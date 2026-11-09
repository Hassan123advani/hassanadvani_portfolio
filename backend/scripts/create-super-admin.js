#!/usr/bin/env node
/**
 * Bootstrap (or repair) a SUPER ADMIN.
 *
 *   npm run create-super-admin -- you@example.com "Your Name"
 *
 * Password options (it is never printed or written anywhere):
 *   - Set SUPER_ADMIN_PASSWORD in the environment for this one command, e.g. in PowerShell:
 *       $env:SUPER_ADMIN_PASSWORD = 'your-password'
 *       npm run create-super-admin -- you@example.com "Your Name"
 *       Remove-Item Env:SUPER_ADMIN_PASSWORD
 *   - Or omit it: a one-time password-setup link is printed to THIS terminal instead.
 *
 * - Creates the Firebase Auth user if it does not exist (or updates its password if one is given).
 * - Writes admins/{uid} with role super_admin and sets matching custom claims.
 */
import { services } from '../src/services/context.js';
import { env } from '../src/config/env.js';

const [email, ...nameParts] = process.argv.slice(2);
const displayName = nameParts.join(' ').trim() || 'Super Admin';
const password = process.env.SUPER_ADMIN_PASSWORD || '';

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run create-super-admin -- you@example.com "Your Name"');
  process.exit(1);
}
if (password && password.length < 6) {
  console.error('SUPER_ADMIN_PASSWORD must be at least 6 characters (Firebase minimum).');
  process.exit(1);
}

try {
  const auth = services.auth();
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Found existing Firebase user ${user.uid}`);
    if (password) {
      await auth.updateUser(user.uid, { password });
      console.log('Password updated from SUPER_ADMIN_PASSWORD.');
    }
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err;
    user = await auth.createUser({ email, displayName, emailVerified: false, ...(password ? { password } : {}) });
    console.log(`Created Firebase user ${user.uid}${password ? ' with the password from SUPER_ADMIN_PASSWORD' : ''}`);
  }

  const ref = services.db().collection('admins').doc(user.uid);
  const now = new Date();
  const existing = await ref.get();
  await ref.set(
    {
      email,
      displayName,
      role: 'super_admin',
      permissions: [],
      active: true,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now, createdBy: 'bootstrap-script' }),
    },
    { merge: true },
  );
  await auth.setCustomUserClaims(user.uid, { role: 'super_admin', admin: true });
  await auth.updateUser(user.uid, { disabled: false, displayName });

  console.log('\nSuper admin ready.');
  if (password) {
    console.log('Sign in at /admin with that email and password. Change the password from Account → Change password.');
  } else {
    const link = await auth.generatePasswordResetLink(email, { url: `${env.siteUrl}/` });
    console.log('Open this link to set your password (do not share it):\n');
    console.log(link, '\n');
  }
  process.exit(0);
} catch (err) {
  console.error('Failed:', err.message);
  if (/CONFIGURATION_NOT_FOUND|configuration-not-found/i.test(err.message)) {
    console.error('→ Enable Authentication: Firebase Console → Authentication → Get started → Email/Password.');
  }
  process.exit(1);
}
