import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import portfolio from '../content/portfolio.json';

const SiteContext = createContext(null);

const merge = (base, remote) => (remote ? { ...base, ...remote } : base);

/**
 * Loads profile / site / SEO settings from the API once. Until it answers
 * (or if the API is unreachable) the bundled real content is shown.
 */
export function SiteProvider({ children }) {
  const [state, setState] = useState({
    profile: portfolio.profile,
    site: portfolio.site,
    seo: portfolio.seo,
    source: 'loading',
  });

  useEffect(() => {
    let alive = true;
    api
      .get('/public/settings')
      .then((r) => {
        if (!alive) return;
        setState({
          profile: merge(portfolio.profile, r.profile),
          site: merge(portfolio.site, r.site),
          seo: merge(portfolio.seo, r.seo),
          source: r.profile ? 'live' : 'fallback',
        });
      })
      .catch(() => alive && setState((s) => ({ ...s, source: 'fallback' })));
    return () => {
      alive = false;
    };
  }, []);

  return <SiteContext.Provider value={state}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);
