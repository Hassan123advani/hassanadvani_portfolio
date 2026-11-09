import { Router } from 'express';
import { services } from '../services/context.js';
import { logActivity } from '../services/activity.js';
import { requirePermission, requireSuperAdmin } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS, PERMISSION_LABELS } from '../config/permissions.js';
import { SETTINGS, messageUpdateSchema, postSchema, projectSchema, certificateSchema } from '../schemas.js';
import { ah, badRequest, notFound } from '../utils/errors.js';
import { docToJSON, plain, toMillis } from '../utils/serialize.js';
import { cloudinaryEnabled } from '../services/cloudinary.js';
import { mailEnabled } from '../services/mailer.js';
import { retryInquiryNow } from '../services/inquiries.js';
import { isConfigured } from '../config/env.js';
import { applyPublishing } from './crud.js';
import { sanitizeRichText, readingTime, excerptFrom, slugify } from '../utils/text.js';

const r = Router();
const db = () => services.db();

r.get('/me', (req, res) => {
  res.json({
    admin: req.admin,
    permissions: PERMISSIONS.filter((p) => hasPermission(req.admin, p)),
    permissionLabels: PERMISSION_LABELS,
    integrations: { cloudinary: cloudinaryEnabled(), mail: mailEnabled(), ai: isConfigured.ai(), visitorEmail: isConfigured.visitorEmail() },
  });
});

/**
 * Records that the signed-in admin changed their own password.
 * The password change itself happens in the browser with Firebase Auth
 * (re-authenticate with the current password, then updatePassword); no
 * password ever reaches this server. To stop a stale session faking the log
 * entry, the ID token must come from a re-authentication in the last 10 minutes.
 */
r.post(
  '/me/password-changed',
  ah(async (req, res) => {
    const ageSeconds = Date.now() / 1000 - (req.admin.authTime || 0);
    if (!req.admin.authTime || ageSeconds > 10 * 60) {
      throw badRequest('Please re-enter your current password before changing it.');
    }
    await logActivity(req, 'admins.password_change', { type: 'admins', id: req.admin.uid, label: req.admin.email });
    res.json({ ok: true });
  }),
);

/* ---------------- Dashboard statistics ---------------- */
r.get(
  '/stats',
  ah(async (req, res) => {
    const count = async (name) => (await db().collection(name).count().get()).data().count;
    const [posts, projects, messages, media, certificates, testimonials] = await Promise.all(
      ['posts', 'projects', 'messages', 'media', 'certificates', 'testimonials'].map((c) => db().collection(c).get()),
    );
    const now = Date.now();
    const byStatus = (snap) => {
      const s = { published: 0, draft: 0, scheduled: 0 };
      snap.docs.forEach((d) => {
        const x = d.data();
        if (x.status === 'published' && toMillis(x.publishedAt) > now) s.scheduled += 1;
        else s[x.status === 'published' ? 'published' : 'draft'] += 1;
      });
      return s;
    };
    const unread = messages.docs.filter((d) => (d.data().status || 'new') === 'new').length;
    const recentMessages = hasPermission(req.admin, 'messages')
      ? messages.docs
          .map(docToJSON)
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
          .slice(0, 5)
          .map(({ id, name, subject, status, createdAt }) => ({ id, name, subject, status, createdAt }))
      : [];
    const recentActivity = hasPermission(req.admin, 'activity')
      ? (await db().collection('activityLogs').orderBy('createdAt', 'desc').limit(8).get()).docs.map(docToJSON)
      : [];
    res.json({
      posts: { total: posts.size, ...byStatus(posts) },
      projects: { total: projects.size, ...byStatus(projects) },
      messages: { total: messages.size, unread },
      media: { total: media.size },
      certificates: { total: certificates.size },
      testimonials: { total: testimonials.size },
      admins: req.admin.role === 'super_admin' ? await count('admins') : null,
      recentMessages,
      recentActivity,
    });
  }),
);

/* ---------------- Contact messages ---------------- */
const messages = () => db().collection('messages');

r.get(
  '/messages',
  requirePermission('messages'),
  ah(async (req, res) => {
    const snap = await messages().get();
    let items = snap.docs.map(docToJSON).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    if (req.query.status) items = items.filter((m) => (m.status || 'new') === req.query.status);
    res.json({ items: items.map(({ ipHash, ...m }) => m) });
  }),
);

