import { services } from '../services/context.js';
import { hasPermission, ROLES } from '../config/permissions.js';
import { ah, forbidden, unauthorized } from '../utils/errors.js';

/**
 * Verifies the Firebase ID token AND looks up the admin record in Firestore.
 * A valid Firebase account is not enough: the user must exist in `admins`
 * and be active. Revoked tokens are rejected.
 */
export const requireAuth = ah(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw unauthorized();

  let decoded;
  try {
    decoded = await services.auth().verifyIdToken(match[1], true);
  } catch (err) {
    if (err?.status === 503) throw err;
    throw unauthorized('Your session is invalid or has expired. Please sign in again.');
  }

  const snap = await services.db().collection('admins').doc(decoded.uid).get();
  if (!snap.exists) throw forbidden('This account is not an administrator.', 'NOT_ADMIN');
  const record = snap.data();
  if (record.active === false) throw forbidden('This administrator account is deactivated.', 'ACCOUNT_DISABLED');

  req.admin = {
    uid: decoded.uid,
    email: decoded.email || record.email,
    displayName: record.displayName || decoded.name || '',
    role: record.role === ROLES.SUPER_ADMIN ? ROLES.SUPER_ADMIN : ROLES.ADMIN,
    permissions: Array.isArray(record.permissions) ? record.permissions : [],
    active: true,
    authTime: decoded.auth_time || null, // seconds since epoch of the last real sign-in / re-authentication
  };
  next();
});

export const requirePermission = (permission) => (req, _res, next) =>
  hasPermission(req.admin, permission) ? next() : next(forbidden());

export const requireSuperAdmin = (req, _res, next) =>
  req.admin?.role === ROLES.SUPER_ADMIN ? next() : next(forbidden('Only a super admin can do that.'));
