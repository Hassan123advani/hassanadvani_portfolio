import { Link } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import SectionHeading from '../components/ui/SectionHeading.jsx';
import { CardSkeletons, EmptyState, ErrorState } from '../components/ui/States.jsx';
import ProjectCard from '../components/content/ProjectCard.jsx';
import PostCard from '../components/content/PostCard.jsx';
import CertificateCard from '../components/content/CertificateCard.jsx';
import VideoSection from '../components/content/VideoSection.jsx';
import { SkillGroups, EducationTimeline, Testimonials } from '../components/content/ProfileBlocks.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { loaders, localCertificates, localProjects } from '../content/data.js';
import { cdn, timeAgo } from '../lib/format.js';

function Hero() {
  const { profile } = useSite();
  const [first, ...rest] = profile.name.split(' ');
  const last = rest.pop() || '';
  const middle = rest.join(' ');
  const skills = profile.skills.flatMap((g) => g.items.map((i) => i.name.toLowerCase())).slice(0, 6);
  const current = profile.education.find((e) => /progress/i.test(e.status)) || profile.education[0];

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__grid-bg" aria-hidden="true" />
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="hero__status">
            <span className="pulse" aria-hidden="true" />
            {current ? `Currently studying ${current.credential?.match(/\((\w+)\)/)?.[1] || current.credential} · ${current.institution}` : profile.availability}
          </p>
          <h1 className="hero__title" id="hero-title">
            <span className="hero__line">{[first, middle].filter(Boolean).join(' ')}</span>
            <span className="hero__line hero__line--accent">
              {last}
              <span className="hero__period">.</span>
            </span>
          </h1>
          <p className="hero__tagline">{profile.tagline}</p>
          <p className="hero__intro">{profile.intro}</p>
          <div className="hero__actions">
            <Link to="/projects" className="btn btn--primary">
              Explore my work <Icon name="arrow" size={16} />
            </Link>
            <Link to="/contact" className="btn btn--ghost">
              Let’s talk
            </Link>
            {profile.resume?.url && (
              <a href={profile.resume.url} className="btn btn--text" target="_blank" rel="noopener noreferrer" download>
                <Icon name="download" size={16} /> Résumé
              </a>
            )}
          </div>
          <ul className="hero__meta">
            <li>
              <Icon name="pin" size={15} /> {profile.location}
            </li>
            <li>
              <span className="dot-live" aria-hidden="true" /> {profile.availability}
            </li>
          </ul>
        </div>

        <div className="hero__visual">
          <figure className="portrait">
            <img src={cdn(profile.avatar?.url, { w: 720, h: 820 }) || '/assets/profile.jpeg'} alt={profile.avatar?.alt || profile.name} width="560" height="640" fetchpriority="high" />
            <figcaption className="mono">
              <span>{profile.location?.split(',')[0]?.toUpperCase()}</span>
              <span>{new Date().getFullYear()}</span>
            </figcaption>
          </figure>
          <div className="console" aria-label="Quick facts">
            <div className="console__bar" aria-hidden="true">
              <i />
              <i />
              <i />
              <span className="mono">~/{(profile.shortName || first).toLowerCase()}</span>
            </div>
            <div className="console__body mono">
              <p>
                <b>$</b> whoami
              </p>
              <p className="console__out">{profile.headline.toLowerCase()}</p>
              <p>
                <b>$</b> ls skills/
              </p>
              <p className="console__out">{skills.join('  ')}</p>
              <p>
                <b>$</b> cat now.txt
              </p>
              <p className="console__out">
                {profile.learning?.[0]?.title || 'learning every day'}
                <span className="caret" aria-hidden="true" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const words = ['Web development', 'Computer science', 'Creative problem solving', 'Building useful tools'];
  const row = [...words, ...words];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {[...row, ...row].map((w, i) => (
          <span key={i}>
            {w} <Icon name="sparkle" size={14} />
          </span>
        ))}
      </div>
    </div>
  );
}

