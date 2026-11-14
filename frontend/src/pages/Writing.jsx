import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';
import ArticleCard, { ArticleCover } from '../components/content/ArticleCard.jsx';
import Newsletter from '../components/content/Newsletter.jsx';
import { loaders } from '../content/data.js';
import { useSite } from '../context/SiteContext.jsx';
import { formatDate, slugify } from '../lib/format.js';
import { articlePath, mergeCategories } from '../lib/writing.js';
import '../styles/writing.css';

const PAGE_SIZE = 9;

function CardSkeleton() {
  return (
    <div className="w-card w-card--skeleton" aria-hidden="true">
      <div className="w-card__media w-shimmer" />
      <div className="w-card__body">
        <span className="w-shimmer w-line w-line--sm" />
        <span className="w-shimmer w-line w-line--lg" />
        <span className="w-shimmer w-line" />
        <span className="w-shimmer w-line w-line--md" />
      </div>
    </div>
  );
}

function Featured({ post }) {
  const { profile } = useSite();
  return (
    <Reveal as="article" className="w-featured">
      <Link to={articlePath(post.slug)} className="w-featured__media" tabIndex={-1} aria-hidden="true">
        <ArticleCover post={post} w={1200} h={760} eager />
      </Link>
      <div className="w-featured__body">
        <p className="w-featured__top">
          <span className="w-badge w-badge--accent">
            <Icon name="star" size={13} /> Featured
          </span>
          {post.category && <span className="w-badge">{post.category}</span>}
        </p>
        <h2 className="w-featured__title">
          <Link to={articlePath(post.slug)}>{post.title}</Link>
        </h2>
        {(post.subtitle || post.excerpt) && <p className="w-featured__excerpt">{post.subtitle || post.excerpt}</p>}
        <div className="w-featured__foot">
          <div className="w-author">
            {profile.avatar?.url ? <img src={profile.avatar.url} alt="" width="40" height="40" /> : <span className="w-author__dot" />}
            <span>
              <strong>{post.author || profile.name}</strong>
              <span className="w-meta">
                <span>
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                </span>
                <span>{post.readingTime || 1} min read</span>
              </span>
            </span>
          </div>
          <Link to={articlePath(post.slug)} className="btn btn--primary">
            Read article <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

function FeaturedFallback() {
  return (
    <div className="w-featured w-featured--empty">
      <div className="w-featured__media" aria-hidden="true">
        <div className="w-cover-fallback w-cover-fallback--lg">
          <span className="w-cover-fallback__glyph">/* */</span>
          <span className="w-cover-fallback__label">In the works</span>
        </div>
      </div>
      <div className="w-featured__body">
        <p className="w-featured__top">
          <span className="w-badge w-badge--accent">
            <Icon name="star" size={13} /> Featured
          </span>
        </p>
        <h2 className="w-featured__title">The featured story is still being written.</h2>
        <p className="w-featured__excerpt">I’m drafting notes from the projects I’m building and the things I’m learning in computer science. The best one will live right here.</p>
        <div className="w-featured__foot">
          <Link to="/projects" className="btn btn--ghost">
            See what I’m building <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Writing() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const tag = params.get('tag') || '';
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  const [state, setState] = useState({ status: 'loading', items: [], page: 0, pages: 1, total: 0, meta: null, error: null, more: false });
  const req = useRef(0);

  const load = useCallback(
    async (page) => {
      const id = ++req.current;
      setState((s) => (page === 1 ? { ...s, status: 'loading', error: null } : { ...s, more: true }));
      try {
        const res = await loaders.posts({ q, category, tag, page, limit: PAGE_SIZE });
        if (id !== req.current) return;
        setState((s) => ({
          status: 'ready',
          items: page === 1 ? res.items : [...s.items, ...res.items.filter((x) => !s.items.some((y) => y.id === x.id))],
          page,
          pages: res.pages,
          total: res.total,
          meta: { categories: res.categories || [], tags: res.tags || [], featured: res.featured || [] },
          error: null,
          more: false,
        }));
      } catch (err) {
        if (id !== req.current) return;
        setState((s) => (page === 1 ? { ...s, status: 'error', error: err, more: false } : { ...s, more: false, moreError: err }));
      }
    },
    [q, category, tag],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const update = (next) => {
    const merged = { q, category, tag, ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)), { replace: false });
  };

  const filtered = Boolean(q || category || tag);
  const featured = state.meta?.featured?.[0] || null;
  const showFeatured = !filtered;
  const items = state.items.filter((p) => !(showFeatured && featured && p.id === featured.id));
  const categories = mergeCategories(state.meta?.categories);
  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state.error : null;
  const nothingPublished = state.status === 'ready' && !filtered && state.total === 0;

  return (
    <div className="writing">
      <Seo title="Writing" description="Thoughts, lessons and discoveries from my journey in technology — notes on web development, programming and the projects I build." />

      {/* ---------- Hero ---------- */}
      <section className="w-hero">
        <div className="w-hero__bg" aria-hidden="true">
          <span className="w-hero__glow" />
          <span className="w-hero__grid" />
          <span className="w-hero__float w-hero__float--1">{'</>'}</span>
          <span className="w-hero__float w-hero__float--2">{'{ }'}</span>
          <span className="w-hero__float w-hero__float--3">#</span>
        </div>
        <div className="container w-hero__inner">
          <p className="w-label w-enter">Writing / Journal</p>
          <h1 className="w-hero__title w-enter w-enter--2">
            Notes from <em>the build.</em>
          </h1>
          <p className="w-hero__lead w-enter w-enter--3">Thoughts, lessons and discoveries from my journey in technology.</p>

          <form
            className="w-search w-enter w-enter--4"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: search.trim() });
            }}
          >
            <Icon name="search" size={18} />
            <label htmlFor="w-search" className="sr-only">
              Search articles
            </label>
            <input id="w-search" type="search" placeholder="Search articles, topics, tags…" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} enterKeyHint="search" />
            {search && (
              <button
                type="button"
                className="w-search__clear"
                aria-label="Clear search"
                onClick={() => {
                  setSearch('');
                  if (q) update({ q: '' });
                }}
              >
                <Icon name="close" size={16} />
              </button>
            )}
            <button type="submit" className="btn btn--primary btn--sm">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <nav className="w-cats container" aria-label="Filter articles by category">
        <div className="w-cats__scroll" role="toolbar">
          <button type="button" className={`w-chip ${!category ? 'is-active' : ''}`} aria-pressed={!category} onClick={() => update({ category: '' })}>
            All
          </button>
          {categories.map((c) => {
            const on = slugify(category) === slugify(c);
            return (
              <button key={c} type="button" className={`w-chip ${on ? 'is-active' : ''}`} aria-pressed={on} onClick={() => update({ category: on ? '' : c })}>
                {c}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ---------- Featured ---------- */}
      {showFeatured && (
        <section className="container w-section" aria-label="Featured article">
          {loading ? <div className="w-featured w-featured--skeleton w-shimmer" aria-hidden="true" /> : !error && (featured ? <Featured post={featured} /> : <FeaturedFallback />)}
        </section>
      )}

      {/* ---------- Latest ---------- */}
      <section className="container w-section" aria-labelledby="w-latest">
        <header className="w-section__head">
          <div>
            <p className="w-label">{filtered ? 'Results' : 'Latest'}</p>
            <h2 id="w-latest" className="w-section__title">
              {filtered ? (
                <>
                  {state.status === 'ready' ? `${state.total} article${state.total === 1 ? '' : 's'}` : 'Searching…'}
                  {q && <span className="muted"> for “{q}”</span>}
                  {category && <span className="muted"> in {category}</span>}
                  {tag && <span className="muted"> tagged #{tag}</span>}
                </>
              ) : (
                'Latest articles'
              )}
            </h2>
          </div>
          {filtered && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams({})}>
              <Icon name="close" size={14} /> Clear filters
            </button>
          )}
        </header>

        {loading && (
          <div className="w-grid" aria-busy="true" aria-label="Loading articles">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && (
          <ErrorState
            title={error.offline ? 'Articles are unavailable right now' : 'Could not load articles'}
            error={error.offline ? { message: 'The writing service is not reachable. Please check back soon.' } : error}
            onRetry={() => load(1)}
          />
        )}

        {nothingPublished && (
          <EmptyState icon="book" title="The first articles are on their way" action={<Link to="/projects" className="btn btn--ghost btn--sm">Explore projects instead</Link>}>
            Published articles will appear here. Subscribe below to hear when the first one goes live.
          </EmptyState>
        )}
        {state.status === 'ready' && filtered && state.total === 0 && (
          <EmptyState icon="search" title="No matching articles" action={<button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams({})}>Clear filters</button>}>
            Try another search term or pick a different category.
          </EmptyState>
        )}
        {state.status === 'ready' && !filtered && state.total > 0 && items.length === 0 && (
          <p className="muted">That’s everything for now — the featured article above is the latest.</p>
        )}

        {state.status === 'ready' && items.length > 0 && (
          <div className="w-grid">
            {items.map((p, i) => (
              <ArticleCard key={p.id} post={p} index={i} />
            ))}
          </div>
        )}

        {state.status === 'ready' && state.page < state.pages && (
          <div className="w-more">
            <button type="button" className="btn btn--ghost" onClick={() => load(state.page + 1)} disabled={state.more}>
              {state.more ? 'Loading…' : 'Load more articles'}
            </button>
            {state.moreError && <p className="danger-text small">Couldn’t load more. Please try again.</p>}
          </div>
        )}

        {state.status === 'ready' && state.meta?.tags?.length > 0 && (
          <div className="w-tags">
            <span className="w-label">Browse by tag</span>
            {state.meta.tags.map((t) => {
              const on = slugify(tag) === slugify(t);
              return (
                <button key={t} type="button" className={`w-tag ${on ? 'is-active' : ''}`} aria-pressed={on} onClick={() => update({ tag: on ? '' : t })}>
                  #{t}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Newsletter ---------- */}
      <div className="container w-section">
        <Newsletter source="writing" />
      </div>

      {/* ---------- CTA ---------- */}
      <section className="container w-section w-section--last">
        <div className="w-cta">
          <h2 className="w-cta__title">Enjoyed reading?</h2>
          <p className="w-cta__text">Explore what I’m building and let’s create something meaningful.</p>
          <div className="w-cta__actions">
            <Link to="/projects" className="btn btn--primary">
              Explore My Work <Icon name="arrowRight" size={16} />
            </Link>
            <Link to="/contact" className="btn btn--ghost">
              Let’s Talk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
