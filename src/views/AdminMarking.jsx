import React, { useState, useEffect } from "react";
import { setAward, revealAward, triggerTTS, setGambit } from "../db";
import { leaders, buzzOrder, standings } from "../scoring";

// ---- Round 1: all-teams grid, tick correct/incorrect per word (number keys mirror this) ----
// Marks live in /marks (via slotMarks) — clicking the other symbol re-scores on the fly.
function WorkerBeesMarking({ teams, slotMarks, markTeamWB }) {
  const teamIds = Object.keys(teams ?? {});
  return (
    <div className="marking">
      <h3>Mark each team for this word <span className="muted">(1–9 correct · Shift+1–9 wrong · click the other mark to change)</span></h3>
      <div className="wb-grid">
        {teamIds.map((tid, i) => (
          <div key={tid} className={`wb-team ${slotMarks[tid] ?? ""}`}>
            <span className="wb-num">{i < 9 ? i + 1 : ""}</span>
            <span className="wb-name">{teams[tid].name}</span>
            <button className={`ok ${slotMarks[tid] === "c" ? "active" : ""}`} onClick={() => markTeamWB(tid, true)}>✓ +10</button>
            <button className={`bad ${slotMarks[tid] === "x" ? "active" : ""}`} onClick={() => markTeamWB(tid, false)}>✗</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Round 2: every team writes every set — teams × answers marking grid ----
function BeeSharpMarking({ state, teams, slotMarks, markBeeSharpAnswer }) {
  const p = state.currentPrompt;
  const teamIds = Object.keys(teams ?? {});
  if (!p) {
    return (
      <div className="marking">
        <h3>Bee Sharp</h3>
        <p className="muted">Load a homophone set — every team writes ALL the spellings at once.</p>
      </div>
    );
  }
  return (
    <div className="marking">
      <h3>Tick each correct spelling, per team <span className="muted">(+10 each · click the other mark to change)</span></h3>
      <table className="bs-grid">
        <thead>
          <tr>
            <th></th>
            {(p.answers ?? []).map((ans, i) => (
              <th key={i} className="bs-grid-ans">{ans}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teamIds.map((tid) => (
            <tr key={tid}>
              <td className="bs-grid-team">{teams[tid].name}</td>
              {(p.answers ?? []).map((ans, i) => {
                const mk = slotMarks[`${tid}_${i}`];
                return (
                  <td key={i} className={`bs-grid-cell ${mk ?? ""}`}>
                    <button className={`ok ${mk === "c" ? "active" : ""}`} onClick={() => markBeeSharpAnswer(tid, i, ans, true)}>✓</button>
                    <button className={`bad ${mk === "x" ? "active" : ""}`} onClick={() => markBeeSharpAnswer(tid, i, ans, false)}>✗</button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Round 3: the buzz queue console (host-only view of the order) ----
function BuzzMarking({ state, teams, players, slotMarks, markBuzz, onOpenBuzzing, onRevealOrder, onNextBuzzer }) {
  const bz = state.buzz ?? {};
  const order = buzzOrder(bz.queue);
  const active = bz.activeIndex ?? null; // null until the host starts judging
  const first = order[0];
  const current = active !== null ? order[active] : null;
  const allPlayers = Object.values(players ?? {});
  const phonesIn = allPlayers.filter((pl) => pl.claimed).length;
  return (
    <div className="marking">
      <h3>
        Buzz queue{" "}
        {bz.open ? (
          <span className="pos">● OPEN — {order.length} in</span>
        ) : (
          <span className="muted">{order.length ? `closed — ${order.length} buzzed` : "closed"}</span>
        )}
        <span className="muted" style={{ marginLeft: 12 }}>📱 phones in: {phonesIn}/{allPlayers.length}</span>
      </h3>
      <div className="btn-row">
        <button className="ok" onClick={onOpenBuzzing} disabled={bz.open || !state.currentPrompt}>
          🔔 {order.length ? "Re-open buzzing" : "Open buzzing"} (B)
        </button>
        <button onClick={onRevealOrder} disabled={!order.length || bz.orderRevealed}>
          👁 Reveal order on TV {bz.orderRevealed ? "✓" : ""}
        </button>
        <button onClick={onNextBuzzer} disabled={!order.length}>
          {active === null ? "▶ Start judging #1 (T)" : "⏭ Next buzzer (T)"}
        </button>
      </div>
      {!order.length && (
        <p className="muted">
          Pronounce the word (Space) first, then open buzzing. Buzzes collect here ranked by speed —
          only you see the order until you reveal it on the TV.
        </p>
      )}
      {order.map((b, i) => {
        const pl = players?.[b.playerId];
        const mk = slotMarks[b.playerId];
        return (
          <div key={b.playerId} className={`bq-row ${i === active ? "current" : ""} ${mk ?? ""}`}>
            <span className="bq-rank">{i + 1}</span>
            <span className="bq-name">
              {pl?.name ?? "?"} <span className="muted">({teams?.[pl?.teamId]?.name})</span>
            </span>
            <span className="muted bq-ms">{i === 0 ? "fastest!" : `+${b.ts - first.ts} ms`}</span>
            <span className="bq-mark">{mk === "c" ? "✓" : mk === "x" ? "✗" : ""}</span>
            <button className="tiny ok" onClick={() => markBuzz(true, b.playerId)}>✓</button>
            <button className="tiny bad" onClick={() => markBuzz(false, b.playerId)}>✗</button>
          </div>
        );
      })}
      {current && (
        <div className="buzz-actions">
          <button
            className={`ok big-btn ${slotMarks[current.playerId] === "c" ? "active" : ""}`}
            onClick={() => markBuzz(true)}
          >
            ✓ {players?.[current.playerId]?.name} correct +20 (C)
          </button>
          <button
            className={`bad big-btn ${slotMarks[current.playerId] === "x" ? "active" : ""}`}
            onClick={() => markBuzz(false)}
          >
            ✗ Wrong −10 → next (X)
          </button>
        </div>
      )}
      {active !== null && (
        <p className="muted">✗ moves to the next buzzer automatically · T skips without penalty · per-row ✓/✗ fix earlier judgments.</p>
      )}
    </div>
  );
}

// ---- Round 4: per rotation — collect ALL wagers first, then spell one by one ----
function RotationPicker({ g, api }) {
  const current = g.turnRound ?? 1;
  return (
    <span className="rotation-picker">
      <span className="muted">Rotation:</span>
      {[1, 2].map((n) => (
        <button
          key={n}
          className={`small ${current === n ? "active" : ""}`}
          onClick={() => current !== n && api.setRotation(n)}
        >
          {n}
        </button>
      ))}
    </span>
  );
}

function GambitWagers({ teams, totals, g, api }) {
  const teamIds = Object.keys(teams ?? {});
  const rot = g.rounds?.[g.turnRound ?? 1] ?? {};
  const wagers = rot.wagers ?? {};
  const [inputs, setInputs] = useState({});
  useEffect(() => setInputs({}), [g.turnRound]);
  const firstEmpty = teamIds.find((tid) => wagers[tid] == null);
  const allIn = teamIds.length > 0 && teamIds.every((tid) => wagers[tid] != null);
  return (
    <div className="marking">
      <h3>
        💰 Rotation {g.turnRound ?? 1} of 2 — collect EVERY team’s wager first (blind — no words yet!)
        <RotationPicker g={g} api={api} />
      </h3>
      {teamIds.map((tid) => {
        const locked = wagers[tid] != null;
        return (
          <div key={tid} className="gambit-row">
            <span className="wager-team">{teams[tid].name}</span>
            <span className="muted">has {totals?.[tid] ?? 0} pts</span>
            {locked ? (
              <>
                <b className="pos">wagering {wagers[tid]} 🔒</b>
                <button className="tiny" onClick={() => api.unlockWager(tid)}>✎ edit</button>
              </>
            ) : (
              <>
                <input
                  ref={tid === firstEmpty ? api.wagerRef : null}
                  type="number"
                  min="0"
                  value={inputs[tid] ?? ""}
                  onChange={(e) => setInputs((m) => ({ ...m, [tid]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && api.lockWager(tid, inputs[tid])}
                  placeholder="go wild!"
                  style={{ width: 110 }}
                />
                <button className="small" onClick={() => api.lockWager(tid, inputs[tid])}>Lock</button>
              </>
            )}
          </div>
        );
      })}
      <button className="ok big-btn" disabled={!allIn} onClick={api.startSpelling}>
        ▶ All wagers locked — start spelling!
      </button>
      <p className="muted">W focuses the next empty wager. Wagers show on the TV as they lock.</p>
    </div>
  );
}

function GambitMarking({ state, teams, players, totals, slotMarks, api }) {
  const g = state.gambit ?? {};
  const rot = g.rounds?.[g.turnRound ?? 1] ?? {};
  const trialDemo = state.isTrial && !!state.currentPrompt; // 🎈 trial word bypasses the wager gate
  if ((rot.mode ?? "wagers") === "wagers" && !trialDemo) {
    return <GambitWagers teams={teams} totals={totals} g={g} api={api} />;
  }
  const activeTeam = state.activeTeam;
  const teamIds = Object.keys(teams ?? {});
  const wagers = rot.wagers ?? {};
  const spelled = rot.spelled ?? {};
  const teamPlayers = Object.entries(players ?? {}).filter(([, pl]) => pl.teamId === activeTeam);
  const wager = wagers[activeTeam];
  const ready = wager != null && g.infoShown?.word;
  const allSpelled = teamIds.length > 0 && teamIds.every((tid) => spelled[tid]);

  return (
    <div className="marking">
      <h3>
        Rotation {g.turnRound ?? 1} of 2 — <b>{teams?.[activeTeam]?.name ?? "pick a team"}</b>
        {wager != null && <span className="pos"> (wagered {wager})</span>}
        {trialDemo && (rot.mode ?? "wagers") === "wagers" ? (
          <button className="small" onClick={api.backToWagers} style={{ marginLeft: 12 }}>
            ✓ Trial done — collect wagers
          </button>
        ) : (
          <button className="small" onClick={api.gambitNextTeam} style={{ marginLeft: 12 }}>
            {allSpelled ? ((g.turnRound ?? 1) >= 2 ? "Done → Awards" : "▶ Rotation 2 wagers") : "Next team ▸"}
          </button>
        )}
        <RotationPicker g={g} api={api} />
        <button
          className={`small ${rot.wagersRevealed ? "active" : ""}`}
          disabled={rot.wagersRevealed}
          onClick={api.revealWagers}
          style={{ marginLeft: 8 }}
        >
          {rot.wagersRevealed ? "✓ Wagers revealed" : "💰 Reveal wagers on TV"}
        </button>
      </h3>

      <div className="gambit-row">
        {teamIds.map((tid) => (
          <button
            key={tid}
            className={`small ${activeTeam === tid ? "active" : ""} ${spelled[tid] ? "done-chip" : ""}`}
            onClick={() => api.gambitSelectTeam(tid)}
          >
            {spelled[tid] ? "✓ " : ""}
            {teams[tid].name} · {wagers[tid] ?? "—"}
          </button>
        ))}
      </div>

      <div className="gambit-row">
        <span className="muted">Speller:</span>
        {teamPlayers.map(([pid, pl]) => (
          <button
            key={pid}
            className={`small ${g.spellerId === pid ? "active" : ""}`}
            onClick={() => setGambit({ spellerId: pid })}
          >
            {pl.name}
          </button>
        ))}
      </div>

      <div className="gambit-row">
        <button className="small" disabled={!state.currentPrompt || g.infoShown?.word} onClick={api.showGambitWord}>
          👁 Show word to room
        </button>
        <span className="muted">then the speller must ask:</span>
        <button className="small" disabled={!ready && !state.isTrial} onClick={() => api.gambitInfo("pronunciation")}>🔊 Pronounce (Space)</button>
        <button className="small" disabled={!ready && !state.isTrial} onClick={() => api.gambitInfo("definition")}>Definition (D)</button>
        <button className="small" disabled={!ready && !state.isTrial} onClick={() => api.gambitInfo("origin")}>Origin (O)</button>
        <button className="small" disabled={!ready && !state.isTrial} onClick={() => api.gambitInfo("sentence")}>Sentence (S)</button>
      </div>

      <div className="buzz-actions">
        <button
          className={`ok big-btn ${slotMarks[activeTeam] === "c" ? "active" : ""}`}
          disabled={!ready && !state.isTrial}
          onClick={() => api.markGambit(true)}
        >
          ✓ Correct {wager != null ? `+${wager}` : ""} (C)
        </button>
        <button
          className={`bad big-btn ${slotMarks[activeTeam] === "x" ? "active" : ""}`}
          disabled={!ready && !state.isTrial}
          onClick={() => api.markGambit(false)}
        >
          ✗ Wrong {wager != null ? `−${wager}` : ""} (X)
        </button>
      </div>
    </div>
  );
}

// ---- Tiebreaker: sudden death among tied leaders ----
function TiebreakerMarking({ state, teams, players, totals, api }) {
  const tied = leaders(teams, totals);
  const g = state.gambit ?? {};
  const activeTeam = state.activeTeam;
  const teamPlayers = Object.entries(players ?? {}).filter(([, pl]) => pl.teamId === activeTeam);
  return (
    <div className="marking">
      <h3>⚡ Sudden death — tied at {tied[0]?.score ?? 0}: {tied.map((t) => t.name).join(" vs ")}</h3>
      <div className="gambit-row">
        <span className="muted">Spelling now:</span>
        {tied.map((t) => (
          <button key={t.id} className={`small ${activeTeam === t.id ? "active" : ""}`} onClick={() => api.setTiebreakTeam(t.id)}>
            {t.name}
          </button>
        ))}
      </div>
      <div className="gambit-row">
        <span className="muted">Speller:</span>
        {teamPlayers.map(([pid, pl]) => (
          <button key={pid} className={`small ${g.spellerId === pid ? "active" : ""}`} onClick={() => setGambit({ spellerId: pid })}>
            {pl.name}
          </button>
        ))}
      </div>
      <div className="gambit-row">
        <button className="small" disabled={!state.currentPrompt || g.infoShown?.word} onClick={api.showGambitWord}>👁 Show word</button>
        <button className="small" onClick={() => api.gambitInfo("pronunciation")}>🔊 Pronounce</button>
        <button className="small" onClick={() => api.gambitInfo("definition")}>Definition</button>
        <button className="small" onClick={() => api.gambitInfo("origin")}>Origin</button>
        <button className="small" onClick={() => api.gambitInfo("sentence")}>Sentence</button>
      </div>
      <div className="buzz-actions">
        <button className="ok big-btn" disabled={!activeTeam} onClick={() => api.tiebreakWinner(activeTeam)}>
          🏆 Spelled it — {teams?.[activeTeam]?.name ?? "?"} wins!
        </button>
        <button className="bad big-btn" onClick={() => triggerTTS("buzz")}>✗ Missed — next team</button>
      </div>
    </div>
  );
}

// ---- Awards ----
function AwardsPanel({ teams, players, totals, awards, api }) {
  const tied = leaders(teams, totals);
  const [miss, setMiss] = useState(awards?.creativeMisspelling ?? "");
  // /awards loads after mount on a refresh — don't lose the saved value.
  useEffect(() => {
    if (awards?.creativeMisspelling != null) setMiss(awards.creativeMisspelling);
  }, [awards?.creativeMisspelling]);
  const topBuzzer = Object.entries(players ?? {}).reduce(
    (best, [pid, p]) => ((p.buzzWins ?? 0) > (best?.p.buzzWins ?? 0) ? { pid, p } : best),
    null
  );
  const revealed = awards?.revealed ?? {};
  const rows = standings(teams, totals);
  const lowScore = rows.length ? rows[rows.length - 1].score : 0;
  const lowestNames = rows.filter((r) => r.score === lowScore).map((r) => r.name).join(" & ");
  const REVEALS = [
    ["lowest", `🐝 Humble Bumbles (${lowestNames || "—"})`],
    ["buzzer", "🔔 Top Buzzer"],
    ["creative", "🎨 Creative Misspelling"],
    ["champion", "👑 Champions"],
  ];
  return (
    <div className="marking">
      <h3>🏆 Awards — reveal on TV one by one</h3>
      <div className="btn-row">
        {REVEALS.map(([key, label]) => (
          <button
            key={key}
            className={revealed[key] ? "active" : "ok"}
            disabled={revealed[key]}
            onClick={() => {
              revealAward(key);
              triggerTTS("ding");
            }}
          >
            {revealed[key] ? "✓ " : "🎉 "}
            {label}
          </button>
        ))}
      </div>
      {tied.length > 1 && !awards?.champion && (
        <p className="neg">
          {tied.map((t) => t.name).join(" and ")} are tied! <button className="small" onClick={() => api.goPhase("tiebreaker")}>Run tiebreaker</button>
        </p>
      )}
      <div className="gambit-row">
        <span className="muted">Champion:</span>
        <b>{awards?.champion ? teams?.[awards.champion]?.name : "not confirmed"}</b>
        {tied.length === 1 && (
          <button className="small" onClick={() => setAward("champion", tied[0].id)}>
            Confirm {tied[0].name}
          </button>
        )}
      </div>
      <div className="gambit-row">
        <span className="muted">Top Buzzer:</span>
        <b>{topBuzzer && (topBuzzer.p.buzzWins ?? 0) > 0 ? `${topBuzzer.p.name} (${topBuzzer.p.buzzWins})` : "—"}</b>
        {topBuzzer && (
          <button className="small" onClick={() => setAward("topBuzzer", topBuzzer.pid)}>Save</button>
        )}
      </div>
      <div className="gambit-row">
        <span className="muted">Most Creative Misspelling:</span>
        <input value={miss} onChange={(e) => setMiss(e.target.value)} placeholder="e.g. 'burrocrazy'" style={{ width: 220 }} />
        <button className="small" onClick={() => setAward("creativeMisspelling", miss)}>Save</button>
        <button className="small" onClick={() => triggerTTS("word", miss)}>🔊 Read aloud</button>
      </div>
    </div>
  );
}

export default function MarkingPanel(props) {
  const { phase } = props;
  switch (phase) {
    case "worker_bees":
      return <WorkerBeesMarking {...props} />;
    case "bee_sharp":
      return <BeeSharpMarking {...props} />;
    case "the_buzz":
      return <BuzzMarking {...props} />;
    case "queen_bee_gambit":
      return <GambitMarking {...props} />;
    case "tiebreaker":
      return <TiebreakerMarking {...props} />;
    case "awards":
      return <AwardsPanel {...props} />;
    default:
      return null;
  }
}
