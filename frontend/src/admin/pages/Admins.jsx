import { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { Modal, PageHeader, StatusBadge, useConfirm, useToast } from '../components/Feedback.jsx';
import { Toggle } from '../components/Fields.jsx';
import { useCollection } from '../lib/useCollection.js';
import { useAuth } from '../AuthContext.jsx';
import { adminApi, describeError } from '../../lib/api.js';
import { formatDateTime } from '../../lib/format.js';

const BLANK = { email: '', displayName: '', role: 'admin', permissions: ['blog'] };

function PermissionPicker({ value, onChange, labels }) {
  return (
    <fieldset className="perm-grid">
      <legend>Permissions</legend>
      {Object.entries(labels).map(([key, label]) => (
        <label key={key} className="check">
          <input type="checkbox" checked={value.includes(key)} onChange={(e) => onChange(e.target.checked ? [...value, key] : value.filter((p) => p !== key))} />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function Admins() {
  const { admin: me, permissionLabels, sendReset } = useAuth();
  const { items, loading, error, reload, setItems } = useCollection('/admins');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const activeSupers = items.filter((a) => a.role === 'super_admin' && a.active !== false).length;

  /** Backend emails the link via Gmail when configured; otherwise Firebase sends its own reset email. */
  async function deliver(delivery, email) {
    if (delivery === 'gmail') return toast.success(`Email sent to ${email}`);
    try {
      await sendReset(email);
      toast.success(`Firebase sent a password email to ${email}`);
    } catch (err) {
      toast.error(`Account saved, but the email could not be sent: ${err.message}`);
    }
    return undefined;
  }

  async function save() {
    setSaving(true);
    try {
      if (form.id) {
        const body = { displayName: form.displayName, permissions: form.permissions };
        if (form.id !== me.uid) {
          body.role = form.role;
          body.active = form.active !== false;
        }
        const { item } = await adminApi.patch(`/admins/${form.id}`, body);
        setItems((xs) => xs.map((x) => (x.id === item.id ? item : x)));
        toast.success('Administrator updated');
      } else {
        const { item, delivery } = await adminApi.post('/admins', form);
        setItems((xs) => [...xs, item]);
        await deliver(delivery, item.email);
      }
      setForm(null);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function reset(a) {
    const ok = await confirm({ title: `Send a password reset to ${a.email}?`, message: 'They will receive a secure link to choose a new password. Existing passwords are never visible to anyone.', confirmLabel: 'Send reset link' });
    if (!ok) return;
    try {
      const r = await adminApi.post(`/admins/${a.id}/password-reset`);
      await deliver(r.delivery, a.email);
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function remove(a) {
    const ok = await confirm({ title: `Delete ${a.email}?`, message: 'Their admin access and Firebase login are removed permanently. Their activity log entries are kept.', confirmLabel: 'Delete account', danger: true });
    if (!ok) return;
    try {
      await adminApi.del(`/admins/${a.id}`);
      setItems((xs) => xs.filter((x) => x.id !== a.id));
      toast.success('Administrator deleted');
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  const isLastSuper = (a) => a.role === 'super_admin' && a.active !== false && activeSupers <= 1;

  return (
    <>
      <PageHeader
        title="Admin accounts"
        description="Invite administrators and control what they can access. Passwords are managed by Firebase Authentication and are never stored or shown here."
        actions={
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setForm({ ...BLANK })}>
            <Icon name="plus" size={15} /> Invite admin
          </button>
        }
      />
      {loading && <Skeleton lines={4} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Role</th>
                <th className="hide-sm">Access</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.displayName || '—'}</strong>
                    {a.id === me.uid && <span className="chip">you</span>}
                    <span className="muted small d-block">{a.email}</span>
                    <span className="muted small d-block">Added {formatDateTime(a.createdAt)}</span>
                  </td>
                  <td>
                    <span className={`badge ${a.role === 'super_admin' ? 'badge--super' : ''}`}>{a.role === 'super_admin' ? 'Super admin' : 'Admin'}</span>
                    {isLastSuper(a) && <span className="muted small d-block">Protected (last super admin)</span>}
                  </td>
                  <td className="hide-sm small">{a.role === 'super_admin' ? 'Everything' : (a.permissions || []).map((p) => permissionLabels?.[p] || p).join(', ') || <span className="muted">No access</span>}</td>
                  <td>
                    <StatusBadge state={a.active === false ? 'inactive' : 'active'} />
                  </td>
                  <td className="a-table__actions">
                    <button type="button" className="icon-btn" onClick={() => setForm({ ...a, permissions: a.permissions || [] })} aria-label="Edit">
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => reset(a)} aria-label="Send password reset" title="Send password reset">
                      <Icon name="mail" size={15} />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => remove(a)} aria-label="Delete" disabled={a.id === me.uid || isLastSuper(a)} title={a.id === me.uid ? 'You cannot delete yourself' : isLastSuper(a) ? 'Last super admin is protected' : 'Delete'}>
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal
          title={form.id ? `Edit ${form.email}` : 'Invite an administrator'}
          onClose={() => setForm(null)}
          wide
          footer={
            <>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={saving || !form.email || !form.displayName}>
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create & send invite'}
              </button>
            </>
          }
        >
          {!form.id && (
            <div className="field">
              <label htmlFor="ad-email">Email</label>
              <input id="ad-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <p className="field__hint">They’ll get an email with a link to set their own password.</p>
            </div>
          )}
          <div className="field">
            <label htmlFor="ad-name">Display name</label>
            <input id="ad-name" value={form.displayName} maxLength={100} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ad-role">Role</label>
            <select id="ad-role" value={form.role} disabled={form.id === me.uid || (form.id && isLastSuper(form))} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin — only the permissions below</option>
              <option value="super_admin">Super admin — full access incl. admin management</option>
            </select>
            {form.id === me.uid && <p className="field__hint">You can’t change your own role.</p>}
          </div>
          {form.role !== 'super_admin' && <PermissionPicker value={form.permissions} onChange={(p) => setForm({ ...form, permissions: p })} labels={permissionLabels || {}} />}
          {form.id && form.id !== me.uid && (
            <Toggle label="Account active" checked={form.active !== false} onChange={(v) => setForm({ ...form, active: v })} hint="Deactivating signs them out everywhere immediately." />
          )}
        </Modal>
      )}
    </>
  );
}
