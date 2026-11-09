import { useMemo, useState } from 'react';
import Seo from '../components/ui/Seo.jsx';
import Icon from '../components/ui/Icon.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import { CardSkeletons, EmptyState, ErrorState } from '../components/ui/States.jsx';
import { useApi } from '../hooks/useApi.js';
import { loaders } from '../content/data.js';
import { timeAgo } from '../lib/format.js';

const SORTS = { updated: 'Recently updated', stars: 'Most stars', name: 'Name' };

export default function Github() {
  const { data, loading, error, reload } = useApi(loaders.github, []);
  const [lang, setLang] = useState('All');
  const [sort, setSort] = useState('updated');

  const languages = useMemo(() => ['All', ...new Set((data?.repos || []).map((r) => r.language).filter(Boolean))], [data]);
  const repos = useMemo(() => {
    const list = (data?.repos || []).filter((r) => lang === 'All' || r.language === lang);
    const by = {
      updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      stars: (a, b) => b.stars - a.stars,
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return [...list].sort(by);
  }, [data, lang, sort]);

  const profile = data?.profile;
  return (
    <>
      <Seo title="GitHub" description="Live public repositories from GitHub." />
      <section className="page-hero">
        <div className="container gh-hero">
          <div>
            <p className="kicker">Open source</p>
            <h1 className="page-title">
              Live from <em>GitHub.</em>
            </h1>
            <p className="page-lead">Public repositories, pulled straight from GitHub and refreshed automatically.</p>
          </div>
          {profile && (
            <Reveal as="a" className="gh-profile" href={profile.url} target="_blank" rel="noopener noreferrer">
              <img src={profile.avatarUrl} alt="" width="56" height="56" />
              <span>
                <strong>{profile.name || profile.login}</strong>
                <span className="mono muted">@{profile.login}</span>
              </span>
              <span className="gh-profile__stats mono">
                <span>{profile.publicRepos} repos</span>
                <span>{profile.followers} followers</span>
              </span>
              <Icon name="arrow" />
            </Reveal>
          )}
        </div>
      </section>
      <section className="section section--flush">
        <div className="container">
          {data && (
            <div className="toolbar">
              <div className="filters" role="toolbar" aria-label="Filter by language">
                {languages.map((l) => (
                  <button key={l} type="button" className={`filter ${lang === l ? 'is-active' : ''}`} aria-pressed={lang === l} onClick={() => setLang(l)}>
                    {l}
                  </button>
                ))}
              </div>
              <label className="select-inline">
                <span className="sr-only">Sort repositories</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {Object.entries(SORTS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {loading && <CardSkeletons count={6} className="repo-grid" />}
          {error && <ErrorState title="GitHub could not be reached" error={error} onRetry={reload} />}
          {!loading && !error && repos.length === 0 && (
            <EmptyState icon="github" title="No public repositories to show" action={profile && <a className="btn btn--ghost btn--sm" href={profile.url} target="_blank" rel="noopener noreferrer">Open GitHub profile</a>} />
          )}
          {repos.length > 0 && (
            <div className="repo-grid">
              {repos.map((r, i) => (
                <Reveal as="article" key={r.id} className="repo-card" delay={(i % 3) * 60}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="repo-card__name">
                    <Icon name="github" size={15} /> {r.name}
                  </a>
                  <p className="muted">{r.description || 'No description yet.'}</p>
                  {r.topics?.length > 0 && (
                    <ul className="chips">
                      {r.topics.slice(0, 4).map((t) => (
                        <li key={t} className="chip">
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="repo-card__meta mono">
                    {r.language && <span>{r.language}</span>}
                    <span>
                      <Icon name="star" size={13} /> {r.stars}
                    </span>
                    <span>
                      <Icon name="fork" size={13} /> {r.forks}
                    </span>
                    <span>{timeAgo(r.updatedAt)}</span>
                  </p>
                  {r.homepage && (
                    <a className="link-arrow small" href={r.homepage} target="_blank" rel="noopener noreferrer">
                      Live site <Icon name="arrow" size={13} />
                    </a>
                  )}
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
