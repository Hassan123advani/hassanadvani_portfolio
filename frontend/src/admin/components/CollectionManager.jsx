import { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { Modal, PageHeader, StatusBadge, useConfirm, useToast } from './Feedback.jsx';
import { FormFields } from './Fields.jsx';
import { strip } from './ContentList.jsx';
import { useCollection } from '../lib/useCollection.js';
import { adminApi, describeError } from '../../lib/api.js';
import { cdn } from '../../lib/format.js';

/**
 * Table + modal form for simple collections (certificates, testimonials, categories, tags).
 * `fields` uses the FormFields config format.
 */
export default function CollectionManager({ endpoint, title, description, noun, fields, blank, columns, sort, header = true, imageKey }) {
  const { items, loading, error, reload, setItems } = useCollection(endpoint);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const sorted = sort ? [...items].sort(sort) : items;

  async function save() {
    setSaving(true);
    try {
      const body = strip(editing);
      const { item } = editing.id ? await adminApi.put(`${endpoint}/${editing.id}`, body) : await adminApi.post(endpoint, body);
      setItems((xs) => (editing.id ? xs.map((x) => (x.id === item.id ? item : x)) : [item, ...xs]));
      setEditing(null);
      toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} saved`);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const ok = await confirm({ title: `Delete “${item.title || item.name}”?`, message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await adminApi.del(`${endpoint}/${item.id}`);
      setItems((xs) => xs.filter((x) => x.id !== item.id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  const addButton = (
    <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditing(structuredClone(blank))}>
      <Icon name="plus" size={15} /> Add {noun}
    </button>
  );

  return (
    <>
      {header ? <PageHeader title={title} description={description} actions={addButton} /> : <div className="a-section-head"><h2>{title}</h2>{addButton}</div>}
      {loading && <Skeleton lines={4} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && items.length === 0 && <EmptyState title={`No ${noun}s yet`} action={addButton} />}
      {!loading && !error && items.length > 0 && (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.label} className={c.className}>
                    {c.label}
                  </th>
                ))}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.id}>
                  {columns.map((c, ci) => (
                    <td key={c.label} className={c.className}>
                      {ci === 0 ? (
                        <button type="button" className="a-table__title" onClick={() => setEditing(structuredClone(item))}>
                          {imageKey && (item[imageKey]?.url ? <img src={cdn(item[imageKey].url, { w: 96, h: 64 })} alt="" /> : <span className="a-table__thumb" />)}
                          <strong>{c.render(item)}</strong>
                        </button>
                      ) : c.status ? (
                        <StatusBadge state={item.status} />
                      ) : (
                        c.render(item)
                      )}
                    </td>
                  ))}
                  <td className="a-table__actions">
                    <button type="button" className="icon-btn" onClick={() => setEditing(structuredClone(item))} aria-label="Edit">
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => remove(item)} aria-label="Delete">
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <Modal
          title={editing.id ? `Edit ${noun}` : `New ${noun}`}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <FormFields fields={fields} value={editing} onChange={setEditing} />
        </Modal>
      )}
    </>
  );
}
