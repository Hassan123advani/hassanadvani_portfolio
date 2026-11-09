import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import { ThemeToggle } from '../components/layout/Header.jsx';
import { useAuth } from './AuthContext.jsx';
import { ADMIN_PATH } from '../lib/config.js';

const NAV = [
  { group: 'Overview', items: [{ to: '', label: 'Dashboard', icon: 'layout', end: true }] },
  {
    group: 'Content',
    items: [
      { to: 'posts', label: 'Blog posts', icon: 'book', perm: 'blog' },
      { to: 'projects', label: 'Projects', icon: 'code', perm: 'projects' },
      { to: 'certificates', label: 'Certificates', icon: 'award', perm: 'certificates' },
      { to: 'testimonials', label: 'Testimonials', icon: 'quote', perm: 'testimonials' },
      { to: 'taxonomy', label: 'Categories & tags', icon: 'tag', perm: 'taxonomy' },
      { to: 'media', label: 'Media library', icon: 'image', perm: 'media' },
    ],
  },
  { group: 'Inbox', items: [{ to: 'messages', label: 'Contact inquiries', icon: 'inbox', perm: 'messages' }] },
  {
    group: 'Site',
    items: [
      { to: 'profile', label: 'Profile & résumé', icon: 'user', perm: 'profile' },
      { to: 'seo', label: 'SEO', icon: 'globe', perm: 'seo' },
      { to: 'settings', label: 'Website settings', icon: 'settings', perm: 'settings' },
    ],
  },
  {
    group: 'Security',
    items: [
      { to: 'admins', label: 'Admin accounts', icon: 'users', superOnly: true },
      { to: 'activity', label: 'Activity log', icon: 'activity', perm: 'activity' },
    ],
  },
  { group: 'Account', items: [{ to: 'account/password', label: 'Change password', icon: 'shield' }] },
];

export default function AdminLayout({ children }) {
  const { admin, can, isSuper, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => (i.superOnly ? isSuper : !i.perm || can(i.perm))) })).filter((g) => g.items.length);

  return (
    <div className={`admin ${open ? 'is-nav-open' : ''}`}>
      <aside className="a-side" aria-label="Admin navigation">
        <div className="a-side__brand">
          <span className="brand__mark">CMS</span>
          <span>
            <strong>Portfolio</strong>
            <span className="muted small">Content studio</span>
          </span>
        </div>
        <nav>
          {groups.map((g) => (
            <div key={g.group} className="a-side__group">
              <p className="a-side__label">{g.group}</p>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to ? `${ADMIN_PATH}/${i.to}` : ADMIN_PATH} end={i.end} className={({ isActive }) => `a-side__link ${isActive ? 'is-active' : ''}`}>
                  <Icon name={i.icon} size={17} /> {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="a-side__foot">
          <Link to="/" target="_blank" rel="noopener" className="a-side__link">
            <Icon name="external" size={17} /> View website
          </Link>
        </div>
      </aside>
      <div className="a-main">
        <header className="a-top">
          <button type="button" className="icon-btn a-top__menu" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation" aria-expanded={open}>
            <Icon name={open ? 'close' : 'menu'} />
          </button>
          <div className="a-top__user">
            <span className="a-avatar">{(admin.displayName || admin.email || '?')[0].toUpperCase()}</span>
            <span>
              <strong>{admin.displayName || admin.email}</strong>
              <span className="muted small">{admin.role === 'super_admin' ? 'Super admin' : 'Admin'}</span>
            </span>
          </div>
          <div className="a-top__actions">
            <ThemeToggle />
            <button type="button" className="btn btn--ghost btn--sm" onClick={signOut}>
              <Icon name="logout" size={15} /> Sign out
            </button>
          </div>
        </header>
        <main className="a-content">{children}</main>
      </div>
      <button type="button" className="a-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} />
    </div>
  );
}
