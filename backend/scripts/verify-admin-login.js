#!/usr/bin/env node
/**
 * End-to-end check that an admin can really sign in:
 *   1. signs in with Firebase Authentication (same REST call the browser SDK makes),
 *   2. calls GET /api/admin/me on the running backend with the ID token,
 *   3. prints the role and permissions the backend grants.
 *
 *   $env:ADMIN_PASSWORD = '...'
 *   npm run verify-admin-login -- hassanadvani08@gmail.com
 *   Remove-Item Env:ADMIN_PASSWORD
 *
 * The Firebase web API key is read from frontend/.env.local (it is public by design).
 * The password is never printed.
 */
import { readFileSync } from 'node:fs';
import { env } from '../src/config/env.js';

const [email] = process.argv.slice(2);
const password = process.env.ADMIN_PASSWORD || '';
const api = process.env.API_URL || `http://localhost:${env.port}`;
if (!email || !password) {
  console.error('Usage: set ADMIN_PASSWORD, then: npm run verify-admin-login -- you@example.com');
  process.exit(1);
}

const frontendEnv = readFileSync(new URL('../../frontend/.env.local', import.meta.url), 'utf8');
const key = frontendEnv.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) {
  console.error('VITE_FIREBASE_API_KEY missing in frontend/.env.local');
  process.exit(1);
}

const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
});
const body = await res.json();
if (!res.ok) {
  const code = body?.error?.message || res.status;
  console.error(`✖ Firebase sign-in failed: ${code}`);
  if (code === 'CONFIGURATION_NOT_FOUND') console.error('  → Firebase Console → Authentication → Get started → enable Email/Password.');
  if (code === 'OPERATION_NOT_ALLOWED') console.error('  → Enable the Email/Password provider in Authentication → Sign-in method.');
  if (/INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_PASSWORD/.test(code)) console.error('  → Wrong email/password, or run npm run create-super-admin first.');
  process.exit(1);
}
console.log(`✔ Firebase sign-in OK (uid ${body.localId})`);

const me = await fetch(`${api}/api/admin/me`, { headers: { Authorization: `Bearer ${body.idToken}` } });
const meBody = await me.json().catch(() => ({}));
if (!me.ok) {
  console.error(`✖ Backend refused the session: ${me.status} ${meBody?.error?.code || ''} ${meBody?.error?.message || ''}`);
  process.exit(1);
}
console.log(`✔ Backend accepts the session: ${meBody.admin.email} is ${meBody.admin.role}`);
console.log(`  permissions: ${meBody.permissions.join(', ')}`);
process.exit(0);
