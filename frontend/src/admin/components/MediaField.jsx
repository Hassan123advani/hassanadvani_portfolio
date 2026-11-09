import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { Modal, useToast } from './Feedback.jsx';
import { adminApi } from '../../lib/api.js';
import { useAuth } from '../AuthContext.jsx';
import { LIMITS, toRef, uploadFile } from '../lib/upload.js';
import { cdn } from '../../lib/format.js';

/** Pick an existing asset from the media library (filtered to one folder for non-media editors). */
export function LibraryModal({ folder, type = 'image', onPick, onClose }) {
  const { can } = useAuth();
  const [state, setState] = useState({ loading: true, items: [], error: null });
  const [scope, setScope] = useState(can('media') ? 'all' : folder);

  const load = (s) => {
    setState({ loading: true, items: [], error: null });
    const req = s === 'all' ? adminApi.get(`/media?type=${type}`) : adminApi.get(`/media/picker/${s}`);
    req.then((r) => setState({ loading: false, items: r.items.filter((m) => m.resourceType === type), error: null })).catch((error) => setState({ loading: false, items: [], error }));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(scope), []);

  return (
    <Modal title="Choose from media library" onClose={onClose} wide>
      {can('media') && (
        <div className="filters" style={{ marginTop: 0, marginBottom: 16 }}>
          {['all', folder].map((s) => (
            <button
              key={s}
              type="button"
              className={`filter ${scope === s ? 'is-active' : ''}`}
              onClick={() => {
                setScope(s);
                load(s);
              }}
            >
              {s === 'all' ? 'All media' : `Folder: ${s}`}
            </button>
          ))}
        </div>
      )}
      {state.loading && <p className="muted">Loading media…</p>}
      {state.error && <p className="form-alert">{state.error.message}</p>}
      {!state.loading && !state.error && state.items.length === 0 && <p className="muted">No {type}s uploaded yet.</p>}
      <div className="lib-grid">
        {state.items.map((m) => (
          <button key={m.id} type="button" className="lib-grid__item" onClick={() => onPick(m)} title={m.title}>
            {m.resourceType === 'image' ? <img src={cdn(m.url, { w: 300, h: 220 })} alt={m.alt || ''} loading="lazy" /> : <span className="lib-grid__file"><Icon name={m.resourceType === 'video' ? 'video' : 'file'} size={26} /></span>}
            <span className="lib-grid__name">{m.title}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/**
 * Single media value (image by default). Supports signed Cloudinary upload,
 * choosing from the library, or pasting a URL when Cloudinary isn't configured.
 */
export default function MediaField({ label, value, onChange, folder = 'media', type = 'image', hint, withCaption = false }) {
  const { integrations } = useAuth();
  const toast = useToast();
  const input = useRef(null);
  const [progress, setProgress] = useState(null);
  const [picking, setPicking] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const cloudinary = integrations?.cloudinary;

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProgress(0);
    try {
      const item = await uploadFile(file, folder, { onProgress: setProgress, alt: value?.alt || '' });
      onChange(toRef(item, { alt: value?.alt || item.alt || '', caption: value?.caption || '' }));
      toast.success('Uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProgress(null);
    }
  }

  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="field media-field">
      <span className="field__label">{label}</span>
      {value?.url ? (
        <div className="media-field__preview">
          {type === 'image' && <img src={cdn(value.url, { w: 520 })} alt={value.alt || ''} />}
          {type === 'video' && <video src={value.url} controls preload="metadata" />}
          {type === 'raw' && (
            <a href={value.url} target="_blank" rel="noopener noreferrer" className="media-field__file">
              <Icon name="file" /> {decodeURIComponent(value.url.split('/').pop())}
            </a>
          )}
          <div className="media-field__actions">
            {cloudinary && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current.click()} disabled={progress !== null}>
                Replace
              </button>
            )}
            <button type="button" className="btn btn--text btn--sm" onClick={() => onChange(null)}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="media-field__empty">
          {cloudinary ? (
            <>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current.click()} disabled={progress !== null}>
                <Icon name="upload" size={15} /> {progress !== null ? `Uploading ${progress}%` : 'Upload'}
              </button>
              <button type="button" className="btn btn--text btn--sm" onClick={() => setPicking(true)}>
                Choose from library
              </button>
            </>
          ) : (
            <div className="media-field__url">
              <input type="url" placeholder="https://… (Cloudinary not configured — paste a URL)" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  if (!/^https?:\/\//.test(urlDraft) && !urlDraft.startsWith('/')) return toast.error('Enter a full https:// URL');
                  onChange({ url: urlDraft.trim(), publicId: '', alt: '', caption: '', resourceType: type });
                  setUrlDraft('');
                  return undefined;
                }}
              >
                Use URL
              </button>
            </div>
          )}
        </div>
      )}
      {progress !== null && (
        <span className="progress">
          <i style={{ width: `${progress}%` }} />
        </span>
      )}
      {value?.url && type !== 'raw' && (
        <div className="field-row">
          <input aria-label={`${label} alt text`} placeholder="Alt text (describe the image)" value={value.alt || ''} onChange={(e) => set({ alt: e.target.value })} maxLength={300} />
          {withCaption && <input aria-label={`${label} caption`} placeholder="Caption (optional)" value={value.caption || ''} onChange={(e) => set({ caption: e.target.value })} maxLength={300} />}
        </div>
      )}
      {hint && <p className="field__hint">{hint}</p>}
      <input ref={input} type="file" hidden accept={LIMITS[type].accept} onChange={onFile} />
      {picking && (
        <LibraryModal
          folder={folder}
          type={type}
          onClose={() => setPicking(false)}
          onPick={(m) => {
            onChange(toRef(m));
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

/** Multiple images with captions, reordering and removal. */
export function GalleryField({ label, value = [], onChange, folder = 'media', max = 30 }) {
  const { integrations } = useAuth();
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(null);
  const [picking, setPicking] = useState(false);

  async function onFiles(e) {
    const files = [...(e.target.files || [])].slice(0, max - value.length);
    e.target.value = '';
    const added = [];
    for (const [i, file] of files.entries()) {
      setBusy(`Uploading ${i + 1}/${files.length}…`);
      try {
        added.push(toRef(await uploadFile(file, folder)));
      } catch (err) {
        toast.error(`${file.name}: ${err.message}`);
      }
    }
    setBusy(null);
    if (added.length) onChange([...value, ...added]);
  }

  const update = (i, patch) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const move = (i, d) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };

  return (
    <div className="field">
      <span className="field__label">
        {label} <span className="muted">({value.length})</span>
      </span>
      {value.length > 0 && (
        <ul className="gallery-field">
          {value.map((img, i) => (
            <li key={`${img.url}-${i}`}>
              <img src={cdn(img.url, { w: 240, h: 160 })} alt={img.alt || ''} />
              <input placeholder="Alt text" value={img.alt || ''} onChange={(e) => update(i, { alt: e.target.value })} maxLength={300} aria-label={`Image ${i + 1} alt text`} />
              <input placeholder="Caption" value={img.caption || ''} onChange={(e) => update(i, { caption: e.target.value })} maxLength={300} aria-label={`Image ${i + 1} caption`} />
              <div className="gallery-field__actions">
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move earlier">
                  <Icon name="arrowLeft" size={14} />
                </button>
                <button type="button" className="icon-btn" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move later">
                  <Icon name="arrowRight" size={14} />
                </button>
                <button type="button" className="icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove image">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {integrations?.cloudinary ? (
        <div className="media-field__empty">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current.click()} disabled={Boolean(busy) || value.length >= max}>
            <Icon name="upload" size={15} /> {busy || 'Upload images'}
          </button>
          <button type="button" className="btn btn--text btn--sm" onClick={() => setPicking(true)}>
            Add from library
          </button>
        </div>
      ) : (
        <p className="field__hint">Configure Cloudinary on the backend to upload gallery images.</p>
      )}
      <input ref={input} type="file" hidden multiple accept={LIMITS.image.accept} onChange={onFiles} />
      {picking && (
        <LibraryModal
          folder={folder}
          onClose={() => setPicking(false)}
          onPick={(m) => {
            onChange([...value, toRef(m)]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
