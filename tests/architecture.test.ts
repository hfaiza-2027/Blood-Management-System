/* Module boundaries: the client module never loads admin code or server-only code. */
import { test } from "node:test";
import assert from "node:assert/strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SERVER_ONLY = [/^firebase-admin/, /^next\/headers$/, /^@\/lib\/server\//, /^@\/lib\/firebase\/(admin|data|server)$/];

function resolve(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) if (fs.existsSync(base + ext)) return base + ext;
  return null;
}

function imports(file: string): string[] {
  const src: string = fs.readFileSync(file, "utf8");
  return [...src.matchAll(/(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|^import\s+["']([^"']+)["']/gm)].map((m) => m[1] ?? m[2] ?? m[3]);
}

/** Every module reachable from `entry`, following @/ and relative imports. */
function graph(entry: string, seen = new Map<string, string[]>()): Map<string, string[]> {
  if (seen.has(entry)) return seen;
  const specs = imports(entry);
  seen.set(entry, specs);
  for (const s of specs) {
    const r = resolve(s, entry);
    if (r) graph(r, seen);
  }
  return seen;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

const rel = (p: string) => path.relative(ROOT, p);
const isClient = (f: string) => fs.readFileSync(f, "utf8").trimStart().startsWith('"use client"');

test("client-side code never reaches firebase-admin, next/headers or lib/server", () => {
  const files = walk(path.join(ROOT, "app")).concat(walk(path.join(ROOT, "components")), walk(path.join(ROOT, "modules"))).filter(isClient);
  assert.ok(files.length > 20);
  for (const f of files)
    for (const [mod, specs] of graph(f))
      for (const s of specs) assert.ok(!SERVER_ONLY.some((re) => re.test(s)), `${rel(f)} → ${rel(mod)} imports server-only "${s}"`);
});

test("the client module never imports the admin module (and vice versa)", () => {
  const clientFiles = walk(path.join(ROOT, "app", "(client)")).concat(walk(path.join(ROOT, "modules", "client")));
  for (const f of clientFiles)
    for (const [mod] of graph(f)) assert.ok(!rel(mod).startsWith(path.join("modules", "admin")), `${rel(f)} pulls in ${rel(mod)}`);
  const adminFiles = walk(path.join(ROOT, "app", "(admin)")).concat(walk(path.join(ROOT, "modules", "admin")));
  for (const f of adminFiles)
    for (const [mod] of graph(f)) assert.ok(!rel(mod).startsWith(path.join("modules", "client")), `${rel(f)} pulls in ${rel(mod)}`);
});

test("shared code (components, services, lib) doesn't depend on either module", () => {
  const shared = walk(path.join(ROOT, "components")).concat(walk(path.join(ROOT, "services")), walk(path.join(ROOT, "lib")));
  for (const f of shared) for (const s of imports(f)) assert.ok(!s.startsWith("@/modules/"), `${rel(f)} imports ${s}`);
});

test("layouts don't wrap redirect() in try/catch", () => {
  for (const f of walk(path.join(ROOT, "app")).filter((x) => /layout\.tsx$/.test(x))) {
    const src: string = fs.readFileSync(f, "utf8");
    const tryBlocks = [...src.matchAll(/try\s*\{([\s\S]*?)\}\s*catch/g)].map((m) => m[1]);
    assert.ok(!tryBlocks.some((b) => b.includes("redirect(")), `${rel(f)} calls redirect() inside try`);
  }
});

test("every page folder in the sidebar has a page", () => {
  const nav: string = fs.readFileSync(path.join(ROOT, "components/layout/navConfig.ts"), "utf8");
  const hrefs = [...nav.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 20);
  for (const h of hrefs) {
    const group = h.startsWith("/admin") ? "(admin)" : "(client)";
    const p = path.join(ROOT, "app", group, h.slice(1), "page.tsx");
    assert.ok(fs.existsSync(p), `nav link ${h} has no page (${rel(p)})`);
  }
});
