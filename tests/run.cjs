#!/usr/bin/env node
/**
 * Zero-dependency test runner for Qatra.
 *
 *   npm test            run every tests/*.test.ts
 *   npm test -- data    run files whose name contains "data"
 *
 * TypeScript is compiled on the fly with the project's own `typescript`
 * package. Firebase Admin, Firebase Web SDK and next/* are replaced with the
 * in-memory fakes in tests/mocks, so no network or Firebase project is needed.
 */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const ROOT = path.resolve(__dirname, "..");

function loadTypeScript() {
  const candidates = [path.join(ROOT, "node_modules", "typescript"), "typescript"];
  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      /* try next */
    }
  }
  console.error("TypeScript was not found. Run `npm install` first.");
  process.exit(1);
}
const ts = loadTypeScript();

// Test environment: pretend Firebase is configured so the real data layer runs against the fakes.
Object.assign(process.env, {
  NODE_ENV: "test",
  FIREBASE_PROJECT_ID: "qatra-test",
  FIREBASE_CLIENT_EMAIL: "test@qatra-test.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----\\n",
});

const MOCKS = {
  "firebase-admin/app": "admin-app.cjs",
  "firebase-admin/auth": "admin-auth.cjs",
  "firebase-admin/firestore": "firestore.cjs",
  "next/headers": "next-headers.cjs",
  "next/navigation": "next-navigation.cjs",
  "next/server": "next-server.cjs",
  "firebase/app": "web-sdk.cjs",
  "firebase/auth": "web-sdk.cjs",
  "firebase/firestore": "web-sdk.cjs",
};

const EXTS = [".ts", ".tsx", ".js", ".cjs"];
function resolveFile(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of EXTS) if (fs.existsSync(base + e)) return base + e;
  for (const e of EXTS) if (fs.existsSync(path.join(base, "index" + e))) return path.join(base, "index" + e);
  return null;
}

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (MOCKS[request]) return path.join(__dirname, "mocks", MOCKS[request]);
  if (request.startsWith("@/")) {
    const hit = resolveFile(path.join(ROOT, request.slice(2)));
    if (hit) return hit;
  }
  if ((request.startsWith("./") || request.startsWith("../")) && parent && parent.filename) {
    const hit = resolveFile(path.resolve(path.dirname(parent.filename), request));
    if (hit) return hit;
  }
  return origResolve.call(this, request, parent, ...rest);
};

function compile(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const out = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      sourceMap: false,
    },
  });
  module._compile(out.outputText, filename);
}
require.extensions[".ts"] = compile;
require.extensions[".tsx"] = compile;

const filter = process.argv[2] ?? "";
const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith(".test.ts") && f.includes(filter))
  .sort();
if (!files.length) {
  console.error(`No test files match "${filter}".`);
  process.exit(1);
}
for (const f of files) require(path.join(__dirname, f));
