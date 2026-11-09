import { Router } from 'express';
import { services } from '../services/context.js';
import { logActivity } from '../services/activity.js';
import { requireSuperAdmin } from '../middleware/auth.js';
import { ROLES, sanitizePermissions } from '../config/permissions.js';
import { adminCreateSchema, adminUpdateSchema } from '../schemas.js';
import { ah, badRequest, conflict, notFound } from '../utils/errors.js';
import { docToJSON, toMillis } from '../utils/serialize.js';
import { env } from '../config/env.js';

const r = Router();
r.use(requireSuperAdmin);

const admins = () => services.db().collection('admins');
const actionSettings = () => ({ url: `${env.siteUrl}/`, handleCodeInApp: false });

/** Keep a Firebase custom claim in sync so Firestore rules can also read the role. */
async function syncClaims(uid, record) {
  await services.auth().setCustomUserClaims(uid, {
    role: record.active === false ? null : record.role,
    admin: record.active !== false,
  });
}

/**
 * Throws when the change would leave the site with no active super admin.
 * Runs inside a transaction so two simultaneous demotions cannot both succeed.
 */
async function assertNotLastSuperAdmin(tx, uid, next) {
  const snap = await tx.get(admins().where('role', '==', ROLES.SUPER_ADMIN));
  const remaining = snap.docs.filter((d) => {
    const data = d.id === uid ? { ...d.data(), ...next } : d.data();
    return data.role === ROLES.SUPER_ADMIN && data.active !== false && !data.__deleted;
  });
  if (remaining.length === 0) {
    throw conflict('This is the last active super admin. Promote another super admin first.', 'LAST_SUPER_ADMIN');
  }
}

/**
 * Invite / password-reset emails are sent by Firebase Authentication itself
 * (the dashboard calls sendPasswordResetEmail). Resend is used only for
 * contact-form notifications to the site owner.
 */
async function deliverLink({ email }) {
  // Confirms the account exists and can receive a reset before the client triggers it.
  await services.auth().generatePasswordResetLink(email, actionSettings());
  return 'firebase-client';
}

r.get(
  '/',
  ah(async (_req, res) => {
    const snap = await admins().get();
    const items = snap.docs.map(docToJSON).sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
    res.json({ items });
  }),
);

r.post(
  '/',
  ah(async (req, res) => {
    const input = adminCreateSchema.parse(req.body);
    const auth = services.auth();
    let user;
    try {
      user = await auth.getUserByEmail(input.email);
    } catch {
      user = await auth.createUser({ email: input.email, displayName: input.displayName, emailVerified: false, disabled: false });
    }
    const ref = admins().doc(user.uid);
    if ((await ref.get()).exists) throw conflict('That person is already an administrator.', 'ADMIN_EXISTS');

    const record = {
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      permissions: input.role === ROLES.SUPER_ADMIN ? [] : sanitizePermissions(input.permissions),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.admin.uid,
    };
    await ref.set(record);
    await syncClaims(user.uid, record);
    const delivery = await deliverLink({ email: input.email });
    await logActivity(req, 'admins.create', { type: 'admins', id: user.uid, label: input.email }, { role: input.role });
    res.status(201).json({ item: { id: user.uid, ...record }, delivery });
  }),
);

r.patch(
  '/:uid',
  ah(async (req, res) => {
    const input = adminUpdateSchema.parse(req.body);
    const { uid } = req.params;
    if (uid === req.admin.uid && (input.role || input.active === false)) {
      throw badRequest('You cannot change your own role or deactivate yourself.');
    }
    const ref = admins().doc(uid);
    const updated = await services.db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw notFound('Administrator not found');
      const current = snap.data();
      const next = { ...input, updatedAt: new Date() };
      if (next.permissions) next.permissions = sanitizePermissions(next.permissions);
      const role = next.role || current.role;
      if (role === ROLES.SUPER_ADMIN) next.permissions = [];
      const losingSuper =
        current.role === ROLES.SUPER_ADMIN && (role !== ROLES.SUPER_ADMIN || next.active === false);
      if (losingSuper) await assertNotLastSuperAdmin(tx, uid, next);
      tx.update(ref, next);
      return { ...current, ...next };
    });

    await syncClaims(uid, updated);
    if (input.active !== undefined) {
      await services.auth().updateUser(uid, { disabled: !input.active });
      if (!input.active) await services.auth().revokeRefreshTokens(uid);
    }
    if (input.role) await services.auth().revokeRefreshTokens(uid); // force new token with new claims
    if (input.displayName) await services.auth().updateUser(uid, { displayName: input.displayName });

    const action =
      input.active === false ? 'admins.deactivate' : input.active === true ? 'admins.activate' : input.role ? 'admins.role' : 'admins.update';
    await logActivity(req, action, { type: 'admins', id: uid, label: updated.email }, { changes: Object.keys(input) });
    res.json({ item: { id: uid, ...updated } });
  }),
);

r.post(
  '/:uid/password-reset',
  ah(async (req, res) => {
    const snap = await admins().doc(req.params.uid).get();
    if (!snap.exists) throw notFound('Administrator not found');
    const { email } = snap.data();
    const delivery = await deliverLink({ email });
    await logActivity(req, 'admins.password_reset', { type: 'admins', id: req.params.uid, label: email }, { delivery });
    // 'firebase-client' tells the dashboard to trigger Firebase's own reset email instead.
    res.json({ ok: true, delivery, email });
  }),
);

r.delete(
  '/:uid',
  ah(async (req, res) => {
    const { uid } = req.params;
    if (uid === req.admin.uid) throw badRequest('You cannot delete your own account.');
    const ref = admins().doc(uid);
    const removed = await services.db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw notFound('Administrator not found');
      if (snap.data().role === ROLES.SUPER_ADMIN) await assertNotLastSuperAdmin(tx, uid, { __deleted: true });
      tx.delete(ref);
      return snap.data();
    });
    try {
      await services.auth().deleteUser(uid);
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') throw err;
    }
    await logActivity(req, 'admins.delete', { type: 'admins', id: uid, label: removed.email });
    res.json({ ok: true });
  }),
);

export default r;
