import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';

/* ---------------- Toasts ---------------- */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 7000 : 4000);
  }, []);
  const api = useRef({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) });
  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <Icon name={t.type === 'error' ? 'close' : 'check'} size={16} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

/* ---------------- Modal ---------------- */
export function Modal({ title, onClose, children, footer, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('input, textarea, select, button')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal__panel ${wide ? 'modal__panel--wide' : ''}`} ref={ref}>
        <header className="modal__head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ---------------- Confirm ---------------- */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setReq({ ...opts, resolve });
      }),
    [],
  );
  const close = (v) => {
    req?.resolve(v);
    setReq(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {req && (
        <Modal
          title={req.title || 'Are you sure?'}
          onClose={() => close(false)}
          footer={
            <>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => close(false)}>
                Cancel
              </button>
              <button type="button" className={`btn btn--sm ${req.danger ? 'btn--danger' : 'btn--primary'}`} onClick={() => close(true)}>
                {req.confirmLabel || 'Confirm'}
              </button>
            </>
          }
        >
          <p className="muted">{req.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmContext);

/* ---------------- Misc ---------------- */
export function StatusBadge({ state }) {
  const label = { published: 'Published', draft: 'Draft', scheduled: 'Scheduled', new: 'New', read: 'Read', replied: 'Replied', resolved: 'Resolved', archived: 'Archived', spam: 'Spam', active: 'Active', inactive: 'Inactive' }[state] || state;
  return <span className={`badge badge--${state}`}>{label}</span>;
}

export function PageHeader({ title, description, actions }) {
  return (
    <header className="a-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="a-page-head__actions">{actions}</div>}
    </header>
  );
}

export function NoAccess() {
  return (
    <div className="state">
      <span className="state__icon">
        <Icon name="shield" size={22} />
      </span>
      <h3>You don’t have access to this section</h3>
      <p>Ask a super admin to grant you the permission if you need it.</p>
    </div>
  );
}
