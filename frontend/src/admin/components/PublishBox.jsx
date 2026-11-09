import Icon from '../../components/ui/Icon.jsx';
import { StatusBadge } from './Feedback.jsx';
import { Toggle } from './Fields.jsx';
import { formatDateTime, publishState } from '../../lib/format.js';

const pad = (n) => String(n).padStart(2, '0');
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

/**
 * Sidebar card for publish state: draft / publish / schedule / unpublish,
 * featured flag, preview and delete.
 */
export default function PublishBox({ item, setItem, onSave, saving, dirty, isNew, onDelete, preview, setPreview, publicUrl }) {
  const state = isNew ? 'draft' : publishState(item);
  const future = item.publishedAt && new Date(item.publishedAt).getTime() > Date.now();
  const live = item.status === 'published';

  return (
    <section className="a-card publish-box">
      <header className="a-card__head">
        <h2>Publish</h2>
        <StatusBadge state={state} />
      </header>
      <div className="field">
        <label htmlFor="pub-date">{live ? 'Publish date' : 'Schedule for (optional)'}</label>
        <input id="pub-date" type="datetime-local" value={toLocalInput(item.publishedAt)} onChange={(e) => setItem({ ...item, publishedAt: fromLocalInput(e.target.value) })} />
        <p className="field__hint">
          {future ? `Goes live ${formatDateTime(item.publishedAt)} once published.` : 'Leave empty to publish immediately.'}
        </p>
      </div>
      <Toggle label="Featured" checked={item.featured} onChange={(v) => setItem({ ...item, featured: v })} />
      <div className="publish-box__actions">
        {!live ? (
          <>
            <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => onSave('draft')}>
              {saving === 'draft' ? 'Saving…' : 'Save draft'}
            </button>
            <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={() => onSave('published')}>
              {saving === 'published' ? 'Publishing…' : future ? 'Schedule' : 'Publish'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => onSave('draft')}>
              {saving === 'draft' ? 'Saving…' : 'Unpublish'}
            </button>
            <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={() => onSave('published')}>
              {saving === 'published' ? 'Saving…' : 'Update'}
            </button>
          </>
        )}
      </div>
      {dirty && <p className="field__hint">You have unsaved changes.</p>}
      <div className="publish-box__links">
        <button type="button" className="btn btn--text btn--sm" onClick={() => setPreview(!preview)}>
          <Icon name="eye" size={15} /> {preview ? 'Back to editor' : 'Preview'}
        </button>
        {!isNew && state === 'published' && publicUrl && (
          <a className="btn btn--text btn--sm" href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={15} /> View live
          </a>
        )}
        {!isNew && (
          <button type="button" className="btn btn--text btn--sm danger-text" onClick={onDelete}>
            <Icon name="trash" size={15} /> Delete
          </button>
        )}
      </div>
    </section>
  );
}

export function SeoPanel({ item, setItem, fallbackTitle, fallbackDescription, path }) {
  const title = item.seoTitle || fallbackTitle || 'Untitled';
  const desc = item.seoDescription || fallbackDescription || '';
  return (
    <section className="a-card">
      <header className="a-card__head">
        <h2>SEO</h2>
      </header>
      <div className="serp" aria-label="Search result preview">
        <span className="serp__url">{`${window.location.host}${path}`}</span>
        <span className="serp__title">{title.slice(0, 65)}</span>
        <span className="serp__desc">{desc.slice(0, 160) || 'Add a description to control how this page appears in search results.'}</span>
      </div>
      <div className="field">
        <label htmlFor="seo-t">
          SEO title <span className={`counter ${(item.seoTitle || '').length > 60 ? 'is-over' : ''}`}>{(item.seoTitle || '').length}/60</span>
        </label>
        <input id="seo-t" value={item.seoTitle || ''} maxLength={120} placeholder={fallbackTitle} onChange={(e) => setItem({ ...item, seoTitle: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="seo-d">
          Meta description <span className={`counter ${(item.seoDescription || '').length > 160 ? 'is-over' : ''}`}>{(item.seoDescription || '').length}/160</span>
        </label>
        <textarea id="seo-d" rows={3} maxLength={300} value={item.seoDescription || ''} placeholder={fallbackDescription} onChange={(e) => setItem({ ...item, seoDescription: e.target.value })} />
      </div>
    </section>
  );
}
