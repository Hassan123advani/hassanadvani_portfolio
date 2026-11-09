import { API_URL } from './config.js';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK', details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  /** True when the backend is unreachable or not configured — callers may fall back to bundled content. */
  get offline() {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
}

let tokenProvider = null;
/** The admin auth layer registers a function that returns a fresh Firebase ID token. */
export const setTokenProvider = (fn) => {
  tokenProvider = fn;
};

export async function request(path, { method = 'GET', body, auth = false, signal, timeout = 15000 } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenProvider ? await tokenProvider() : null;
    if (!token) throw new ApiError('Please sign in again.', { status: 401, code: 'UNAUTHENTICATED' });
    headers.Authorization = `Bearer ${token}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  signal?.addEventListener('abort', () => ctrl.abort());

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok || !isJson) {
    // A non-JSON response usually means the API isn't running behind this URL.
    const status = isJson ? res.status : res.status >= 500 ? res.status : 503;
    throw new ApiError(data?.error?.message || 'The server is not available right now.', {
      status,
      code: data?.error?.code || (isJson ? 'HTTP_ERROR' : 'API_UNAVAILABLE'),
      details: data?.error?.details,
    });
  }
  return data;
}

export const api = {
  get: (p, o) => request(p, o),
  post: (p, body, o) => request(p, { ...o, method: 'POST', body }),
};

export const adminApi = {
  get: (p, o) => request(`/admin${p}`, { ...o, auth: true }),
  post: (p, body, o) => request(`/admin${p}`, { ...o, method: 'POST', body: body ?? {}, auth: true }),
  put: (p, body, o) => request(`/admin${p}`, { ...o, method: 'PUT', body, auth: true }),
  patch: (p, body, o) => request(`/admin${p}`, { ...o, method: 'PATCH', body, auth: true }),
  del: (p, o) => request(`/admin${p}`, { ...o, method: 'DELETE', auth: true }),
};

/** Human-readable message for a validation error from the API. */
export function describeError(err) {
  if (!err) return '';
  if (err.code === 'VALIDATION' && err.details?.length) {
    return err.details.map((d) => `${d.path || 'field'}: ${d.message}`).join(' · ');
  }
  return err.message || 'Something went wrong.';
}
