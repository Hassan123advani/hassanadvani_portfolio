import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import Lightbox from '../components/ui/Lightbox.jsx';
import { ErrorState, Skeleton } from '../components/ui/States.jsx';
import { ProjectVisual } from '../components/content/ProjectCard.jsx';
import NotFound from './NotFound.jsx';
import { useApi } from '../hooks/useApi.js';
import { loaders, localProject } from '../content/data.js';
import { safeHtml } from '../lib/sanitize.js';
import { cdn } from '../lib/format.js';

export default function ProjectDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi(() => loaders.project(slug), [slug], { fallback: () => localProject(slug) });
  const [lightbox, setLightbox] = useState(-1);

  if (loading) {
    return (
      <div className="container page-hero">
        <Skeleton lines={4} />
      </div>
    );
  }
  if (error?.status === 404) return <NotFound what="project" />;
  if (error) {
    return (
      <div className="container page-hero">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }
  if (!data?.item) return <NotFound what="project" />;

  const { item: p, prev, next } = data;
  const gallery = (p.images || []).map((img) => ({ ...img, title: img.caption || img.alt || p.title }));

  return (
    <>
      <Seo title={p.seoTitle || p.title} description={p.seoDescription || p.summary} image={p.coverImage?.url} type="article" />
      <article>
        <section className="page-hero">
          <div className="container">
            <Link to="/projects" className="back-link">
              <Icon name="arrowLeft" size={15} /> All projects
            </Link>
            <p className="kicker">{[p.level, p.category].filter(Boolean).join(' · ')}</p>
            <h1 className="page-title">{p.title}</h1>
            <p className="page-lead">{p.summary}</p>
            <div className="hero__actions">
              {p.liveUrl && (
                <a className="btn btn--primary" href={p.liveUrl} target="_blank" rel="noopener noreferrer">
                  Open live demo <Icon name="arrow" size={16} />
                </a>
              )}
              {p.githubUrl && (
                <a className="btn btn--ghost" href={p.githubUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="github" size={16} /> View the code
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="container">
          <Reveal className="project-hero-visual">
            <ProjectVisual project={p} eager />
          </Reveal>
        </section>

        <section className="section">
          <div className="container project-body">
            <aside className="project-aside">
              <dl>
                {p.techStack?.length > 0 && (
                  <div>
                    <dt>Built with</dt>
                    <dd>
                      <ul className="chips">
                        {p.techStack.map((t) => (
                          <li key={t} className="chip">
                            {t}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {p.category && (
                  <div>
                    <dt>Category</dt>
                    <dd>{p.category}</dd>
                  </div>
                )}
                {p.level && (
                  <div>
                    <dt>Level</dt>
                    <dd>{p.level}</dd>
                  </div>
                )}
              </dl>
            </aside>
            <div className="prose" dangerouslySetInnerHTML={{ __html: safeHtml(p.description || `<p>${p.summary || ''}</p>`) }} />
          </div>
        </section>

        {gallery.length > 0 && (
          <section className="section section--flush">
            <div className="container">
              <h2 className="h3">Gallery</h2>
              <div className="gallery">
                {gallery.map((g, i) => (
                  <button type="button" key={g.url} className="gallery__item" onClick={() => setLightbox(i)} aria-label={`Open image ${i + 1}`}>
                    <img src={cdn(g.url, { w: 700, h: 460 })} alt={g.alt || ''} loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <nav className="container pager" aria-label="More projects">
          {prev ? (
            <Link to={`/projects/${prev.slug}`} className="pager__link">
              <span className="mono muted">← Previous</span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/projects/${next.slug}`} className="pager__link pager__link--next">
              <span className="mono muted">Next →</span>
              {next.title}
            </Link>
          )}
        </nav>
      </article>
      {lightbox >= 0 && <Lightbox items={gallery} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(-1)} />}
    </>
  );
}
