// The entire RTDB write surface. By convention (§10): Admin is the only writer of
// /state, /teams, /ledger, /awards; phones call only buzz() and claimPlayer().
import { db, serverNow, ref, push, set, update, remove, increment, serverTimestamp } from "./firebase";
import { computeTotals } from "./scoring";

// Real Firebase rejects ref(db, "") — the root ref must omit the path argument.
const r = (path) => (path ? ref(db, path) : ref(db, undefined));
const newKey = () => push(r("_keys")).key; // client-side key generation, no write

// RTDB path segments can't contain . # $ / [ ]
export const dbKey = (s) => String(s).replace(/[.#$/[\]]/g, "_");

export const PHASES = [
  "welcome",
  "setup",
  "worker_bees",
  "bee_sharp",
  "the_buzz",
  "queen_bee_gambit",
  "tiebreaker",
  "awards",
];

export const EMPTY_GAMBIT = {
  turnRound: 1,
  // Per-rotation state so switching rotations never loses anything:
  // rounds: { 1: { mode, wagers, spelled, wagersRevealed }, 2: {...} }
  rounds: null,
  spellerId: null,
  infoShown: { word: false, pronunciation: false, definition: false, origin: false, sentence: false },
};

export const INITIAL_STATE = {
  phase: "welcome",
  isTrial: true,
  gameCounted: false, // usage ping sent for this game (cleared by resetGame)
  currentPrompt: null,
  activeTeam: null,
  gambit: EMPTY_GAMBIT,
  scoresVisible: true,
  timer: { endsAt: null, seconds: 0 },
  buzz: { openRoundId: "init", open: false, queue: null, activeIndex: null, orderRevealed: false, answerDeadline: null },
  tts: null,
};

// ---------- /state ----------
export const setPhase = (phase) => update(r("state"), { phase });
export const markGameCounted = () => update(r("state"), { gameCounted: true });
export const setTrial = (isTrial) => update(r("state"), { isTrial });
export const setScoresVisible = (v) => update(r("state"), { scoresVisible: v });
export const setActiveTeam = (teamId) => update(r("state"), { activeTeam: teamId });
export const setReveal = (revealed) => update(r("state/currentPrompt"), { revealed });

// Load a prompt; isTrial rides along so trial mode can never be forgotten.
export function setPrompt(prompt, isTrial) {
  return update(r("state"), { currentPrompt: prompt, isTrial });
}

export const startTimer = (seconds) =>
  set(r("state/timer"), { endsAt: serverNow() + seconds * 1000, seconds });
export const clearTimer = () => set(r("state/timer"), { endsAt: null, seconds: 0 });

// Monotonic nonce → the Presenter re-fires even for identical text.
export const triggerTTS = (kind, text = "") =>
  set(r("state/tts"), { nonce: serverNow(), kind, text });

// ---------- setup: teams & players ----------
export const addTeam = (name) => set(push(r("teams")), { name, score: 0 });
export const renameTeam = (teamId, name) => update(r(`teams/${teamId}`), { name });
export function removeTeam(teamId, players) {
  const updates = { [`teams/${teamId}`]: null };
  for (const [pid, p] of Object.entries(players ?? {})) {
    if (p.teamId === teamId) updates[`players/${pid}`] = null;
  }
  return update(r(""), updates);
}
export const addPlayer = (teamId, name) =>
  set(push(r("players")), { name, teamId, claimed: false, buzzWins: 0, correct: 0 });
export const removePlayer = (playerId) => remove(r(`players/${playerId}`));

// The only phone writes outside the buzz transaction.
export const claimPlayer = (playerId) => update(r(`players/${playerId}`), { claimed: true });
export const unclaimPlayer = (playerId) => update(r(`players/${playerId}`), { claimed: false });

// ---------- ledger (§9) ----------
// Multi-path update: append entry + mirror team score + player attribution, atomically.
export function addLedgerEntry(ledger, { teamId, playerId = null, phase, delta, note = "", isBuzzWin = false }) {
  const entryId = newKey();
  const entry = { ts: serverNow(), teamId, playerId, phase, delta, note, voided: false };
  const totals = computeTotals({ ...(ledger ?? {}), [entryId]: entry });
  const updates = {
    [`ledger/${entryId}`]: entry,
    [`teams/${teamId}/score`]: totals[teamId] ?? 0,
  };
  if (playerId && delta > 0) {
    updates[`players/${playerId}/correct`] = increment(1);
    if (isBuzzWin) updates[`players/${playerId}/buzzWins`] = increment(1);
  }
  return update(r(""), updates);
}

export function voidEntry(ledger, entryId) {
  const entry = ledger?.[entryId];
  if (!entry || entry.voided) return Promise.resolve();
  const next = { ...ledger, [entryId]: { ...entry, voided: true } };
  const totals = computeTotals(next);
  const updates = {
    [`ledger/${entryId}/voided`]: true,
    [`teams/${entry.teamId}/score`]: totals[entry.teamId] ?? 0,
  };
  if (entry.playerId && entry.delta > 0) {
    updates[`players/${entry.playerId}/correct`] = increment(-1);
    if (entry.phase === "the_buzz") updates[`players/${entry.playerId}/buzzWins`] = increment(-1);
  }
  return update(r(""), updates);
}

// Change a slot's mark (§13 marking UIs): void the previous ledger entry if it's
// still live, write the new scoring entry (unless trial / non-scoring), and record
// the mark under /marks — all in ONE atomic multi-path update, so re-clicking
// ✓ after ✗ (or vice versa) just updates the score on the fly.
export function remark({ ledger, marksNode, phase, promptKey, slotId, mark, entry, isTrial }) {
  const updates = {};
  const nextLedger = { ...(ledger ?? {}) };
  const affectedTeams = new Set();

  // 1. void the previous entry attached to this mark, if any and still live
  const prevId = marksNode?.entryId;
  const prev = prevId ? ledger?.[prevId] : null;
  if (prev && !prev.voided) {
    updates[`ledger/${prevId}/voided`] = true;
    nextLedger[prevId] = { ...prev, voided: true };
    affectedTeams.add(prev.teamId);
    if (prev.playerId && prev.delta > 0) {
      updates[`players/${prev.playerId}/correct`] = increment(-1);
      if (prev.phase === "the_buzz") updates[`players/${prev.playerId}/buzzWins`] = increment(-1);
    }
  }

  // 2. add the new entry if this mark scores anything
  let entryId = null;
  if (entry && !isTrial) {
    const { isBuzzWin, ...data } = entry;
    entryId = newKey();
    const full = { ts: serverNow(), playerId: null, note: "", ...data, voided: false };
    updates[`ledger/${entryId}`] = full;
    nextLedger[entryId] = full;
    affectedTeams.add(full.teamId);
    if (full.playerId && full.delta > 0) {
      updates[`players/${full.playerId}/correct`] = increment(1);
      if (isBuzzWin) updates[`players/${full.playerId}/buzzWins`] = increment(1);
    }
  }

  // 3. re-mirror every affected team's score from the resulting ledger
  const totals = computeTotals(nextLedger);
  for (const tid of affectedTeams) updates[`teams/${tid}/score`] = totals[tid] ?? 0;

  // 4. record the mark itself
  updates[`marks/${phase}/${dbKey(promptKey)}/${slotId}`] = {
    mark,
    entryId,
    playerId: entry?.playerId ?? null,
  };

  return update(r(""), updates);
}

// Edit delta/team/note of an entry; re-mirrors both affected team scores.
export function editEntry(ledger, entryId, patch) {
  const entry = ledger?.[entryId];
  if (!entry) return Promise.resolve();
  const edited = { ...entry, ...patch };
  const next = { ...ledger, [entryId]: edited };
  const totals = computeTotals(next);
  const updates = { [`ledger/${entryId}`]: edited };
  updates[`teams/${edited.teamId}/score`] = totals[edited.teamId] ?? 0;
  if (patch.teamId && patch.teamId !== entry.teamId) {
    updates[`teams/${entry.teamId}/score`] = totals[entry.teamId] ?? 0;
  }
  return update(r(""), updates);
}

// ---------- buzz (queue model) ----------
// Every buzz is collected into /state/buzz/queue, stamped by the SERVER on
// arrival, so the ranked order is exactly as authoritative as a transaction —
// each phone only ever writes its own key, so there is nothing to race.
export const resetBuzz = () =>
  set(r("state/buzz"), {
    openRoundId: newKey(),
    open: false, // armed by the host's "Open buzzing" CTA, not by loading a word
    queue: null,
    activeIndex: null, // null = judging not started (reveal is display-only)
    orderRevealed: false,
    answerDeadline: null,
  });

export const setBuzzOpen = (open) => update(r("state/buzz"), { open });

export function buzz(playerId, seenRoundId, buzzState) {
  if (!buzzState?.open) return Promise.resolve(); // not armed
  if (buzzState.openRoundId !== seenRoundId) return Promise.resolve(); // stale word
  if (buzzState.queue?.[playerId]) return Promise.resolve(); // already in the queue
  return set(r(`state/buzz/queue/${playerId}`), serverTimestamp());
}

// Display-only: show the ranked list on the TV. Touches nothing else — buzzing
// stays open if it was open, no clock, no current speller.
export const revealBuzzOrder = () => update(r("state/buzz"), { orderRevealed: true });

// Explicit "begin scoring" action: close buzzing, spotlight #1, start their 5s clock.
export const startJudging = () =>
  update(r("state/buzz"), { open: false, activeIndex: 0, answerDeadline: serverNow() + 5000 });

// Move to the next buzzer in the list with a fresh 5s clock.
export const advanceBuzzer = (nextIndex) =>
  update(r("state/buzz"), { activeIndex: nextIndex, answerDeadline: serverNow() + 5000 });

// Stop the Presenter's 5s clock once the host has judged the answer.
export const clearAnswerClock = () => update(r("state/buzz"), { answerDeadline: null });

// ---------- gambit ----------
export const setGambit = (patch) => update(r("state/gambit"), patch);
export const showGambitInfo = (key) => update(r("state/gambit/infoShown"), { [key]: true });
// Full reset (phase entry / tiebreaker) — wipes BOTH rotations.
export const resetGambitTurn = (turnRound) =>
  update(r("state"), { gambit: { ...EMPTY_GAMBIT, turnRound } });
// Rotation switch: transient turn state resets, both rotations' data survives.
export const setGambitRotation = (turnRound) =>
  update(r("state"), {
    "gambit/turnRound": turnRound,
    "gambit/spellerId": null,
    "gambit/infoShown": EMPTY_GAMBIT.infoShown,
    currentPrompt: null,
  });
export const setGambitWager = (turnRound, teamId, amount) =>
  update(r(`state/gambit/rounds/${turnRound}/wagers`), { [teamId]: amount });
export const startGambitSpelling = (turnRound) =>
  update(r(`state/gambit/rounds/${turnRound}`), { mode: "spelling" });
// The end-of-rotation moment: amounts go public on the TV.
export const revealGambitWagers = (turnRound) =>
  update(r(`state/gambit/rounds/${turnRound}`), { wagersRevealed: true });
// A team steps up to spell: fresh speller/panels + cleared word; rotation data survives.
export const startGambitTeamTurn = (teamId) =>
  update(r("state"), {
    activeTeam: teamId,
    currentPrompt: null,
    "gambit/spellerId": null,
    "gambit/infoShown": EMPTY_GAMBIT.infoShown,
  });
// Words are burned once shown (§7.4) — survives Admin refresh.
export const burnGambitWord = (word) => update(r("gambitUsed"), { [dbKey(word)]: word });

// ---------- awards ----------
export const setAward = (key, value) => update(r("awards"), { [key]: value });
// Staged reveal on the TV: lowest → buzzer → creative → champion.
export const revealAward = (key) => update(r("awards/revealed"), { [key]: true });

// ---------- build high-water mark (stale-tab banner) ----------
// Newest build wins; tabs whose id is lower show a "refresh" banner. resetGame leaves /meta alone.
export function announceBuild(currentId, myId) {
  if ((currentId ?? 0) < myId) return set(r("meta/buildId"), myId);
  return Promise.resolve();
}

// ---------- reset ----------
export function resetGame(teams, players) {
  const updates = {
    state: INITIAL_STATE,
    ledger: null,
    marks: null,
    gambitUsed: null,
    awards: { champion: null, topBuzzer: null, creativeMisspelling: null, revealed: null },
  };
  for (const id of Object.keys(teams ?? {})) updates[`teams/${id}/score`] = 0;
  for (const id of Object.keys(players ?? {})) {
    updates[`players/${id}/claimed`] = false;
    updates[`players/${id}/buzzWins`] = 0;
    updates[`players/${id}/correct`] = 0;
  }
  return update(r(""), updates);
}
