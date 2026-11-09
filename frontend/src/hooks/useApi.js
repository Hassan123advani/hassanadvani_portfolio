import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs `loader` and tracks loading / error / data.
 * If the API is offline and `fallback` is provided, the fallback is shown
 * instead of an error (source === 'fallback').
 */
export function useApi(loader, deps = [], { fallback } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null, source: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => alive && setState({ data, loading: false, error: null, source: 'live' }))
      .catch((error) => {
        if (!alive) return;
        const fb = fallbackRef.current;
        if (error?.offline && fb !== undefined) {
          const data = typeof fb === 'function' ? fb() : fb;
          if (data !== undefined && data !== null) {
            setState({ data, loading: false, error: null, source: 'fallback' });
            return;
          }
        }
        setState({ data: null, loading: false, error, source: null });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}
