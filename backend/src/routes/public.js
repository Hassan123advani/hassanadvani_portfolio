import { Router } from 'express';
import { createHash } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { services } from '../services/context.js';
import { createInquiry, processInquiry } from '../services/inquiries.js';
import { isConfigured } from '../config/env.js';
import { getRepos } from '../services/github.js';
import { contactSchema } from '../schemas.js';
import { ah, badRequest, notFound } from '../utils/errors.js';
import { docToJSON, plain, toMillis } from '../utils/serialize.js';
import { slugify } from '../utils/text.js';
import { env } from '../config/env.js';
import { waitUntil } from '@vercel/functions';

const r = Router();
const db = () => services.db();

/** The only definition of "publicly visible" — mirrored in firestore.rules. */
export const isPublic = (doc, now = Date.now()) =>
  doc.status === 'published' && (!doc.publishedAt || toMillis(doc.publishedAt) <= now);

async function publishedFrom(collection) {
  const snap = await db().collection(collection).where('status', '==', 'published').get();
  const now = Date.now();
  return snap.docs.map(docToJSON).filter((d) => isPublic(d, now));
}

const cache = (res, seconds = 60) => res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=300`);
const stripAdminFields = ({ createdBy, updatedBy, ...rest }) => rest;
const postSummary = ({ content, gallery, ...p }) => stripAdminFields(p);

/* ---------------- Settings ---------------- */
r.get(
  '/settings',
  ah(async (_req, res) => {
    const [profile, site, seo] = await Promise.all(
      ['profile', 'site', 'seo'].map((k) => db().collection('settings').doc(k).get()),
    );
    const clean = (s) => {
      if (!s.exists) return null;
      const { updatedBy, ...rest } = plain(s.data());
      return rest;
    };
    cache(res, 120);
    res.json({ profile: clean(profile), site: clean(site), seo: clean(seo) });
  }),
);

/* ---------------- Blog ---------------- */
r.get(
  '/posts',
  ah(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 9));
    const q = String(req.query.q || '').trim().toLowerCase().slice(0, 100);
    const category = String(req.query.category || '');
    const tag = String(req.query.tag || '');

    let posts = (await publishedFrom('posts')).sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt));
    const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))];
    const tags = [...new Set(posts.flatMap((p) => p.tags || []))];
    const featured = posts.filter((p) => p.featured).slice(0, 3).map(postSummary);

    if (category) posts = posts.filter((p) => slugify(p.category) === slugify(category));
    if (tag) posts = posts.filter((p) => (p.tags || []).some((t) => slugify(t) === slugify(tag)));
    if (q)
      posts = posts.filter((p) =>
        [p.title, p.excerpt, p.category, ...(p.tags || [])].join(' ').toLowerCase().includes(q),
      );

    const total = posts.length;
    const items = posts.slice((page - 1) * limit, page * limit).map(postSummary);
    cache(res);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), categories, tags, featured });
  }),
);

r.get(
  '/posts/:slug',
  ah(async (req, res) => {
    const posts = await publishedFrom('posts');
    const post = posts.find((p) => p.slug === req.params.slug);
    if (!post) throw notFound('Article not found');
    const score = (p) =>
      (p.category && p.category === post.category ? 2 : 0) +
      (p.tags || []).filter((t) => (post.tags || []).includes(t)).length;
    const related = posts
      .filter((p) => p.id !== post.id)
      .map((p) => ({ p, s: score(p) }))
      .sort((a, b) => b.s - a.s || toMillis(b.p.publishedAt) - toMillis(a.p.publishedAt))
      .slice(0, 3)
      .map(({ p }) => postSummary(p));
    cache(res);
    res.json({ item: stripAdminFields(post), related });
  }),
);

/* ---------------- Projects / certificates / testimonials ---------------- */
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || toMillis(b.publishedAt) - toMillis(a.publishedAt);

r.get(
  '/projects',
  ah(async (_req, res) => {
    const items = (await publishedFrom('projects')).sort(byOrder).map(({ description, ...p }) => stripAdminFields(p));
    cache(res);
    res.json({ items });
  }),
);

r.get(
  '/projects/:slug',
  ah(async (req, res) => {
    const items = (await publishedFrom('projects')).sort(byOrder);
    const idx = items.findIndex((p) => p.slug === req.params.slug);
    if (idx === -1) throw notFound('Project not found');
    const pick = (p) => (p ? { slug: p.slug, title: p.title } : null);
    cache(res);
    res.json({ item: stripAdminFields(items[idx]), prev: pick(items[idx - 1]), next: pick(items[idx + 1]) });
  }),
);

r.get(
  '/certificates',
  ah(async (_req, res) => {
    const items = (await publishedFrom('certificates')).sort(byOrder).map(stripAdminFields);
    cache(res, 300);
    res.json({ items });
  }),
);

r.get(
  '/testimonials',
  ah(async (_req, res) => {
    const items = (await publishedFrom('testimonials')).sort(byOrder).map(stripAdminFields);
    cache(res, 300);
    res.json({ items });
  }),
);

/* ---------------- GitHub ---------------- */
r.get(
  '/github',
  ah(async (_req, res) => {
    cache(res, 600);
    res.json(await getRepos());
  }),
);

/* ---------------- Contact ---------------- */
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many messages from your connection. Please try again in a little while.' },
    }),
});

const MIN_FILL_MS = 3000;

export function spamScore({ message, subject, name }) {
  let score = 0;
  const links = (message.match(/https?:\/\//gi) || []).length;
  if (links > 3) score += 2;
  if (/\b(viagra|casino|crypto ?invest|seo services|backlinks|loan offer)\b/i.test(`${subject} ${message}`)) score += 2;
  if (/<a\s|\[url=/i.test(message)) score += 2;
  if (/https?:\/\//i.test(name)) score += 3;
  return score;
}

r.post(
  '/contact',
  contactLimiter,
  ah(async (req, res) => {
    const input = contactSchema.parse(req.body);

    // Honeypot / timing traps: pretend success so bots learn nothing.
    const tooFast = input.startedAt && Date.now() - input.startedAt < MIN_FILL_MS;
    if (input.website || tooFast) return res.status(202).json({ ok: true });

    const settings = await db().collection('settings').doc('site').get();
    if (settings.exists && settings.data().contactEnabled === false) {
      throw badRequest('The contact form is currently closed. Please email directly instead.');
    }

    const spam = spamScore(input) >= 3;
    const { id, conversationId } = await createInquiry(input, {
      spam,
      ipHash: createHash('sha256').update(`${env.ipHashSalt}:${req.ip}`).digest('hex').slice(0, 24),
      userAgent: String(req.get('user-agent') || '').slice(0, 300),
    });

    // Cloud Functions: the Firestore onCreate trigger runs the pipeline (reliable, retried).
    // Locally and on Vercel: run it in the background so the visitor isn't kept waiting.
    // On Vercel, waitUntil keeps the function alive until it finishes (it is frozen otherwise).
    if (!env.onGoogleCloud && env.inlineProcessing) {
      const job = new Promise((resolve) => setImmediate(resolve))
        .then(() => processInquiry(id))
        .catch((err) => console.error('[contact] pipeline error:', err.message));
      if (process.env.VERCEL) waitUntil(job);
    }
    res.status(201).json({ ok: true, conversationId, autoReply: !spam && isConfigured.visitorEmail() });
  }),
);

export default r;
