import { useSearchParams } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon, { socialIcon } from '../components/ui/Icon.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import ContactForm, { PROJECT_TYPES } from '../components/content/ContactForm.jsx';
import { useSite } from '../context/SiteContext.jsx';

export default function Contact() {
  const { profile } = useSite();
  const [params] = useSearchParams();
  const requested = params.get('type') || '';
  // Map a service title to the closest project type option.
  const type = PROJECT_TYPES.includes(requested)
    ? requested
    : /website/i.test(requested)
      ? 'Website'
      : /tool/i.test(requested)
        ? 'Web app or tool'
        : /fix|polish/i.test(requested)
          ? 'Fix or improve a site'
          : '';

  return (
    <>
      <Seo title="Contact" description={`Get in touch with ${profile.name}.`} />
      <section className="page-hero">
        <div className="container contact-layout">
          <Reveal className="contact-intro">
            <p className="kicker">Say hello</p>
            <h1 className="page-title">
              Let’s build something <em>useful.</em>
            </h1>
            <p className="page-lead">Have a project idea, a question or an opportunity to collaborate? I’d be glad to hear from you.</p>
            <ul className="contact-list">
              {profile.email && (
                <li>
                  <Icon name="mail" />
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </li>
              )}
              <li>
                <Icon name="pin" />
                <span>{profile.location}</span>
              </li>
            </ul>
            <div className="social-row">
              {profile.socials
                .filter((s) => !s.url.startsWith('mailto'))
                .map((s) => (
                  <a key={s.url} className="icon-btn icon-btn--lg" href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                    <Icon name={socialIcon(s)} size={20} />
                  </a>
                ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ContactForm key={type} defaultType={type} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
