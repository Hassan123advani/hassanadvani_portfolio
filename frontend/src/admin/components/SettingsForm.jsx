import { useEffect, useMemo, useState } from 'react';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { PageHeader, useToast } from './Feedback.jsx';
import { FormFields } from './Fields.jsx';
import { useSettings, useUnsavedWarning } from '../lib/useCollection.js';
import { adminApi, describeError } from '../../lib/api.js';
import { portfolio } from '../../content/data.js';

/** Edit one settings document (profile / site / seo), seeded from the original site's content. */
export default function SettingsForm({ settingsKey, title, description, sections, children }) {
  const { item, loading, error, reload } = useSettings(settingsKey);
  const defaults = portfolio[settingsKey];
  const [value, setValue] = useState(null);
  const [original, setOriginal] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (loading || error) return;
    const { updatedAt, updatedBy, ...rest } = item || {};
    const v = { ...defaults, ...rest };
    setValue(v);
    setOriginal(JSON.stringify(v));
  }, [item, loading, error, defaults]);

  const dirty = useMemo(() => value && JSON.stringify(value) !== original, [value, original]);
  useUnsavedWarning(dirty);

  async function save() {
    setSaving(true);
    try {
      await adminApi.put(`/settings/${settingsKey}`, value);
      setOriginal(JSON.stringify(value));
      toast.success('Saved — changes are live on the website');
      reload();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  const saveBtn = (
    <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={saving || !dirty}>
      {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
    </button>
  );

  return (
    <>
      <PageHeader title={title} description={description} actions={saveBtn} />
      {loading && <Skeleton lines={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {value && (
        <>
          {!item && (
            <div className="a-card a-callout">
              <div>
                <h3>Not saved yet</h3>
                <p className="muted">These values come from your original website. Review them and press save to store them in the CMS.</p>
              </div>
            </div>
          )}
          {children?.(value, setValue)}
          {sections.map((s) => (
            <section key={s.title} className="a-card a-form-section">
              <header className="a-card__head">
                <div>
                  <h2>{s.title}</h2>
                  {s.description && <p className="muted small">{s.description}</p>}
                </div>
              </header>
              <FormFields fields={s.fields} value={value} onChange={setValue} />
            </section>
          ))}
          <div className="a-sticky-save">
            {dirty && <span className="muted small">Unsaved changes</span>}
            {saveBtn}
          </div>
        </>
      )}
    </>
  );
}
