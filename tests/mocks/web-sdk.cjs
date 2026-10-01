/* Firebase Web SDK is never used by server-side tests; keep imports harmless. */
const noop = () => undefined;
module.exports = new Proxy({}, { get: (_t, k) => (k === "__esModule" ? false : k === "EmailAuthProvider" ? { credential: noop } : noop) });
