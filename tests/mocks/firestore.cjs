/* In-memory stand-in for firebase-admin/firestore (only what Qatra uses). */
class Timestamp {
  constructor(ms) { this.ms = ms; }
  toDate() { return new Date(this.ms); }
}

class Sentinel { constructor(kind, value) { this.kind = kind; this.value = value; } }
const FieldValue = {
  increment: (n) => new Sentinel("increment", n),
  arrayUnion: (...v) => new Sentinel("arrayUnion", v),
  delete: () => new Sentinel("delete"),
  serverTimestamp: () => new Sentinel("serverTimestamp"),
};

const clone = (v) => JSON.parse(JSON.stringify(v));
const isPlain = (v) => v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Sentinel);

function apply(current, patch, merge) {
  const out = merge && isPlain(current) ? { ...current } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue; // ignoreUndefinedProperties
    if (v instanceof Sentinel) {
      if (v.kind === "delete") delete out[k];
      else if (v.kind === "increment") out[k] = (Number(out[k]) || 0) + v.value;
      else if (v.kind === "arrayUnion") {
        const arr = Array.isArray(out[k]) ? [...out[k]] : [];
        for (const item of v.value) if (!arr.some((x) => JSON.stringify(x) === JSON.stringify(item))) arr.push(clone(item));
        out[k] = arr;
      } else if (v.kind === "serverTimestamp") out[k] = new Date().toISOString();
    } else if (merge && isPlain(v) && isPlain(out[k])) out[k] = apply(out[k], v, true);
    else out[k] = isPlain(v) ? apply({}, v, false) : clone(v);
  }
  return out;
}

let seq = 0;
const newId = () => `auto${String(++seq).padStart(5, "0")}`;

class DocSnap {
  constructor(ref, data) { this.ref = ref; this.id = ref.id; this._d = data; this.exists = data !== undefined; }
  data() { return this._d === undefined ? undefined : clone(this._d); }
}

class DocRef {
  constructor(db, col, id) { this._db = db; this._col = col; this.id = id; }
  _map() { return this._db._col(this._col); }
  async get() { return new DocSnap(this, this._map().get(this.id)); }
  async set(data, opts = {}) { this._map().set(this.id, apply(this._map().get(this.id), data, Boolean(opts.merge))); }
  async update(data) {
    if (!this._map().has(this.id)) throw new Error(`NOT_FOUND: ${this._col}/${this.id}`);
    this._map().set(this.id, apply(this._map().get(this.id), data, true));
  }
  async delete() { this._map().delete(this.id); }
}

class Query {
  constructor(db, col, filters = [], lim = Infinity) { this._db = db; this._col = col; this._f = filters; this._lim = lim; }
  where(field, op, value) {
    if (op !== "==") throw new Error(`fake firestore: operator ${op} not supported`);
    return new Query(this._db, this._col, [...this._f, [field, value]], this._lim);
  }
  limit(n) { return new Query(this._db, this._col, this._f, n); }
  _rows() {
    const rows = [];
    for (const [id, d] of this._db._col(this._col)) {
      if (this._f.every(([f, v]) => f.split(".").reduce((o, k) => (o == null ? o : o[k]), d) === v)) rows.push([id, d]);
      if (rows.length >= this._lim) break;
    }
    return rows;
  }
  async get() {
    const docs = this._rows().map(([id, d]) => new DocSnap(new DocRef(this._db, this._col, id), d));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
  count() { return { get: async () => ({ data: () => ({ count: this._rows().length }) }) }; }
}

class CollectionRef extends Query {
  doc(id) { return new DocRef(this._db, this._col, id ?? newId()); }
  async add(data) { const ref = this.doc(); await ref.set(data); return ref; }
}

class FakeFirestore {
  constructor() { this._data = new Map(); this.writes = 0; }
  _col(name) { if (!this._data.has(name)) this._data.set(name, new Map()); return this._data.get(name); }
  collection(name) { return new CollectionRef(this, name); }
  batch() {
    const ops = [];
    const b = { set: (ref, data, opts) => { ops.push(() => ref.set(data, opts)); return b; }, commit: async () => { for (const op of ops) await op(); } };
    return b;
  }
  settings() {}
  /* test helpers */
  reset() { this._data.clear(); seq = 0; }
  dump(name) { return [...this._col(name).entries()].map(([id, d]) => ({ id, ...clone(d) })); }
}

const db = new FakeFirestore();
module.exports = { FieldValue, Timestamp, getFirestore: () => db, __db: db };
