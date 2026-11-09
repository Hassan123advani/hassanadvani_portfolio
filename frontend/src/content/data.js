import { api } from '../lib/api.js';
import portfolio from './portfolio.json';

/** Bundled real content, used only when the API is unreachable. */
const published = (list) => list.filter((x) => x.status === 'published').map((x, i) => ({ id: x.slug || `local-${i}`, ...x }));
export const localProjects = () => published(portfolio.projects).sort((a, b) => a.order - b.order);
export const localCertificates = () => published(portfolio.certificates).sort((a, b) => a.order - b.order);

export const loaders = {
  projects: () => api.get('/public/projects').then((r) => r.items),
  project: (slug) => api.get(`/public/projects/${encodeURIComponent(slug)}`),
  certificates: () => api.get('/public/certificates').then((r) => r.items),
  testimonials: () => api.get('/public/testimonials').then((r) => r.items),
  posts: (params) => api.get(`/public/posts?${new URLSearchParams(params)}`),
  post: (slug) => api.get(`/public/posts/${encodeURIComponent(slug)}`),
  github: async () => {
    try {
      return await api.get('/public/github');
    } catch (err) {
      if (!err.offline) throw err;
      return githubDirect();
    }
  },
};

export function localProject(slug) {
  const items = localProjects();
  const idx = items.findIndex((p) => p.slug === slug);
  if (idx === -1) return null;
  const pick = (p) => (p ? { slug: p.slug, title: p.title } : null);
  return { item: items[idx], prev: pick(items[idx - 1]), next: pick(items[idx + 1]) };
}

/** Browser fallback straight to GitHub's public API (60 req/hour per visitor). */
async function githubDirect() {
  const user = 'Hassan123advani';
  const [p, r] = await Promise.all([
    fetch(`https://api.github.com/users/${user}`).then((x) => (x.ok ? x.json() : Promise.reject(new Error('GitHub unavailable')))),
    fetch(`https://api.github.com/users/${user}/repos?sort=updated&per_page=100`).then((x) =>
      x.ok ? x.json() : Promise.reject(new Error('GitHub unavailable')),
    ),
  ]);
  return {
    profile: { login: p.login, name: p.name, avatarUrl: p.avatar_url, url: p.html_url, publicRepos: p.public_repos, followers: p.followers },
    repos: r
      .filter((x) => !x.fork && !x.archived)
      .map((x) => ({
        id: x.id,
        name: x.name,
        description: x.description,
        url: x.html_url,
        homepage: x.homepage,
        language: x.language,
        stars: x.stargazers_count,
        forks: x.forks_count,
        topics: x.topics || [],
        updatedAt: x.pushed_at || x.updated_at,
      })),
    fetchedAt: new Date().toISOString(),
  };
}

export { portfolio };
