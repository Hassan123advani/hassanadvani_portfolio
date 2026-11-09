import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { PageHeader, StatusBadge, useConfirm, useToast } from '../components/Feedback.jsx';
import { useCollection } from '../lib/useCollection.js';
import { useAuth } from '../AuthContext.jsx';
import { adminApi, describeError } from '../../lib/api.js';
import { formatDateTime, timeAgo } from '../../lib/format.js';

const failed = (m) => ['visitor', 'owner'].some((k) => m.delivery?.[k]?.status === 'failed') || m.ai?.status === 'failed';
const needsAttention = (m) =>
  !['resolved', 'archived', 'spam'].includes(m.status) && (m.ai?.decision !== 'answer' || m.delivery?.visitor?.status !== 'sent' || failed(m));

const TABS = {
  inbox: { label: 'Inbox', test: (m) => ['new', 'read', 'replied'].includes(m.status || 'new') },
  attention: { label: 'Needs attention', test: needsAttention },
  resolved: { label: 'Resolved', test: (m) => m.status === 'resolved' },
  starred: { label: 'Starred', test: (m) => m.starred },
  archived: { label: 'Archived', test: (m) => m.status === 'archived' },
  spam: { label: 'Spam', test: (m) => m.status === 'spam' },
  all: { label: 'All', test: () => true },
};

const DELIVERY_TEXT = { sent: 'Sent', pending: 'Pending', failed: 'Failed', skipped: 'Not sent' };

function DeliveryPill({ label, step }) {
  const s = step?.status || 'pending';
  return (
    <div className={`delivery delivery--${s}`}>
      <span className="delivery__label">{label}</span>
      <strong>{DELIVERY_TEXT[s] || s}</strong>
      {step?.content && <span className="muted small">{step.content === 'ai' ? 'AI answer' : 'acknowledgement template'}</span>}
      {step?.sentAt && <span className="muted small">{formatDateTime(step.sentAt)}</span>}
      {step?.reason && <span className="muted small">{step.reason}</span>}
      {step?.lastError && <span className="small danger-text">{step.lastError}</span>}
    </div>
  );
}

