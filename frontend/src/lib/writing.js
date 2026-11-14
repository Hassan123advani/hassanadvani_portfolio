import { slugify } from './format.js';

/** Categories always offered as filters; admins can add more under "Categories & tags". */
export const DEFAULT_CATEGORIES = [
  'Web Development',
  'Programming',
  'JavaScript',
  'C Programming',
  'React',
  'Firebase',
  'Artificial Intelligence',
  'Technology',
  'My Journey',
];

/** Defaults first, then any extra categories from the API; de-duplicated by slug. */
export function mergeCategories(extra = []) {
  const seen = new Set();
  return [...DEFAULT_CATEGORIES, ...extra].filter((c) => {
    const k = slugify(c);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const articlePath = (slug) => `/writing/${slug}`;

/** Show "Updated" only when the article changed meaningfully after it went live (a day or more). */
export function wasUpdated(post) {
  const pub = new Date(post?.publishedAt).getTime();
  const upd = new Date(post?.updatedAt).getTime();
  return Boolean(pub && upd && upd - pub > 86_400_000);
}

/** Languages offered in the editor's code-block menu (value = highlight.js name). */
export const CODE_LANGUAGES = [
  { value: '', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'xml', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Shell' },
  { value: 'sql', label: 'SQL' },
];
