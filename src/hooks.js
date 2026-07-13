import { useEffect, useMemo, useState } from "react";
import { db, serverNow, ref, onValue } from "./firebase";
import { computeTotals } from "./scoring";
import { gamePath } from "./game";

export function useDbValue(path) {
  const [val, setVal] = useState(undefined);
  useEffect(() => onValue(ref(db, path), (s) => setVal(s.val())), [path]);
  return val;
}

// Same as useDbValue but scoped to the current game room (/games/<code>/<sub>).
export function useGameValue(sub) {
  return useDbValue(gamePath(sub));
}

export function useScores() {
  const ledger = useGameValue("ledger");
  const totals = useMemo(() => computeTotals(ledger), [ledger]);
  return { ledger, totals };
}

export function useConnected() {
  const v = useDbValue(".info/connected"); // global, not per-game
  return v !== false; // undefined (still loading) counts as connected to avoid a flash
}

// #/               → landing (no code)
// #/<CODE>         → present (TV default) | #/<CODE>/admin | #/<CODE>/play/<playerId>
export function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const fn = () => setHash(window.location.hash);
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const code = parts[0] ? parts[0].toUpperCase() : null;
  return { code, view: parts[1] || "present", param: parts[2] ?? null };
}

// Ticking clock (server-corrected) for countdown rendering.
export function useNow(active, intervalMs = 100) {
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
