import { Router } from 'express';
import { services } from '../services/context.js';
import { logActivity } from '../services/activity.js';
import { requirePermission } from '../middleware/auth.js';
import { destroyResource, fetchResource, signUpload } from '../services/cloudinary.js';
import { mediaRegisterSchema, mediaUpdateSchema, signSchema } from '../schemas.js';
import { ah, notFound } from '../utils/errors.js';
import { docToJSON, toMillis } from '../utils/serialize.js';
import { hasPermission } from '../config/permissions.js';

const r = Router();
const media = () => services.db().collection('media');

/** Any content editor may upload into the folder for the content they manage. */
const FOLDER_PERMISSION = {
  posts: 'blog',
  projects: 'projects',
  certificates: 'certificates',
  profile: 'profile',
  resume: 'profile',
  video: 'profile',
  media: 'media',
};
const canUseFolder = (admin, folder) => hasPermission(admin, 'media') || hasPermission(admin, FOLDER_PERMISSION[folder]);

r.post(
  '/sign',
  ah(async (req, res) => {
    const input = signSchema.parse(req.body);
    if (!canUseFolder(req.admin, input.folder)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You cannot upload here.' } });
    res.json(signUpload(input));
  }),
);

/** Register an asset after a signed browser upload. Metadata comes from Cloudinary, not the client. */
r.post(
  '/',
  ah(async (req, res) => {
    const input = mediaRegisterSchema.parse(req.body);
    if (!canUseFolder(req.admin, input.folder)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You cannot upload here.' } });
    const asset = await fetchResource(input.publicId, input.resourceType);
    const doc = {
      publicId: asset.public_id,
      url: asset.secure_url,
      resourceType: asset.resource_type,
      format: asset.format || null,
      bytes: asset.bytes || 0,
      width: asset.width || null,
      height: asset.height || null,
      duration: asset.duration || null,
      folder: input.folder,
      alt: input.alt,
      title: input.title || asset.public_id.split('/').pop(),
      caption: '',
      createdAt: new Date(),
      createdBy: req.admin.uid,
    };
    const existing = await media().where('publicId', '==', doc.publicId).limit(1).get();
    const ref = existing.empty ? await media().add(doc) : existing.docs[0].ref;
    if (!existing.empty) await ref.set(doc, { merge: true });
    await logActivity(req, 'media.upload', { type: 'media', id: ref.id, label: doc.title }, { folder: input.folder });
    res.status(201).json({ item: docToJSON(await ref.get()) });
  }),
);

r.get(
  '/',
  requirePermission('media'),
  ah(async (req, res) => {
    const snap = await media().get();
    let items = snap.docs.map(docToJSON).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    if (req.query.folder) items = items.filter((m) => m.folder === req.query.folder);
    if (req.query.type) items = items.filter((m) => m.resourceType === req.query.type);
    res.json({ items });
  }),
);

/** Lightweight picker for editors without full media permission: only their folder. */
r.get(
  '/picker/:folder',
  ah(async (req, res) => {
    if (!canUseFolder(req.admin, req.params.folder)) return res.json({ items: [] });
    const snap = await media().where('folder', '==', req.params.folder).get();
    res.json({ items: snap.docs.map(docToJSON).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)) });
  }),
);

r.patch(
  '/:id',
  requirePermission('media'),
  ah(async (req, res) => {
    const input = mediaUpdateSchema.parse(req.body);
    const ref = media().doc(req.params.id);
    if (!(await ref.get()).exists) throw notFound('Media not found');
    await ref.update({ ...input, updatedAt: new Date() });
    await logActivity(req, 'media.update', { type: 'media', id: req.params.id, label: input.title });
    res.json({ item: docToJSON(await ref.get()) });
  }),
);

r.delete(
  '/:id',
  requirePermission('media'),
  ah(async (req, res) => {
    const ref = media().doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw notFound('Media not found');
    const { publicId, resourceType, title } = snap.data();
    const result = await destroyResource(publicId, resourceType);
    await ref.delete();
    await logActivity(req, 'media.delete', { type: 'media', id: req.params.id, label: title }, { cloudinary: result });
    res.json({ ok: true, cloudinary: result });
  }),
);

export default r;
