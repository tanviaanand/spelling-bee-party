// Backend switch: real Firebase RTDB when firebase-config.js is filled in,
// otherwise the in-browser localdb (single-machine test mode). db.js and
// hooks.js import the database API from here, never from firebase/database.
import { initializeApp } from "firebase/app";
import * as fdb from "firebase/database";
import * as ldb from "./localdb";
import { firebaseConfig } from "./firebase-config";

export const isConfigured = !Object.values(firebaseConfig).includes("PASTE_ME");
export const LOCAL_MODE = !isConfigured;

// Stamped at build time (vite define); dev tabs never announce theirs (see App).
export const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : 0;
export const IS_PROD_BUILD = import.meta.env.PROD;

let _db = null;
let offset = 0;
const api = isConfigured ? fdb : ldb;

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  _db = fdb.getDatabase(app);
  // Server-clock sync so timers agree across devices regardless of local clocks.
  fdb.onValue(fdb.ref(_db, ".info/serverTimeOffset"), (s) => {
    offset = s.val() ?? 0;
  });
}

export const db = _db;
export const serverNow = () => Date.now() + offset;
export const { ref, onValue, set, update, remove, push, increment, runTransaction, serverTimestamp } = api;