export default function Messages() {
  const { integrations } = useAuth();
  const { items, loading, error, reload, setItems } = useCollection('/messages');
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('inbox');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const selectedId = params.get('id');
  const selected = items.find((m) => m.id === selectedId);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(TABS[tab].test).filter(
      (m) => !needle || [m.name, m.email, m.subject, m.message, m.conversationId, m.ai?.reply].join(' ').toLowerCase().includes(needle),
    );
  }, [items, tab, q]);

  const replace = (item) => setItems((xs) => xs.map((x) => (x.id === item.id ? item : x)));

  async function patch(m, body, note) {
    try {
      const { item } = await adminApi.patch(`/messages/${m.id}`, body);
      replace(item);
      if (note) toast.success(note);
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  // Opening a new message marks it as read.
  useEffect(() => {
    if (selected && (selected.status || 'new') === 'new') patch(selected, { status: 'read' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.status]);

  async function retry(m) {
    setBusy(true);
    try {
      const { item } = await adminApi.post(`/messages/${m.id}/retry`);
      replace(item);
      toast.success(failed(item) ? 'Retried — some steps still failed (see details)' : 'Retried successfully');
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(m) {
    const ok = await confirm({ title: 'Delete this inquiry?', message: 'The message, AI response and delivery history will be permanently removed.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await adminApi.del(`/messages/${m.id}`);
      setItems((xs) => xs.filter((x) => x.id !== m.id));
      setParams({});
      toast.success('Inquiry deleted');
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  const quoted = (m) => `\n\n---\nOn ${formatDateTime(m.createdAt)}, ${m.name} wrote:\n> ${m.message.replace(/\n/g, '\n> ')}`;
  const gmailHref = (m) =>
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email)}&su=${encodeURIComponent(`Re: ${m.subject}`)}&body=${encodeURIComponent(quoted(m))}`;
  const mailtoHref = (m) => `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}&body=${encodeURIComponent(quoted(m))}`;
  const unread = items.filter((m) => (m.status || 'new') === 'new').length;
  const attention = items.filter(needsAttention).length;

  return (
    <>
      <PageHeader
        title="Contact inquiries"
        description={`Every contact form message with its AI response and email delivery status${unread ? ` · ${unread} unread` : ''}${attention ? ` · ${attention} need attention` : ''}.`}
        actions={
          <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
            <Icon name="refresh" size={15} /> Refresh
          </button>
        }
      />
      {(integrations && (!integrations.ai || !integrations.visitorEmail)) && (
        <div className="a-card a-callout a-callout--warn">
          <Icon name="settings" size={20} />
          <div>
            <h3>Automatic replies are {integrations.ai && integrations.visitorEmail ? 'on' : 'limited'}</h3>
            <p className="muted">
              {!integrations.ai && 'AI drafting is off (ANTHROPIC_API_KEY not set). '}
              {!integrations.visitorEmail && 'Visitors receive no email until a Resend sending domain is verified. '}
              You still get every notification. See <code>docs/CONTACT_AUTOMATION.md</code>.
            </p>
          </div>
        </div>
      )}
      <div className="a-toolbar">
        <div className="filters">
          {Object.entries(TABS).map(([key, t]) => (
            <button key={key} type="button" className={`filter ${tab === key ? 'is-active' : ''}`} onClick={() => setTab(key)}>
              {t.label} <span className="muted">{items.filter(t.test).length}</span>
            </button>
          ))}
        </div>
        <input className="a-search" type="search" placeholder="Search name, email, text, ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inquiries" />
      </div>
      {loading && <Skeleton lines={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (
        <div className={`inbox ${selected ? 'has-selection' : ''}`}>
          <ul className="inbox__list">
            {list.length === 0 && (
              <li>
                <EmptyState icon="inbox" title={q ? 'No matches' : 'Nothing here'} />
              </li>
            )}
            {list.map((m) => (
              <li key={m.id}>
                <button type="button" className={`inbox__item ${m.id === selectedId ? 'is-active' : ''} ${(m.status || 'new') === 'new' ? 'is-unread' : ''}`} onClick={() => setParams({ id: m.id })}>
                  <span className="inbox__row">
                    <strong>{m.name}</strong>
                    <span className="muted small">{timeAgo(m.createdAt)}</span>
                  </span>
                  <span className="inbox__subject">{m.subject}</span>
                  <span className="inbox__preview muted small">{m.message}</span>
                  <span className="inbox__badges">
                    {m.starred && <Icon name="star" size={13} />}
                    {m.status === 'resolved' && <span className="chip">resolved</span>}
                    {m.ai?.decision === 'answer' && m.delivery?.visitor?.status === 'sent' && <span className="chip chip--ok">AI answered</span>}
                    {needsAttention(m) && <span className="chip chip--warn">{failed(m) ? 'delivery issue' : 'needs you'}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <section className="inbox__detail" aria-live="polite">
            {!selected ? (
              <p className="muted inbox__placeholder">Select an inquiry to read it.</p>
            ) : (
              <article>
                <button type="button" className="btn btn--text btn--sm inbox__back" onClick={() => setParams({})}>
                  <Icon name="arrowLeft" size={15} /> Back
                </button>
                <header className="inbox__head">
                  <div>
                    <h2>{selected.subject}</h2>
                    <p>
                      <strong>{selected.name}</strong> &lt;<a href={`mailto:${selected.email}`}>{selected.email}</a>&gt;
                    </p>
                    <p className="muted small">
                      {formatDateTime(selected.createdAt)}
                      {selected.projectType && ` · ${selected.projectType}`}
                      {selected.conversationId && <> · <span className="mono">ID {selected.conversationId}</span></>}
                    </p>
                  </div>
                  <StatusBadge state={selected.status || 'new'} />
                </header>

                <h3 className="inbox__section">Original message</h3>
                <div className="inbox__body">{selected.message}</div>

                <h3 className="inbox__section">AI response</h3>
                {selected.ai?.status === 'done' && selected.ai.reply ? (
                  <>
                    <div className="inbox__body inbox__body--ai">{selected.ai.reply}</div>
                    <p className="muted small">
                      {selected.ai.decision === 'answer' ? 'Fully answered from verified facts' : 'Model flagged this for your personal reply'}
                      {selected.ai.category && ` · ${selected.ai.category.replace(/_/g, ' ')}`}
                      {selected.ai.model && ` · ${selected.ai.model}`}
                      {selected.ai.reason && ` · “${selected.ai.reason}”`}
                    </p>
                    {selected.ai.problems?.length > 0 && <p className="form-alert">Blocked by safety check: {selected.ai.problems.join('; ')} — the visitor got the acknowledgement template instead.</p>}
                  </>
                ) : (
                  <p className="muted">
                    {selected.ai?.status === 'failed' ? `Generation failed: ${selected.ai.error}` : selected.ai?.status === 'pending' ? 'Being generated…' : `Not generated: ${selected.ai?.error || 'AI disabled'}`}
                  </p>
                )}

                <h3 className="inbox__section">Email delivery</h3>
                <div className="delivery-grid">
                  <DeliveryPill label="Reply to visitor" step={selected.delivery?.visitor} />
                  <DeliveryPill label="Notification to you" step={selected.delivery?.owner} />
                </div>
                {selected.errors?.length > 0 && (
                  <details className="inbox__errors">
                    <summary>Error log ({selected.errors.length})</summary>
                    <ul>
                      {selected.errors.map((e, i) => (
                        <li key={i} className="small">
                          <span className="mono">{formatDateTime(e.at)}</span> · {e.stage} · {e.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="inbox__actions">
                  <a className="btn btn--primary btn--sm" href={gmailHref(selected)} target="_blank" rel="noopener noreferrer" onClick={() => patch(selected, { status: 'replied' })}>
                    <Icon name="mail" size={15} /> Reply in Gmail
                  </a>
                  <a className="btn btn--ghost btn--sm" href={mailtoHref(selected)} onClick={() => patch(selected, { status: 'replied' })}>
                    Email app
                  </a>
                  {selected.ai?.reply && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard.writeText(selected.ai.reply).then(() => toast.success('AI response copied'), () => toast.error('Copy failed'))}>
                      <Icon name="copy" size={15} /> Copy AI response
                    </button>
                  )}
                  {selected.status !== 'resolved' ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => patch(selected, { status: 'resolved' }, 'Marked as resolved')}>
                      <Icon name="check" size={15} /> Resolve
                    </button>
                  ) : (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => patch(selected, { status: 'read' }, 'Reopened')}>
                      Reopen
                    </button>
                  )}
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => patch(selected, { status: 'new' }, 'Marked as unread')}>
                    Mark unread
                  </button>
                  {failed(selected) && (
                    <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => retry(selected)}>
                      <Icon name="refresh" size={15} /> {busy ? 'Retrying…' : 'Retry failed steps'}
                    </button>
                  )}
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => patch(selected, { starred: !selected.starred })}>
                    <Icon name="star" size={15} /> {selected.starred ? 'Unstar' : 'Star'}
                  </button>
                  {selected.status !== 'archived' ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => patch(selected, { status: 'archived' }, 'Archived')}>
                      Archive
                    </button>
                  ) : null}
                  {selected.status !== 'spam' ? (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => patch(selected, { status: 'spam' }, 'Marked as spam')}>
                      Spam
                    </button>
                  ) : (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => patch(selected, { status: 'read' }, 'Not spam')}>
                      Not spam
                    </button>
                  )}
                  <button type="button" className="btn btn--text btn--sm danger-text" onClick={() => remove(selected)}>
                    <Icon name="trash" size={15} /> Delete
                  </button>
                </div>
              </article>
            )}
          </section>
        </div>
      )}
    </>
  );
}
