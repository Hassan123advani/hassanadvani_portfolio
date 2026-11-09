import { useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { api } from '../../lib/api.js';
import { useSite } from '../../context/SiteContext.jsx';

export const PROJECT_TYPES = ['Website', 'Web app or tool', 'Fix or improve a site', 'Collaboration', 'Something else'];

const RULES = {
  name: (v) => (v.trim().length < 2 ? 'Please enter your name (at least 2 characters).' : ''),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
  subject: (v) => (v.trim().length < 2 ? 'Please add a short subject.' : ''),
  message: (v) => (v.trim().length < 10 ? 'Your message should be at least 10 characters.' : v.length > 5000 ? 'Please keep it under 5000 characters.' : ''),
};

const EMPTY = { name: '', email: '', subject: '', message: '', projectType: '', website: '' };

export default function ContactForm({ defaultType = '' }) {
  const { profile, site } = useSite();
  const [values, setValues] = useState({ ...EMPTY, projectType: defaultType });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const startedAt = useRef(Date.now());

  if (site.contactEnabled === false) {
    return (
      <div className="contact-form contact-form--closed">
        <h3>The contact form is closed right now</h3>
        <p className="muted">
          You can still reach me by email at <a href={`mailto:${profile.email}`}>{profile.email}</a>.
        </p>
      </div>
    );
  }

  const set = (k) => (e) => {
    const v = e.target.value;
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: RULES[k]?.(v) || '' }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    const next = Object.fromEntries(Object.entries(RULES).map(([k, fn]) => [k, fn(values[k])]));
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      setStatus({ state: 'idle', message: '' });
      document.getElementById(`cf-${Object.keys(next).find((k) => next[k])}`)?.focus();
      return;
    }
    setStatus({ state: 'sending', message: '' });
    try {
      const r = await api.post('/public/contact', { ...values, startedAt: startedAt.current });
      const first = values.name.trim().split(' ')[0];
      setStatus({
        state: 'sent',
        message: r.autoReply
          ? `Thanks, ${first}! Your message was received. A reply is on its way to ${values.email} — check your inbox (and spam folder) in a minute. Hassan also reads every message personally.`
          : `Thanks, ${first}! Your message was received. Hassan reads every message personally and will reply to ${values.email}.`,
      });
      setValues({ ...EMPTY });
      startedAt.current = Date.now();
    } catch (err) {
      const fallback = err.offline
        ? `The message service is offline right now. Please email me directly at ${profile.email}.`
        : err.status === 429
          ? `${err.message}`
          : err.code === 'VALIDATION'
            ? 'Please check the highlighted fields and try again.'
            : err.message;
      setStatus({ state: 'error', message: fallback });
    }
  }

  const field = (k, label, props = {}, Tag = 'input') => (
    <div className={`field ${errors[k] ? 'has-error' : ''}`}>
      <label htmlFor={`cf-${k}`}>{label}</label>
      <Tag id={`cf-${k}`} name={k} value={values[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `cf-${k}-err` : undefined} {...props} />
      {errors[k] && (
        <p className="field__error" id={`cf-${k}-err`}>
          {errors[k]}
        </p>
      )}
    </div>
  );

  if (status.state === 'sent') {
    return (
      <div className="contact-form contact-form--sent" role="status">
        <span className="state__icon">
          <Icon name="check" size={22} />
        </span>
        <h3>Message sent</h3>
        <p>{status.message}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStatus({ state: 'idle', message: '' })}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <div className="field-row">
        {field('name', 'Full name', { autoComplete: 'name', placeholder: 'Your name', maxLength: 100 })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'you@example.com', maxLength: 200 })}
      </div>
      <div className="field-row">
        {field('subject', 'Subject', { placeholder: 'What’s it about?', maxLength: 150 })}
        <div className="field">
          <label htmlFor="cf-projectType">
            Project type <span className="muted">(optional)</span>
          </label>
          <select id="cf-projectType" value={values.projectType} onChange={set('projectType')}>
            <option value="">Choose one…</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {field('message', 'Message', { rows: 6, placeholder: 'Tell me a little about your idea, timeline or question…', maxLength: 5000 }, 'textarea')}

      {/* Honeypot: hidden from people, irresistible to bots */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
      </div>

      {status.state === 'error' && (
        <p className="form-alert" role="alert">
          {status.message}
        </p>
      )}
      <div className="contact-form__foot">
        <p className="muted small">Your details are only used to reply to you.</p>
        <button type="submit" className="btn btn--primary" disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Sending…' : 'Send message'} <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </form>
  );
}
