import { Link } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import SectionHeading from '../components/ui/SectionHeading.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { useSite } from '../context/SiteContext.jsx';

const PROCESS = [
  ['Talk', 'You tell me what you need. I ask questions until we both understand the goal and scope.'],
  ['Plan', 'I outline what I’ll build, what I won’t, and a realistic timeline that fits around my studies.'],
  ['Build', 'I work in small steps and share progress so you can give feedback early.'],
  ['Hand over', 'You get the finished work, the source files and short notes on how it fits together.'],
];

export default function Services() {
  const { profile } = useSite();
  return (
    <>
      <Seo title="Hire me" description="Services offered by Muhammad Hassan Advani: responsive websites, small browser tools and front-end fixes." />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Services</p>
          <h1 className="page-title">
            Let’s make something <em>useful.</em>
          </h1>
          <p className="page-lead">
            I’m a student developer, so I take on small, well-defined projects that I can do properly. If yours fits, I’d love to hear about it.
          </p>
          <div className="hero__actions">
            <Link to="/contact" className="btn btn--primary">
              Start a conversation <Icon name="arrow" size={16} />
            </Link>
            <Link to="/projects" className="btn btn--ghost">
              See past work
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--flush">
        <div className="container">
          {profile.services?.length ? (
            <div className="services-grid">
              {profile.services.map((s, i) => (
                <Reveal as="article" key={s.title} className="service-card" delay={i * 80}>
                  <span className="mono service-card__n">{String(i + 1).padStart(2, '0')}</span>
                  <h2 className="h3">{s.title}</h2>
                  <p className="muted">{s.description}</p>
                  {s.deliverables?.length > 0 && (
                    <ul className="checklist">
                      {s.deliverables.map((d) => (
                        <li key={d}>
                          <Icon name="check" size={16} /> {d}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link to={`/contact?type=${encodeURIComponent(s.title)}`} className="link-arrow">
                    Ask about this <Icon name="arrowRight" size={15} />
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState title="Services are being updated" action={<Link to="/contact" className="btn btn--ghost btn--sm">Get in touch</Link>} />
          )}
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <SectionHeading kicker="Process" title="How we’d work together" />
          <ol className="process">
            {PROCESS.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 80}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t}</h3>
                <p className="muted">{d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
