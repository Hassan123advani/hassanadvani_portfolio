import { useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { Modal, PageHeader, useConfirm, useToast } from '../components/Feedback.jsx';
import { useCollection } from '../lib/useCollection.js';
import { useAuth } from '../AuthContext.jsx';
import { uploadFile } from '../lib/upload.js';
import { adminApi, describeError } from '../../lib/api.js';
import { bytes, cdn, formatDateTime } from '../../lib/format.js';

const FOLDERS = ['media', 'posts', 'projects', 'certificates', 'profile', 'resume', 'video'];

export default function Media() {
  const { integrations } = useAuth();
  const { items, loading, error, reload, setItems } = useCollection('/media');
  const [folder, setFolder] = useState('all');
  const [type, setType] = useState('all');
  const [target, setTarget] = useState('media');
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState(null);
  const input = useRef(null);
  const toast = useToast();
  const confirm = useConfirm();

  const list = items.filter((m) => (folder === 'all' || m.folder === folder) && (type === 'all' || m.resourceType === type));

  async function onFiles(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    for (const [i, f] of files.entries()) {
      setBusy(`Uploading ${i + 1}/${files.length}`);
      try {
        const item = await uploadFile(f, target, { onProgress: (p) => setBusy(`Uploading ${i + 1}/${files.length} · ${p}%`) });
        setItems((xs) => [item, ...xs.filter((x) => x.id !== item.id)]);
      } catch (err) {
        toast.error(`${f.name}: ${err.message}`);
      }
    }
    setBusy(null);
  }

  async function saveMeta() {
    try {
      const { item } = await adminApi.patch(`/media/${selected.id}`, { alt: selected.alt || '', title: selected.title || '', caption: selected.caption || '' });
      setItems((xs) => xs.map((x) => (x.id === item.id ? item : x)));
      toast.success('Details saved');
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Delete this file?',
      message: 'It will be removed from Cloudinary permanently. Any article, project or page still using it will show a broken image.',
      confirmLabel: 'Delete file',
      danger: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/media/${selected.id}`);
      setItems((xs) => xs.filter((x) => x.id !== selected.id));
      setSelected(null);
      toast.success('File deleted');
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Media library"
        description="Images, videos and PDFs stored in Cloudinary. Uploads are signed by the server — the API secret never reaches the browser."
        actions={
          integrations?.cloudinary && (
            <div className="a-upload">
              <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Upload folder">
                {FOLDERS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => input.current.click()} disabled={Boolean(busy)}>
                <Icon name="upload" size={15} /> {busy || 'Upload files'}
              </button>
            </div>
          )
        }
      />
      {!integrations?.cloudinary && (
        <div className="a-card a-callout a-callout--warn">
          <Icon name="settings" size={20} />
          <div>
            <h3>Cloudinary is not configured</h3>
            <p className="muted">
              Add <code>CLOUDINARY_CLOUD_NAME</code> and <code>CLOUDINARY_API_SECRET</code> to <code>backend/.env</code> and restart the API to enable uploads.
            </p>
          </div>
        </div>
      )}
      <div className="a-toolbar">
        <div className="filters">
          {['all', ...FOLDERS].map((f) => (
            <button key={f} type="button" className={`filter ${folder === f ? 'is-active' : ''}`} onClick={() => setFolder(f)}>
              {f}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="File type">
          <option value="all">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="raw">Documents</option>
        </select>
      </div>
      {loading && <Skeleton lines={4} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && list.length === 0 && <EmptyState icon="image" title="No files here yet" />}
      <div className="lib-grid lib-grid--page">
        {list.map((m) => (
          <button key={m.id} type="button" className="lib-grid__item" onClick={() => setSelected({ ...m })}>
            {m.resourceType === 'image' ? (
              <img src={cdn(m.url, { w: 320, h: 240 })} alt={m.alt || ''} loading="lazy" />
            ) : (
              <span className="lib-grid__file">
                <Icon name={m.resourceType === 'video' ? 'video' : 'file'} size={28} />
                <span className="mono small">{m.format}</span>
              </span>
            )}
            <span className="lib-grid__name">{m.title}</span>
          </button>
        ))}
      </div>
      <input ref={input} type="file" hidden multiple accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf" onChange={onFiles} />

      {selected && (
        <Modal
          title={selected.title || 'File details'}
          onClose={() => setSelected(null)}
          wide
          footer={
            <>
              <button type="button" className="btn btn--text btn--sm danger-text" onClick={remove}>
                <Icon name="trash" size={15} /> Delete
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={saveMeta}>
                Save details
              </button>
            </>
          }
        >
          <div className="media-detail">
            <div className="media-detail__preview">
              {selected.resourceType === 'image' && <img src={cdn(selected.url, { w: 900 })} alt={selected.alt || ''} />}
              {selected.resourceType === 'video' && <video src={selected.url} controls preload="metadata" />}
              {selected.resourceType === 'raw' && (
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                  <Icon name="file" size={15} /> Open document
                </a>
              )}
            </div>
            <div>
              <dl className="media-detail__meta mono small">
                <div>
                  <dt>Folder</dt>
                  <dd>{selected.folder}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{bytes(selected.bytes)}</dd>
                </div>
                {selected.width && (
                  <div>
                    <dt>Dimensions</dt>
                    <dd>
                      {selected.width}×{selected.height}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Uploaded</dt>
                  <dd>{formatDateTime(selected.createdAt)}</dd>
                </div>
              </dl>
              <div className="field">
                <label htmlFor="m-url">URL</label>
                <div className="copy-row">
                  <input id="m-url" readOnly value={selected.url} onFocus={(e) => e.target.select()} />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Copy URL"
                    onClick={() => navigator.clipboard.writeText(selected.url).then(() => toast.success('URL copied'), () => toast.error('Copy failed'))}
                  >
                    <Icon name="copy" size={15} />
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="m-title">Title</label>
                <input id="m-title" value={selected.title || ''} maxLength={200} onChange={(e) => setSelected({ ...selected, title: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="m-alt">Alt text</label>
                <input id="m-alt" value={selected.alt || ''} maxLength={300} onChange={(e) => setSelected({ ...selected, alt: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="m-cap">Caption</label>
                <input id="m-cap" value={selected.caption || ''} maxLength={300} onChange={(e) => setSelected({ ...selected, caption: e.target.value })} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
