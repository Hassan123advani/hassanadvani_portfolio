import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { ArticleView } from '../../pages/BlogPost.jsx';
import RichEditor from '../components/RichEditor.jsx';
import MediaField, { GalleryField } from '../components/MediaField.jsx';
import PublishBox, { SeoPanel } from '../components/PublishBox.jsx';
import { TagInput, TextField } from '../components/Fields.jsx';
import { useContentEditor, useTaxonomy } from '../lib/useEditor.js';
import { useAuth } from '../AuthContext.jsx';
import { ADMIN_PATH } from '../../lib/config.js';
import { readingTime, slugify } from '../../lib/format.js';

const BLANK = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: null,
  ogImage: null,
  gallery: [],
  category: '',
  tags: [],
  seoTitle: '',
  seoDescription: '',
  featured: false,
  status: 'draft',
  publishedAt: null,
  author: '',
};

export default function PostEditor() {
  const { admin } = useAuth();
  const ed = useContentEditor({
    endpoint: '/posts',
    route: 'posts',
    noun: 'article',
    blank: BLANK,
    validate: (p) => (!p.title.trim() ? 'Please add a title.' : p.status === 'published' && !p.content ? 'Write some content before publishing.' : ''),
  });
  const { categories, tags } = useTaxonomy('post');
  const [preview, setPreview] = useState(false);
  const { item, setItem } = ed;
  const set = (k) => (v) => setItem({ ...item, [k]: v });

  if (ed.loading) return <Skeleton lines={8} />;
  if (ed.error) return <ErrorState error={ed.error} />;

  return (
    <div className="editor">
      <div className="editor__top">
        <Link to={`${ADMIN_PATH}/posts`} className="back-link">
          <Icon name="arrowLeft" size={15} /> All articles
        </Link>
      </div>
      <div className="editor__layout">
        <div className="editor__main">
          {preview ? (
            <div className="a-card preview-frame">
              <p className="preview-frame__label mono">Preview — not visible to visitors</p>
              <ArticleView post={{ ...item, author: item.author || admin.displayName, readingTime: readingTime(item.content) }} preview />
            </div>
          ) : (
            <>
              <input className="editor__title" placeholder="Article title" value={item.title} onChange={(e) => set('title')(e.target.value)} maxLength={200} aria-label="Title" />
              <div className="editor__slug mono">
                <span className="muted">/blog/</span>
                <input value={item.slug} placeholder={slugify(item.title) || 'url-slug'} onChange={(e) => set('slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-'))}
                  onBlur={(e) => set('slug')(slugify(e.target.value))} aria-label="URL slug" />
              </div>
              <TextField label="Excerpt" value={item.excerpt} onChange={set('excerpt')} multiline rows={2} maxLength={400} counter={200} hint="Shown on cards and under the title. Generated from the content if left empty." />
              <RichEditor key={ed.id || 'new'} value={item.content} onChange={set('content')} folder="posts" placeholder="Start writing… Use the toolbar to add headings, images, code and YouTube videos." />
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
            publicUrl={`/blog/${item.slug}`}
          />
          <section className="a-card">
            <header className="a-card__head">
              <h2>Organise</h2>
            </header>
            <div className="field">
              <label htmlFor="post-cat">Category</label>
              <input id="post-cat" list="post-cats" value={item.category} onChange={(e) => set('category')(e.target.value)} maxLength={100} placeholder="e.g. Learning notes" />
              <datalist id="post-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <TagInput label="Tags" value={item.tags} onChange={set('tags')} suggestions={tags} max={20} />
            <TextField label="Author" value={item.author} onChange={set('author')} placeholder={admin.displayName || 'Your name'} maxLength={100} />
          </section>
          <section className="a-card">
            <MediaField label="Cover image" folder="posts" value={item.coverImage} onChange={set('coverImage')} withCaption />
            <MediaField label="Social share image (Open Graph)" folder="posts" value={item.ogImage} onChange={set('ogImage')} hint="1200×630 recommended. Falls back to the cover image." />
          </section>
          <SeoPanel item={item} setItem={setItem} fallbackTitle={item.title} fallbackDescription={item.excerpt} path={`/blog/${item.slug || slugify(item.title)}`} />
        </aside>
      </div>
    </div>
  );
}
