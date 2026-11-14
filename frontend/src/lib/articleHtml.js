import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import { safeHtml } from './sanitize.js';
import { cdn, slugify } from './format.js';
import { CODE_LANGUAGES } from './writing.js';

export { CODE_LANGUAGES };


const registered = { javascript, typescript, xml, css, c, cpp, python, java, json, bash, sql };
Object.entries(registered).forEach(([name, lang]) => hljs.registerLanguage(name, lang));
hljs.registerAliases(['html', 'jsx'], { languageName: 'xml' });
hljs.registerAliases(['js'], { languageName: 'javascript' });
hljs.registerAliases(['sh', 'shell'], { languageName: 'bash' });

const LABEL = Object.fromEntries(CODE_LANGUAGES.filter((l) => l.value).map((l) => [l.value, l.label]));

/** Make `base` unique within `used` (base, base-2, base-3 …). */
export function uniqueId(base, used) {
  const root = base || 'section';
  let id = root;
  for (let i = 2; used.has(id); i += 1) id = `${root}-${i}`;
  used.add(id);
  return id;
}

/**
 * Turn stored article HTML into reader-ready HTML.
 * The input is sanitized first (DOMPurify, on top of the server-side allow-list); everything
 * added afterwards is generated here from text content, so no untrusted markup is introduced.
 * Returns { html, toc } where toc lists the h2/h3 headings for the table of contents.
 */
export function enhanceArticle(raw = '') {
  const clean = safeHtml(raw);
  if (typeof DOMParser === 'undefined') return { html: clean, toc: [] };
  const doc = new DOMParser().parseFromString(`<div id="article-root">${clean}</div>`, 'text/html');
  const root = doc.getElementById('article-root');
  const toc = [];
  const used = new Set();

  root.querySelectorAll('h2, h3').forEach((h) => {
    const text = h.textContent.trim();
    if (!text) return;
    h.id = uniqueId(slugify(text), used);
    h.setAttribute('tabindex', '-1');
    toc.push({ id: h.id, text, level: h.tagName === 'H2' ? 2 : 3 });
  });

  root.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    const text = (code || pre).textContent.replace(/\n$/, '');
    const asked = ((code?.className || pre.className).match(/language-([\w-]+)/) || [])[1] || '';
    const lang = asked && hljs.getLanguage(asked) ? hljs.getLanguage(asked) : null;
    const name = lang ? Object.keys(registered).find((k) => hljs.getLanguage(k) === lang) : '';

    const wrap = doc.createElement('div');
    wrap.className = 'code-block';
    const bar = doc.createElement('div');
    bar.className = 'code-block__bar';
    const label = doc.createElement('span');
    label.className = 'code-block__lang';
    label.textContent = LABEL[name] || 'Code';
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'code-block__copy';
    btn.setAttribute('data-copy', '');
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.textContent = 'Copy';
    bar.append(label, btn);

    const newPre = doc.createElement('pre');
    newPre.setAttribute('tabindex', '0'); // scrollable region must be keyboard reachable
    const newCode = doc.createElement('code');
    newCode.className = `hljs${name ? ` language-${name}` : ''}`;
    // highlight.js escapes the source text; its output contains only <span class="hljs-…"> wrappers.
    newCode.innerHTML = name ? hljs.highlight(text, { language: name, ignoreIllegals: true }).value : escapeText(doc, text);
    newPre.append(newCode);
    wrap.append(bar, newPre);
    pre.replaceWith(wrap);
  });

  root.querySelectorAll('table').forEach((table) => {
    const wrap = doc.createElement('div');
    wrap.className = 'table-wrap';
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Table (scrolls horizontally)');
    table.replaceWith(wrap);
    wrap.append(table);
  });

  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    if (src.includes('res.cloudinary.com')) {
      img.setAttribute('src', cdn(src, { w: 1400, crop: 'limit' }));
      img.setAttribute('srcset', [640, 960, 1400].map((w) => `${cdn(src, { w, crop: 'limit' })} ${w}w`).join(', '));
      img.setAttribute('sizes', '(max-width: 760px) 100vw, 720px');
    }
  });

  return { html: root.innerHTML, toc };
}

function escapeText(doc, text) {
  const d = doc.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
