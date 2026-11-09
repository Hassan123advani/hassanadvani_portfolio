import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { PageHeader, StatusBadge, useConfirm, useToast } from '../components/Feedback.jsx';
import { useAuth } from '../AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { adminApi, describeError } from '../../lib/api.js';
import { ADMIN_PATH } from '../../lib/config.js';
import { timeAgo } from '../../lib/format.js';
import { portfolio } from '../../content/data.js';
import { describeAction } from './Activity.jsx';

function Stat({ label, value, sub, to, icon }) {
  const body = (
    <>
      <span className="a-stat__icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="a-stat__value">{value ?? '—'}</span>
      <span className="a-stat__label">{label}</span>
      {sub && <span className="a-stat__sub muted small">{sub}</span>}
    </>
  );
  return to ? (
    <Link to={to} className="a-stat">
      {body}
    </Link>
  ) : (
    <div className="a-stat">{body}</div>
  );
}

function StarterImport({ onDone }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  async function run() {
    const ok = await confirm({
      title: 'Import starter content?',
      message: 'This copies your profile, settings, 3 projects and 9 certificates from the original site into Firestore. Sections that already have content are skipped — nothing is overwritten.',
      confirmLabel: 'Import',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await adminApi.post('/import-starter', portfolio);
      toast.success(`Imported: ${r.created.join(', ') || 'nothing new'}`);
      onDone();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="a-card a-callout">
      <Icon name="sparkle" size={20} />
      <div>
        <h3>Your CMS is empty</h3>
        <p className="muted">Import the real content from your original portfolio (profile, education, skills, projects and certificates) so you can manage it here.</p>
      </div>
      <button type="button" className="btn btn--primary btn--sm" onClick={run} disabled={busy}>
        {busy ? 'Importing…' : 'Import starter content'}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { admin, can, isSuper, integrations } = useAuth();
  const { data, loading, error, reload } = useApi(() => adminApi.get('/stats'), []);
  const p = (path) => `${ADMIN_PATH}/${path}`;

  return (
    <>
      <PageHeader
        title={`Welcome back${admin.displayName ? `, ${admin.displayName.split(' ')[0]}` : ''}`}
        description="Here’s what’s happening on your portfolio."
        actions={
          <>
            {can('blog') && (
              <Link to={p('posts/new')} className="btn btn--primary btn--sm">
                <Icon name="plus" size={15} /> New article
              </Link>
            )}
            {can('projects') && (
              <Link to={p('projects/new')} className="btn btn--ghost btn--sm">
                <Icon name="plus" size={15} /> New project
              </Link>
            )}
          </>
        }
      />

      {(!integrations?.cloudinary || !integrations?.mail) && (
        <div className="a-card a-callout a-callout--warn">
          <Icon name="settings" size={20} />
          <div>
            <h3>Some integrations need credentials</h3>
            <p className="muted">
              {!integrations?.cloudinary && 'Cloudinary (media uploads) is not configured. '}
              {!integrations?.mail && 'Email notifications (Resend) are not configured — messages are still saved to your inbox here.'} See <code>docs/DEVELOPMENT_STATUS.md</code>.
            </p>
          </div>
        </div>
      )}

      {loading && <Skeleton lines={4} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          {isSuper && data.projects.total === 0 && data.certificates.total === 0 && <StarterImport onDone={reload} />}
          <div className="a-stats">
            {can('blog') && <Stat icon="book" label="Articles" value={data.posts.total} sub={`${data.posts.published} live · ${data.posts.draft} drafts · ${data.posts.scheduled} scheduled`} to={p('posts')} />}
            {can('projects') && <Stat icon="code" label="Projects" value={data.projects.total} sub={`${data.projects.published} live · ${data.projects.draft} drafts`} to={p('projects')} />}
            {can('messages') && <Stat icon="inbox" label="Unread messages" value={data.messages.unread} sub={`${data.messages.total} total`} to={p('messages')} />}
            {can('media') && <Stat icon="image" label="Media files" value={data.media.total} to={p('media')} />}
            {can('certificates') && <Stat icon="award" label="Certificates" value={data.certificates.total} to={p('certificates')} />}
            {isSuper && <Stat icon="users" label="Administrators" value={data.admins} to={p('admins')} />}
          </div>

          <div className="a-grid-2">
            {can('messages') && (
              <section className="a-card">
                <header className="a-card__head">
                  <h2>Latest messages</h2>
                  <Link to={p('messages')} className="link-arrow small">
                    Inbox <Icon name="arrowRight" size={14} />
                  </Link>
                </header>
                {data.recentMessages.length === 0 ? (
                  <p className="muted">No messages yet.</p>
                ) : (
                  <ul className="a-list">
                    {data.recentMessages.map((m) => (
                      <li key={m.id}>
                        <Link to={`${p('messages')}?id=${m.id}`}>
                          <strong>{m.name}</strong> <span className="muted">— {m.subject}</span>
                        </Link>
                        <span className="a-list__meta">
                          <StatusBadge state={m.status || 'new'} /> {timeAgo(m.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {can('activity') && (
              <section className="a-card">
                <header className="a-card__head">
                  <h2>Recent activity</h2>
                  <Link to={p('activity')} className="link-arrow small">
                    Full log <Icon name="arrowRight" size={14} />
                  </Link>
                </header>
                {data.recentActivity.length === 0 ? (
                  <p className="muted">Nothing yet.</p>
                ) : (
                  <ul className="a-list">
                    {data.recentActivity.map((a) => (
                      <li key={a.id}>
                        <span>
                          <strong>{a.actorName || a.actorEmail}</strong> {describeAction(a)}
                        </span>
                        <span className="a-list__meta">{timeAgo(a.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}
