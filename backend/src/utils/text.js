import sanitizeHtml from 'sanitize-html';

export function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const stripHtml = (html = '') =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();

export function readingTime(html = '') {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function excerptFrom(html = '', max = 180) {
  const text = stripHtml(html);
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}

const YT_HOSTS = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'];

/** Strict allow-list for rich text written in the admin editor. */
export function sanitizeRichText(html = '') {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 's', 'u', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'hr', 'br', 'div', 'iframe', 'span',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      iframe: ['src', 'width', 'height', 'allowfullscreen', 'allow', 'frameborder', 'title', 'loading'],
      div: ['data-youtube-video'],
      p: ['class'],
      pre: ['class'],
      code: ['class'],
    },
    allowedClasses: {
      p: ['caption'],
      pre: [/^language-[\w-]+$/],
      code: [/^language-[\w-]+$/],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https', 'http'], iframe: ['https'] },
    allowedIframeHostnames: YT_HOSTS,
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const external = /^https?:/i.test(attribs.href || '');
        return {
          tagName,
          attribs: external ? { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' } : attribs,
        };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
  });
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
