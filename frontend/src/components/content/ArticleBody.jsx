import { useState } from 'react';
import Lightbox from '../ui/Lightbox.jsx';
import { safeHtml } from '../../lib/sanitize.js';
import { cdn } from '../../lib/format.js';

/** Renders sanitized article HTML plus an optional image gallery. */
export default function ArticleBody({ html = '', gallery = [] }) {
  const [open, setOpen] = useState(-1);
  const items = gallery.map((g) => ({ ...g, title: g.caption || g.alt || 'Image' }));
  return (
    <>
      <div className="prose" dangerouslySetInnerHTML={{ __html: safeHtml(html) }} />
      {items.length > 0 && (
        <div className="gallery gallery--article">
          {items.map((g, i) => (
            <figure key={`${g.url}-${i}`}>
              <button type="button" className="gallery__item" onClick={() => setOpen(i)} aria-label={`Open image ${i + 1}`}>
                <img src={cdn(g.url, { w: 800, h: 560 })} alt={g.alt || ''} loading="lazy" />
              </button>
              {g.caption && <figcaption>{g.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {open >= 0 && <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} />}
    </>
  );
}
