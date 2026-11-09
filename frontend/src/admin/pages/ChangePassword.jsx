import { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { PageHeader, useToast } from '../components/Feedback.jsx';
import { useAuth } from '../AuthContext.jsx';
import { MIN_PASSWORD_LENGTH, passwordChangeError, passwordStrength, validatePasswordChange } from '../lib/password.js';

const STRENGTH = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const EMPTY = { current: '', next: '', confirm: '' };

function PasswordInput({ id, label, value, onChange, error, autoComplete, show }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error && (
        <p className="field__error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Available to every admin: re-authenticates with the current password, then updates it in Firebase Auth. */
export default function ChangePassword() {
  const { admin, changePassword, sendReset } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const strength = passwordStrength(values.next);

  const set = (k) => (v) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const found = validatePasswordChange(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await changePassword(values.current, values.next);
      setValues(EMPTY);
      toast.success('Password changed. Use the new password next time you sign in.');
    } catch (err) {
      const mapped = passwordChangeError(err);
      if (mapped.field) setErrors({ [mapped.field]: mapped.message });
      else setFormError(mapped.message);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    try {
      await sendReset(admin.email);
      toast.success(`A reset link was sent to ${admin.email}.`);
    } catch (err) {
      toast.error(passwordChangeError(err).message);
    }
  }

  return (
    <>
      <PageHeader title="Change password" description={`Signed in as ${admin.email}. Your password is managed by Firebase Authentication and is never stored by this website.`} />
      <form className="a-card a-narrow" onSubmit={submit} noValidate>
        <PasswordInput id="pw-current" label="Current password" value={values.current} onChange={set('current')} error={errors.current} autoComplete="current-password" show={show} />
        <PasswordInput id="pw-new" label="New password" value={values.next} onChange={set('next')} error={errors.next} autoComplete="new-password" show={show} />
        {values.next && (
          <div className={`pw-strength pw-strength--${strength}`} aria-live="polite">
            <span className="pw-strength__bar">
              <i style={{ width: `${(strength / 4) * 100}%` }} />
            </span>
            <span className="small muted">{STRENGTH[strength]}</span>
          </div>
        )}
        <PasswordInput id="pw-confirm" label="Confirm new password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" show={show} />
        <label className="check" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
        </label>
        <p className="field__hint">At least {MIN_PASSWORD_LENGTH} characters and different from your current password. A mix of letters, numbers and symbols is best.</p>
        {formError && (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        )}
        <div className="a-form-actions">
          <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
            <Icon name="shield" size={15} /> {busy ? 'Changing…' : 'Change password'}
          </button>
          <button type="button" className="btn btn--text btn--sm" onClick={forgot}>
            Forgot your current password?
          </button>
        </div>
      </form>
    </>
  );
}
