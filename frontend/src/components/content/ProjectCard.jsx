import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import Reveal from '../ui/Reveal.jsx';
import { cdn } from '../../lib/format.js';

const isLocalDemo = (url = '') => url.startsWith('/demos/');

/**
 * Visual for a project: uploaded cover image, else a live miniature of the
 * bundled demo, else a typographic poster.
 */
export function ProjectVisual({ project, eager = false }) {
  const cover = project.coverImage?.url || project.images?.[0]?.url;
  if (cover) {
    return (
      <img
        className="project-visual__img"
        src={cdn(cover, { w: 900, h: 600 })}
        alt={project.coverImage?.alt || `${project.title} preview`}
        loading={eager ? 'eager' : 'lazy'}
      />
    );
  }
  if (isLocalDemo(project.liveUrl)) {
    return (
      <div className="project-visual__frame" aria-hidden="true">
        <iframe src={project.liveUrl} title={`${project.title} preview`} tabIndex={-1} loading="lazy" sandbox="allow-scripts allow-same-origin" />
      </div>
    );
  }
  return (
    <div className="project-visual__poster" aria-hidden="true">
      <span>{project.title}</span>
    </div>
  );
}

export default function ProjectCard({ project, index = 0, large = false }) {
  return (
    <Reveal as="article" className={`project-card ${large ? 'project-card--large' : ''}`} delay={(index % 3) * 80}>
      <Link to={`/projects/${project.slug}`} className="project-card__visual" aria-label={`${project.title} — case study`}>
        <ProjectVisual project={project} />
        <span className="project-card__index mono">{String(index + 1).padStart(2, '0')}</span>
      </Link>
      <div className="project-card__body">
        <p className="project-card__meta mono">
          {[project.level, project.category].filter(Boolean).join(' · ')}
        </p>
        <h3>
          <Link to={`/projects/${project.slug}`}>{project.title}</Link>
        </h3>
        <p className="project-card__summary">{project.summary}</p>
        <ul className="chips" aria-label="Technologies">
          {project.techStack?.slice(0, 5).map((t) => (
            <li key={t} className="chip">
              {t}
            </li>
          ))}
        </ul>
        <div className="project-card__links">
          <Link to={`/projects/${project.slug}`} className="link-arrow">
            Case study <Icon name="arrowRight" size={15} />
          </Link>
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="link-arrow">
              Live demo <Icon name="arrow" size={15} />
            </a>
          )}
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="link-arrow">
              Code <Icon name="github" size={14} />
            </a>
          )}
        </div>
      </div>
    </Reveal>
  );
}