r.patch(
  '/messages/:id',
  requirePermission('messages'),
  ah(async (req, res) => {
    const input = messageUpdateSchema.parse(req.body);
    const ref = messages().doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw notFound('Message not found');
    await ref.update({ ...input, updatedAt: new Date() });
    if (input.status) await logActivity(req, `messages.${input.status}`, { type: 'messages', id: ref.id, label: snap.data().subject });
    const { ipHash, ...item } = docToJSON(await ref.get());
    res.json({ item });
  }),
);

/** Retry failed AI / email steps for one inquiry. Already-sent emails are never re-sent. */
r.post(
  '/messages/:id/retry',
  requirePermission('messages'),
  ah(async (req, res) => {
    const result = await retryInquiryNow(req.params.id);
    if (!result) throw notFound('Message not found');
    await logActivity(req, 'messages.retry', { type: 'messages', id: req.params.id, label: result.subject });
    const { ipHash, ...item } = docToJSON(await messages().doc(req.params.id).get());
    res.json({ item });
  }),
);

r.delete(
  '/messages/:id',
  requirePermission('messages'),
  ah(async (req, res) => {
    const ref = messages().doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw notFound('Message not found');
    await ref.delete();
    await logActivity(req, 'messages.delete', { type: 'messages', id: ref.id, label: snap.data().subject });
    res.json({ ok: true });
  }),
);

/* ---------------- Settings (profile / site / seo) ---------------- */
const settingsGuard = (req, res, next) => {
  const def = SETTINGS[req.params.key];
  if (!def) return next(notFound('Unknown settings section'));
  req.settingsDef = def;
  return requirePermission(def.permission)(req, res, next);
};

r.get(
  '/settings/:key',
  settingsGuard,
  ah(async (req, res) => {
    const snap = await db().collection('settings').doc(req.params.key).get();
    res.json({ item: snap.exists ? plain(snap.data()) : null });
  }),
);

r.put(
  '/settings/:key',
  settingsGuard,
  ah(async (req, res) => {
    const data = req.settingsDef.schema.parse(req.body);
    await db().collection('settings').doc(req.params.key).set({ ...data, updatedAt: new Date(), updatedBy: req.admin.uid });
    await logActivity(req, `settings.${req.params.key}.update`, { type: 'settings', id: req.params.key, label: req.params.key });
    res.json({ item: data });
  }),
);

/* ---------------- Activity log ---------------- */
r.get(
  '/activity',
  requirePermission('activity'),
  ah(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const snap = await db().collection('activityLogs').orderBy('createdAt', 'desc').limit(limit).get();
    let items = snap.docs.map(docToJSON);
    if (req.query.actor) items = items.filter((a) => a.actorUid === req.query.actor);
    res.json({ items });
  }),
);

/* ---------------- Import starter content (super admin, one-off) ---------------- */
r.post(
  '/import-starter',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { profile, projects = [], certificates = [], site, seo, posts = [] } = req.body || {};
    if (!profile) throw badRequest('Starter content is missing the profile section.');
    const report = { created: [], skipped: [] };

    for (const key of ['profile', 'site', 'seo']) {
      const value = { profile, site, seo }[key];
      if (!value) continue;
      const ref = db().collection('settings').doc(key);
      if ((await ref.get()).exists) {
        report.skipped.push(`settings/${key}`);
        continue;
      }
      await ref.set({ ...SETTINGS[key].schema.parse(value), updatedAt: new Date(), updatedBy: req.admin.uid });
      report.created.push(`settings/${key}`);
    }

    const importList = async (name, list, schema, extra = (d) => d) => {
      const col = db().collection(name);
      if (!(await col.limit(1).get()).empty) {
        report.skipped.push(`${name} (collection not empty)`);
        return;
      }
      for (const raw of list) {
        let data = schema.parse(raw);
        if ('slug' in data) data.slug = slugify(data.slug || data.title);
        if ('publishedAt' in data) data = applyPublishing(data, null);
        data = extra(data);
        const now = new Date();
        await col.add({ ...data, createdAt: now, updatedAt: now, createdBy: req.admin.uid, updatedBy: req.admin.uid });
      }
      report.created.push(`${name} (${list.length})`);
    };
    await importList('projects', projects, projectSchema, (d) => ({ ...d, description: sanitizeRichText(d.description) }));
    await importList('certificates', certificates, certificateSchema);
    if (posts.length)
      await importList('posts', posts, postSchema, (d) => {
        const content = sanitizeRichText(d.content);
        return { ...d, content, readingTime: readingTime(content), excerpt: d.excerpt || excerptFrom(content) };
      });

    await logActivity(req, 'content.import', { type: 'settings', id: 'starter', label: 'Starter content' }, report);
    res.json(report);
  }),
);

export default r;
