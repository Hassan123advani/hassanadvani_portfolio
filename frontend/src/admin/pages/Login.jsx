import { useState } from 'react';
import { authMessage, useAuth } from '../AuthContext.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function Login() {
  const auth = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: auth.error ? 'error' : '', text: auth.error || '' });

  if (auth.status === 'unconfigured') {
    return (
      <div className="a-login">
        <div className="a-login__card">
          <h1>Admin is not configured</h1>
          <p className="muted">
            Add the Firebase web config (at minimum <code>VITE_FIREBASE_API_KEY</code>) to <code>frontend/.env.local</code> and restart the dev server. See <code>docs/FIREBASE_SETUP.md</code>.
          </p>
        </div>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      if (mode === 'signin') {
        await auth.signIn(email, password);
      } else {
        await auth.sendReset(email);
        // Same message whether or not the account exists, to avoid account enumeration.
        setMsg({ type: 'ok', text: 'If an account exists for that email, a reset link is on its way.' });
      }
    } catch (err) {
      if (mode === 'reset') setMsg({ type: 'ok', text: 'If an account exists for that email, a reset link is on its way.' });
      else setMsg({ type: 'error', text: authMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="a-login">
      <form className="a-login__card" onSubmit={submit} noValidate>
        <span className="brand__mark">
          <Icon name="shield" size={18} />
        </span>
        <h1>{mode === 'signin' ? 'Sign in' : 'Reset password'}</h1>
        <p className="muted small">{mode === 'signin' ? 'Authorised administrators only.' : 'We’ll email you a secure link to choose a new password.'}</p>
        <div className="field">
          <label htmlFor="a-email">Email</label>
          <input id="a-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === 'signin' && (
          <div className="field">
            <label htmlFor="a-pass">Password</label>
            <input id="a-pass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        {msg.text && (
          <p className={msg.type === 'error' ? 'form-alert' : 'form-ok'} role="alert">
            {msg.text}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy || !email || (mode === 'signin' && !password)}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Send reset link'}
        </button>
        <button
          type="button"
          className="btn btn--text btn--sm"
          onClick={() => {
            setMode(mode === 'signin' ? 'reset' : 'signin');
            setMsg({ type: '', text: '' });
          }}
        >
          {mode === 'signin' ? 'Forgot your password?' : 'Back to sign in'}
        </button>
      </form>
    </div>
  );
}
