import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { PageHeader, StatusBadge, useConfirm, useToast } from './Feedback.jsx';
import { useCollection } from '../lib/useCollection.js';
import { adminApi, describeError } from '../../lib/api.js';
import { ADMIN_PATH } from '../../lib/config.js';
import { cdn, formatDateTime, publishState } from '../../lib/format.js';

/** Shared list view for posts and projects. */
export default function ContentList({ endpoint, route, publicBase, title, description, noun, emptyHint }) {
  const { items, loading, error, reload, setItems } = useCollection(endpoint);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  const counts = useMemo(() => {
    const c = { all: items.length, published: 0, draft: 0, scheduled: 0 };
    items.forEach((i) => (c[publishState(i)] += 1));
    return c;
  }, [items]);

  const list = items.filter((i) => (tab === 'all' || publishState(i) === tab) && (!q || `${i.title} ${i.category}`.toLowerCase().includes(q.toLowerCase())));

  async function remove(item) {
    const ok = await confirm({ title: `Delete “${item.title}”?`, message: `This permanently deletes the ${noun}. Uploaded images stay in the media library.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await adminApi.del(`${endpoint}/${item.id}`);
      setItems((xs) => xs.filter((x) => x.id !== item.id));
      toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`);
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function toggleFeatured(item) {
    try {
      const { item: saved } = await adminApi.put(`${endpoint}/${item.id}`, { ...strip(item), featured: !item.featured });
      setItems((xs) => xs.map((x) => (x.id === item.id ? saved : x)));
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link to={`${ADMIN_PATH}/${route}/new`} className="btn btn--primary btn--sm">
            <Icon name="plus" size={15} /> New {noun}
          </Link>
        }
      />
      <div className="a-toolbar">
        <div className="filters">
          {['all', 'published', 'scheduled', 'draft'].map((t) => (
            <button key={t} type="button" className={`filter ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)} <span className="muted">{counts[t]}</span>
            </button>
          ))}
        </div>
        <input className="a-search" type="search" placeholder={`Search ${noun}s…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${noun}s`} />
      </div>

      {loading && <Skeleton lines={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState icon="plus" title={`No ${noun}s yet`} action={<Link to={`${ADMIN_PATH}/${route}/new`} className="btn btn--primary btn--sm">Create your first {noun}</Link>}>
          {emptyHint}
        </EmptyState>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th className="hide-sm">Category</th>
                <th className="hide-sm">Updated</th>
                <th>Featured</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => {
                const state = publishState(i);
                const cover = i.coverImage?.url || i.images?.[0]?.url;
                return (
                  <tr key={i.id}>
                    <td>
                      <Link to={`${ADMIN_PATH}/${route}/${i.id}`} className="a-table__title">
                        {cover ? <img src={cdn(cover, { w: 96, h: 64 })} alt="" /> : <span className="a-table__thumb" />}
                        <span>
                          <strong>{i.title}</strong>
                          <span className="muted small mono">/{publicBase}/{i.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <StatusBadge state={state} />
                      {state === 'scheduled' && <span className="muted small d-block">{formatDateTime(i.publishedAt)}</span>}
                    </td>
                    <td className="hide-sm">{i.category || <span className="muted">—</span>}</td>
                    <td className="hide-sm muted small">{formatDateTime(i.updatedAt)}</td>
                    <td>
                      <button type="button" className={`star-btn ${i.featured ? 'is-on' : ''}`} onClick={() => toggleFeatured(i)} aria-pressed={Boolean(i.featured)} aria-label={i.featured ? 'Unfeature' : 'Feature'}>
                        <Icon name="star" size={16} />
                      </button>
                    </td>
                    <td className="a-table__actions">
                      {state === 'published' && (
                        <a className="icon-btn" href={`/${publicBase}/${i.slug}`} target="_blank" rel="noopener noreferrer" aria-label="View live">
                          <Icon name="eye" size={15} />
                        </a>
                      )}
                      <Link className="icon-btn" to={`${ADMIN_PATH}/${route}/${i.id}`} aria-label="Edit">
                        <Icon name="edit" size={15} />
                      </Link>
                      <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label="Delete">
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Nothing matches this filter.
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

/** Remove server-managed fields before sending an item back to the API. */
export function strip(item) {
  const { id, createdAt, updatedAt, createdBy, updatedBy, readingTime, ...rest } = item;
  return rest;
}
