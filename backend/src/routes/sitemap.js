import { Router } from 'express';
import { services } from '../services/context.js';
import { env } from '../config/env.js';
import { toMillis } from '../utils/serialize.js';
import { escapeHtml } from '../utils/text.js';
import { isPublic } from './public.js';

const r = Router();
const STATIC = ['/', '/about', '/projects', '/blog', '/certificates', '/github', '/services', '/contact'];

/** Public pages only. Admin routes are deliberately never listed. */
r.get('/sitemap.xml', async (_req, res) => {
  const urls = STATIC.map((p) => ({ loc: `${env.siteUrl}${p}` }));
  try {
    const now = Date.now();
    for (const [col, base] of [['posts', '/blog'], ['projects', '/projects']]) {
      const snap = await services.db().collection(col).where('status', '==', 'published').get();
      snap.docs
        .map((d) => d.data())
        .filter((d) => isPublic(d, now))
        .forEach((d) =>
          urls.push({ loc: `${env.siteUrl}${base}/${d.slug}`, lastmod: new Date(toMillis(d.updatedAt) || now).toISOString() }),
        );
    }
  } catch {
    // Firebase not configured yet: serve static pages only.
  }
  const body = urls
    .map((u) => `<url><loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('');
  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=3600')
    .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
});

export default r;
