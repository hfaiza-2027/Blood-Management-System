class NextResponse {
  constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.cookieJar = {}; const self = this; this.cookies = { set(n, v, o) { self.cookieJar[n] = { value: v, ...o }; } }; }
  static json(body, init) { return new NextResponse(body, init); }
  static next() { return new NextResponse(null); }
  static redirect(url) { const r = new NextResponse(null, { status: 307 }); r.location = String(url); return r; }
  async json() { return this.body; }
}
module.exports = { NextResponse };
