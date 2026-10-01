/* Fake Admin Auth: session cookies map directly to users registered with __signIn. */
const sessions = new Map(); // cookie -> decoded token
const log = { updated: [], deleted: [], revoked: [] };
const auth = {
  async verifySessionCookie(cookie) {
    const t = sessions.get(cookie);
    if (!t || log.revoked.includes(t.uid)) throw new Error("auth/session-cookie-revoked");
    return t;
  },
  async verifyIdToken(token) { const t = sessions.get(token); if (!t) throw new Error("auth/invalid-id-token"); return t; },
  async createSessionCookie(token) { return token; },
  async updateUser(uid, p) { log.updated.push({ uid, ...p }); return { uid }; },
  async deleteUser(uid) { log.deleted.push(uid); },
  async revokeRefreshTokens(uid) { log.revoked.push(uid); },
};
function __signIn(cookie, decoded) { sessions.set(cookie, { email_verified: true, ...decoded }); }
function __reset() { sessions.clear(); log.updated.length = 0; log.deleted.length = 0; log.revoked.length = 0; }
module.exports = { getAuth: () => auth, __signIn, __reset, __log: log };
