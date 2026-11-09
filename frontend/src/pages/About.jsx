import { Link } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon, { socialIcon } from '../components/ui/Icon.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import SectionHeading from '../components/ui/SectionHeading.jsx';
import { SkillGroups, EducationTimeline, ExperienceList } from '../components/content/ProfileBlocks.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { cdn } from '../lib/format.js';

export default function About() {
  const { profile } = useSite();
  return (
    <>
      <Seo title="About" description={profile.bio[0]} />
      <section className="page-hero">
        <div className="container about-hero">
          <Reveal className="about-hero__copy">
            <p className="kicker">About me</p>
            <h1 className="page-title">
              Hi, I’m {profile.shortName || profile.name.split(' ')[0]}. <em>{profile.headline}.</em>
            </h1>
            {profile.bio.map((p) => (
              <p key={p.slice(0, 24)} className="about-hero__p">
                {p}
              </p>
            ))}
            <div className="hero__actions">
              {profile.resume?.url ? (
                <a href={profile.resume.url} className="btn btn--primary" target="_blank" rel="noopener noreferrer" download>
                  <Icon name="download" size={16} /> Download résumé
                </a>
              ) : (
                <Link to="/contact?type=Something%20else" className="btn btn--primary">
                  Request my résumé <Icon name="arrow" size={16} />
                </Link>
              )}
              {profile.socials
                .filter((s) => !s.url.startsWith('mailto'))
                .map((s) => (
                  <a key={s.url} className="btn btn--ghost" href={s.url} target="_blank" rel="noopener noreferrer">
                    <Icon name={socialIcon(s)} size={16} /> {s.label}
                  </a>
                ))}
            </div>
          </Reveal>
          <Reveal className="about-hero__photo" delay={120}>
            <img src={cdn(profile.avatar?.url, { w: 640, h: 760 })} alt={profile.avatar?.alt || profile.name} />
            <ul className="about-facts mono">
              <li>
                <span>Based in</span> {profile.location}
              </li>
              <li>
                <span>Email</span> <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </li>
              <li>
                <span>Status</span> {profile.availability}
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container two-col">
          <SectionHeading kicker="Education" title="Where I’ve studied" />
          <EducationTimeline education={profile.education} />
        </div>
      </section>

      <section className="section">
        <div className="container two-col">
          <SectionHeading kicker="Experience" title="Work & roles" />
          <ExperienceList experience={profile.experience} />
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <SectionHeading kicker="Skills" title="What I work with" lead="Levels are honest self-assessments and change as I learn." />
          <SkillGroups skills={profile.skills} />
        </div>
      </section>

      {profile.learning?.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHeading kicker="Right now" title="What I’m learning" />
            <div className="learning-grid">
              {profile.learning.map((l, i) => (
                <Reveal key={l.title} className="learning-card" delay={i * 60}>
                  <span className="mono">{l.status}</span>
                  <h3>{l.title}</h3>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {profile.subjects?.length > 0 && (
        <section className="section section--tint">
          <div className="container">
            <SectionHeading kicker="The road ahead" title="Computer science, by subject" lead="Core areas I’m exploring throughout my degree." />
            <ol className="subjects">
              {profile.subjects.map((s, i) => (
                <Reveal as="li" key={s.title} delay={(i % 4) * 50}>
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.description}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
