#!/usr/bin/env node
/** Prints which integrations are configured. Never prints secret values. */
import { env, isConfigured } from '../src/config/env.js';

const rows = [
  ['Firebase Admin', isConfigured.firebase(), 'FIREBASE_SERVICE_ACCOUNT_PATH  or  FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY'],
  ['Cloudinary', isConfigured.cloudinary(), 'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'],
  ['Resend email', isConfigured.mail(), 'RESEND_API_KEY → see docs/GMAIL_INTEGRATION.md'],
  ['AI replies', isConfigured.ai(), 'ANTHROPIC_API_KEY → see docs/CONTACT_AUTOMATION.md'],
  ['Visitor email', isConfigured.visitorEmail(), 'verified Resend domain + RESEND_FROM on it → npm run resend-domain -- add <domain>'],
];

let missing = 0;
for (const [name, ok, hint] of rows) {
  console.log(`${ok ? '✔' : '✖'} ${name.padEnd(15)} ${ok ? 'configured' : `missing: ${hint}`}`);
  if (!ok) missing += 1;
}
if (env.ipHashSalt === 'change-me') console.log('! IP_HASH_SALT is still the default — set a random value.');
console.log(`\nCORS_ORIGINS = ${env.corsOrigins.join(', ')}`);
console.log(`SITE_URL     = ${env.siteUrl}`);
process.exit(missing ? 1 : 0);
