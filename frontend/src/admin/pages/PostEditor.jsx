import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { ArticleView } from '../../pages/Article.jsx';
import RichEditor from '../components/RichEditor.jsx';
import MediaField, { GalleryField } from '../components/MediaField.jsx';
import PublishBox, { SeoPanel } from '../components/PublishBox.jsx';
import { TagInput, TextField } from '../components/Fields.jsx';
import { useContentEditor, useTaxonomy } from '../lib/useEditor.js';
import { useAuth } from '../AuthContext.jsx';
import { ADMIN_PATH } from '../../lib/config.js';
import { formatDateTime, readingTime, slugify } from '../../lib/format.js';
import { mergeCategories } from '../../lib/writing.js';
import '../../styles/writing.css';

const BLANK = {
  title: '',
  slug: '',
  subtitle: '',
  excerpt: '',
  content: '',
  coverImage: null,
  ogImage: null,
  gallery: [],
  category: '',
  tags: [],
  seoTitle: '',
  seoDescription: '',
  seoKeywords: [],
  readingTimeOverride: 0,
  featured: false,
  status: 'draft',
  publishedAt: null,
  author: '',
};

/* ---------- Local autosave: a backup in this browser, restored on request ---------- */
const UNSET = Symbol('unset');
const backupKey = (id) => `writing-backup:${id || 'new'}`;
function readBackup(id) {
  try {
    return JSON.parse(localStorage.getItem(backupKey(id)) || 'null');
  } catch {
    return null;
  }
}
function writeBackup(id, item) {
  try {
    localStorage.setItem(backupKey(id), JSON.stringify({ savedAt: new Date().toISOString(), item }));
  } catch {
    /* storage full or blocked: autosave is a convenience only */
  }
}
function clearBackup(id) {
  try {
    localStorage.removeItem(backupKey(id));
  } catch {
    /* ignore */
  }
}

