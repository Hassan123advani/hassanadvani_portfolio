import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { services } from '../src/services/context.js';
import { createFakeAuth, createFakeDb } from './fakes.js';
import { sanitizeRichText, slugify, readingTime } from '../src/utils/text.js';
import { spamScore } from '../src/routes/public.js';

const PAST = new Date(Date.now() - 86_400_000);
const FUTURE = new Date(Date.now() + 86_400_000);

let db;
let auth;
let app;

beforeEach(() => {
  db = createFakeDb({
    admins: {
      super1: { email: 'boss@test.dev', role: 'super_admin', permissions: [], active: true, displayName: 'Boss' },
      editor: { email: 'ed@test.dev', role: 'admin', permissions: ['blog'], active: true, displayName: 'Ed' },
      off: { email: 'off@test.dev', role: 'admin', permissions: ['blog'], active: false },
    },
    posts: {
      p1: { title: 'Live', slug: 'live', status: 'published', publishedAt: PAST, content: '<p>x</p>', tags: ['web'], category: 'Notes' },
      p2: { title: 'Draft', slug: 'draft', status: 'draft', publishedAt: null, content: '' },
      p3: { title: 'Later', slug: 'later', status: 'published', publishedAt: FUTURE, content: '' },
    },
  });
  auth = createFakeAuth({
    'tok-super': { uid: 'super1', email: 'boss@test.dev' },
    'tok-editor': { uid: 'editor', email: 'ed@test.dev' },
    'tok-off': { uid: 'off', email: 'off@test.dev' },
    'tok-stranger': { uid: 'nobody', email: 'x@test.dev' },
  });
  services.db = () => db;
  services.auth = () => auth;
  app = createApp();
});

const as = (token) => ({ Authorization: `Bearer ${token}` });

/* ---------------- utilities ---------------- */
test('slugify + reading time', () => {
  assert.equal(slugify('  Héllo, World!! 2026 '), 'hello-world-2026');
  assert.equal(readingTime('<p>word </p>'.repeat(440)), 2);
});

test('sanitizer strips scripts/handlers and non-YouTube iframes, keeps YouTube', () => {
  const dirty =
    '<p onclick="x()">Hi<script>alert(1)</script></p><iframe src="https://evil.com/x"></iframe>' +
    '<div data-youtube-video><iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe></div>' +
    '<a href="javascript:alert(1)">bad</a><a href="https://ok.dev">ok</a><p class="caption evil">c</p>';
  const clean = sanitizeRichText(dirty);
  assert.ok(!clean.includes('script'));
  assert.ok(!clean.includes('onclick'));
  assert.ok(!clean.includes('evil.com'));
  assert.ok(clean.includes('youtube-nocookie.com/embed/abc123'));
  assert.ok(!clean.includes('javascript:'));
  assert.ok(clean.includes('rel="noopener noreferrer nofollow"'));
  assert.ok(clean.includes('class="caption"'));
});

/* ---------------- public visibility ---------------- */
test('public blog only lists published posts whose date has passed', async () => {
  const res = await request(app).get('/api/public/posts');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.items.map((p) => p.slug), ['live']);
  assert.equal(res.body.items[0].content, undefined, 'list omits full content');
  assert.equal((await request(app).get('/api/public/posts/draft')).status, 404);
  assert.equal((await request(app).get('/api/public/posts/later')).status, 404);
  assert.equal((await request(app).get('/api/public/posts/live')).status, 200);
});

test('blog search and tag filtering', async () => {
  assert.equal((await request(app).get('/api/public/posts?q=nothing')).body.total, 0);
  assert.equal((await request(app).get('/api/public/posts?tag=web')).body.total, 1);
  assert.equal((await request(app).get('/api/public/posts?category=notes')).body.total, 1);
});

test('sitemap excludes admin, drafts and scheduled posts', async () => {
  const res = await request(app).get('/sitemap.xml');
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('/writing/live'));
  assert.ok(!res.text.includes('/writing/draft'));
  assert.ok(!res.text.includes('/writing/later'));
  assert.ok(!res.text.includes('admin'));
});

/* ---------------- authentication & authorization ---------------- */
test('admin API rejects missing, invalid, non-admin and deactivated users', async () => {
  assert.equal((await request(app).get('/api/admin/me')).status, 401);
  assert.equal((await request(app).get('/api/admin/me').set(as('garbage'))).status, 401);
  assert.equal((await request(app).get('/api/admin/me').set(as('tok-stranger'))).status, 403);
  const off = await request(app).get('/api/admin/me').set(as('tok-off'));
  assert.equal(off.status, 403);
  assert.equal(off.body.error.code, 'ACCOUNT_DISABLED');
});

