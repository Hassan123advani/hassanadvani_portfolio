export const MIN_PASSWORD_LENGTH = 8;

/** Client-side rules for the change-password form. Returns { field: message } (empty = valid). */
export function validatePasswordChange({ current = '', next = '', confirm = '' }) {
  const errors = {};
  if (!current) errors.current = 'Enter your current password.';
  if (next.length < MIN_PASSWORD_LENGTH) errors.next = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (next === current) errors.next = 'The new password must be different from the current one.';
  else if (/^\s|\s$/.test(next)) errors.next = 'Remove spaces at the start or end.';
  if (!confirm) errors.confirm = 'Confirm the new password.';
  else if (confirm !== next) errors.confirm = 'The passwords do not match.';
  return errors;
}

/** Rough strength meter: 0 (weak) – 4 (strong). */
export function passwordStrength(pw = '') {
  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

/** Map Firebase Auth errors to messages for this form. */
export function passwordChangeError(err) {
  switch (err?.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return { field: 'current', message: 'Your current password is incorrect.' };
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return { field: 'next', message: 'That password is too weak. Use a longer password with mixed characters.' };
    case 'auth/too-many-requests':
      return { message: 'Too many attempts. Wait a few minutes and try again.' };
    case 'auth/network-request-failed':
      return { message: 'Network error — check your connection and try again.' };
    case 'auth/requires-recent-login':
      return { message: 'For security, sign out and sign in again, then change your password.' };
    case 'auth/user-mismatch':
    case 'auth/user-not-found':
      return { message: 'This session no longer matches your account. Sign out and sign in again.' };
    default:
      return { message: err?.message || 'Could not change the password. Please try again.' };
  }
}
