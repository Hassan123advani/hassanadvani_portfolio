import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useSite } from '../../context/SiteContext.jsx';

export const NAV = [
  { to: '/projects', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/writing', label: 'Writing', flag: 'blogEnabled' },
  { to: '/certificates', label: 'Certificates' },
  { to: '/github', label: 'GitHub', flag: 'showGithub' },
  { to: '/services', label: 'Hire me' },
];

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title="Toggle theme"
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { site, profile } = useSite();
  const items = NAV.filter((n) => !n.flag || site[n.flag] !== false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 12);
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 3);

  return (
    <header className={`header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header__bar">
        <Link to="/" className="brand" aria-label={`${profile.name} — home`}>
          <span className="brand__mark">{initials}</span>
          <span className="brand__name">
            {profile.shortName || profile.name.split(' ')[0]}
            <span className="brand__dot">.</span>dev
          </span>
        </Link>

        <nav className={`nav ${open ? 'is-open' : ''}`} aria-label="Main">
          <ul>
            {items.map((n, i) => (
              <li key={n.to} style={{ '--i': i }}>
                <NavLink to={n.to} className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}>
                  {n.label}
                </NavLink>
              </li>
            ))}
            <li className="nav__mobile-cta" style={{ '--i': items.length }}>
              <Link to="/contact" className="btn btn--primary">
                Let’s talk <Icon name="arrow" size={16} />
              </Link>
            </li>
          </ul>
        </nav>

        <div className="header__actions">
          <ThemeToggle />
          <Link to="/contact" className="btn btn--primary btn--sm header__cta">
            Let’s talk <Icon name="arrow" size={15} />
          </Link>
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}
