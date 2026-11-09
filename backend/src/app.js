import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { env, isConfigured } from './config/env.js';
import { HttpError } from './utils/errors.js';
import { requireAuth } from './middleware/auth.js';
import { crudRouter } from './routes/crud.js';
import publicRoutes from './routes/public.js';
import sitemapRoutes from './routes/sitemap.js';
import adminRoutes from './routes/admins.js';
import mediaRoutes from './routes/media.js';
import miscRoutes from './routes/adminMisc.js';
import {
  categorySchema,
  certificateSchema,
  postSchema,
  projectSchema,
  tagSchema,
  testimonialSchema,
} from './schemas.js';
import { excerptFrom, readingTime, sanitizeRichText } from './utils/text.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy === 'true' ? true : /^\d+$/.test(env.trustProxy) ? Number(env.trustProxy) : env.trustProxy);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      services: { firebase: isConfigured.firebase(), cloudinary: isConfigured.cloudinary(), mail: isConfigured.mail() },
    }),
  );

  app.use(sitemapRoutes);

  app.use('/api', (_req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false }));

  app.use('/api/public', publicRoutes);

  /* ---------- Authenticated admin API ---------- */
  const admin = express.Router();
  admin.use(requireAuth);
  admin.use(miscRoutes);
  admin.use('/admins', adminRoutes);
  admin.use('/media', mediaRoutes);
  admin.use(
    '/posts',
    crudRouter({
      collection: 'posts',
      permission: 'blog',
      schema: postSchema,
      label: 'Article',
      slugFrom: 'title',
      publishable: true,
      prepare: (d) => {
        const content = sanitizeRichText(d.content);
        return { ...d, content, readingTime: readingTime(content), excerpt: d.excerpt || excerptFrom(content) };
      },
    }),
  );
  admin.use(
    '/projects',
    crudRouter({
      collection: 'projects',
      permission: 'projects',
      schema: projectSchema,
      label: 'Project',
      slugFrom: 'title',
      publishable: true,
      prepare: (d) => ({ ...d, description: sanitizeRichText(d.description) }),
    }),
  );
  admin.use('/certificates', crudRouter({ collection: 'certificates', permission: 'certificates', schema: certificateSchema, label: 'Certificate' }));
  admin.use('/testimonials', crudRouter({ collection: 'testimonials', permission: 'testimonials', schema: testimonialSchema, label: 'Testimonial' }));
  admin.use('/categories', crudRouter({ collection: 'categories', permission: 'taxonomy', schema: categorySchema, label: 'Category', slugFrom: 'name', readPermissions: ['blog', 'projects'] }));
  admin.use('/tags', crudRouter({ collection: 'tags', permission: 'taxonomy', schema: tagSchema, label: 'Tag', slugFrom: 'name', readPermissions: ['blog', 'projects'] }));
  app.use('/api/admin', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }), admin);

  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: 'Some fields are invalid.',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request body is too large.' } });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body.' } });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    console.error('[error]', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } });
  });

  return app;
}
