import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { getVoices, getSavedVoiceName, saveVoiceName, unlockAudio } from "../tts";
import { RULES } from "../rules";
import { buzzOrder, standings } from "../scoring";
import { gameCode } from "../game";

const playUrl = () => `${window.location.origin}/#/${gameCode()}/play`;

// Big QR + live claim chips: shown on The Buzz intro — the phones-out moment.
function QRJoin({ players }) {
  const [src, setSrc] = useState("");
  const url = playUrl();
  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 1 })
      .then(setSrc)
      .catch(() => {});
  }, [url]);
  const entries = Object.entries(players ?? {});
  const claimed = entries.filter(([, p]) => p.claimed).length;
  return (
    <div className="qr-join">
      {src && <img className="qr-img" src={src} alt="Scan to join" />}
      <div className="qr-side">
        <div className="qr-title">📱 Phones OUT — scan & tap your name!</div>
        <div className="qr-code-big">code: <b>{gameCode()}</b></div>
        <div className="qr-url">{url.replace(/^https?:\/\//, "")}</div>
        <div className="qr-claims">
          {entries.map(([pid, p]) => (
            <span key={pid} className={`claim-chip ${p.claimed ? "claimed" : ""}`}>
              {p.claimed ? "✓ " : "○ "}
              {p.name}
            </span>
          ))}
        </div>
        {entries.length > 0 && <div className="qr-count">{claimed}/{entries.length} in</div>}
      </div>
    </div>
  );
}

// Shown while no word is loaded — i.e. while the host introduces the round.
function RulesCard({ phase }) {
  const r = RULES[phase];
  if (!r) return null;
  return (
    <div className="rules-card">
      {r.round && <div className="rules-eyebrow">— Round {r.round} —</div>}
      <div className="rules-title">{r.emoji} {r.title}</div>
      <div><span className="rules-points">{r.points}</span></div>
      <div className="rules-lines">
        {r.lines.map((line, i) => (
          <div key={i} className="rules-line">{line}</div>
        ))}
      </div>
    </div>
  );
}

// ---- Welcome / Setup: title, audio test (gesture unlock), voice picker, claim roster ----
export function WelcomeStage({ phase, teams, players }) {
  const [voiceName, setVoiceName] = useState(getSavedVoiceName());
  const [tested, setTested] = useState(false);
  // Chrome populates the voice list asynchronously — re-render when it lands.
  const [voices, setVoices] = useState(getVoices());
  useEffect(() => {
    const fn = () => setVoices(getVoices());
    window.speechSynthesis?.addEventListener("voiceschanged", fn);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", fn);
  }, []);

  const hasTeams = Object.keys(teams ?? {}).length > 0;
  return (
    <div className="stage welcome-stage">
      <h1 className="app-title">🐝 The Spelling Bee 🐝</h1>
      <div className="welcome-code">
        Game code <b>{gameCode()}</b> · join at {window.location.host}
      </div>
      {!hasTeams && <p className="subtitle">Waiting for the host to set up the teams…</p>}
      {phase === "setup" && (
        <>
          <div className="audio-test">
            <select
              value={voiceName}
              onChange={(e) => {
                setVoiceName(e.target.value);
                saveVoiceName(e.target.value);
                setTested(false);
              }}
            >
              <option value="">Default voice</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <button
              className="big-btn"
              onClick={() => {
                unlockAudio("Welcome to the spelling bee! Can you hear me on the TV?");
                setTested(true);
              }}
            >
              {tested ? "✓ Test audio again" : "🔊 Test audio"}
            </button>
            {tested && <p className="hint">If that came from the laptop, fix the Mac sound output → TV.</p>}
          </div>
        </>
      )}
      {hasTeams && (
        <>
          <div className="claim-roster">
            {Object.entries(teams ?? {}).map(([tid, t]) => (
              <div key={tid} className="claim-team">
                <h3>{t.name}</h3>
                {Object.entries(players ?? {})
                  .filter(([, p]) => p.teamId === tid)
                  .map(([pid, p]) => (
                    <span key={pid} className={`claim-chip ${p.claimed ? "claimed" : ""}`}>
                      {p.claimed ? "✓ " : "○ "}
                      {p.name}
                    </span>
                  ))}
              </div>
            ))}
          </div>
          <p className="subtitle">📵 Phones stay AWAY until Round 3!</p>
        </>
      )}
    </div>
  );
}

function TrialBadge({ isTrial }) {
  return isTrial ? <div className="trial-badge">TRIAL — doesn’t count!</div> : null;
}

// ---- Round 1: Worker Bees — WRITE!, then the spelling on reveal ----
export function WorkerBeesStage({ state }) {
  const p = state.currentPrompt;
  return (
    <div className="stage">
      <TrialBadge isTrial={state.isTrial} />
      {!p && <RulesCard phase="worker_bees" />}
      {p && !p.revealed && (
        <>
          {p.index && <div className="word-count">📝 Word {p.index} of {p.total}</div>}
          <div className="big-cue">WRITE! ✍️</div>
          <p className="stage-hint">Listen… then every team writes the word.</p>
        </>
      )}
      {p && p.revealed && <div className="the-word">{p.word}</div>}
    </div>
  );
}

// ---- Round 2: Bee Sharp — definitions for the whole room; spellings only on reveal ----
export function BeeSharpStage({ state }) {
  const p = state.currentPrompt;
  return (
    <div className="stage">
      <TrialBadge isTrial={state.isTrial} />
      {!p && <RulesCard phase="bee_sharp" />}
      {p && !p.revealed && (
        <div className="word-count">
          ✍️ {p.index ? `Set ${p.index} of ${p.total} — ` : ""}every team writes ALL the spellings!
        </div>
      )}
      {p && (
        <div className="definitions">
          {(p.definitions ?? []).map((d, i) => (
            <div key={i} className="definition-row">
              <span className="def-num">{i + 1}</span>
              <span className="def-text">{d}</span>
              {p.revealed && <span className="def-answer">{p.answers?.[i]}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Round 3: The Buzz — LISTEN… → BUZZ NOW (count only) → ranked order on host reveal ----
export function BuzzStage({ state, teams, players, now }) {
  const p = state.currentPrompt;
  const bz = state.buzz ?? {};
  const order = buzzOrder(bz.queue);
  const active = bz.activeIndex ?? null; // spotlight + clock only once the host starts judging
  const current = active !== null && order[active] ? players?.[order[active].playerId] : null;
  const secsLeft =
    active !== null && bz.answerDeadline ? Math.max(0, Math.ceil((bz.answerDeadline - now) / 1000)) : null;
  return (
    <div className="stage">
      <TrialBadge isTrial={state.isTrial} />
      {p && !p.revealed && p.index && (
        <div className="word-count small">🔔 Word {p.index} of {p.total}</div>
      )}
      {p && p.revealed ? (
        <div className="the-word">{p.word}</div>
      ) : bz.orderRevealed && order.length ? (
        <div className="buzz-banner">
          {current && (
            <div className="buzz-who">
              🎤 {current.name} <span className="buzz-team">({teams?.[current.teamId]?.name})</span>
            </div>
          )}
          {secsLeft !== null && (
            <div className={`answer-clock ${secsLeft <= 2 ? "urgent" : ""}`}>{secsLeft}</div>
          )}
          <div className="buzz-order">
            {order.map((b, i) => {
              const pl = players?.[b.playerId];
              return (
                <div key={b.playerId} className={`bq-row ${i === active ? "current" : ""}`}>
                  <span className="bq-rank">{i + 1}</span>
                  <span className="bq-name">
                    {pl?.name ?? "?"} <span className="muted">({teams?.[pl?.teamId]?.name})</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="stage-hint">
            {current ? "Spell it out loud — solo, no help!" : "The order is in — who buzzed fastest?"}
          </p>
        </div>
      ) : bz.open ? (
        <>
          <div className="big-cue">🔔 BUZZ NOW!</div>
          <p className="stage-hint">
            {order.length
              ? `${order.length} buzzed in — keep them coming!`
              : "Hit the button on your phone!"}
          </p>
        </>
      ) : p ? (
        <>
          <div className="big-cue">👂 LISTEN…</div>
          <p className="stage-hint">Get ready to buzz…</p>
        </>
      ) : (
        <div className="buzz-intro">
          <RulesCard phase="the_buzz" />
          <QRJoin players={players} />
        </div>
      )}
    </div>
  );
}

// ---- Round 4 + tiebreaker: Gambit — word shown openly, panels fill on request ----
export function GambitStage({ state, teams, players, tiebreaker = false }) {
  const p = state.currentPrompt;
  const g = state.gambit ?? {};
  const tr = g.turnRound ?? 1;
  const rot = g.rounds?.[tr] ?? {};
  const info = g.infoShown ?? {};
  const wagers = rot.wagers ?? {};
  const speller = g.spellerId ? players?.[g.spellerId] : null;
  const teamName = teams?.[state.activeTeam]?.name;
  const trialDemo = state.isTrial && !!p;

  // End-of-rotation reveal: the host's CTA makes the amounts public.
  if (!tiebreaker && rot.wagersRevealed && !trialDemo) {
    return (
      <div className="stage gambit-stage">
        <div className="turn-banner">💰 Rotation {tr} — the wagers, revealed!</div>
        <div className="wager-board">
          {Object.entries(teams ?? {}).map(([tid, t]) => (
            <div key={tid} className={`wager-row ${wagers[tid] != null ? "locked" : ""}`}>
              <span className="wager-name">{rot.spelled?.[tid] ? "✓ " : ""}{t.name}</span>
              <span className="wager-amount">{wagers[tid] != null ? `${wagers[tid]}` : "—"}</span>
            </div>
          ))}
        </div>
        <p className="stage-hint">Check the leaderboard — who bet big and backed it up?</p>
      </div>
    );
  }

  // Wager-collection board — amounts stay SECRET (🔒 only) until the reveal CTA.
  if (!tiebreaker && (rot.mode ?? "wagers") === "wagers" && !trialDemo) {
    return (
      <div className="stage gambit-stage">
        <div className="turn-banner">💰 Rotation {tr} of 2 — place your wagers!</div>
        <div className="wager-board">
          {Object.entries(teams ?? {}).map(([tid, t]) => (
            <div key={tid} className={`wager-row ${wagers[tid] != null ? "locked" : ""}`}>
              <span className="wager-name">{t.name}</span>
              <span className="wager-amount">{wagers[tid] != null ? "🔒 locked in" : "…"}</span>
            </div>
          ))}
        </div>
        <p className="stage-hint">Huddle up — commit before you see your word! Wagers stay secret until the end.</p>
      </div>
    );
  }

  return (
    <div className="stage gambit-stage">
      <TrialBadge isTrial={state.isTrial} />
      {tiebreaker && <div className="turn-banner sudden-death">⚡ SUDDEN DEATH ⚡</div>}
      {speller && (
        <div className="turn-banner">
          👑 {speller.name} {teamName ? `(${teamName})` : ""} — back to the screen!
        </div>
      )}
      {!p && <RulesCard phase={tiebreaker ? "tiebreaker" : "queen_bee_gambit"} />}
      {p && info.word && <div className="the-word gambit-word">{p.word}</div>}
      <div className="gambit-panels">
        {info.pronunciation && <div className="gambit-panel">🔊 pronounced aloud</div>}
        {info.definition && p?.definition && (
          <div className="gambit-panel"><b>Definition:</b> {p.definition}</div>
        )}
        {info.origin && p?.origin && (
          <div className="gambit-panel"><b>Origin:</b> {p.origin}</div>
        )}
        {info.sentence && p?.sentence && (
          <div className="gambit-panel"><b>Sentence:</b> {p.sentence}</div>
        )}
      </div>
      {p && !info.word && <p className="stage-hint">Speller up — back to the screen, then the word appears!</p>}
    </div>
  );
}

// ---- Awards: staged reveal — every card is a mystery until the host flips it ----
export function AwardsStage({ awards, teams, players, totals }) {
  const revealed = awards?.revealed ?? {};
  const rows = standings(teams, totals);
  const topScore = rows[0]?.score ?? 0;
  const lowScore = rows.length ? rows[rows.length - 1].score : 0;
  const champNames = awards?.champion
    ? [teams?.[awards.champion]?.name ?? "?"]
    : rows.filter((r) => r.score === topScore).map((r) => r.name);
  const lowestNames = rows.filter((r) => r.score === lowScore).map((r) => r.name);
  const topBuzzer = Object.values(players ?? {}).reduce(
    (best, p) => ((p.buzzWins ?? 0) > (best?.buzzWins ?? 0) ? p : best),
    null
  );

  const cards = [
    {
      key: "lowest",
      teaser: "The… Humble Bumbles? 🤔",
      label: "🐝 The Humble Bumbles",
      value: lowestNames.join(" & "),
      sub: "bee-hind the pack — but the bee’s knees in our hearts",
    },
    {
      key: "buzzer",
      teaser: "Fastest fingers in the hive… 🤔",
      label: "🔔 Top Buzzer",
      value:
        topBuzzer && (topBuzzer.buzzWins ?? 0) > 0
          ? `${topBuzzer.name} — ${topBuzzer.buzzWins} buzz${topBuzzer.buzzWins === 1 ? "" : "es"} won`
          : "nobody stung this time",
      sub: "the fastest stinger in the hive",
    },
    {
      key: "creative",
      teaser: "Art was committed tonight… 🤔",
      label: "🎨 Most Creative Misspelling",
      value: awards?.creativeMisspelling || "…",
      sub: "spelling? never heard of her",
    },
    {
      key: "champion",
      teaser: "👑 …drumroll… 🥁",
      label: "👑 Queen Bees — Champions",
      value: champNames.join(" & "),
      sub: `simply un-bee-lievable — ${topScore} points!`,
      champion: true,
    },
  ];

  return (
    <div className="stage awards-stage">
      <h1 className="app-title">🏆 Awards 🏆</h1>
      {cards.map((c) =>
        revealed[c.key] ? (
          <div key={c.key} className={`award-card revealed ${c.champion ? "champion" : ""}`}>
            <div className="award-label">{c.label}</div>
            <div className="award-value">{c.value}</div>
            <div className="award-sub">{c.sub}</div>
          </div>
        ) : (
          <div key={c.key} className="award-card mystery">
            <div className="award-label">{c.teaser}</div>
            <div className="award-value">❓</div>
          </div>
        )
      )}
    </div>
  );
}
