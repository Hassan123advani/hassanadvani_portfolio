import DOMPurify from 'dompurify';

const YT = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//;

let hooked = false;
function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe' && !YT.test(node.getAttribute('src') || '')) node.remove();
  });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') || '')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
    if (node.tagName === 'IFRAME') {
      node.setAttribute('loading', 'lazy');
      node.setAttribute('allowfullscreen', 'true');
    }
  });
}

/** Second layer of defence: the API already sanitizes, the browser sanitizes again before rendering. */
export function safeHtml(html = '') {
  ensureHooks();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target', 'data-youtube-video', 'loading'],
    FORBID_TAGS: ['style', 'form', 'input', 'script'],
  });
}
