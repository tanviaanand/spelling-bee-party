import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGameValue, useScores } from "../hooks";
import { lastUndoable, buzzOrder, standings } from "../scoring";
import {
  PHASES,
  EMPTY_GAMBIT,
  setPhase,
  setTrial,
  setPrompt,
  setReveal,
  setScoresVisible,
  setActiveTeam,
  startTimer,
  clearTimer,
  triggerTTS,
  remark,
  dbKey,
  voidEntry,
  resetBuzz,
  setBuzzOpen,
  revealBuzzOrder,
  startJudging,
  advanceBuzzer,
  clearAnswerClock,
  setGambit,
  resetGambitTurn,
  setGambitRotation,
  setGambitWager,
  startGambitSpelling,
  revealGambitWagers,
  startGambitTeamTurn,
  showGambitInfo,
  burnGambitWord,
  setAward,
  markGameCounted,
} from "../db";
import { bumpStat } from "../stats";
import { gameCode } from "../game";
import { trialWords, workerBees, beeSharp, theBuzz, queenBeeGambit } from "../words";
import AdminSetup from "./AdminSetup";
import AdminLedger from "./AdminLedger";
import MarkingPanel from "./AdminMarking";

const PHASE_LABELS = {
  welcome: "Welcome",
  setup: "Setup",
  worker_bees: "1 · Worker Bees",
  bee_sharp: "2 · Bee Sharp",
  the_buzz: "3 · The Buzz",
  queen_bee_gambit: "4 · Gambit",
  tiebreaker: "⚡ Tiebreak",
  awards: "🏆 Awards",
};
// ArrowRight walks this list; tiebreaker is entered via its button only.
const MAIN_FLOW = PHASES.filter((p) => p !== "tiebreaker");

// Full lists always — played/burned words are struck through in the UI, never removed.
function buildList(phase) {
  switch (phase) {
    case "worker_bees":
      return [{ trial: true, kind: "word", data: trialWords.worker_bees }, ...workerBees.map((w) => ({ kind: "word", data: w }))];
    case "bee_sharp":
      return [{ trial: true, kind: "homophones", data: trialWords.bee_sharp }, ...beeSharp.map((w) => ({ kind: "homophones", data: w }))];
    case "the_buzz":
      return [{ trial: true, kind: "word", data: trialWords.the_buzz }, ...theBuzz.map((w) => ({ kind: "word", data: w }))];
    case "queen_bee_gambit":
      return [{ trial: true, kind: "word", data: trialWords.queen_bee_gambit }, ...queenBeeGambit.map((w) => ({ kind: "word", data: w }))];
    case "tiebreaker":
      return queenBeeGambit.map((w) => ({ kind: "word", data: w }));
    default:
      return [];
  }
}

const itemLabel = (item) => item.data.word ?? (item.data.answers ?? []).join(" / ");
const promptKeyOf = (p) => (p ? p.word ?? (p.answers ?? []).join(" / ") : null);

function toPrompt(item) {
  if (item.kind === "homophones") {
    return { type: "homophones", definitions: item.data.definitions ?? [], answers: item.data.answers ?? [], revealed: false };
  }
  return {
    type: "word",
    word: item.data.word,
    definition: item.data.definition ?? "",
    sentence: item.data.sentence ?? "",
    origin: item.data.origin ?? "",
    revealed: false,
  };
}

