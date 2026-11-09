import { useCallback, useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { cdn } from '../../lib/format.js';

/** Accessible image viewer: Esc closes, ←/→ navigate, focus is trapped on the dialog. */
export default function Lightbox({ items, index, onClose, onIndex }) {
  const ref = useRef(null);
  const item = items[index];
  const go = useCallback((d) => onIndex((index + d + items.length) % items.length), [index, items.length, onIndex]);

  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (!item) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={item.title} onClick={onClose}>
      <div className="lightbox__inner" ref={ref} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <img src={cdn(item.url, { w: 1600, crop: 'limit' })} alt={item.alt || item.title} />
        <div className="lightbox__bar">
          <div>
            <strong>{item.title}</strong>
            {item.meta && <span>{item.meta}</span>}
          </div>
          <div className="lightbox__actions">
            <span className="mono muted">
              {index + 1} / {items.length}
            </span>
            {items.length > 1 && (
              <>
                <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Previous">
                  <Icon name="arrowLeft" />
                </button>
                <button type="button" className="icon-btn" onClick={() => go(1)} aria-label="Next">
                  <Icon name="arrowRight" />
                </button>
              </>
            )}
            <a className="icon-btn" href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open full size">
              <Icon name="external" />
            </a>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
