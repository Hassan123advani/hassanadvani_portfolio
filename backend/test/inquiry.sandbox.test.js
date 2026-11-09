/**
 * Current real-world configuration: Resend key but NO verified domain
 * (sender onboarding@resend.dev), and no Anthropic key.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY = 're_test_key_never_real';
process.env.RESEND_FROM = 'Portfolio Contact <onboarding@resend.dev>';
process.env.CONTACT_NOTIFY_TO = 'hassanadvani08@gmail.com';

const { setup } = await import('./helpers/pipeline.js');
const h = await setup();
beforeEach(() => h.reset());

test('without a verified domain: owner is notified, visitor auto-reply is skipped with a clear reason', async () => {
  const res = await h.submit();
  assert.equal(res.status, 201);
  assert.equal(res.body.autoReply, false, 'frontend is told no confirmation email will arrive');
  const [inq] = h.only();
  await h.inquiries.processInquiry(inq.id);
  const doc = h.db.store.get('messages').get(inq.id);

  assert.equal(doc.ai.status, 'skipped');
  assert.match(doc.ai.error, /ANTHROPIC_API_KEY/);
  assert.equal(doc.delivery.visitor.status, 'skipped');
  assert.match(doc.delivery.visitor.reason, /verified Resend sending domain/);
  assert.equal(doc.delivery.owner.status, 'sent');
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.sent[0].body.to, ['hassanadvani08@gmail.com']);
  assert.ok(h.sent[0].body.text.includes('ANTHROPIC_API_KEY not configured'));
});