export default function Admin() {
  const state = useGameValue("state");
  const teams = useGameValue("teams");
  const players = useGameValue("players");
  const awards = useGameValue("awards");
  const gambitUsed = useGameValue("gambitUsed");
  const marksTree = useGameValue("marks");
  const { ledger, totals } = useScores();

  const [flashMsg, setFlashMsg] = useState(null);
  const wagerRef = useRef(null);
  const flashTimer = useRef(null);

  const phase = state?.phase ?? "welcome";
  const prompt = state?.currentPrompt ?? null;
  const isTrial = state?.isTrial === true;
  const gambitish = phase === "queen_bee_gambit" || phase === "tiebreaker";
  const teamIds = Object.keys(teams ?? {});
  const promptKey = promptKeyOf(prompt);
  const list = useMemo(() => buildList(phase), [phase]);
  const curIdx = list.findIndex((item) => itemLabel(item) === promptKey);

  function flash(msg) {
    setFlashMsg(msg);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashMsg(null), 2500);
  }

  // ---- persistent marks: /marks/<phase>/<wordKey>/<slot> = { mark, entryId } ----
  const wordMarks = (promptKey && marksTree?.[phase]?.[dbKey(promptKey)]) || {};
  // A mark whose ledger entry was voided (via U) counts as unmarked, so undo
  // and the marking UI never disagree.
  const effectiveMark = (rec) =>
    !rec || (rec.entryId && ledger?.[rec.entryId]?.voided) ? null : rec.mark;
  const slotMarks = Object.fromEntries(
    Object.entries(wordMarks).map(([slot, rec]) => [slot, effectiveMark(rec)])
  );

  // Re-marking a slot voids its old ledger entry and writes the new one in one
  // atomic update — clicking ✓ after ✗ just updates the score on the fly.
  function applyMark(slotId, newMark, entry) {
    if (slotMarks[slotId] === newMark) return false; // idempotent
    remark({
      ledger,
      marksNode: wordMarks[slotId],
      phase,
      promptKey,
      slotId,
      mark: newMark,
      entry,
      isTrial,
    });
    if (isTrial) flash("Trial word — not scored");
    triggerTTS(newMark === "c" ? "ding" : "buzz");
    return true;
  }

  // ---------- prompt loading ----------
  function loadItem(item) {
    // "Word N of M" (real words only) so the TV tracks the host; meaningless in
    // Gambit/tiebreaker where words are per-team and burned.
    const real = list.filter((it) => !it.trial);
    const idx = real.indexOf(item);
    const numbering = !gambitish && idx !== -1 ? { index: idx + 1, total: real.length } : {};
    setPrompt({ ...toPrompt(item), ...numbering }, !!item.trial);
    clearTimer();
    if (phase === "the_buzz") resetBuzz(); // fresh, CLOSED queue — host opens buzzing after the audio
    if (gambitish) {
      if (!item.trial) burnGambitWord(item.data.word);
      setGambit({ infoShown: EMPTY_GAMBIT.infoShown }); // fresh panels; wager/speller survive
    }
  }
  function nextWord() {
    if (!list.length) return;
    const next = list[curIdx + 1];
    if (next) loadItem(next);
    else flash("No more words in this round.");
  }

  // ---------- TTS (phase-aware; Bee Sharp never speaks the homophones) ----------
  function ttsWord() {
    if (!prompt) return;
    if (phase === "bee_sharp") return ttsDefinition();
    triggerTTS("word", prompt.word);
    if (gambitish) showGambitInfo("pronunciation");
  }
  function ttsDefinition() {
    if (!prompt) return;
    if (phase === "bee_sharp") {
      const text = (prompt.definitions ?? []).map((d, i) => `Definition ${i + 1}: ${d}`).join(" … ");
      triggerTTS("definition", text);
      return;
    }
    if (!prompt.definition) return;
    triggerTTS("definition", prompt.definition);
    if (gambitish) showGambitInfo("definition");
  }
  function ttsSentence() {
    if (!prompt?.sentence) return;
    triggerTTS("sentence", prompt.sentence);
    if (gambitish) showGambitInfo("sentence");
  }
  function ttsOrigin() {
    if (!prompt?.origin) return;
    triggerTTS("origin", prompt.origin);
    if (gambitish) showGambitInfo("origin");
  }

  // ---------- per-round marking ----------
  function markTeamWB(teamId, correct) {
    if (!teamId || phase !== "worker_bees" || !prompt) return;
    applyMark(teamId, correct ? "c" : "x", correct ? { teamId, phase, delta: 10, note: prompt.word } : null);
  }

  // All teams play every set simultaneously (like Worker Bees), scored per spelling per team.
  function markBeeSharpAnswer(teamId, answerIdx, answer, correct) {
    if (!teamId || !prompt) return;
    applyMark(
      `${teamId}_${answerIdx}`,
      correct ? "c" : "x",
      correct ? { teamId, phase, delta: 10, note: answer } : null
    );
  }

  // ---- The Buzz: queue console ----
  const bzOrder = buzzOrder(state?.buzz?.queue);
  const bzActive = state?.buzz?.activeIndex ?? null; // null = judging not started

  function nextUnjudgedBuzzer(fromIdx) {
    for (let i = fromIdx + 1; i < bzOrder.length; i++) {
      if (!slotMarks[bzOrder[i].playerId]) return i;
    }
    return -1;
  }

  // Judge the current buzzer (or a specific row via pidOverride for re-judging).
  function markBuzz(correct, pidOverride = null) {
    const pid = pidOverride ?? (bzActive !== null ? bzOrder[bzActive]?.playerId : null);
    if (!pid) {
      return flash(bzOrder.length ? "Start judging first (T) — or use a row's ✓/✗." : "Nobody has buzzed — open buzzing first (B).");
    }
    const p = players?.[pid];
    if (!p || !prompt) return;
    applyMark(
      pid,
      correct ? "c" : "x",
      correct
        ? { teamId: p.teamId, playerId: pid, phase, delta: 20, note: prompt.word, isBuzzWin: true }
        : { teamId: p.teamId, playerId: null, phase, delta: -10, note: `${prompt.word} — missed by ${p.name}` }
    );
    if (pidOverride) return; // re-judging an earlier row: don't touch clock/turn
    if (correct) clearAnswerClock();
    else buzzNext(); // miss → straight to the next person in the list
  }

  function buzzNext() {
    if (phase !== "the_buzz") return;
    if (!bzOrder.length) return flash("Nobody has buzzed yet.");
    if (bzActive === null) return startJudging(); // T first begins with #1
    const i = nextUnjudgedBuzzer(bzActive);
    if (i === -1) {
      clearAnswerClock();
      return flash("No more buzzers — re-open buzzing (B) or Enter for the next word.");
    }
    advanceBuzzer(i);
  }

  function openBuzzing() {
    if (phase !== "the_buzz") return;
    if (!prompt) return flash("Load a word first (Enter).");
    setBuzzOpen(true);
    flash("🔔 Buzzing is OPEN");
  }

  function revealOrder() {
    if (!bzOrder.length) return flash("Nobody has buzzed yet.");
    revealBuzzOrder();
  }

  // Everything gambit is namespaced by the current rotation.
  const gTr = state?.gambit?.turnRound ?? 1;
  const gRot = state?.gambit?.rounds?.[gTr] ?? {};

  const gambitApi = {
    wagerRef,
    // Wager phase: lock one team's blind wager — no cap, going negative is allowed.
    lockWager(teamId, v) {
      const n = Math.max(0, Math.round(Number(v) || 0));
      setGambitWager(gTr, teamId, n);
      flash(`${teams?.[teamId]?.name}: wagering ${n}`);
    },
    unlockWager(teamId) {
      setGambitWager(gTr, teamId, null);
    },
    startSpelling() {
      if (!teamIds.every((tid) => gRot.wagers?.[tid] != null)) {
        return flash("Every team needs a locked wager first.");
      }
      startGambitSpelling(gTr);
      startGambitTeamTurn(teamIds[0]);
      flash("Wagers locked — spelling begins!");
    },
    revealWagers() {
      revealGambitWagers(gTr);
      triggerTTS("ding");
      flash(`Rotation ${gTr} wagers revealed on the TV!`);
    },
    showGambitWord() {
      showGambitInfo("word");
    },
    gambitInfo(key) {
      if (key === "pronunciation") ttsWord();
      else if (key === "definition") ttsDefinition();
      else if (key === "origin") ttsOrigin();
      else if (key === "sentence") ttsSentence();
    },
    markGambit(correct) {
      const teamId = state?.activeTeam;
      const g = state?.gambit ?? {};
      if (!teamId) return flash("Pick the active team first.");
      if (!prompt) return flash("Load the word first.");
      const wager = gRot.wagers?.[teamId];
      if (!isTrial && !(wager != null && g.infoShown?.word)) {
        return flash("This team needs a locked wager and the word shown first.");
      }
      applyMark(teamId, correct ? "c" : "x", {
        teamId,
        playerId: correct ? g.spellerId ?? null : null,
        phase: "queen_bee_gambit",
        delta: correct ? wager ?? 0 : -(wager ?? 0),
        note: `wager on ${prompt.word}`,
      });
      setGambit({ [`rounds/${gTr}/spelled/${teamId}`]: true });
      setReveal(true);
    },
    // Jump straight to any team's turn (wagers and spelled-status survive).
    gambitSelectTeam(teamId) {
      startGambitTeamTurn(teamId);
    },
    backToWagers() {
      setPrompt(null, false); // trial demo over — the wagers panel takes back over
    },
    // Manual rotation switch — each rotation keeps its own wagers/progress; nothing is lost.
    setRotation(n) {
      setGambitRotation(n);
      flash(`Rotation ${n}.`);
    },
    gambitNextTeam() {
      if (!teamIds.length) return;
      const next = teamIds.find((tid) => !gRot.spelled?.[tid] && tid !== state?.activeTeam);
      if (next) return startGambitTeamTurn(next);
      if (gTr >= 2) return flash("Both rotations done — head to Awards (→).");
      setGambitRotation(2);
      flash("Rotation 2 — collect a fresh round of wagers!");
    },
    setTiebreakTeam(teamId) {
      setActiveTeam(teamId);
      resetGambitTurn(1);
      setPrompt(null, false);
    },
    tiebreakWinner(teamId) {
      setAward("champion", teamId);
      triggerTTS("ding");
      flash(`${teams?.[teamId]?.name} wins the tiebreak! (→ to Awards)`);
    },
    goPhase,
  };

  // ---------- global controls ----------
  function reveal() {
    if (!prompt) return;
    setReveal(true);
    triggerTTS("ding");
  }
  function toggleScores() {
    setScoresVisible(!(state?.scoresVisible !== false));
  }
  function undo() {
    const last = lastUndoable(ledger);
    if (!last) return flash("Nothing to undo.");
    voidEntry(ledger, last.id);
    flash(`Voided ${last.entry.delta > 0 ? "+" : ""}${last.entry.delta} for ${teams?.[last.entry.teamId]?.name ?? "?"}`);
  }
  function goPhase(p) {
    setPhase(p);
    setPrompt(null, true);
    clearTimer();
    // Anonymous usage counter: one ping per game, when Round 1 begins.
    if (p === "worker_bees" && !state?.gameCounted) {
      markGameCounted();
      bumpStat("gamesPlayed");
    }
    if (p === "the_buzz") resetBuzz();
    if (p === "queen_bee_gambit") {
      setActiveTeam(teamIds[0] ?? null);
      resetGambitTurn(1);
    }
    if (p === "tiebreaker") {
      setActiveTeam(null);
      resetGambitTurn(1);
    }
    if (p === "awards") setScoresVisible(true);
  }
  function stepPhase(dir) {
    const i = MAIN_FLOW.indexOf(phase);
    const next = MAIN_FLOW[i + dir];
    if (i === -1) return goPhase(dir > 0 ? "awards" : "queen_bee_gambit"); // stepping out of tiebreaker
    if (next) goPhase(next);
  }

  // ---------- keyboard shortcuts (§13) ----------
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.repeat) return; // a held key must never mark twice
      const k = e.key;
      if (k === " ") {
        e.preventDefault();
        ttsWord();
      } else if (k === "d" || k === "D") ttsDefinition();
      else if (k === "s" || k === "S") ttsSentence();
      else if (k === "o" || k === "O") ttsOrigin();
      else if (k === "c" || k === "C") {
        if (phase === "the_buzz") markBuzz(true);
        else if (phase === "queen_bee_gambit") gambitApi.markGambit(true);
      } else if (k === "x" || k === "X") {
        if (phase === "the_buzz") markBuzz(false);
        else if (phase === "queen_bee_gambit") gambitApi.markGambit(false);
      } else if (k === "t" || k === "T") buzzNext();
      else if (k === "b" || k === "B") openBuzzing();
      else if (k === "w" || k === "W") {
        e.preventDefault();
        wagerRef.current?.focus();
      } else if (k === "v" || k === "V") reveal();
      else if (k === "h" || k === "H") toggleScores();
      else if (k === "u" || k === "U") undo();
      else if (k === "Enter") {
        e.preventDefault(); // don't re-click whatever marking button is still focused
        nextWord();
      }
      else if (k === "ArrowRight") stepPhase(1);
      else if (k === "ArrowLeft") stepPhase(-1);
      else if (/^[1-9]$/.test(k) && phase === "worker_bees") markTeamWB(teamIds[Number(k) - 1], true);
      else if (e.shiftKey && phase === "worker_bees") {
        const digit = { "!": 1, "@": 2, "#": 3, $: 4, "%": 5, "^": 6, "&": 7, "*": 8, "(": 9 }[k];
        if (digit) markTeamWB(teamIds[digit - 1], false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (state === undefined) return <div className="admin"><p>Connecting…</p></div>;

  const inSetup = phase === "welcome" || phase === "setup";
  const burnedSet = new Set(Object.values(gambitUsed ?? {}));
  burnedSet.delete(prompt?.word);
  const gambitWordsLeft = queenBeeGambit.filter((w) => !burnedSet.has(w.word)).length;
  const gambitShort = teamIds.length * 2 > gambitWordsLeft && phase === "queen_bee_gambit";

  const code = gameCode();
  const presentUrl = `${window.location.origin}/#/${code}/present`;

  return (
    <div className="admin">
      {flashMsg && <div className="flash">{flashMsg}</div>}

      <div className="admin-gamebar">
        <span className="admin-gamecode">Game <b>{code}</b></span>
        <a className="admin-tvlink" href={presentUrl} target="_blank" rel="noreferrer">📺 Open TV screen ↗</a>
        <button className="tiny" onClick={() => { navigator.clipboard?.writeText(presentUrl); flash("TV link copied!"); }}>copy link</button>
        <span className="muted">Players join at {window.location.host} with code <b>{code}</b> (or scan the QR in Round 3).</span>
      </div>

      <header className="admin-header">
        <div className="phase-steps">
          {PHASES.map((p) => (
            <button key={p} className={`phase-btn ${p === phase ? "active" : ""}`} onClick={() => goPhase(p)}>
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="header-toggles">
          <label>
            <input type="checkbox" checked={isTrial} onChange={(e) => setTrial(e.target.checked)} /> trial (not scored)
          </label>
          <label>
            <input type="checkbox" checked={state?.scoresVisible !== false} onChange={toggleScores} /> scores on TV (H)
          </label>
        </div>
      </header>

      {/* permanent all-teams scoreboard */}
      {teamIds.length > 0 && (
        <div className="admin-scores">
          <span className="muted">Scores:</span>
          {standings(teams, totals).map((row, i) => (
            <span key={row.id} className={`score-chip ${i === 0 && row.score > 0 ? "leader" : ""}`}>
              {row.name} · <b>{row.score}</b>
            </span>
          ))}
        </div>
      )}

      {gambitShort && (
        <p className="neg panel">
          ⚠ Only {gambitWordsLeft} champions words left for {teamIds.length} teams × 2 turns — add words to src/words.js.
        </p>
      )}

      {inSetup ? (
        <AdminSetup teams={teams} players={players} />
      ) : (
        <div className="admin-grid">
          <div className="admin-col">
            {/* ---- prompt card: answers ALWAYS visible to the host ---- */}
            <div className="panel prompt-card">
              {prompt ? (
                <>
                  {isTrial && <span className="trial-chip">TRIAL</span>}
                  {prompt.index && (
                    <div className="muted">
                      {prompt.type === "homophones" ? "Set" : "Word"} {prompt.index} of {prompt.total} — shown on TV
                    </div>
                  )}
                  <div className="prompt-answer">
                    {prompt.type === "homophones" ? (prompt.answers ?? []).join("  /  ") : prompt.word}
                  </div>
                  {prompt.type === "homophones" ? (
                    <ol className="muted">
                      {(prompt.definitions ?? []).map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ol>
                  ) : (
                    <>
                      {prompt.definition && <p className="muted">def: {prompt.definition}</p>}
                      {prompt.origin && <p className="muted">origin: {prompt.origin}</p>}
                      {prompt.sentence && <p className="muted">“{prompt.sentence}”</p>}
                    </>
                  )}
                  <div className="btn-row">
                    <button onClick={ttsWord}>🔊 {phase === "bee_sharp" ? "Definitions (Space)" : "Pronounce (Space)"}</button>
                    {phase !== "bee_sharp" && <button onClick={ttsDefinition}>Definition (D)</button>}
                    <button onClick={ttsSentence}>Sentence (S)</button>
                    <button onClick={ttsOrigin}>Origin (O)</button>
                  </div>
                  <div className="btn-row">
                    {!gambitish && (
                      <button className={prompt.revealed ? "active" : "ok"} onClick={reveal} disabled={prompt.revealed}>
                        {prompt.revealed ? "✓ Revealed on TV" : "👁 Reveal on TV (V)"}
                      </button>
                    )}
                    <button onClick={() => startTimer(10)}>⏱ 10s</button>
                    <button onClick={() => startTimer(15)}>15s</button>
                    <button onClick={() => startTimer(30)}>30s</button>
                    <button onClick={clearTimer}>stop</button>
                  </div>
                </>
              ) : (
                <p className="muted">No word loaded — press Enter for the next one, or pick from the list.</p>
              )}
            </div>

            {/* ---- word list ---- */}
            {list.length > 0 && (
              <div className="panel word-list">
                <h2>Words <span className="muted">(Enter = next)</span></h2>
                {list.map((item, i) => {
                  // Gambit/tiebreaker: "played" = burned once shown; other rounds: has marks.
                  const played = gambitish
                    ? !!gambitUsed?.[dbKey(itemLabel(item))]
                    : !!marksTree?.[phase]?.[dbKey(itemLabel(item))];
                  return (
                    <button
                      key={itemLabel(item)}
                      className={`word-item ${i === curIdx ? "active" : ""} ${played && i !== curIdx ? "done" : ""}`}
                      onClick={() => loadItem(item)}
                    >
                      {item.trial ? "🎈 " : ""}
                      {itemLabel(item)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-col">
            <div className="panel">
              <MarkingPanel
                phase={phase}
                state={state}
                teams={teams}
                players={players}
                totals={totals}
                awards={awards}
                slotMarks={slotMarks}
                markTeamWB={markTeamWB}
                markBeeSharpAnswer={markBeeSharpAnswer}
                markBuzz={markBuzz}
                onOpenBuzzing={openBuzzing}
                onRevealOrder={revealOrder}
                onNextBuzzer={buzzNext}
                api={gambitApi}
              />
            </div>
            <AdminLedger ledger={ledger} teams={teams} players={players} />
          </div>
        </div>
      )}
    </div>
  );
}
