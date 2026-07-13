import { useEffect, useMemo, useState } from "react";
import { db, serverNow, ref, onValue } from "./firebase";
import { computeTotals } from "./scoring";

export function useDbValue(path) {
  const [val, setVal] = useState(undefined);
  useEffect(() => onValue(ref(db, path), (s) => setVal(s.val())), [path]);
  return val;
}

export function useScores() {
  const ledger = useDbValue("ledger");
  const totals = useMemo(() => computeTotals(ledger), [ledger]);
  return { ledger, totals };
}

export function useConnected() {
  const v = useDbValue(".info/connected");
  return v !== false; // undefined (still loading) counts as connected to avoid a flash
}

// #/present (default) | #/admin | #/play/<playerId>
export function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const fn = () => setHash(window.location.hash);
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  return { view: parts[0] || "present", param: parts[1] ?? null };
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
