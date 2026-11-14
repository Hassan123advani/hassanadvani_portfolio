import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { services } from '../src/services/context.js';
import { createFakeAuth, createFakeDb } from './fakes.js';
import { sanitizeRichText } from '../src/utils/text.js';

const PAST = new Date(Date.now() - 2 * 86_400_000);
const OLDER = new Date(Date.now() - 5 * 86_400_000);
const FUTURE = new Date(Date.now() + 86_400_000);

let db;
let app;
const as = (token) => ({ Authorization: `Bearer ${token}` });

beforeEach(() => {
  db = createFakeDb({
    admins: {
      super1: { email: 'boss@test.dev', role: 'super_admin', permissions: [], active: true },
      editor: { email: 'ed@test.dev', role: 'admin', permissions: ['blog'], active: true },
      inbox: { email: 'in@test.dev', role: 'admin', permissions: ['messages'], active: true },
    },
    posts: {
      a: { title: 'Newer', slug: 'newer', status: 'published', publishedAt: PAST, content: '<p>a</p>', category: 'React', views: 4, createdBy: 'super1' },
      b: { title: 'Older', slug: 'older', status: 'published', publishedAt: OLDER, content: '<p>b</p>', category: 'Firebase', featured: true },
      c: { title: 'Secret draft', slug: 'secret', status: 'draft', publishedAt: null, content: '<p>c</p>' },
      d: { title: 'Scheduled', slug: 'scheduled', status: 'published', publishedAt: FUTURE, content: '<p>d</p>' },
    },
    categories: { k1: { name: 'C Programming', slug: 'c-programming', scope: 'post' }, k2: { name: 'Design', slug: 'design', scope: 'project' } },
  });
  services.db = () => db;
  services.auth = () =>
    createFakeAuth({
      'tok-super': { uid: 'super1', email: 'boss@test.dev' },
      'tok-editor': { uid: 'editor', email: 'ed@test.dev' },
      'tok-inbox': { uid: 'inbox', email: 'in@test.dev' },
    });
  app = createApp();
});

test('public list hides drafts/scheduled, strips views + admin fields, includes admin post categories', async () => {
  const res = await request(app).get('/api/public/posts');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.items.map((p) => p.slug), ['newer', 'older']);
  assert.equal(res.body.items[0].views, undefined, 'raw view counter is not public');
  assert.equal(res.body.items[0].createdBy, undefined);
  assert.ok(res.body.categories.includes('C Programming'), 'admin-created post category is offered');
  assert.ok(!res.body.categories.includes('Design'), 'project-only category is not');
  assert.deepEqual(res.body.featured.map((p) => p.slug), ['older']);
  assert.equal(res.body.items[0].content, undefined, 'list payload has no article body');
});

test('article detail returns prev/next in publish order and 404s for drafts and scheduled posts', async () => {
  const res = await request(app).get('/api/public/posts/newer');
  assert.equal(res.status, 200);
  assert.equal(res.body.prev.slug, 'older');
  assert.equal(res.body.next, null);
  assert.equal(res.body.item.views, undefined);
  const older = await request(app).get('/api/public/posts/older');
  assert.equal(older.body.next.slug, 'newer');
  assert.equal((await request(app).get('/api/public/posts/secret')).status, 404);
  assert.equal((await request(app).get('/api/public/posts/scheduled')).status, 404);
});

test('views are counted on the server, once per visitor per window, never for drafts', async () => {
  const first = await request(app).post('/api/public/posts/newer/view').set('User-Agent', 'ua-1');
  assert.equal(first.status, 200);
  assert.equal(first.body.counted, true);
  const again = await request(app).post('/api/public/posts/newer/view').set('User-Agent', 'ua-1');
  assert.equal(again.body.counted, false, 'refresh does not inflate');
  assert.equal(db.store.get('posts').get('a').views, 5);
  const day = [...db.store.get('article_analytics').values()][0];
  assert.equal(day.views, 1);
  assert.equal(day.postId, 'a');

  assert.equal((await request(app).post('/api/public/posts/secret/view')).status, 404);
  assert.equal((await request(app).post('/api/public/posts/scheduled/view')).status, 404);
});

test('saving an article in the admin keeps its view counter and supports new fields', async () => {
  const res = await request(app)
    .put('/api/admin/posts/a')
    .set(as('tok-editor'))
    .send({ title: 'Newer', slug: 'newer', content: '<p>edited</p>', status: 'published', views: 999, subtitle: 'Sub', seoKeywords: ['react'], readingTimeOverride: 7 });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const saved = db.store.get('posts').get('a');
  assert.equal(saved.views, 4, 'views preserved, and not settable from the request');
  assert.equal(saved.subtitle, 'Sub');
  assert.deepEqual(saved.seoKeywords, ['react']);
  assert.equal(saved.readingTime, 7);
});

