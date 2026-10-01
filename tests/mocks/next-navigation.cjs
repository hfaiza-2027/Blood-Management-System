class RedirectError extends Error { constructor(url) { super(`NEXT_REDIRECT:${url}`); this.url = url; } }
module.exports = {
  redirect: (url) => { throw new RedirectError(url); },
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  useRouter: () => ({ push() {}, replace() {}, back() {}, refresh() {} }),
  usePathname: () => "/",
  RedirectError,
};
