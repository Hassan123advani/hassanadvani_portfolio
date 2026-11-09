import { useId, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import MediaField, { GalleryField } from './MediaField.jsx';

export function TextField({ label, value, onChange, hint, counter, multiline, rows = 3, required, ...props }) {
  const id = useId();
  const Tag = multiline ? 'textarea' : 'input';
  const len = (value || '').length;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
        {counter && (
          <span className={`counter ${len > counter ? 'is-over' : ''}`}>
            {len}/{counter}
          </span>
        )}
      </label>
      <Tag id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={multiline ? rows : undefined} required={required} {...props} />
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  const id = useId();
  return (
    <div className="toggle-field">
      <label htmlFor={id} className="toggle">
        <input id={id} type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle__track" aria-hidden="true" />
        <span>{label}</span>
      </label>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, hint }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

/** Free-text tags with optional suggestions. Enter or comma adds a tag. */
export function TagInput({ label, value = [], onChange, suggestions = [], placeholder = 'Type and press Enter', max = 30, hint }) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const t = raw.trim().replace(/,$/, '');
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase()) || value.length >= max) return;
    onChange([...value, t]);
  };
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="tag-input">
        {value.map((t) => (
          <span key={t} className="chip">
            {t}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={value.length ? '' : placeholder}
          list={remaining.length ? `${id}-list` : undefined}
          onChange={(e) => {
            if (e.target.value.endsWith(',')) {
              add(e.target.value);
              setDraft('');
            } else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
              setDraft('');
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft) {
              add(draft);
              setDraft('');
            }
          }}
        />
        {remaining.length > 0 && (
          <datalist id={`${id}-list`}>
            {remaining.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

/**
 * Render a form from a field config list. Supported types:
 * text, textarea, url, email, number, toggle, select, tags, image, video, file, gallery, list
 */
export function FormFields({ fields, value, onChange }) {
  const set = (name) => (v) => onChange({ ...value, [name]: v });
  return fields.map((f) => {
    if (f.when && !f.when(value)) return null;
    const common = { label: f.label, hint: f.hint, value: value?.[f.name], onChange: set(f.name) };
    switch (f.type) {
      case 'textarea':
        return <TextField key={f.name} {...common} multiline rows={f.rows || 4} maxLength={f.max} counter={f.counter} />;
      case 'number':
        return <TextField key={f.name} {...common} type="number" min={f.min} max={f.max} value={value?.[f.name] ?? 0} onChange={(v) => set(f.name)(v === '' ? 0 : Number(v))} />;
      case 'toggle':
        return <Toggle key={f.name} label={f.label} hint={f.hint} checked={value?.[f.name]} onChange={set(f.name)} />;
      case 'select':
        return <SelectField key={f.name} {...common} options={f.options} />;
      case 'tags':
        return <TagInput key={f.name} {...common} value={value?.[f.name] || []} suggestions={f.suggestions} max={f.maxItems} />;
      case 'image':
      case 'video':
      case 'file':
        return <MediaField key={f.name} label={f.label} hint={f.hint} folder={f.folder} type={f.type === 'file' ? 'raw' : f.type} value={value?.[f.name] || null} onChange={set(f.name)} withCaption={f.withCaption} />;
      case 'gallery':
        return <GalleryField key={f.name} label={f.label} folder={f.folder} value={value?.[f.name] || []} onChange={set(f.name)} />;
      case 'list':
        return <ListEditor key={f.name} label={f.label} hint={f.hint} fields={f.fields} value={value?.[f.name] || []} onChange={set(f.name)} itemTitle={f.itemTitle} newItem={f.newItem} max={f.maxItems} simple={f.simple} />;
      default:
        return <TextField key={f.name} {...common} type={f.type || 'text'} maxLength={f.max} counter={f.counter} required={f.required} placeholder={f.placeholder} />;
    }
  });
}

/**
 * Editable list of objects (or of strings when `simple`), with add / remove / reorder.
 */
export function ListEditor({ label, hint, value = [], onChange, fields = [], itemTitle, newItem = {}, max = 30, simple = false }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (i) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    return n;
  });
  const update = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)));
  const move = (i, d) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  const add = () => {
    onChange([...value, simple ? '' : structuredClone(newItem)]);
    setOpen((s) => new Set(s).add(value.length));
  };

  return (
    <fieldset className="list-editor">
      <legend>
        {label} <span className="muted">({value.length})</span>
      </legend>
      {hint && <p className="field__hint">{hint}</p>}
      <ol>
        {value.map((item, i) => (
          <li key={i} className={`list-editor__item ${simple || open.has(i) ? 'is-open' : ''}`}>
            <div className="list-editor__head">
              {simple ? (
                <textarea value={item} onChange={(e) => update(i, e.target.value)} rows={3} aria-label={`${label} ${i + 1}`} />
              ) : (
                <button type="button" className="list-editor__title" onClick={() => toggle(i)} aria-expanded={open.has(i)}>
                  <Icon name={open.has(i) ? 'arrowLeft' : 'arrowRight'} size={13} />
                  {(itemTitle ? itemTitle(item) : item?.title || item?.name) || <span className="muted">Untitled item</span>}
                </button>
              )}
              <div className="list-editor__actions">
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  ↑
                </button>
                <button type="button" className="icon-btn" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  ↓
                </button>
                <button type="button" className="icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
            {!simple && open.has(i) && (
              <div className="list-editor__body">
                <FormFields fields={fields} value={item} onChange={(v) => update(i, v)} />
              </div>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn--ghost btn--sm" onClick={add} disabled={value.length >= max}>
        <Icon name="plus" size={15} /> Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </fieldset>
  );
}
