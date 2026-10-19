/* In-memory stand-in for firebase-admin/firestore (only what BloodBridge uses). */
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
const read = (doc, field) => field.split(".").reduce((o, k) => (o == null ? o : o[k]), doc);

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

/** Evaluates one where() clause the way Firestore does for the types BloodBridge stores. */
function matches(doc, [field, op, value]) {
  const v = read(doc, field);
  switch (op) {
    case "==": return v === value;
    case "!=": return v !== undefined && v !== value;
    case "<": return v !== undefined && v < value;
    case "<=": return v !== undefined && v <= value;
    case ">": return v !== undefined && v > value;
    case ">=": return v !== undefined && v >= value;
    case "in": return Array.isArray(value) && value.includes(v);
    case "not-in": return v !== undefined && Array.isArray(value) && !value.includes(v);
    case "array-contains": return Array.isArray(v) && v.includes(value);
    default: throw new Error(`fake firestore: operator ${op} not supported`);
  }
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
  async get() { this._db.reads += 1; return new DocSnap(this, this._map().get(this.id)); }
  async set(data, opts = {}) { this._db.writes += 1; this._map().set(this.id, apply(this._map().get(this.id), data, Boolean(opts.merge))); }
  async update(data) {
    if (!this._map().has(this.id)) throw new Error(`NOT_FOUND: ${this._col}/${this.id}`);
    this._db.writes += 1;
    this._map().set(this.id, apply(this._map().get(this.id), data, true));
  }
  async delete() { this._db.writes += 1; this._map().delete(this.id); }
}

class Query {
  constructor(db, col, filters = [], lim = Infinity, order = []) { this._db = db; this._col = col; this._f = filters; this._lim = lim; this._o = order; }
  where(field, op, value) { return new Query(this._db, this._col, [...this._f, [field, op, value]], this._lim, this._o); }
  orderBy(field, dir = "asc") { return new Query(this._db, this._col, this._f, this._lim, [...this._o, [field, dir]]); }
  limit(n) { return new Query(this._db, this._col, this._f, n, this._o); }
  select() { return this; }
  _rows() {
    let rows = [];
    for (const [id, d] of this._db._col(this._col)) if (this._f.every((f) => matches(d, f))) rows.push([id, d]);
    if (this._o.length) {
      // Firestore drops documents that lack an orderBy field.
      rows = rows.filter(([, d]) => this._o.every(([f]) => read(d, f) !== undefined));
      rows.sort(([, a], [, b]) => {
        for (const [f, dir] of this._o) {
          const x = read(a, f);
          const y = read(b, f);
          if (x === y) continue;
          return (x < y ? -1 : 1) * (dir === "desc" ? -1 : 1);
        }
        return 0;
      });
    }
    return rows.slice(0, this._lim);
  }
  async get() {
    const rows = this._rows();
    this._db.reads += Math.max(1, rows.length);
    const docs = rows.map(([id, d]) => new DocSnap(new DocRef(this._db, this._col, id), d));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
  count() { return { get: async () => { this._db.reads += 1; return { data: () => ({ count: this._rows().length }) }; } }; }
}

class CollectionRef extends Query {
  doc(id) { return new DocRef(this._db, this._col, id ?? newId()); }
  async add(data) { const ref = this.doc(); await ref.set(data); return ref; }
}

class FakeFirestore {
  constructor() { this._data = new Map(); this.writes = 0; this.reads = 0; }
  _col(name) { if (!this._data.has(name)) this._data.set(name, new Map()); return this._data.get(name); }
  collection(name) { return new CollectionRef(this, name); }
  batch() {
    const ops = [];
    const b = {
      set: (ref, data, opts) => { ops.push(() => ref.set(data, opts)); return b; },
      update: (ref, data) => { ops.push(() => ref.update(data)); return b; },
      delete: (ref) => { ops.push(() => ref.delete()); return b; },
      commit: async () => { for (const op of ops) await op(); },
    };
    return b;
  }
  /** Runs the callback once; writes are applied after it returns, like a real transaction. */
  async runTransaction(fn) {
    const ops = [];
    const tx = {
      get: (refOrQuery) => refOrQuery.get(),
      set: (ref, data, opts) => { ops.push(() => ref.set(data, opts)); return tx; },
      update: (ref, data) => { ops.push(() => ref.update(data)); return tx; },
      delete: (ref) => { ops.push(() => ref.delete()); return tx; },
      create: (ref, data) => { ops.push(() => ref.set(data)); return tx; },
    };
    const result = await fn(tx);
    for (const op of ops) await op();
    return result;
  }
  settings() {}
  /* test helpers */
  reset() { this._data.clear(); seq = 0; this.writes = 0; this.reads = 0; }
  dump(name) { return [...this._col(name).entries()].map(([id, d]) => ({ id, ...clone(d) })); }
}

const db = new FakeFirestore();
module.exports = { FieldValue, Timestamp, getFirestore: () => db, __db: db };
