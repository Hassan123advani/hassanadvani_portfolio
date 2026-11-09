import { describe, expect, it } from 'vitest';
import { passwordChangeError, passwordStrength, validatePasswordChange } from './password.js';

describe('validatePasswordChange', () => {
  it('requires every field', () => {
    expect(validatePasswordChange({})).toEqual({
      current: 'Enter your current password.',
      next: 'Use at least 8 characters.',
      confirm: 'Confirm the new password.',
    });
  });

  it('enforces a minimum of 8 characters', () => {
    expect(validatePasswordChange({ current: 'old-pw1', next: 'short1!', confirm: 'short1!' }).next).toMatch(/at least 8/);
  });

  it('rejects reusing the current password', () => {
    expect(validatePasswordChange({ current: 'SamePass123!', next: 'SamePass123!', confirm: 'SamePass123!' }).next).toMatch(/different/);
  });

  it('rejects a mismatched confirmation', () => {
    expect(validatePasswordChange({ current: 'old-pw1', next: 'NewPass123!', confirm: 'NewPass124!' }).confirm).toMatch(/do not match/);
  });

  it('rejects leading/trailing spaces', () => {
    expect(validatePasswordChange({ current: 'old-pw1', next: ' NewPass123!', confirm: ' NewPass123!' }).next).toMatch(/spaces/);
  });

  it('accepts a valid change', () => {
    expect(validatePasswordChange({ current: 'old-pw1', next: 'Karachi-2026-strong', confirm: 'Karachi-2026-strong' })).toEqual({});
  });
});

describe('passwordStrength', () => {
  it('scores from weak to strong', () => {
    expect(passwordStrength('old-pw1')).toBe(1);
    expect(passwordStrength('Karachi-2026-strong')).toBe(4);
  });
});

describe('passwordChangeError', () => {
  it('maps a wrong current password to the current field', () => {
    expect(passwordChangeError({ code: 'auth/invalid-credential' })).toEqual({ field: 'current', message: 'Your current password is incorrect.' });
    expect(passwordChangeError({ code: 'auth/wrong-password' }).field).toBe('current');
  });
  it('maps weak password and network errors', () => {
    expect(passwordChangeError({ code: 'auth/weak-password' }).field).toBe('next');
    expect(passwordChangeError({ code: 'auth/network-request-failed' }).message).toMatch(/Network error/);
    expect(passwordChangeError({ code: 'auth/too-many-requests' }).message).toMatch(/Too many attempts/);
  });
  it('falls back to the raw message', () => {
    expect(passwordChangeError({ message: 'boom' }).message).toBe('boom');
  });
});
