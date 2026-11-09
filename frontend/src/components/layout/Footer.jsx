import { Link, useLocation } from 'react-router-dom';
import Icon, { socialIcon } from '../ui/Icon.jsx';
import { useSite } from '../../context/SiteContext.jsx';
import { NAV } from './Header.jsx';

export default function Footer() {
  const { profile, site } = useSite();
  const year = new Date().getFullYear();
  const { pathname } = useLocation();
  const nav = NAV.filter((n) => !n.flag || site[n.flag] !== false);

  return (
    <footer className="footer">
      <div className="container">
        {pathname !== '/contact' && (
        <div className="footer__cta">
          <p className="kicker">Have an idea?</p>
          <Link to="/contact" className="footer__big">
            Let’s build something <em>useful.</em>
            <Icon name="arrow" size={44} strokeWidth={1.3} />
          </Link>
        </div>
        )}

        <div className="footer__grid">
          <div>
            <p className="footer__name">{profile.name}</p>
            <p className="muted">{site.footerNote || profile.headline}</p>
            {profile.email && (
              <a className="footer__email" href={`mailto:${profile.email}`}>
                {profile.email}
              </a>
            )}
          </div>
          <nav aria-label="Footer">
            <p className="footer__label">Explore</p>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              {nav.map((n) => (
                <li key={n.to}>
                  <Link to={n.to}>{n.label}</Link>
                </li>
              ))}
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
          </nav>
          <div>
            <p className="footer__label">Elsewhere</p>
            <ul className="footer__social">
              {profile.socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target={s.url.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer">
                    <Icon name={socialIcon(s)} size={16} /> {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__base">
          <span>
            © {year} {profile.name}
          </span>
          <span className="mono">{profile.location}</span>
          <button type="button" className="footer__top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
