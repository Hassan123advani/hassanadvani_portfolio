export function formatDate(value, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB', opts);
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(value) {
  const d = new Date(value).getTime();
  if (!d) return '';
  const s = Math.round((Date.now() - d) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [u, sec] of units) {
    const n = Math.floor(Math.abs(s) / sec);
    if (n >= 1) return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(s > 0 ? -n : n, u);
  }
  return 'just now';
}

export function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function readingTime(html = '') {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export const bytes = (n = 0) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n > 1e3 ? `${Math.round(n / 1e3)} KB` : `${n} B`;

/** Status a visitor would see: drafts, scheduled (future date) or live. */
export function publishState(item) {
  if (item?.status !== 'published') return 'draft';
  if (item.publishedAt && new Date(item.publishedAt).getTime() > Date.now()) return 'scheduled';
  return 'published';
}

/** Extract a YouTube video id from a URL or bare id. */
export function youtubeId(input = '') {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : '';
}

/** Cloudinary on-the-fly resize for delivery URLs; leaves other URLs untouched. */
export function cdn(url, { w, h, crop = 'fill' } = {}) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  const t = ['f_auto', 'q_auto', w && `w_${w}`, h && `h_${h}`, (w || h) && `c_${crop}`].filter(Boolean).join(',');
  return url.replace('/upload/', `/upload/${t}/`);
}