test('newsletter validates, de-duplicates case-insensitively and honours the honeypot', async () => {
  const bad = await request(app).post('/api/public/newsletter').send({ email: 'not-an-email' });
  assert.equal(bad.status, 400);
  const ok = await request(app).post('/api/public/newsletter').send({ email: 'Reader@Example.com' });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.status, 'subscribed');
  const dup = await request(app).post('/api/public/newsletter').send({ email: 'reader@example.com ' });
  assert.equal(dup.status, 200);
  assert.equal(dup.body.status, 'already_subscribed');
  assert.equal(db.store.get('newsletter_subscribers').size, 1);
  assert.equal([...db.store.get('newsletter_subscribers').values()][0].email, 'reader@example.com');

  const bot = await request(app).post('/api/public/newsletter').send({ email: 'bot@example.com', website: 'http://spam' });
  assert.equal(bot.status, 201);
  assert.equal(db.store.get('newsletter_subscribers').size, 1, 'honeypot submission not stored');
});

test('writing stats need blog permission; subscriber list needs inbox permission', async () => {
  await request(app).post('/api/public/newsletter').send({ email: 'a@example.com' });
  await request(app).post('/api/public/posts/newer/view').set('User-Agent', 'x');

  assert.equal((await request(app).get('/api/admin/writing/stats')).status, 401);
  assert.equal((await request(app).get('/api/admin/writing/stats').set(as('tok-inbox'))).status, 403);
  const stats = await request(app).get('/api/admin/writing/stats').set(as('tok-editor'));
  assert.equal(stats.status, 200, JSON.stringify(stats.body));
  assert.deepEqual(stats.body.counts, { total: 4, published: 2, draft: 1, scheduled: 1, featured: 1 });
  assert.equal(stats.body.views, 5);
  assert.equal(stats.body.subscribers, 1);
  assert.equal(stats.body.topArticles[0].slug, 'newer');
  assert.equal(stats.body.daily.length, 30);
  assert.equal(stats.body.daily.at(-1).views, 1);

  assert.equal((await request(app).get('/api/admin/newsletter').set(as('tok-editor'))).status, 403, 'blog editors cannot read emails');
  const list = await request(app).get('/api/admin/newsletter').set(as('tok-inbox'));
  assert.equal(list.status, 200);
  assert.equal(list.body.items[0].email, 'a@example.com');
  assert.equal(list.body.items[0].ipHash, undefined);
  const del = await request(app).delete(`/api/admin/newsletter/${list.body.items[0].id}`).set(as('tok-inbox'));
  assert.equal(del.status, 200);
  assert.equal(db.store.get('newsletter_subscribers').size, 0);
});

test('sanitizer keeps tables and code languages but drops inline styles', () => {
  const html = sanitizeRichText(
    '<table style="min-width:50px"><tbody><tr><th colspan="1" rowspan="1"><p>H</p></th></tr><tr><td colspan="2" onclick="x()">v</td></tr></tbody></table><pre><code class="language-c">int x;</code></pre>',
  );
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('<th colspan="1" rowspan="1">'));
  assert.ok(html.includes('<td colspan="2">'));
  assert.ok(!html.includes('style='));
  assert.ok(!html.includes('onclick'));
  assert.ok(html.includes('class="language-c"'));
});

test('sitemap lists /writing URLs only for live articles', async () => {
  const res = await request(app).get('/sitemap.xml');
  assert.ok(res.text.includes('/writing/newer'));
  assert.ok(res.text.includes('/writing</loc>'));
  assert.ok(!res.text.includes('/writing/secret'));
  assert.ok(!res.text.includes('/writing/scheduled'));
});

test('starter articles are valid drafts with safe content, unique slugs and no scripts', async () => {
  const { starterArticles } = await import('../scripts/starter-articles.js');
  const { prepareStarter } = await import('../scripts/seed-articles.js');
  const slugs = new Set();
  assert.ok(starterArticles.length >= 5);
  for (const raw of starterArticles) {
    const a = prepareStarter(raw);
    assert.equal(a.status, 'draft', `${a.title} must be a draft`);
    assert.equal(a.featured, false);
    assert.equal(a.publishedAt, null);
    assert.ok(a.readingTime >= 1);
    assert.ok(a.excerpt && a.category && a.subtitle);
    assert.ok(!/<script|on\w+=/i.test(a.content));
    assert.ok(!slugs.has(a.slug), `duplicate slug ${a.slug}`);
    slugs.add(a.slug);
  }
});