export default function PostEditor() {
  const { admin } = useAuth();
  const ed = useContentEditor({
    endpoint: '/posts',
    route: 'writing',
    noun: 'article',
    blank: BLANK,
    validate: (p) => (!p.title.trim() ? 'Please add a title.' : p.status === 'published' && !p.content ? 'Write some content before publishing.' : ''),
  });
  const { categories, tags } = useTaxonomy('post');
  const [preview, setPreview] = useState(false);
  const [restore, setRestore] = useState(null);
  const [autosavedAt, setAutosavedAt] = useState(null);
  const [editorKey, setEditorKey] = useState(0);
  const checked = useRef(null);
  const { item, setItem } = ed;
  const set = (k) => (v) => setItem({ ...item, [k]: v });

  // Offer to restore a local backup that differs from what's saved on the server.
  useEffect(() => {
    if (ed.loading || checked.current === (ed.id || 'new')) return;
    checked.current = ed.id || 'new';
    const b = readBackup(ed.id);
    if (!b?.item) return;
    const serverTime = new Date(item.updatedAt || 0).getTime();
    const differs = JSON.stringify(b.item) !== JSON.stringify(item);
    if (differs && new Date(b.savedAt).getTime() > serverTime && (b.item.title || b.item.content)) setRestore(b);
    else clearBackup(ed.id);
  }, [ed.loading, ed.id, item]);

  // Autosave unsaved edits locally every few seconds.
  useEffect(() => {
    if (!ed.dirty || restore) return undefined;
    const t = setTimeout(() => {
      writeBackup(ed.id, item);
      setAutosavedAt(new Date());
    }, 2500);
    return () => clearTimeout(t);
  }, [item, ed.dirty, ed.id, restore]);

  // A successful save (the server's updatedAt changes) makes the local backup redundant.
  const lastSaved = useRef(UNSET);
  useEffect(() => {
    if (ed.loading || ed.dirty) return;
    if (lastSaved.current !== UNSET && lastSaved.current !== item.updatedAt) {
      clearBackup(ed.id);
      clearBackup(null); // a brand-new article that just received its id
      setAutosavedAt(null);
    }
    lastSaved.current = item.updatedAt;
  }, [ed.dirty, ed.loading, ed.id, item.updatedAt]);

  if (ed.loading) return <Skeleton lines={8} />;
  if (ed.error) return <ErrorState error={ed.error} />;

  const autoMinutes = readingTime(item.content);
  const path = `/writing/${item.slug || slugify(item.title) || 'url-slug'}`;
  const categoryOptions = mergeCategories(categories);

  return (
    <div className="editor">
      <div className="editor__top">
        <Link to={`${ADMIN_PATH}/writing`} className="back-link">
          <Icon name="arrowLeft" size={15} /> Writing dashboard
        </Link>
        <span className="muted small mono" aria-live="polite">
          {ed.dirty ? (autosavedAt ? `Unsaved changes · backed up locally ${formatDateTime(autosavedAt)}` : 'Unsaved changes') : item.updatedAt ? `Saved ${formatDateTime(item.updatedAt)}` : ''}
        </span>
      </div>

      {restore && (
        <div className="a-card a-callout wa-restore" role="alert">
          <Icon name="refresh" size={20} />
          <div>
            <h3>Restore unsaved changes?</h3>
            <p className="muted">This browser has a newer local copy of this article from {formatDateTime(restore.savedAt)} that was never saved.</p>
            <div className="wa-restore__actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  setItem({ ...item, ...restore.item });
                  setEditorKey((k) => k + 1);
                  setRestore(null);
                }}
              >
                Restore local copy
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  clearBackup(ed.id);
                  setRestore(null);
                }}
              >
                Discard it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="editor__layout">
        <div className="editor__main">
          {preview ? (
            <div className="a-card preview-frame">
              <p className="preview-frame__label mono">Live preview — not visible to visitors</p>
              <ArticleView post={{ ...item, author: item.author || admin.displayName, readingTime: item.readingTimeOverride || autoMinutes }} preview />
            </div>
          ) : (
            <>
              <input className="editor__title" placeholder="Article title" value={item.title} onChange={(e) => set('title')(e.target.value)} maxLength={200} aria-label="Title" />
              <div className="editor__slug mono">
                <span className="muted">/writing/</span>
                <input
                  value={item.slug}
                  placeholder={slugify(item.title) || 'url-slug'}
                  onChange={(e) => set('slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-'))}
                  onBlur={(e) => set('slug')(slugify(e.target.value))}
                  aria-label="URL slug"
                />
              </div>
              <TextField label="Subtitle" value={item.subtitle} onChange={set('subtitle')} maxLength={300} hint="A one-line standfirst shown under the title on the article page." />
              <TextField label="Excerpt" value={item.excerpt} onChange={set('excerpt')} multiline rows={2} maxLength={400} counter={200} hint="Shown on article cards and in search results. Generated from the content if left empty." />
              <RichEditor key={`${ed.id || 'new'}-${editorKey}`} value={item.content} onChange={set('content')} folder="posts" placeholder="Start writing… Use the toolbar for headings, lists, links, quotes, code, tables, images and videos." />
              <GalleryField label="Image gallery (shown after the article)" folder="posts" value={item.gallery} onChange={set('gallery')} />
            </>
          )}
        </div>
        <aside className="editor__side">
          <PublishBox
            item={item}
            setItem={setItem}
            onSave={ed.save}
            saving={ed.saving}
            dirty={ed.dirty}
            isNew={ed.isNew}
            onDelete={ed.remove}
            preview={preview}
            setPreview={setPreview}
            publicUrl={`/writing/${item.slug}`}
          />
          <section className="a-card">
            <header className="a-card__head">
              <h2>Organise</h2>
            </header>
            <div className="field">
              <label htmlFor="post-cat">Category</label>
              <input id="post-cat" list="post-cats" value={item.category} onChange={(e) => set('category')(e.target.value)} maxLength={100} placeholder="Pick one or type a new category" />
              <datalist id="post-cats">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="field__hint">A new name creates a new filter on the Writing page. Manage the list under Categories &amp; tags.</p>
            </div>
            <TagInput label="Tags" value={item.tags} onChange={set('tags')} suggestions={tags} max={20} />
            <TextField label="Author" value={item.author} onChange={set('author')} placeholder={admin.displayName || 'Your name'} maxLength={100} />
            <div className="field">
              <label htmlFor="post-rt">Reading time (minutes)</label>
              <input
                id="post-rt"
                type="number"
                min={0}
                max={240}
                value={item.readingTimeOverride || ''}
                placeholder={`Auto: ${autoMinutes} min`}
                onChange={(e) => set('readingTimeOverride')(Math.max(0, Math.min(240, Number(e.target.value) || 0)))}
              />
              <p className="field__hint">Leave empty to calculate it from the content (~220 words per minute).</p>
            </div>
          </section>
          <section className="a-card">
            <MediaField label="Cover image" folder="posts" value={item.coverImage} onChange={set('coverImage')} withCaption hint="Uploaded to Cloudinary. Add alt text that describes the image for screen readers." />
            <MediaField label="Social share image (Open Graph)" folder="posts" value={item.ogImage} onChange={set('ogImage')} hint="1200×630 recommended. Falls back to the cover image." />
          </section>
          <SeoPanel item={item} setItem={setItem} fallbackTitle={item.title} fallbackDescription={item.excerpt} path={path} />
          <section className="a-card">
            <TagInput label="SEO keywords" value={item.seoKeywords} onChange={set('seoKeywords')} max={15} hint="Optional. A few phrases people might search for." />
          </section>
        </aside>
      </div>
    </div>
  );
}
