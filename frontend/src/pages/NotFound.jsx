import { Link, useLocation } from 'react-router-dom';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';

export default function NotFound({ what = 'page' }) {
  const { pathname } = useLocation();
  return (
    <section className="not-found">
      <Seo title="Not found" noindex />
      <div className="container">
        <p className="not-found__code mono" aria-hidden="true">
          4<span>0</span>4
        </p>
        <div className="console not-found__console">
          <div className="console__bar" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="console__body mono">
            <p>
              <b>$</b> cd {pathname}
            </p>
            <p className="console__out console__out--err">bash: cd: {pathname}: No such {what}</p>
            <p>
              <b>$</b> <span className="caret" aria-hidden="true" />
            </p>
          </div>
        </div>
        <h1 className="page-title">This {what} doesn’t exist.</h1>
        <p className="page-lead">It may have moved, been unpublished, or the link has a typo.</p>
        <div className="hero__actions">
          <Link to="/" className="btn btn--primary">
            <Icon name="arrowLeft" size={16} /> Back home
          </Link>
          <Link to="/projects" className="btn btn--ghost">
            Browse projects
          </Link>
          <Link to="/contact" className="btn btn--text">
            Report a broken link
          </Link>
        </div>
      </div>
    </section>
  );
}
