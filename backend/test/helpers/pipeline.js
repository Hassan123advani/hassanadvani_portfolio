/**
 * Shared harness for the contact pipeline tests: in-memory Firestore seeded with
 * the real starter profile, a recording mock of the Resend API, and a stub AI.
 * Each test file sets its own environment BEFORE calling setup().
 */
import { readFileSync } from 'node:fs';
import { createFakeAuth, createFakeDb } from '../fakes.js';

export const starter = JSON.parse(readFileSync(new URL('../../../frontend/src/content/portfolio.json', import.meta.url), 'utf8'));

export async function setup() {
  const request = (await import('supertest')).default;
  const { createApp } = await import('../../src/app.js');
  const { services } = await import('../../src/services/context.js');
  const inquiries = await import('../../src/services/inquiries.js');
  const ai = await import('../../src/services/ai.js');
  const { _resetKnowledgeCache } = await import('../../src/services/knowledge.js');

  const h = {
    request,
    inquiries,
    ai,
    db: null,
    sent: [],
    resendReplies: [], // queue of {status, body} to return; default 200
    aiCalls: [],
    aiResult: null, // object | Error | (call) => object
    app: null,
  };

  h.reset = () => {
    _resetKnowledgeCache();
    const projects = Object.fromEntries(starter.projects.map((p, i) => [`p${i}`, { ...p, publishedAt: new Date(Date.now() - 1000) }]));
    h.db = createFakeDb({ settings: { profile: starter.profile }, projects });
    services.db = () => h.db;
    services.auth = () => createFakeAuth({});
    h.sent = [];
    h.resendReplies = [];
    h.aiCalls = [];
    h.aiResult = {
      decision: 'answer',
      category: 'question_about_hassan',
      reply: 'Hi Ada,\n\nThanks for asking! Hassan is a BSCS student at GU Tech who builds responsive websites with HTML, CSS and JavaScript. You can see his work at http://localhost:5173/projects.',
      reason: 'Answered from education and skills facts.',
    };
    h.app = createApp();
    h.ip = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`; // fresh client per test
  };

  globalThis.fetch = async (url, init) => {
    if (!String(url).startsWith('https://api.resend.com/')) throw new Error(`Unexpected network call in test: ${url}`);
    const body = JSON.parse(init.body);
    h.sent.push({ url, headers: init.headers, body });
    const reply = h.resendReplies.shift() || { status: 200, body: { id: `email_${h.sent.length}` } };
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json' } });
  };

  ai.aiProvider.complete = async (call) => {
    h.aiCalls.push(call);
    const r = typeof h.aiResult === 'function' ? h.aiResult(call) : h.aiResult;
    if (r instanceof Error) throw r;
    return { json: JSON.stringify(r), model: 'stub-model' };
  };

  h.submit = (over = {}) =>
    request(h.app)
      .post('/api/public/contact')
      .set('X-Forwarded-For', h.ip)
      .send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        subject: 'Question about your skills',
        message: 'Hi Hassan, what technologies do you work with? I may need a small website.',
        projectType: 'Website',
        startedAt: Date.now() - 10_000,
        ...over,
      });

  h.only = () => [...h.db.store.get('messages').entries()].map(([id, d]) => ({ id, ...d }));
  h.to = (addr) => h.sent.filter((s) => s.body.to.includes(addr));
  h.reset();
  return h;
}
