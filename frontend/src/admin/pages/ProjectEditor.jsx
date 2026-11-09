import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import RichEditor from '../components/RichEditor.jsx';
import MediaField, { GalleryField } from '../components/MediaField.jsx';
import PublishBox, { SeoPanel } from '../components/PublishBox.jsx';
import { TagInput, TextField } from '../components/Fields.jsx';
import { useContentEditor, useTaxonomy } from '../lib/useEditor.js';
import { ProjectVisual } from '../../components/content/ProjectCard.jsx';
import { ADMIN_PATH } from '../../lib/config.js';
import { safeHtml } from '../../lib/sanitize.js';
import { slugify } from '../../lib/format.js';

const BLANK = {
  title: '',
  slug: '',
  summary: '',
  description: '',
  coverImage: null,
  images: [],
  techStack: [],
  githubUrl: '',
  liveUrl: '',
  category: '',
  level: '',
  featured: false,
  status: 'draft',
  order: 0,
  publishedAt: null,
  seoTitle: '',
  seoDescription: '',
};

const TECH = ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'Python', 'C', 'C++', 'Firebase', 'Firestore', 'Cloudinary', 'Local Storage', 'Git'];
const urlOk = (u) => !u || /^https?:\/\//.test(u) || /^\/demos\/[\w-]+\/?(index\.html)?$/.test(u);

export default function ProjectEditor() {
  const ed = useContentEditor({
    endpoint: '/projects',
    route: 'projects',
    noun: 'project',
    blank: BLANK,
    validate: (p) =>
      !p.title.trim() ? 'Please add a title.' : !urlOk(p.githubUrl) || !urlOk(p.liveUrl) ? 'Links must start with https:// (or /demos/… for bundled demos).' : '',
  });
  const { categories } = useTaxonomy('project');
  const [preview, setPreview] = useState(false);
  const { item, setItem } = ed;
  const set = (k) => (v) => setItem({ ...item, [k]: v });

  if (ed.loading) return <Skeleton lines={8} />;
  if (ed.error) return <ErrorState error={ed.error} />;

  return (
    <div className="editor">
      <div className="editor__top">
        <Link to={`${ADMIN_PATH}/projects`} className="back-link">
          <Icon name="arrowLeft" size={15} /> All projects
        </Link>
      </div>
      <div className="editor__layout">
        <div className="editor__main">
          {preview ? (
            <div className="a-card preview-frame">
              <p className="preview-frame__label mono">Preview — not visible to visitors</p>
              <h1 className="page-title">{item.title || 'Untitled project'}</h1>
              <p className="page-lead">{item.summary}</p>
              <div className="project-hero-visual">
                <ProjectVisual project={item} />
              </div>
              <div className="prose" style={{ marginTop: 32 }} dangerouslySetInnerHTML={{ __html: safeHtml(item.description) }} />
            </div>
          ) : (
            <>
              <input className="editor__title" placeholder="Project name" value={item.title} onChange={(e) => set('title')(e.target.value)} maxLength={150} aria-label="Project name" />
              <div className="editor__slug mono">
                <span className="muted">/projects/</span>
                <input value={item.slug} placeholder={slugify(item.title) || 'url-slug'} onChange={(e) => set('slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-'))}
                  onBlur={(e) => set('slug')(slugify(e.target.value))} aria-label="URL slug" />
              </div>
              <TextField label="Summary" value={item.summary} onChange={set('summary')} multiline rows={2} maxLength={400} counter={180} hint="One or two sentences shown on project cards." />
              <div className="field">
                <span className="field__label">Case study / description</span>
                <RichEditor key={ed.id || 'new'} value={item.description} onChange={set('description')} folder="projects" placeholder="What does it do? What did you learn? How was it built?" />
              </div>
              <GalleryField label="Screenshots" folder="projects" value={item.images} onChange={set('images')} />
            </>
          )}
        </div>
        <aside className="editor__side">
          <PublishBox item={item} setItem={setItem} onSave={ed.save} saving={ed.saving} dirty={ed.dirty} isNew={ed.isNew} onDelete={ed.remove} preview={preview} setPreview={setPreview} publicUrl={`/projects/${item.slug}`} />
          <section className="a-card">
            <header className="a-card__head">
              <h2>Details</h2>
            </header>
            <TagInput label="Technology stack" value={item.techStack} onChange={set('techStack')} suggestions={TECH} max={30} />
            <TextField label="GitHub repository" type="url" value={item.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/…" />
            <TextField label="Live website" value={item.liveUrl} onChange={set('liveUrl')} placeholder="https://… or /demos/name/" hint="Bundled demos live under /demos/." />
            <div className="field">
              <label htmlFor="proj-cat">Category</label>
              <input id="proj-cat" list="proj-cats" value={item.category} onChange={(e) => set('category')(e.target.value)} maxLength={100} />
              <datalist id="proj-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <TextField label="Level" value={item.level} onChange={set('level')} placeholder="Beginner / Intermediate…" maxLength={60} />
            <TextField label="Sort order" type="number" min={0} max={10000} value={item.order} onChange={(v) => set('order')(Number(v) || 0)} hint="Lower numbers appear first." />
          </section>
          <section className="a-card">
            <MediaField label="Cover image" folder="projects" value={item.coverImage} onChange={set('coverImage')} hint="If empty, bundled demos show a live miniature instead." />
          </section>
          <SeoPanel item={item} setItem={setItem} fallbackTitle={item.title} fallbackDescription={item.summary} path={`/projects/${item.slug || slugify(item.title)}`} />
        </aside>
      </div>
    </div>
  );
}
