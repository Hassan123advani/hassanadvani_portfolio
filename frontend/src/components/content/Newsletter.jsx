import { useId, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { loaders } from '../../content/data.js';
import { describeError } from '../../lib/api.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Newsletter sign-up. Addresses are stored server-side only (validated, de-duplicated,
 * rate limited); there is no email-service key anywhere in the browser.
 */
export default function Newsletter({ source = 'writing' }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState({ status: 'idle', message: '' });

  async function submit(e) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setState({ status: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    setState({ status: 'loading', message: '' });
    try {
      const res = await loaders.subscribe({ email: value, source, website });
      setState({
        status: 'success',
        message: res.status === 'already_subscribed' ? 'You’re already on the list — thanks for being here.' : 'You’re in. Thanks for subscribing!',
      });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', message: err.offline ? 'The sign-up service is unavailable right now. Please try again later.' : describeError(err) });
    }
  }

  const done = state.status === 'success';
  return (
    <section className="w-news" aria-labelledby={`${id}-title`}>
      <div className="w-news__glow" aria-hidden="true" />
      <div className="w-news__copy">
        <p className="w-label">Newsletter</p>
        <h2 id={`${id}-title`} className="w-news__title">
          Stay in the <em>loop.</em>
        </h2>
        <p className="w-news__text">New articles, project write-ups and lessons from the build — only when there’s something worth sharing. No spam, unsubscribe any time.</p>
      </div>
      <form className="w-news__form" onSubmit={submit} noValidate>
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <div className={`w-news__field ${state.status === 'error' ? 'is-invalid' : ''}`}>
          <Icon name="mail" size={18} />
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state.status === 'error') setState({ status: 'idle', message: '' });
            }}
            maxLength={254}
            aria-invalid={state.status === 'error'}
            aria-describedby={`${id}-msg`}
            disabled={state.status === 'loading'}
          />
          <button type="submit" className="btn btn--primary" disabled={state.status === 'loading'}>
            {state.status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </div>
        <div className="w-hp" aria-hidden="true">
          <label htmlFor={`${id}-web`}>Website</label>
          <input id={`${id}-web`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <p id={`${id}-msg`} className={`w-news__msg ${done ? 'is-ok' : state.status === 'error' ? 'is-err' : ''}`} role="status" aria-live="polite">
          {done && <Icon name="check" size={15} />} {state.message}
        </p>
      </form>
    </section>
  );
}