test('regular admin is limited to granted permissions', async () => {
  assert.equal((await request(app).get('/api/admin/posts').set(as('tok-editor'))).status, 200);
  assert.equal((await request(app).get('/api/admin/projects').set(as('tok-editor'))).status, 403);
  assert.equal((await request(app).get('/api/admin/messages').set(as('tok-editor'))).status, 403);
  assert.equal((await request(app).get('/api/admin/admins').set(as('tok-editor'))).status, 403);
  assert.equal((await request(app).put('/api/admin/settings/site').set(as('tok-editor')).send({ siteTitle: 'x' })).status, 403);
});

test('regular admin cannot escalate their own privileges', async () => {
  const res = await request(app)
    .patch('/api/admin/admins/editor')
    .set(as('tok-editor'))
    .send({ role: 'super_admin', permissions: ['blog', 'settings'] });
  assert.equal(res.status, 403);
  assert.equal(db.store.get('admins').get('editor').role, 'admin');
});

/* ---------------- blog CMS ---------------- */
test('creating a post sanitizes content, computes slug/reading time, logs activity', async () => {
  const res = await request(app)
    .post('/api/admin/posts')
    .set(as('tok-editor'))
    .send({ title: 'Live', content: '<p>Hello<script>x</script></p>', status: 'published' });
  assert.equal(res.status, 201);
  assert.equal(res.body.item.slug, 'live-2', 'slug made unique');
  assert.ok(!res.body.item.content.includes('script'));
  assert.equal(res.body.item.readingTime, 1);
  assert.ok(res.body.item.publishedAt, 'publish date set');
  const logs = [...db.store.get('activityLogs').values()];
  assert.equal(logs.at(-1).action, 'posts.create');
  assert.equal(logs.at(-1).actorUid, 'editor');
});

test('explicit duplicate slug is rejected; validation errors are 400', async () => {
  const dup = await request(app).post('/api/admin/posts').set(as('tok-editor')).send({ title: 'x', slug: 'live' });
  assert.equal(dup.status, 409);
  const bad = await request(app).post('/api/admin/posts').set(as('tok-editor')).send({ title: '' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'VALIDATION');
});

test('unpublishing is logged as such', async () => {
  const res = await request(app).put('/api/admin/posts/p1').set(as('tok-editor')).send({ title: 'Live', slug: 'live', status: 'draft' });
  assert.equal(res.status, 200);
  assert.equal([...db.store.get('activityLogs').values()].at(-1).action, 'posts.unpublish');
});

/* ---------------- super admin management ---------------- */
test('super admin creates an admin without any password and gets a delivery mode', async () => {
  const res = await request(app)
    .post('/api/admin/admins')
    .set(as('tok-super'))
    .send({ email: 'new@test.dev', displayName: 'New', role: 'admin', permissions: ['blog', 'bogus'] });
  assert.equal(res.status, 400, 'unknown permission rejected');
  const ok = await request(app)
    .post('/api/admin/admins')
    .set(as('tok-super'))
    .send({ email: 'new@test.dev', displayName: 'New', role: 'admin', permissions: ['blog', 'media'] });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.delivery, 'firebase-client');
  const stored = db.store.get('admins').get(ok.body.item.id);
  assert.deepEqual(stored.permissions, ['blog', 'media']);
  assert.equal(stored.password, undefined);
});

test('last super admin is protected', async () => {
  const demoteSelf = await request(app).patch('/api/admin/admins/super1').set(as('tok-super')).send({ role: 'admin' });
  assert.equal(demoteSelf.status, 400);
  assert.equal((await request(app).delete('/api/admin/admins/super1').set(as('tok-super'))).status, 400);

  // add a second super admin, then demoting the other one is allowed
  db.store.get('admins').set('super2', { email: 's2@test.dev', role: 'super_admin', active: true, permissions: [] });
  auth.verifyIdToken = async (t) => ({ 'tok-super': { uid: 'super1' }, 'tok-s2': { uid: 'super2' } })[t];
  assert.equal((await request(app).patch('/api/admin/admins/super1').set(as('tok-s2')).send({ active: false })).status, 200);
  // super1 is now deactivated, so its token no longer works at all
  assert.equal((await request(app).get('/api/admin/me').set(as('tok-super'))).status, 403);
  // and super2, the last active super admin, cannot delete itself
  assert.equal((await request(app).delete('/api/admin/admins/super2').set(as('tok-s2'))).status, 400);
});

test('deactivating an admin disables and revokes their Firebase session', async () => {
  const res = await request(app).patch('/api/admin/admins/editor').set(as('tok-super')).send({ active: false });
  assert.equal(res.status, 200);
  assert.ok(auth.calls.some(([k, uid, d]) => k === 'update' && uid === 'editor' && d.disabled === true));
  assert.ok(auth.calls.some(([k, uid]) => k === 'revoke' && uid === 'editor'));
});

/* ---------------- contact form ---------------- */
const contact = (over = {}) => ({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Hello there',
  message: 'I would like to talk about a project.',
  startedAt: Date.now() - 10_000,
  ...over,
});

