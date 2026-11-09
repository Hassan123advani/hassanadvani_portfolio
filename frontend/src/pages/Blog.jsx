import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import { CardSkeletons, EmptyState, ErrorState } from '../components/ui/States.jsx';
import PostCard from '../components/content/PostCard.jsx';
import { useApi } from '../hooks/useApi.js';
import { loaders } from '../content/data.js';
import { useSite } from '../context/SiteContext.jsx';
import { slugify } from '../lib/format.js';

export default function Blog() {
  const { site } = useSite();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const tag = params.get('tag') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  const { data, loading, error, reload } = useApi(
    () => loaders.posts({ q, category, tag, page, limit: site.postsPerPage || 9 }),
    [q, category, tag, page, site.postsPerPage],
  );

  const update = (next) => {
    const merged = { q, category, tag, page: 1, ...next };
    const clean = Object.fromEntries(Object.entries(merged).filter(([k, v]) => v && !(k === 'page' && v === 1)));
    setParams(clean);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = Boolean(q || category || tag);
  const showFeatured = !filtered && page === 1 && data?.featured?.length > 0;
  const featuredIds = new Set(showFeatured ? data.featured.map((p) => p.id) : []);
  const items = (data?.items || []).filter((p) => !featuredIds.has(p.id));

  return (
    <>
      <Seo title="Writing" description="Articles and notes on learning computer science and building for the web." />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Writing</p>
          <h1 className="page-title">
            Notes from <em>the build.</em>
          </h1>
          <p className="page-lead">What I’m learning, building and figuring out along the way.</p>

          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: search.trim() });
            }}
          >
            <Icon name="search" size={18} />
            <label htmlFor="blog-search" className="sr-only">
              Search articles
            </label>
            <input id="blog-search" type="search" placeholder="Search articles…" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} />
            <button type="submit" className="btn btn--primary btn--sm">
              Search
            </button>
          </form>

          {data?.categories?.length > 0 && (
            <div className="filters" role="toolbar" aria-label="Filter by category">
              <button type="button" className={`filter ${!category ? 'is-active' : ''}`} aria-pressed={!category} onClick={() => update({ category: '' })}>
                All
              </button>
              {data.categories.map((c) => (
                <button key={c} type="button" className={`filter ${slugify(category) === slugify(c) ? 'is-active' : ''}`} aria-pressed={slugify(category) === slugify(c)} onClick={() => update({ category: c })}>
                  {c}
                </button>
              ))}
            </div>
          )}
          {filtered && (
            <p className="active-filters">
              {data ? `${data.total} result${data.total === 1 ? '' : 's'}` : 'Searching'}
              {q && ` for “${q}”`}
              {tag && <> tagged <span className="chip">#{tag}</span></>}
              <button type="button" className="btn btn--text btn--sm" onClick={() => setParams({})}>
                Clear filters
              </button>
            </p>
          )}
        </div>
      </section>

      <section className="section section--flush">
        <div className="container">
          {loading && <CardSkeletons count={3} className="posts-grid" />}
          {error && (
            <ErrorState
              title={error.offline ? 'Articles are unavailable right now' : 'Could not load articles'}
              error={error.offline ? { message: 'The blog service is not reachable. Please check back soon.' } : error}
              onRetry={reload}
            />
          )}
          {!loading && !error && data.total === 0 && !filtered && (
            <EmptyState icon="book" title="The first article is being written" action={<Link to="/projects" className="btn btn--ghost btn--sm">Explore projects instead</Link>}>
              I’m preparing notes on what I’m learning and building. Published articles will appear here.
            </EmptyState>
          )}
          {!loading && !error && data.total === 0 && filtered && (
            <EmptyState icon="search" title="No matching articles" action={<button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams({})}>Clear filters</button>}>
              Try a different search term or category.
            </EmptyState>
          )}

          {!loading && !error && showFeatured && (
            <div className="featured-posts">
              {data.featured.slice(0, 1).map((p) => (
                <PostCard key={p.id} post={p} featured />
              ))}
            </div>
          )}
          {!loading && !error && items.length > 0 && (
            <div className="posts-grid">
              {items.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} />
              ))}
            </div>
          )}

          {!loading && !error && data.tags?.length > 0 && (
            <div className="tag-cloud">
              <span className="mono muted small">Browse by tag</span>
              {data.tags.map((t) => (
                <button key={t} type="button" className={`chip chip--btn ${slugify(tag) === slugify(t) ? 'is-active' : ''}`} onClick={() => update({ tag: slugify(tag) === slugify(t) ? '' : t })}>
                  #{t}
                </button>
              ))}
            </div>
          )}

          {!loading && !error && data.pages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                <Icon name="arrowLeft" size={15} /> Newer
              </button>
              <span className="mono">
                Page {page} of {data.pages}
              </span>
              <button type="button" className="btn btn--ghost btn--sm" disabled={page >= data.pages} onClick={() => update({ page: page + 1 })}>
                Older <Icon name="arrowRight" size={15} />
              </button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
