#!/usr/bin/env node
/**
 * Sends ONE real test notification through Resend to CONTACT_NOTIFY_TO.
 *   npm run test-email
 * Never prints the API key.
 */
import { env, isConfigured } from '../src/config/env.js';
import { buildOwnerNotification, sendViaResend } from '../src/services/mailer.js';

if (!isConfigured.mail()) {
  console.error('✖ RESEND_API_KEY is not set in backend/.env');
  process.exit(1);
}

console.log(`From:     ${env.mail.from}`);
console.log(`To:       ${env.mail.notifyTo}`);
console.log('Reply-To: Test Visitor <test-visitor@example.com>\n');

try {
  const email = buildOwnerNotification({
    conversationId: `test-${Date.now()}`,
    createdAt: new Date(),
    ai: { status: 'done', decision: 'answer', category: 'other', reply: 'Hi Test,\n\nThis is where the AI-generated reply appears.', reason: 'Integration test' },
    delivery: { visitor: { status: 'skipped', reason: 'test only' } },
    name: 'Test Visitor',
    email: 'test-visitor@example.com',
    subject: 'Resend integration test',
    projectType: 'Website',
    message: 'This is a test sent by `npm run test-email`.\nIn Gmail, press Reply — the To field should show test-visitor@example.com.',
  });
  const id = await sendViaResend(email);
  console.log(`✔ Sent. Resend id: ${id}`);
  console.log('  Check the inbox (and Spam) of', env.mail.notifyTo);
  process.exit(0);
} catch (err) {
  console.error(`✖ Resend rejected the email (${err.status || 'network'} ${err.resendError || ''}): ${err.message}`);
  if (err.status === 403 && /domain|testing emails|own email/i.test(err.message)) {
    console.error('\n  You are using onboarding@resend.dev, which can only deliver to the email that owns the');
    console.error('  Resend account. Either sign up to Resend with', env.mail.notifyTo, 'or verify a domain');
    console.error('  and set RESEND_FROM to an address on it. See docs/GMAIL_INTEGRATION.md.');
  }
  if (err.status === 401) console.error('\n  The API key is invalid or revoked — create a new one at https://resend.com/api-keys');
  process.exit(1);
}
