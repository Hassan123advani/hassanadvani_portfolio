import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../lib/api.js';

/** Load an admin collection endpoint and keep it in local state. */
export function useCollection(path) {
  const [state, setState] = useState({ items: [], loading: true, error: null });
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return adminApi
      .get(path)
      .then((r) => setState({ items: r.items || [], loading: false, error: null }))
      .catch((error) => setState({ items: [], loading: false, error }));
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  const setItems = (fn) => setState((s) => ({ ...s, items: typeof fn === 'function' ? fn(s.items) : fn }));
  return { ...state, reload, setItems };
}

/** Load a single settings document. */
export function useSettings(key) {
  const [state, setState] = useState({ item: null, loading: true, error: null });
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return adminApi
      .get(`/settings/${key}`)
      .then((r) => setState({ item: r.item, loading: false, error: null }))
      .catch((error) => setState({ item: null, loading: false, error }));
  }, [key]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { ...state, reload };
}

/** Warn before closing the tab with unsaved changes. */
export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const on = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);
}
