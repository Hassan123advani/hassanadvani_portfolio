import Reveal from '../ui/Reveal.jsx';
import { EmptyState } from '../ui/States.jsx';
import { Link } from 'react-router-dom';

export function SkillGroups({ skills = [] }) {
  return (
    <div className="skills">
      {skills.map((g, gi) => (
        <Reveal key={g.group} className="skill-group" delay={gi * 70}>
          <h3>{g.group}</h3>
          <ul>
            {g.items.map((s) => (
              <li key={s.name}>
                <div className="skill">
                  <span>{s.name}</span>
                  {typeof s.level === 'number' && <span className="mono muted">{s.level}%</span>}
                </div>
                {typeof s.level === 'number' && (
                  <span className="meter" role="meter" aria-valuenow={s.level} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name} self-assessed level`}>
                    <i style={{ '--w': `${s.level}%` }} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}

export function EducationTimeline({ education = [] }) {
  return (
    <ol className="timeline">
      {education.map((e, i) => (
        <Reveal as="li" key={`${e.institution}-${i}`} className={`timeline__item ${i === 0 && /progress/i.test(e.status) ? 'is-current' : ''}`} delay={i * 80}>
          <span className="timeline__dot" aria-hidden="true" />
          <p className="mono timeline__meta">{[e.period, e.status].filter(Boolean).join(' · ')}</p>
          <h3>{e.credential || e.institution}</h3>
          {e.credential && <p className="timeline__org">{e.institution}</p>}
          {e.description && <p className="muted">{e.description}</p>}
        </Reveal>
      ))}
    </ol>
  );
}

export function ExperienceList({ experience = [] }) {
  if (!experience.length) {
    return (
      <EmptyState icon="sparkle" title="No professional roles yet" action={<Link to="/contact" className="btn btn--ghost btn--sm">Get in touch</Link>}>
        I’m focused on my BSCS degree and building projects. I’m open to learning and collaboration — internships and real-world experience will be listed here.
      </EmptyState>
    );
  }
  return (
    <ol className="timeline">
      {experience.map((x, i) => (
        <Reveal as="li" key={`${x.role}-${i}`} className="timeline__item" delay={i * 80}>
          <span className="timeline__dot" aria-hidden="true" />
          <p className="mono timeline__meta">{[x.period, x.location].filter(Boolean).join(' · ')}</p>
          <h3>{x.role}</h3>
          {x.organization && <p className="timeline__org">{x.organization}</p>}
          {x.description && <p className="muted">{x.description}</p>}
        </Reveal>
      ))}
    </ol>
  );
}

export function Testimonials({ items = [] }) {
  return (
    <div className="testimonials">
      {items.map((t, i) => (
        <Reveal as="figure" key={t.id || i} className="testimonial" delay={i * 80}>
          <blockquote>“{t.quote}”</blockquote>
          <figcaption>
            {t.avatar?.url ? <img src={t.avatar.url} alt="" loading="lazy" /> : <span className="testimonial__initial">{t.name[0]}</span>}
            <span>
              <strong>{t.link ? <a href={t.link} target="_blank" rel="noopener noreferrer">{t.name}</a> : t.name}</strong>
              <span className="muted">{[t.role, t.company].filter(Boolean).join(', ')}</span>
            </span>
          </figcaption>
        </Reveal>
      ))}
    </div>
  );
}
