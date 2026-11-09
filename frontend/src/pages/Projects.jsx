import { useMemo, useState } from 'react';
import Seo from '../components/ui/Seo.jsx';
import { CardSkeletons, EmptyState, ErrorState } from '../components/ui/States.jsx';
import ProjectCard from '../components/content/ProjectCard.jsx';
import { useApi } from '../hooks/useApi.js';
import { loaders, localProjects } from '../content/data.js';

export default function Projects() {
  const { data, loading, error, reload } = useApi(loaders.projects, [], { fallback: localProjects });
  const [filter, setFilter] = useState('All');
  const categories = useMemo(() => ['All', ...new Set((data || []).map((p) => p.category).filter(Boolean))], [data]);
  const list = (data || []).filter((p) => filter === 'All' || p.category === filter);

  return (
    <>
      <Seo title="Projects" description="Browser-based tools and web projects built by Muhammad Hassan Advani." />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Work</p>
          <h1 className="page-title">
            Projects I’ve <em>built.</em>
          </h1>
          <p className="page-lead">Each one is a working tool you can open and use — no sign-up, and your data stays in your browser.</p>
          {categories.length > 2 && (
            <div className="filters" role="toolbar" aria-label="Filter projects by category">
              {categories.map((c) => (
                <button key={c} type="button" className={`filter ${filter === c ? 'is-active' : ''}`} aria-pressed={filter === c} onClick={() => setFilter(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section section--flush">
        <div className="container">
          {loading && <CardSkeletons count={3} className="projects-grid" />}
          {error && <ErrorState error={error} onRetry={reload} />}
          {!loading && !error && list.length === 0 && <EmptyState icon="code" title="No projects here yet">New work will appear here as soon as it’s published.</EmptyState>}
          {list.length > 0 && (
            <div className="projects-grid">
              {list.map((p, i) => (
                <ProjectCard key={p.id || p.slug} project={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
