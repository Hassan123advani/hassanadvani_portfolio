import { useState } from 'react';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { PageHeader } from '../components/Feedback.jsx';
import { useCollection } from '../lib/useCollection.js';
import { formatDateTime } from '../../lib/format.js';

const VERBS = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  publish: 'published',
  unpublish: 'unpublished',
  upload: 'uploaded',
  deactivate: 'deactivated',
  activate: 'activated',
  role: 'changed the role of',
  password_reset: 'sent a password reset to',
  import: 'imported',
  read: 'read',
  replied: 'replied to',
  archived: 'archived',
  spam: 'marked as spam',
  new: 'marked as unread',
  resolved: 'resolved',
  retry: 'retried delivery of',
  password_change: 'changed the password of',
};
const NOUNS = { posts: 'article', projects: 'project', certificates: 'certificate', testimonials: 'testimonial', categories: 'category', tags: 'tag', media: 'file', messages: 'message', admins: 'admin', settings: 'settings', content: 'content' };

export function describeAction(a) {
  const parts = a.action.split('.');
  const verb = VERBS[parts.at(-1)] || parts.at(-1);
  const noun = NOUNS[parts[0]] || parts[0];
  return `${verb} ${noun === 'settings' ? `${parts[1]} settings` : noun}${a.targetLabel && noun !== 'settings' ? ` “${a.targetLabel}”` : ''}`;
}

export default function Activity() {
  const { items, loading, error, reload } = useCollection('/activity?limit=300');
  const [actor, setActor] = useState('');
  const [q, setQ] = useState('');
  const actors = [...new Map(items.map((a) => [a.actorUid, a.actorName || a.actorEmail])).entries()];
  const list = items.filter((a) => (!actor || a.actorUid === actor) && (!q || `${a.action} ${a.targetLabel}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title="Activity log" description="Every change made in the admin panel, newest first." />
      <div className="a-toolbar">
        <select value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Filter by administrator">
          <option value="">All administrators</option>
          {actors.map(([uid, name]) => (
            <option key={uid} value={uid}>
              {name}
            </option>
          ))}
        </select>
        <input className="a-search" type="search" placeholder="Search actions…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activity" />
      </div>
      {loading && <Skeleton lines={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="muted small nowrap">{formatDateTime(a.createdAt)}</td>
                  <td>{a.actorName || a.actorEmail || 'System'}</td>
                  <td>
                    {describeAction(a)} <span className="muted small mono">{a.action}</span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
