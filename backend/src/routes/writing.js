import { Router } from 'express';
import { services } from '../services/context.js';
import { requirePermission } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';
import { ah, notFound } from '../utils/errors.js';
import { docToJSON, toMillis } from '../utils/serialize.js';

/**
 * Admin-only Writing analytics and newsletter management.
 * Mounted behind requireAuth; each route checks its own permission.
 */
const r = Router();
const db = () => services.db();
const DAYS = 30;
const dayKey = (d) => d.toISOString().slice(0, 10);

function stateOf(p, now) {
  if (p.status !== 'published') return 'draft';
  return p.publishedAt && toMillis(p.publishedAt) > now ? 'scheduled' : 'published';
}

r.get(
  '/writing/stats',
  requirePermission('blog'),
  ah(async (_req, res) => {
    const now = Date.now();
    const start = new Date(now - (DAYS - 1) * 86_400_000);
    const startKey = dayKey(start);

    const [postsSnap, daysSnap] = await Promise.all([
      db().collection('posts').get(),
      db().collection('article_analytics').where('date', '>=', startKey).get(),
    ]);
    const posts = postsSnap.docs.map(docToJSON);
    const counts = { total: posts.length, published: 0, draft: 0, scheduled: 0, featured: 0 };
    let views = 0;
    for (const p of posts) {
      counts[stateOf(p, now)] += 1;
      if (p.featured) counts.featured += 1;
      views += p.views || 0;
    }

    // Daily totals for the last 30 days (zero-filled) and per-article views in that window.
    const daily = new Map();
    for (let i = 0; i < DAYS; i += 1) daily.set(dayKey(new Date(start.getTime() + i * 86_400_000)), 0);
    const recentByPost = new Map();
    for (const d of daysSnap.docs.map((x) => x.data()).filter((x) => x.date >= startKey)) {
      if (daily.has(d.date)) daily.set(d.date, daily.get(d.date) + (d.views || 0));
      recentByPost.set(d.postId, (recentByPost.get(d.postId) || 0) + (d.views || 0));
    }

    const summary = (p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: stateOf(p, now),
      category: p.category || '',
      views: p.views || 0,
      recentViews: recentByPost.get(p.id) || 0,
      publishedAt: p.publishedAt || null,
    });

    // Only the count is shown here; the addresses themselves need the 'messages' permission.
    const sub = await db().collection('newsletter_subscribers').where('status', '==', 'active').count().get();
    const subscribers = sub.data().count;

    res.json({
      counts,
      views,
      subscribers,
      topArticles: posts.filter((p) => p.views).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map(summary),
      recent: posts
        .filter((p) => stateOf(p, now) === 'published')
        .sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt))
        .slice(0, 5)
        .map(summary),
      daily: [...daily.entries()].map(([date, v]) => ({ date, views: v })),
      windowDays: DAYS,
    });
  }),
);

/* Subscriber emails are personal data: same permission as the contact inbox. */
r.get(
  '/newsletter',
  requirePermission('messages'),
  ah(async (_req, res) => {
    const snap = await db().collection('newsletter_subscribers').get();
    const items = snap.docs
      .map(docToJSON)
      .map(({ ipHash, ...s }) => s)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    res.json({ items });
  }),
);

r.delete(
  '/newsletter/:id',
  requirePermission('messages'),
  ah(async (req, res) => {
    const ref = db().collection('newsletter_subscribers').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw notFound('Subscriber not found');
    await ref.delete();
    await logActivity(req, 'newsletter.delete', { type: 'newsletter_subscribers', id: req.params.id, label: snap.data().email });
    res.json({ ok: true });
  }),
);

export default r;
