/* The "current request" cookie is whatever the test sets with __setCookie. */
let current = null;
module.exports = {
  cookies: async () => ({ get: (name) => (name === "bloodbridge_session" && current ? { value: current } : undefined) }),
  __setCookie: (v) => { current = v; },
};
