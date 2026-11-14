import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import ArticleCard from '../components/content/ArticleCard.jsx';
import ShareButtons from '../components/content/ShareButtons.jsx';
import Lightbox from '../components/ui/Lightbox.jsx';
import NotFound from './NotFound.jsx';
import { useApi } from '../hooks/useApi.js';
import { loaders } from '../content/data.js';
import { cdn, formatDate } from '../lib/format.js';
import { SITE_URL } from '../lib/config.js';
import { useSite } from '../context/SiteContext.jsx';
import { enhanceArticle } from '../lib/articleHtml.js';
import { articlePath, wasUpdated } from '../lib/writing.js';
import '../styles/writing.css';

/* ---------- Reading progress ---------- */
function ReadingProgress({ target }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = target.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        setP(total <= 0 ? (r.top <= 0 ? 1 : 0) : Math.min(1, Math.max(0, -r.top / total)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [target]);
  return (
    <div className="w-progress" role="progressbar" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <span style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

/* ---------- Table of contents ---------- */
function useActiveHeading(toc) {
  const [active, setActive] = useState(toc[0]?.id || '');
  useEffect(() => {
    if (!toc.length || typeof IntersectionObserver === 'undefined') return undefined;
    const els = toc.map((t) => document.getElementById(t.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-90px 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [toc]);
  return active;
}

function TocList({ toc, active, onPick }) {
  return (
    <ol className="w-toc__list">
      {toc.map((t) => (
        <li key={t.id} className={`w-toc__item w-toc__item--h${t.level} ${active === t.id ? 'is-active' : ''}`}>
          <a
            href={`#${t.id}`}
            aria-current={active === t.id ? 'location' : undefined}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(t.id);
              if (!el) return;
              el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
              el.focus({ preventScroll: true });
              window.history.replaceState(null, '', `#${t.id}`);
              onPick?.();
            }}
          >
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Body with copy buttons + image lightbox ---------- */
function ArticleContent({ html }) {
  const ref = useRef(null);
  const [zoom, setZoom] = useState(null);
  function onClick(e) {
    const btn = e.target.closest('[data-copy]');
    if (btn) {
      const code = btn.closest('.code-block')?.querySelector('pre')?.innerText || '';
      const done = (label) => {
        btn.textContent = label;
        btn.classList.toggle('is-done', label === 'Copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('is-done');
        }, 1800);
      };
      // Fallback when the async Clipboard API is unavailable or blocked: select the code so the
      // reader can copy it, and try the legacy copy command on that selection.
      const fallback = () => {
        const pre = btn.closest('.code-block')?.querySelector('pre');
        const sel = window.getSelection();
        if (!pre || !sel) return done('Press Ctrl+C');
        const range = document.createRange();
        range.selectNodeContents(pre);
        sel.removeAllRanges();
        sel.addRange(range);
        let ok = false;
        try {
          ok = document.execCommand('copy');
        } catch {
          ok = false;
        }
        return done(ok ? 'Copied' : 'Press Ctrl+C');
      };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(() => done('Copied'), fallback);
      else fallback();
      return;
    }
    const img = e.target.closest('img');
    if (img && ref.current?.contains(img)) setZoom({ url: img.currentSrc || img.src, alt: img.alt, title: img.alt || 'Image' });
  }
  return (
    <>
      {/* html comes from enhanceArticle(): sanitized with DOMPurify, then only generated markup is added. */}
      <div ref={ref} className="prose w-prose" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      {zoom && <Lightbox items={[zoom]} index={0} onIndex={() => {}} onClose={() => setZoom(null)} />}
    </>
  );
}

/**
 * The full article layout. Also used by the admin editor for its live preview
 * (preview = true: no links out, no view counting).
 */
export function ArticleView({ post, preview = false, related = [], prev = null, next = null }) {
  const { profile } = useSite();
  const root = useRef(null);
  const { html, toc } = useMemo(() => enhanceArticle(post.content || ''), [post.content]);
  const active = useActiveHeading(preview ? [] : toc);
  const [tocOpen, setTocOpen] = useState(false);
  const author = post.author || profile.name;
  const url = `${SITE_URL}${articlePath(post.slug)}`;
  const date = post.publishedAt || (preview ? new Date().toISOString() : null);

  return (
    <article className={`w-article ${preview ? 'is-preview' : ''}`} ref={root}>
      {!preview && <ReadingProgress target={root} />}

      <header className="w-article__head container">
        {!preview && (
          <Link to="/writing" className="w-back">
            <Icon name="arrowLeft" size={15} /> Back to Writing
          </Link>
        )}
        <p className="w-article__kicker">
          {post.category ? (
            preview ? (
              <span className="w-badge w-badge--accent">{post.category}</span>
            ) : (
              <Link className="w-badge w-badge--accent" to={`/writing?category=${encodeURIComponent(post.category)}`}>
                {post.category}
              </Link>
            )
          ) : (
            <span className="w-badge">Article</span>
          )}
        </p>
        <h1 className="w-article__title">{post.title || 'Untitled article'}</h1>
        {(post.subtitle || post.excerpt) && <p className="w-article__dek">{post.subtitle || post.excerpt}</p>}
        <div className="w-article__byline">
          <div className="w-author">
            {profile.avatar?.url ? <img src={profile.avatar.url} alt="" width="44" height="44" /> : <span className="w-author__dot" />}
            <span>
              <strong>{author}</strong>
              <span className="muted small">{profile.headline}</span>
            </span>
          </div>
          <dl className="w-facts">
            <div>
              <dt>Published</dt>
              <dd>
                <time dateTime={date}>{formatDate(date)}</time>
              </dd>
            </div>
            {wasUpdated(post) && (
              <div>
                <dt>Updated</dt>
                <dd>
                  <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                </dd>
              </div>
            )}
            <div>
              <dt>Reading time</dt>
              <dd>{post.readingTime || 1} min</dd>
            </div>
          </dl>
        </div>
      </header>

      {post.coverImage?.url && (
        <figure className="w-article__cover container">
          <img
            src={cdn(post.coverImage.url, { w: 1600, h: 840 })}
            srcSet={[800, 1200, 1600].map((w) => `${cdn(post.coverImage.url, { w, h: Math.round(w * 0.525) })} ${w}w`).join(', ')}
            sizes="(max-width: 1240px) 100vw, 1200px"
            alt={post.coverImage.alt || ''}
            fetchpriority="high"
          />
          {post.coverImage.caption && <figcaption>{post.coverImage.caption}</figcaption>}
        </figure>
      )}

      <div className={`container w-article__layout ${toc.length > 1 ? 'has-toc' : ''}`}>
        {toc.length > 1 && (
          <aside className="w-toc" aria-label="Table of contents">
            <details className="w-toc__mobile" open={tocOpen} onToggle={(e) => setTocOpen(e.currentTarget.open)}>
              <summary>
                <Icon name="layout" size={16} /> On this page <span className="muted">({toc.length})</span>
              </summary>
              <TocList toc={toc} active={active} onPick={() => setTocOpen(false)} />
            </details>
            <div className="w-toc__desktop">
              <p className="w-label">On this page</p>
              <TocList toc={toc} active={active} />
            </div>
          </aside>
        )}

        <div className="w-article__main">
          {post.content ? <ArticleContent html={html} /> : <p className="muted">Start writing to see the article here.</p>}

          {post.gallery?.length > 0 && (
            <div className="gallery gallery--article">
              {post.gallery.map((g, i) => (
                <figure key={`${g.url}-${i}`}>
                  <img src={cdn(g.url, { w: 800, h: 560 })} alt={g.alt || ''} loading="lazy" />
                  {g.caption && <figcaption>{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}

          {post.tags?.length > 0 && (
            <ul className="w-article__tags" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t}>{preview ? <span className="w-tag">#{t}</span> : <Link className="w-tag" to={`/writing?tag=${encodeURIComponent(t)}`}>#{t}</Link>}</li>
              ))}
            </ul>
          )}

          {!preview && (
            <div className="w-article__share">
              <ShareButtons url={url} title={post.title} />
            </div>
          )}

          <aside className="w-authorbox" aria-label="About the author">
            {profile.avatar?.url ? <img src={profile.avatar.url} alt="" width="64" height="64" loading="lazy" /> : <span className="w-author__dot w-author__dot--lg" />}
            <div>
              <p className="w-label">Written by</p>
              <p className="w-authorbox__name">{author}</p>
              {profile.intro && <p className="w-authorbox__bio">{profile.intro}</p>}
              {!preview && (
                <Link to="/about" className="w-link">
                  More about me <Icon name="arrowRight" size={14} />
                </Link>
              )}
            </div>
          </aside>

          {!preview && (prev || next) && (
            <nav className="w-pager" aria-label="More articles">
              {prev ? (
                <Link to={articlePath(prev.slug)} className="w-pager__link">
                  <span className="w-label">
                    <Icon name="arrowLeft" size={13} /> Previous
                  </span>
                  <strong>{prev.title}</strong>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link to={articlePath(next.slug)} className="w-pager__link w-pager__link--next">
                  <span className="w-label">
                    Next <Icon name="arrowRight" size={13} />
                  </span>
                  <strong>{next.title}</strong>
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>

      {!preview && related.length > 0 && (
        <section className="container w-section" aria-labelledby="w-related">
          <header className="w-section__head">
            <div>
              <p className="w-label">Keep reading</p>
              <h2 id="w-related" className="w-section__title">
                Related articles
              </h2>
            </div>
            <Link to="/writing" className="btn btn--ghost btn--sm">
              All articles
            </Link>
          </header>
          <div className="w-grid">
            {related.map((p, i) => (
              <ArticleCard key={p.id} post={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function ArticleSkeleton() {
  return (
    <div className="container w-article__head" aria-busy="true" aria-label="Loading article">
      <span className="w-shimmer w-line w-line--sm" />
      <span className="w-shimmer w-line w-line--xl" />
      <span className="w-shimmer w-line w-line--lg" />
      <div className="w-shimmer w-skel-cover" />
    </div>
  );
}

export default function Article() {
  const { slug } = useParams();
  const { profile } = useSite();
  const { data, loading, error, reload } = useApi(() => loaders.post(slug), [slug]);

  // Count one view per article per browser session; the server de-duplicates again.
  useEffect(() => {
    if (!data?.item) return;
    const key = `viewed:${data.item.slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage unavailable: the server-side window still prevents inflation */
    }
    loaders.postView(data.item.slug).catch(() => {});
  }, [data?.item]);

  useEffect(() => {
    if (!data?.item || !window.location.hash) return;
    const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50);
  }, [data?.item]);

  if (loading) return <ArticleSkeleton />;
  if (error?.status === 404) return <NotFound what="article" />;
  if (error) {
    return (
      <div className="container page-hero">
        <ErrorState error={error.offline ? { message: 'The writing service is not reachable. Please try again soon.' } : error} onRetry={reload} />
      </div>
    );
  }

  const post = data.item;
  const url = `${SITE_URL}${articlePath(post.slug)}`;
  const image = post.ogImage?.url || post.coverImage?.url;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { '@type': 'Person', name: post.author || profile.name, url: `${SITE_URL}/about` },
    mainEntityOfPage: url,
    ...(image ? { image: cdn(image, { w: 1200, h: 630 }) } : {}),
    ...(post.tags?.length ? { keywords: [...(post.seoKeywords || []), ...post.tags].join(', ') } : {}),
  };

  return (
    <>
      <Seo title={post.seoTitle || post.title} description={post.seoDescription || post.excerpt} image={image ? cdn(image, { w: 1200, h: 630 }) : undefined} type="article">
        <meta property="article:published_time" content={post.publishedAt} />
        {post.updatedAt && <meta property="article:modified_time" content={post.updatedAt} />}
        {post.category && <meta property="article:section" content={post.category} />}
        <meta name="author" content={post.author || profile.name} />
        {post.tags?.map((t) => <meta key={t} property="article:tag" content={t} />)}
      </Seo>
      <Helmet>
        {post.seoKeywords?.length > 0 && <meta name="keywords" content={post.seoKeywords.join(', ')} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
      </Helmet>
      <ArticleView post={post} related={data.related || []} prev={data.prev} next={data.next} />
    </>
  );
}
