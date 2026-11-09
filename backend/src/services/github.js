import { env } from '../config/env.js';
import { HttpError } from '../utils/errors.js';

const TTL = 15 * 60 * 1000;
let cache = { at: 0, data: null };

/** Public repositories for the configured GitHub user, cached for 15 minutes. */
export async function getRepos({ fetchImpl = fetch } = {}) {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;

  const headers = { 'User-Agent': 'portfolio-backend', Accept: 'application/vnd.github+json' };
  if (env.github.token) headers.Authorization = `Bearer ${env.github.token}`;

  const user = encodeURIComponent(env.github.username);
  const [profileRes, reposRes] = await Promise.all([
    fetchImpl(`https://api.github.com/users/${user}`, { headers }),
    fetchImpl(`https://api.github.com/users/${user}/repos?sort=updated&per_page=100`, { headers }),
  ]);
  if (!reposRes.ok || !profileRes.ok) {
    if (cache.data) return cache.data; // serve stale rather than fail
    throw new HttpError(502, 'GitHub is not reachable right now.', 'GITHUB_UNAVAILABLE');
  }
  const profile = await profileRes.json();
  const repos = await reposRes.json();

  const data = {
    profile: {
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      url: profile.html_url,
      publicRepos: profile.public_repos,
      followers: profile.followers,
    },
    repos: repos
      .filter((r) => !r.fork && !r.archived)
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        url: r.html_url,
        homepage: r.homepage || null,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        topics: r.topics || [],
        updatedAt: r.pushed_at || r.updated_at,
      })),
    fetchedAt: new Date().toISOString(),
  };
  cache = { at: Date.now(), data };
  return data;
}

export const _resetGithubCache = () => {
  cache = { at: 0, data: null };
};
