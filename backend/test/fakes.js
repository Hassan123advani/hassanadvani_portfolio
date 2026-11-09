/**
 * Minimal in-memory stand-ins for Firestore and Firebase Auth, implementing
 * only the API surface the backend uses. Good enough for route-level tests.
 */
let autoId = 0;
const clone = (v) => (v === undefined ? undefined : structuredClone(v));

class DocSnap {
  constructor(id, data, ref) {
    this.id = id;
    this._data = data;
    this.ref = ref;
    this.exists = data !== undefined;
  }
  data() {
    return clone(this._data);
  }
}

class QuerySnap {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
}

class DocRef {
  constructor(store, col, id) {
    this.store = store;
    this.col = col;
    this.id = id;
  }
  get map() {
    if (!this.store.has(this.col)) this.store.set(this.col, new Map());
    return this.store.get(this.col);
  }
  async get() {
    return new DocSnap(this.id, clone(this.map.get(this.id)), this);
  }
  async set(data, opts) {
    const prev = opts?.merge ? this.map.get(this.id) || {} : {};
    this.map.set(this.id, clone({ ...prev, ...data }));
  }
  async update(data) {
    if (!this.map.has(this.id)) throw new Error('NOT_FOUND');
    this.map.set(this.id, clone({ ...this.map.get(this.id), ...data }));
  }
  async delete() {
    this.map.delete(this.id);
  }
}

class Query {
  constructor(store, col, filters = [], order = null, lim = null) {
    Object.assign(this, { store, col, filters, order, lim });
  }
  where(field, op, value) {
    return new Query(this.store, this.col, [...this.filters, [field, op, value]], this.order, this.lim);
  }
  orderBy(field, dir = 'asc') {
    return new Query(this.store, this.col, this.filters, [field, dir], this.lim);
  }
  limit(n) {
    return new Query(this.store, this.col, this.filters, this.order, n);
  }
  async get() {
    const map = this.store.get(this.col) || new Map();
    let rows = [...map.entries()].filter(([, d]) =>
      this.filters.every(([f, op, v]) => (op === '==' ? d[f] === v : true)),
    );
    if (this.order) {
      const [f, dir] = this.order;
      rows.sort((a, b) => (a[1][f] > b[1][f] ? 1 : -1) * (dir === 'desc' ? -1 : 1));
    }
    if (this.lim) rows = rows.slice(0, this.lim);
    return new QuerySnap(rows.map(([id, d]) => new DocSnap(id, clone(d), new DocRef(this.store, this.col, id))));
  }
  count() {
    return {
      get: async () => {
        const { size } = await this.get();
        return { data: () => ({ count: size }) };
      },
    };
  }
}

class Collection extends Query {
  doc(id) {
    return new DocRef(this.store, this.col, id ?? `id${++autoId}`);
  }
  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

export function createFakeDb(seed = {}) {
  const store = new Map();
  for (const [col, docs] of Object.entries(seed)) store.set(col, new Map(Object.entries(clone(docs))));
  const db = {
    store,
    collection: (name) => new Collection(store, name),
    runTransaction: async (fn) =>
      fn({
        get: (target) => target.get(),
        set: (ref, d, o) => ref.set(d, o),
        update: (ref, d) => ref.update(d),
        delete: (ref) => ref.delete(),
      }),
  };
  return db;
}

export function createFakeAuth(tokens = {}) {
  const users = new Map();
  const calls = [];
  return {
    users,
    calls,
    verifyIdToken: async (token) => {
      if (!tokens[token]) throw new Error('invalid token');
      return tokens[token];
    },
    getUserByEmail: async (email) => {
      const u = [...users.values()].find((x) => x.email === email);
      if (!u) throw Object.assign(new Error('not found'), { code: 'auth/user-not-found' });
      return u;
    },
    createUser: async ({ email, displayName }) => {
      const u = { uid: `u_${users.size + 1}`, email, displayName };
      users.set(u.uid, u);
      return u;
    },
    setCustomUserClaims: async (uid, claims) => calls.push(['claims', uid, claims]),
    updateUser: async (uid, data) => calls.push(['update', uid, data]),
    revokeRefreshTokens: async (uid) => calls.push(['revoke', uid]),
    deleteUser: async (uid) => calls.push(['delete', uid]),
    generatePasswordResetLink: async (email) => `https://example.test/reset?email=${encodeURIComponent(email)}`,
  };
}
