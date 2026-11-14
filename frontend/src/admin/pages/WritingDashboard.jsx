import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { PageHeader, StatusBadge, useConfirm, useToast } from '../components/Feedback.jsx';
import { strip } from '../components/ContentList.jsx';
import { useCollection } from '../lib/useCollection.js';
import { useAuth } from '../AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { adminApi, describeError } from '../../lib/api.js';
import { ADMIN_PATH } from '../../lib/config.js';
import { cdn, formatDate, formatDateTime, publishState } from '../../lib/format.js';

const W = `${ADMIN_PATH}/writing`;
const n = (v) => (v ?? 0).toLocaleString('en-GB');

function Tile({ icon, label, value, sub }) {
  return (
    <div className="a-stat">
      <span className="a-stat__icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="a-stat__value">{value ?? '—'}</span>
      <span className="a-stat__label">{label}</span>
      {sub && <span className="a-stat__sub muted small">{sub}</span>}
    </div>
  );
}

/** Single-series daily views: one accent hue, bars from the baseline, hover/focus tooltip, table view. */
function ViewsChart({ daily = [] }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...daily.map((d) => d.views));
  const total = daily.reduce((s, d) => s + d.views, 0);
  const label = (d) => `${formatDate(d.date, { day: 'numeric', month: 'short' })}: ${d.views} view${d.views === 1 ? '' : 's'}`;

  return (
    <div className="wa-chart">
      <div className="wa-chart__head">
        <div>
          <p className="wa-chart__value">{n(total)}</p>
          <p className="muted small">views in the last {daily.length} days</p>
        </div>
        <button type="button" className="btn btn--text btn--sm" onClick={() => setTable((t) => !t)} aria-pressed={table}>
          <Icon name={table ? 'activity' : 'grid'} size={14} /> {table ? 'Chart view' : 'Table view'}
        </button>
      </div>
      {table ? (
        <div className="a-table-wrap wa-chart__table">
          <table className="a-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.date}>
                  <td>{formatDate(d.date)}</td>
                  <td>{d.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="wa-chart__plot" role="img" aria-label={`Daily article views, last ${daily.length} days, ${total} in total`} onMouseLeave={() => setHover(null)}>
          <span className="wa-chart__max mono">{max}</span>
          <div className="wa-chart__bars">
            {daily.map((d, i) => (
              <button
                key={d.date}
                type="button"
                className={`wa-bar ${hover === i ? 'is-hover' : ''}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={label(d)}
              >
                <span style={{ height: `${d.views ? Math.max(4, (d.views / max) * 100) : 0}%` }} />
              </button>
            ))}
          </div>
          {hover !== null && daily[hover] && (
            <div className="wa-tip" style={{ left: `${((hover + 0.5) / daily.length) * 100}%` }} role="status">
              <strong>{daily[hover].views}</strong> view{daily[hover].views === 1 ? '' : 's'}
              <span className="muted">{formatDate(daily[hover].date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          )}
          <div className="wa-chart__axis mono">
            <span>{daily[0] && formatDate(daily[0].date, { day: 'numeric', month: 'short' })}</span>
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleRank({ items, empty, metric }) {
  if (!items?.length) return <p className="muted small">{empty}</p>;
  return (
    <ol className="wa-rank">
      {items.map((a) => (
        <li key={a.id}>
          <Link to={`${W}/${a.id}`}>{a.title}</Link>
          <span className="mono small">
            {metric === 'recent' ? `${n(a.recentViews)} in 30d · ${n(a.views)} total` : `${n(a.views)} views`}
          </span>
        </li>
      ))}
    </ol>
  );
}

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return ['email,subscribed_at,source', ...rows.map((r) => [r.email, r.createdAt, r.source].map(esc).join(','))].join('\n');
}

function Subscribers() {
  const { items, loading, error, reload, setItems } = useCollection('/newsletter');
  const toast = useToast();
  const confirm = useConfirm();
  const { integrations } = useAuth();

  async function remove(s) {
    const ok = await confirm({ title: `Remove ${s.email}?`, message: 'They will no longer be on the subscriber list.', confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    try {
      await adminApi.del(`/newsletter/${s.id}`);
      setItems((xs) => xs.filter((x) => x.id !== s.id));
      toast.success('Subscriber removed');
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(items)], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="a-card">
      <header className="a-card__head">
        <h2>Newsletter subscribers</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={exportCsv} disabled={!items.length}>
          <Icon name="download" size={14} /> Export CSV
        </button>
      </header>
      {!integrations?.mail && (
        <p className="wa-note small">
          <Icon name="mail" size={14} /> Sign-ups are stored securely, but automatic newsletter emails are not set up yet — that needs a verified sending domain in Resend. Until then, export the list to email subscribers yourself.
        </p>
      )}
      {integrations?.mail && (
        <p className="wa-note small">
          <Icon name="mail" size={14} /> Sign-ups are stored here. Sending newsletters to them is not automated yet — export the list to email subscribers.
        </p>
      )}
      {loading && <Skeleton lines={3} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && items.length === 0 && <p className="muted">No subscribers yet. The sign-up form is on the Writing page.</p>}
      {!loading && !error && items.length > 0 && (
        <ul className="a-list">
          {items.map((s) => (
            <li key={s.id}>
              <span>
                <strong>{s.email}</strong> <span className="muted small">· {s.source || 'writing'}</span>
              </span>
              <span className="a-list__meta">
                {formatDateTime(s.createdAt)}
                <button type="button" className="icon-btn" onClick={() => remove(s)} aria-label={`Remove ${s.email}`}>
                  <Icon name="trash" size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function WritingDashboard() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const stats = useApi(() => adminApi.get('/writing/stats'), []);
  const { items, loading, error, reload, setItems } = useCollection('/posts');
  const [tab, setTab] = useState('all');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);

  const counts = useMemo(() => {
    const c = { all: items.length, published: 0, draft: 0, scheduled: 0 };
    items.forEach((i) => (c[publishState(i)] += 1));
    return c;
  }, [items]);
  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items]);
  const list = items.filter(
    (i) =>
      (tab === 'all' || publishState(i) === tab) &&
      (!cat || i.category === cat) &&
      (!q || `${i.title} ${i.category} ${(i.tags || []).join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  );

  const refreshStats = () => stats.reload();
  const replace = (saved) => setItems((xs) => xs.map((x) => (x.id === saved.id ? saved : x)));

  async function act(item, label, fn) {
    setBusy(item.id);
    try {
      await fn();
      toast.success(label);
      refreshStats();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  const togglePublish = (item) =>
    act(item, item.status === 'published' ? 'Unpublished — now a draft' : 'Published', async () => {
      const { item: saved } = await adminApi.put(`/posts/${item.id}`, { ...strip(item), status: item.status === 'published' ? 'draft' : 'published' });
      replace(saved);
    });

  const toggleFeatured = (item) =>
    act(item, item.featured ? 'Removed from featured' : 'Marked as featured', async () => {
      const { item: saved } = await adminApi.put(`/posts/${item.id}`, { ...strip(item), featured: !item.featured });
      replace(saved);
    });

  const duplicate = (item) =>
    act(item, 'Duplicated as a draft', async () => {
      const { views, ...rest } = strip(item);
      const { item: saved } = await adminApi.post('/posts', { ...rest, title: `${item.title} (copy)`.slice(0, 200), slug: '', status: 'draft', featured: false, publishedAt: null });
      navigate(`${W}/${saved.id}`);
    });

  async function remove(item) {
    const ok = await confirm({ title: `Delete “${item.title}”?`, message: 'This permanently deletes the article and its view count. Uploaded images stay in the media library.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    act(item, 'Article deleted', async () => {
      await adminApi.del(`/posts/${item.id}`);
      setItems((xs) => xs.filter((x) => x.id !== item.id));
    });
  }

  const s = stats.data;
  return (
    <div className="wa">
      <PageHeader
        title="Writing"
        description="Your developer blog: write, schedule and publish articles, and see how they’re read. Drafts and scheduled articles are never visible to visitors."
        actions={
          <>
            <a href="/writing" target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
              <Icon name="external" size={15} /> View Writing page
            </a>
            <Link to={`${W}/new`} className="btn btn--primary btn--sm">
              <Icon name="plus" size={15} /> New article
            </Link>
          </>
        }
      />

      {/* Overview */}
      {stats.error && <ErrorState title="Could not load writing stats" error={stats.error} onRetry={stats.reload} />}
      <div className="a-stats wa-stats">
        <Tile icon="book" label="Total articles" value={s ? n(s.counts.total) : null} />
        <Tile icon="globe" label="Published" value={s ? n(s.counts.published) : null} sub={s?.counts.scheduled ? `${s.counts.scheduled} scheduled` : null} />
        <Tile icon="edit" label="Drafts" value={s ? n(s.counts.draft) : null} />
        <Tile icon="star" label="Featured" value={s ? n(s.counts.featured) : null} />
        <Tile icon="eye" label="Total article views" value={s ? n(s.views) : null} sub="Page views, de-duplicated per visitor every 6 h" />
        <Tile icon="mail" label="Newsletter subscribers" value={s ? n(s.subscribers) : null} />
      </div>

      {/* Analytics */}
      <div className="wa-analytics">
        <section className="a-card wa-analytics__chart">
          <header className="a-card__head">
            <h2>Article views</h2>
          </header>
          {s ? <ViewsChart daily={s.daily} /> : !stats.error && <Skeleton lines={4} />}
        </section>
        <section className="a-card">
          <header className="a-card__head">
            <h2>Most viewed</h2>
          </header>
          {s ? <ArticleRank items={s.topArticles} empty="Views appear here once published articles are read." /> : <Skeleton lines={3} />}
        </section>
        <section className="a-card">
          <header className="a-card__head">
            <h2>Recent articles</h2>
          </header>
          {s ? <ArticleRank items={s.recent} metric="recent" empty="Nothing published yet." /> : <Skeleton lines={3} />}
        </section>
      </div>

      {/* Article management */}
      <section className="wa-manage">
        <div className="a-toolbar">
          <div className="filters">
            {['all', 'published', 'scheduled', 'draft'].map((t) => (
              <button key={t} type="button" className={`filter ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)} aria-pressed={tab === t}>
                {t === 'draft' ? 'Drafts' : t[0].toUpperCase() + t.slice(1)} <span className="muted">{counts[t]}</span>
              </button>
            ))}
          </div>
          <div className="wa-toolbar__right">
            <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input className="a-search" type="search" placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search articles" />
          </div>
        </div>

        {loading && <Skeleton lines={5} />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {!loading && !error && items.length === 0 && (
          <EmptyState icon="plus" title="No articles yet" action={<Link to={`${W}/new`} className="btn btn--primary btn--sm">Write your first article</Link>}>
            Articles you create appear here. Save as a draft until you’re ready to publish.
          </EmptyState>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="a-table-wrap">
            <table className="a-table wa-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Status</th>
                  <th className="hide-sm">Category</th>
                  <th className="hide-sm">Views</th>
                  <th className="hide-sm">Updated</th>
                  <th>Featured</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const state = publishState(i);
                  return (
                    <tr key={i.id} className={busy === i.id ? 'is-busy' : ''}>
                      <td>
                        <Link to={`${W}/${i.id}`} className="a-table__title">
                          {i.coverImage?.url ? <img src={cdn(i.coverImage.url, { w: 96, h: 64 })} alt="" /> : <span className="a-table__thumb" />}
                          <span>
                            <strong>{i.title}</strong>
                            <span className="muted small mono">/writing/{i.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <StatusBadge state={state} />
                        {state === 'scheduled' && <span className="muted small d-block">{formatDateTime(i.publishedAt)}</span>}
                      </td>
                      <td className="hide-sm">{i.category || <span className="muted">—</span>}</td>
                      <td className="hide-sm mono">{n(i.views)}</td>
                      <td className="hide-sm muted small">{formatDateTime(i.updatedAt)}</td>
                      <td>
                        <button type="button" className={`star-btn ${i.featured ? 'is-on' : ''}`} onClick={() => toggleFeatured(i)} disabled={busy === i.id} aria-pressed={Boolean(i.featured)} aria-label={i.featured ? 'Unfeature' : 'Feature'}>
                          <Icon name="star" size={16} />
                        </button>
                      </td>
                      <td className="a-table__actions">
                        {state === 'published' && (
                          <a className="icon-btn" href={`/writing/${i.slug}`} target="_blank" rel="noopener noreferrer" aria-label="View live" title="View live">
                            <Icon name="eye" size={15} />
                          </a>
                        )}
                        <Link className="icon-btn" to={`${W}/${i.id}`} aria-label="Edit" title="Edit">
                          <Icon name="edit" size={15} />
                        </Link>
                        <button type="button" className="icon-btn" onClick={() => togglePublish(i)} disabled={busy === i.id} aria-label={i.status === 'published' ? 'Unpublish' : 'Publish now'} title={i.status === 'published' ? 'Unpublish' : 'Publish now'}>
                          <Icon name={i.status === 'published' ? 'close' : 'upload'} size={15} />
                        </button>
                        <button type="button" className="icon-btn" onClick={() => duplicate(i)} disabled={busy === i.id} aria-label="Duplicate" title="Duplicate">
                          <Icon name="copy" size={15} />
                        </button>
                        <button type="button" className="icon-btn" onClick={() => remove(i)} disabled={busy === i.id} aria-label="Delete" title="Delete">
                          <Icon name="trash" size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      Nothing matches these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {can('messages') && <Subscribers />}
    </div>
  );
}