function FeaturedWork() {
  const { data, loading, error, reload } = useApi(loaders.projects, [], { fallback: localProjects });
  const featured = (data || []).filter((p) => p.featured);
  const list = (featured.length ? featured : data || []).slice(0, 3);
  return (
    <section className="section" id="work">
      <div className="container">
        <SectionHeading
          index="01"
          kicker="Selected work"
          title={
            <>
              Small ideas. <em>Useful outcomes.</em>
            </>
          }
          lead="Real, browser-based tools to help you focus, manage money and stay on top of your studies. Open one and try it."
          action={
            <Link to="/projects" className="link-arrow">
              All projects <Icon name="arrowRight" size={15} />
            </Link>
          }
        />
        {loading && <CardSkeletons count={3} className="projects-grid" />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {!loading && !error && list.length === 0 && <EmptyState icon="code" title="Projects are on the way" />}
        {!loading && !error && list.length > 0 && (
          <div className="projects-grid">
            {list.map((p, i) => (
              <ProjectCard key={p.id || p.slug} project={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AboutTeaser() {
  const { profile } = useSite();
  return (
    <section className="section section--tint" id="about">
      <div className="container about-teaser">
        <SectionHeading index="02" kicker="A little about me" title="Learning the craft, one project at a time." />
        <div className="about-teaser__body">
          <Reveal>
            <p className="lead">{profile.bio[0]}</p>
            {profile.bio[1] && <p className="muted">{profile.bio[1]}</p>}
            <Link to="/about" className="link-arrow">
              More about me <Icon name="arrowRight" size={15} />
            </Link>
          </Reveal>
          <Reveal as="dl" className="stats" delay={120}>
            {profile.stats.map((s) => (
              <div key={s.label} className="stat">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function CertificatesPreview() {
  const { data, loading } = useApi(loaders.certificates, [], { fallback: localCertificates });
  if (loading || !data?.length) return null;
  return (
    <section className="section" id="certificates">
      <div className="container">
        <SectionHeading
          index="05"
          kicker="Continuous learning"
          title="Certificates & coursework"
          lead={`${data.length} learning milestones completed through ${[...new Set(data.map((c) => c.issuer).filter(Boolean))].join(' & ') || 'online programs'}.`}
          action={
            <Link to="/certificates" className="link-arrow">
              View the gallery <Icon name="arrowRight" size={15} />
            </Link>
          }
        />
        <div className="cert-strip">
          {data.slice(0, 4).map((c, i) => (
            <Link to="/certificates" key={c.id || c.title} className="cert-strip__item" style={{ '--i': i }}>
              {c.image?.url && <img src={cdn(c.image.url, { w: 520 })} alt={c.image.alt || c.title} loading="lazy" />}
              <span>{c.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function GithubPreview() {
  const { site } = useSite();
  const { data, loading, error } = useApi(loaders.github, []);
  if (site.showGithub === false) return null;
  const repos = (data?.repos || []).slice(0, 3);
  return (
    <section className="section section--tint">
      <div className="container">
        <SectionHeading
          index="06"
          kicker="Open source"
          title="Live from GitHub"
          lead="Repositories update here automatically whenever I push new work."
          action={
            <Link to="/github" className="link-arrow">
              All repositories <Icon name="arrowRight" size={15} />
            </Link>
          }
        />
        {loading && <CardSkeletons count={3} className="repo-grid" />}
        {error && <ErrorState title="GitHub is taking a break" error={{ message: 'Repositories could not be loaded right now.' }} />}
        {!loading && !error && repos.length === 0 && (
          <EmptyState icon="github" title="No public repositories yet" action={<a className="btn btn--ghost btn--sm" href={data?.profile?.url} target="_blank" rel="noopener noreferrer">Visit GitHub profile</a>} />
        )}
        {repos.length > 0 && (
          <div className="repo-grid">
            {repos.map((r, i) => (
              <Reveal as="a" key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="repo-card" delay={i * 70}>
                <p className="repo-card__name">
                  <Icon name="github" size={15} /> {r.name}
                </p>
                <p className="muted">{r.description || 'No description yet.'}</p>
                <p className="repo-card__meta mono">
                  {r.language && <span>{r.language}</span>}
                  <span>★ {r.stars}</span>
                  <span>{timeAgo(r.updatedAt)}</span>
                </p>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LatestWriting() {
  const { site } = useSite();
  const { data, loading } = useApi(() => loaders.posts({ limit: 3 }), []);
  if (site.blogEnabled === false || loading || !data?.items?.length) return null;
  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          index="07"
          kicker="Writing"
          title="Notes from the build"
          action={
            <Link to="/writing" className="link-arrow">
              All articles <Icon name="arrowRight" size={15} />
            </Link>
          }
        />
        <div className="posts-grid">
          {data.items.map((p, i) => (
            <PostCard key={p.id} post={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { site } = useSite();
  const { data } = useApi(loaders.testimonials, []);
  if (site.showTestimonials === false || !data?.length) return null;
  return (
    <section className="section section--tint">
      <div className="container">
        <SectionHeading index="08" kicker="Kind words" title="What people say" />
        <Testimonials items={data} />
      </div>
    </section>
  );
}

function ServicesTeaser() {
  const { profile } = useSite();
  if (!profile.services?.length) return null;
  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          index="09"
          kicker="Hire me"
          title="How I can help"
          action={
            <Link to="/services" className="link-arrow">
              Services & process <Icon name="arrowRight" size={15} />
            </Link>
          }
        />
        <div className="service-list">
          {profile.services.map((s, i) => (
            <Reveal key={s.title} className="service-row" delay={i * 60}>
              <span className="mono service-row__n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p className="muted">{s.description}</p>
              <Link to={`/contact?type=${encodeURIComponent(s.title)}`} className="icon-btn" aria-label={`Ask about ${s.title}`}>
                <Icon name="arrow" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { profile } = useSite();
  return (
    <>
      <Seo />
      <Hero />
      <Marquee />
      <FeaturedWork />
      <AboutTeaser />
      <section className="section" id="skills">
        <div className="container">
          <SectionHeading index="03" kicker="Tools & foundations" title="Skills in progress" lead="Self-assessed levels for the technologies and fundamentals I’m developing through study and hands-on practice." />
          <SkillGroups skills={profile.skills} />
        </div>
      </section>
      <section className="section section--tint" id="education">
        <div className="container two-col">
          <SectionHeading index="04" kicker="Education" title="My learning journey" lead="The steps that brought me to computer science." />
          <EducationTimeline education={profile.education} />
        </div>
      </section>
      <VideoSection />
      <CertificatesPreview />
      <GithubPreview />
      <LatestWriting />
      <TestimonialsSection />
      <ServicesTeaser />
    </>
  );
}
