/** Convert Firestore Timestamps (and Dates) to ISO strings, recursively. */
export function plain(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = plain(v);
    return out;
  }
  return value;
}

export const docToJSON = (snap) => ({ id: snap.id, ...plain(snap.data()) });

export function toMillis(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v).getTime() || 0;
  return 0;
}