test('contact form stores valid messages', async () => {
  const res = await request(app).post('/api/public/contact').send(contact());
  assert.equal(res.status, 201);
  const msg = [...db.store.get('messages').values()][0];
  assert.equal(msg.status, 'new');
  assert.ok(msg.conversationId, 'conversation id assigned');
  assert.equal(msg.ai.status, 'pending');
  assert.equal(msg.pipelineState, 'queued');
  assert.ok(msg.ipHash && !msg.ipHash.includes('.'), 'IP stored only as hash');
});

test('contact form validation, honeypot and timing traps', async () => {
  assert.equal((await request(app).post('/api/public/contact').send(contact({ email: 'nope' }))).status, 400);
  assert.equal((await request(app).post('/api/public/contact').send(contact({ website: 'http://spam' }))).status, 202);
  assert.equal((await request(app).post('/api/public/contact').send(contact({ startedAt: Date.now() }))).status, 202);
  assert.equal(db.store.get('messages'), undefined, 'bots are not stored');
});

test('contact form is rate limited', async () => {
  let last;
  for (let i = 0; i < 6; i += 1) last = await request(app).post('/api/public/contact').send(contact());
  assert.equal(last.status, 429);
});

test('spam heuristics flag link-stuffed messages', () => {
  assert.ok(spamScore({ name: 'x', subject: 'cheap backlinks', message: 'http://a http://b http://c http://d' }) >= 3);
  assert.equal(spamScore({ name: 'Ada', subject: 'Hi', message: 'Plain message' }), 0);
});

test('unknown API routes return JSON 404', async () => {
  const res = await request(app).get('/api/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

/* ---------------- taxonomy permissions ---------------- */
test('blog editors can read categories but not change them', async () => {
  assert.equal((await request(app).get('/api/admin/categories').set(as('tok-editor'))).status, 200);
  assert.equal((await request(app).post('/api/admin/categories').set(as('tok-editor')).send({ name: 'X' })).status, 403);
});

/* ---------------- starter content import ---------------- */
import { readFileSync } from 'node:fs';
const starter = JSON.parse(readFileSync(new URL('../../frontend/src/content/portfolio.json', import.meta.url), 'utf8'));

test('starter content from the original site validates and imports once', async () => {
  assert.equal((await request(app).post('/api/admin/import-starter').set(as('tok-editor')).send(starter)).status, 403);
  const res = await request(app).post('/api/admin/import-starter').set(as('tok-super')).send(starter);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.created.includes('settings/profile'));
  assert.ok(res.body.created.includes(`projects (${starter.projects.length})`));
  assert.ok(res.body.created.includes(`certificates (${starter.certificates.length})`));
  const again = await request(app).post('/api/admin/import-starter').set(as('tok-super')).send(starter);
  assert.equal(again.body.created.length, 0, 'second import changes nothing');

  const projects = await request(app).get('/api/public/projects');
  assert.deepEqual(projects.body.items.map((p) => p.slug), [...starter.projects].sort((a, b) => a.order - b.order).map((p) => p.slug));
  const certs = await request(app).get('/api/public/certificates');
  assert.equal(certs.body.items.length, 9);
  const settings = await request(app).get('/api/public/settings');
  assert.equal(settings.body.profile.name, 'Muhammad Hassan Advani');
  assert.equal(settings.body.profile.updatedBy, undefined, 'admin metadata not exposed');
});

test('profile settings round-trip through validation', async () => {
  const res = await request(app).put('/api/admin/settings/profile').set(as('tok-super')).send(starter.profile);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const bad = await request(app).put('/api/admin/settings/profile').set(as('tok-super')).send({ ...starter.profile, socials: [{ label: 'x', url: 'javascript:alert(1)' }] });
  assert.equal(bad.status, 400);
});

/* ---------------- change password (activity log) ---------------- */
test('password change is logged for any admin, only after a fresh re-authentication, without the password', async () => {
  const fresh = Math.floor(Date.now() / 1000) - 30;
  auth.verifyIdToken = async (t) =>
    ({ 'tok-editor-fresh': { uid: 'editor', email: 'ed@test.dev', auth_time: fresh }, 'tok-editor-stale': { uid: 'editor', email: 'ed@test.dev', auth_time: fresh - 3600 } })[t];

  const stale = await request(app).post('/api/admin/me/password-changed').set(as('tok-editor-stale')).send({});
  assert.equal(stale.status, 400);

  const ok = await request(app).post('/api/admin/me/password-changed').set(as('tok-editor-fresh')).send({ password: 'should-be-ignored' });
  assert.equal(ok.status, 200, 'regular admins can use it, not only super admins');
  const log = [...db.store.get('activityLogs').values()].at(-1);
  assert.equal(log.action, 'admins.password_change');
  assert.equal(log.actorUid, 'editor');
  assert.ok(!JSON.stringify(log).includes('should-be-ignored'), 'no password in the log');

  assert.equal((await request(app).post('/api/admin/me/password-changed').send({})).status, 401);
});
