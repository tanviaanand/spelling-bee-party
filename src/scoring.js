// Ledger → totals. The ledger is the source of truth (§9); /teams/<id>/score is
// only a mirror. Totals are the raw sum — negative scores are allowed (host's
// rule: you can wager more than you have and go into the red).
export function computeTotals(ledger) {
  const totals = {};
  for (const e of Object.values(ledger ?? {})) {
    if (e.voided) continue;
    totals[e.teamId] = (totals[e.teamId] ?? 0) + e.delta;
  }
  return totals;
}

// Sorted [teamId, name, score] rows for leaderboards.
export function standings(teams, totals) {
  return Object.entries(teams ?? {})
    .map(([id, t]) => ({ id, name: t.name, score: totals[id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

// Latest non-voided ledger entry (undo target).
export function lastUndoable(ledger) {
  let best = null;
  for (const [id, e] of Object.entries(ledger ?? {})) {
    if (e.voided) continue;
    if (!best || e.ts > best.entry.ts) best = { id, entry: e };
  }
  return best;
}

// Ranked buzz queue: sort by server arrival time, playerId breaks exact ties.
export function buzzOrder(queue) {
  return Object.entries(queue ?? {})
    .map(([playerId, ts]) => ({ playerId, ts }))
    .sort((a, b) => a.ts - b.ts || a.playerId.localeCompare(b.playerId));
}

// Teams tied for the lead (tiebreaker check).
export function leaders(teams, totals) {
  const rows = standings(teams, totals);
  if (!rows.length) return [];
  return rows.filter((r) => r.score === rows[0].score);
}
