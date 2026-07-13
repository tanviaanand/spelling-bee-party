// In-browser stand-in for Firebase RTDB, used while firebase-config.js is unset.
// Same call signatures as firebase/database for the subset the app uses, so
// src/firebase.js can swap it in transparently. State lives in localStorage and
// syncs across tabs via BroadcastChannel — good for testing every flow on one
// machine; NOT shared across devices and with no real transaction races.

const STORE_KEY = "bee.localdb";

let tree = null;
try {
  tree = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
} catch {
  tree = null;
}
tree ??= {};

const listeners = new Set(); // { path, cb }
const chan = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("bee-localdb") : null;
if (chan) {
  chan.onmessage = (e) => {
    tree = e.data ?? {};
    notifyAll();
  };
}

const partsOf = (path) => (path ?? "").split("/").filter(Boolean);

function getAt(path) {
  let node = tree;
  for (const part of partsOf(path)) {
    if (node == null || typeof node !== "object") return null;
    node = node[part];
  }
  return node === undefined ? null : node;
}

// RTDB never stores null or empty objects — mimic so "missing key" behavior matches prod.
function prune(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map((x) => prune(x));
  if (typeof v !== "object") return v;
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    const p = prune(val);
    if (p !== null) out[k] = p;
  }
  return Object.keys(out).length ? out : null;
}

// Resolve firebase increment() sentinels against the current value.
function resolveSentinels(value, path) {
  if (value != null && typeof value === "object") {
    if (typeof value[".increment"] === "number") {
      const cur = getAt(path);
      return (typeof cur === "number" ? cur : 0) + value[".increment"];
    }
    const out = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveSentinels(v, `${path}/${k}`);
    return out;
  }
  return value;
}

function setAtSilently(path, value) {
  const parts = partsOf(path);
  const resolved = prune(resolveSentinels(value, path));
  if (!parts.length) {
    tree = resolved ?? {};
    return;
  }
  let node = tree;
  for (const part of parts.slice(0, -1)) {
    if (node[part] == null || typeof node[part] !== "object") node[part] = {};
    node = node[part];
  }
  const leaf = parts[parts.length - 1];
  if (resolved === null) delete node[leaf];
  else node[leaf] = resolved;
}

function commit() {
  tree = prune(tree) ?? {};
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(tree));
  } catch {
    /* storage full/blocked — in-memory still works */
  }
  chan?.postMessage(tree);
  notifyAll();
}

function snap(path) {
  if (path === ".info/serverTimeOffset") return { val: () => 0 };
  if (path === ".info/connected") return { val: () => true };
  return { val: () => structuredClone(getAt(path)) }; // fresh object so React re-renders
}

function notifyAll() {
  for (const l of [...listeners]) l.cb(snap(l.path));
}

// ---------- firebase/database-compatible API ----------
export function ref(_db, path) {
  return { path: path ?? "" };
}

export function onValue(refObj, cb) {
  const l = { path: refObj.path, cb };
  listeners.add(l);
  cb(snap(refObj.path));
  return () => listeners.delete(l);
}

export function set(refObj, value) {
  setAtSilently(refObj.path, value);
  commit();
  return Promise.resolve();
}

export function update(refObj, values) {
  for (const [k, v] of Object.entries(values ?? {})) {
    const full = refObj.path ? `${refObj.path}/${k}` : k;
    setAtSilently(full, v);
  }
  commit();
  return Promise.resolve();
}

export const remove = (refObj) => set(refObj, null);

let pushCounter = 0;
export function push(refObj, value) {
  // Sortable-enough unique key for a one-night app.
  const key = `L${Date.now().toString(36)}${(pushCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const child = { path: refObj.path ? `${refObj.path}/${key}` : key, key };
  if (value !== undefined) set(child, value);
  return child;
}

export const increment = (n) => ({ ".increment": n });

// Real RTDB stamps this server-side; the mock's clock IS the "server".
export const serverTimestamp = () => Date.now();

export function runTransaction(refObj, fn) {
  const current = structuredClone(getAt(refObj.path));
  const result = fn(current);
  if (result === undefined) {
    return Promise.resolve({ committed: false, snapshot: snap(refObj.path) });
  }
  setAtSilently(refObj.path, result);
  commit();
  return Promise.resolve({ committed: true, snapshot: snap(refObj.path) });
}
