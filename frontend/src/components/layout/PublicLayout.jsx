import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { PageLoader } from '../ui/States.jsx';
import { useSite } from '../../context/SiteContext.jsx';

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setP(max > 0 ? scrollY / max : 0);
    };
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  return <div className="scroll-progress" style={{ transform: `scaleX(${p})` }} aria-hidden="true" />;
}

export default function PublicLayout() {
  const { pathname, hash } = useLocation();
  const { site } = useSite();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollProgress />
      {site.announcement && <div className="announcement">{site.announcement}</div>}
      <Header />
      <main id="main" className="page-enter" key={pathname}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
