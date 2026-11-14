import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { services } from '../services/context.js';
import { logActivity } from '../services/activity.js';
import { requirePermission } from '../middleware/auth.js';
import { ah, conflict, forbidden, notFound } from '../utils/errors.js';
import { hasPermission } from '../config/permissions.js';
import { docToJSON, toMillis } from '../utils/serialize.js';
import { slugify } from '../utils/text.js';

/** Resolve a unique slug in `collection`, ignoring the document `selfId`. */
export async function uniqueSlug(collection, wanted, fallback, selfId, explicit) {
  const base = slugify(wanted) || slugify(fallback) || `item-${randomUUID().slice(0, 8)}`;
  const col = services.db().collection(collection);
  for (let i = 1; i < 50; i += 1) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const snap = await col.where('slug', '==', candidate).limit(2).get();
    const taken = snap.docs.some((d) => d.id !== selfId);
    if (!taken) return candidate;
    if (explicit && i === 1) throw conflict(`The URL slug "${candidate}" is already used.`, 'SLUG_TAKEN');
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

/** Normalise publish state: published items get a publish date, drafts keep a scheduled date if given. */
export function applyPublishing(data, existing) {
  const out = { ...data };
  if (out.publishedAt) out.publishedAt = new Date(out.publishedAt);
  else if (out.status === 'published') out.publishedAt = existing?.publishedAt || new Date();
  else out.publishedAt = null;
  return out;
}

/**
 * Generic admin CRUD router for a Firestore collection.
 * Every write is validated, permission-checked and recorded in the activity log.
 */
export function crudRouter({ collection, permission, readPermissions = [], schema, label, slugFrom, publishable, prepare, preserve = [] }) {
  const r = Router();
  const canRead = (req, _res, next) =>
    [permission, ...readPermissions].some((p) => hasPermission(req.admin, p)) ? next() : next(forbidden());
  const canWrite = requirePermission(permission);
  const col = () => services.db().collection(collection);
  const titleOf = (d) => d.title || d.name || d.slug || '';

  async function build(body, existing, id) {
    let data = schema.parse(body);
    if (slugFrom) data.slug = await uniqueSlug(collection, data.slug, data[slugFrom], id, Boolean(body.slug));
    if (publishable) data = applyPublishing(data, existing);
    if (prepare) data = await prepare(data, existing);
    return data;
  }

  r.get(
    '/',
    canRead,
    ah(async (_req, res) => {
      const snap = await col().get();
      const items = snap.docs.map(docToJSON).sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      res.json({ items });
    }),
  );

  r.get(
    '/:id',
    canRead,
    ah(async (req, res) => {
      const snap = await col().doc(req.params.id).get();
      if (!snap.exists) throw notFound(`${label} not found`);
      res.json({ item: docToJSON(snap) });
    }),
  );

  r.post(
    '/',
    canWrite,
    ah(async (req, res) => {
      const data = await build(req.body, null, null);
      const now = new Date();
      const ref = await col().add({ ...data, createdAt: now, updatedAt: now, createdBy: req.admin.uid, updatedBy: req.admin.uid });
      await logActivity(req, `${collection}.create`, { type: collection, id: ref.id, label: titleOf(data) });
      const snap = await ref.get();
      res.status(201).json({ item: docToJSON(snap) });
    }),
  );

  r.put(
    '/:id',
    canWrite,
    ah(async (req, res) => {
      const ref = col().doc(req.params.id);
      const current = await ref.get();
      if (!current.exists) throw notFound(`${label} not found`);
      const data = await build(req.body, current.data(), req.params.id);
      // Server-managed fields (e.g. view counters) are never taken from the request and must survive a save.
      const kept = Object.fromEntries(preserve.filter((k) => current.data()[k] !== undefined).map((k) => [k, current.data()[k]]));
      await ref.set({ ...data, ...kept, createdAt: current.data().createdAt || new Date(), createdBy: current.data().createdBy || null, updatedAt: new Date(), updatedBy: req.admin.uid });
      const before = current.data();
      const action =
        publishable && before.status !== data.status
          ? `${collection}.${data.status === 'published' ? 'publish' : 'unpublish'}`
          : `${collection}.update`;
      await logActivity(req, action, { type: collection, id: req.params.id, label: titleOf(data) });
      res.json({ item: docToJSON(await ref.get()) });
    }),
  );

  r.delete(
    '/:id',
    canWrite,
    ah(async (req, res) => {
      const ref = col().doc(req.params.id);
      const current = await ref.get();
      if (!current.exists) throw notFound(`${label} not found`);
      await ref.delete();
      await logActivity(req, `${collection}.delete`, { type: collection, id: req.params.id, label: titleOf(current.data()) });
      res.json({ ok: true });
    }),
  );

  return r;
}
