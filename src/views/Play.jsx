import React, { useEffect, useState } from "react";
import { useDbValue, useScores, useConnected } from "../hooks";
import { standings } from "../scoring";
import { buzz, claimPlayer, unclaimPlayer } from "../db";
import { bumpStat } from "../stats";

const CLAIM_KEY = "bee.playerId";

// ---- Claim screen: roster grouped by team; tap your name to bind this phone ----
function ClaimScreen({ teams, players, onClaim }) {
  const teamIds = Object.keys(teams ?? {});
  if (!teamIds.length) {
    return (
      <div className="play claim">
        <h1>🐝 Spelling Bee</h1>
        <p>Waiting for the host — pick your name once teams are up!</p>
      </div>
    );
  }
  return (
    <div className="play claim">
      <h1>🐝 Who are you?</h1>
      {teamIds.map((tid) => (
        <div key={tid} className="claim-team">
          <h3>{teams[tid].name}</h3>
          <div className="claim-names">
            {Object.entries(players ?? {})
              .filter(([, p]) => p.teamId === tid)
              .map(([pid, p]) => (
                <button
                  key={pid}
                  className={`claim-btn ${p.claimed ? "already" : ""}`}
                  onClick={() => {
                    if (p.claimed && !window.confirm(`${p.name} is already claimed on another phone. Is this you?`)) return;
                    onClaim(pid);
                  }}
                >
                  {p.claimed ? "✓ " : ""}
                  {p.name}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Play({ playerId }) {
  const state = useDbValue("state");
  const teams = useDbValue("teams");
  const players = useDbValue("players");
  const { totals } = useScores();
  const connected = useConnected();
  const [buzzed, setBuzzed] = useState(false);

  // Rebind from localStorage on load and whenever the phone wakes.
  useEffect(() => {
    const rebind = () => {
      const saved = localStorage.getItem(CLAIM_KEY);
      if (saved && saved !== playerId) window.location.hash = `#/play/${saved}`;
    };
    rebind();
    document.addEventListener("visibilitychange", rebind);
    return () => document.removeEventListener("visibilitychange", rebind);
  }, [playerId]);

  const me = playerId ? players?.[playerId] : null;

  // Saved id points at a deleted player → clear and re-claim.
  useEffect(() => {
    if (playerId && players && !players[playerId]) {
      localStorage.removeItem(CLAIM_KEY);
      window.location.hash = "#/play";
    }
  }, [playerId, players]);

  const bz = state?.buzz ?? {};
  useEffect(() => setBuzzed(false), [bz.openRoundId]); // fresh word → fresh button

  if (state === undefined || players === undefined) {
    return <div className="play"><h1>🐝</h1></div>;
  }

  // Rounds 1–2 are phones-away: no claiming until The Buzz. A phone that already
  // claimed (e.g. re-opened later) keeps working in any phase.
  const PHONE_PHASES = ["the_buzz", "queen_bee_gambit", "tiebreaker", "awards"];
  if (!me && !PHONE_PHASES.includes(state?.phase)) {
    return (
      <div className="play claim">
        <h1>📵</h1>
        <h1>Phones away!</h1>
        <p style={{ textAlign: "center", fontSize: 18 }}>
          No phones until <b>Round 3 — The Buzz</b>.
          <br />
          <br />
          Getting caught with one costs your team <b>100 points</b>. 👀
        </p>
      </div>
    );
  }

  if (!me) {
    return (
      <ClaimScreen
        teams={teams}
        players={players}
        onClaim={(pid) => {
          const prev = localStorage.getItem(CLAIM_KEY);
          if (prev && prev !== pid && players?.[prev]) unclaimPlayer(prev);
          if (!players?.[pid]?.claimed) bumpStat("playersJoined"); // first claim only
          claimPlayer(pid);
          localStorage.setItem(CLAIM_KEY, pid);
          window.location.hash = `#/play/${pid}`;
        }}
      />
    );
  }

  const myTeam = teams?.[me.teamId];
  const rows = standings(teams, totals);
  const scoresVisible = state?.phase === "awards" ? true : state?.scoresVisible !== false;
  const buzzPhase = state?.phase === "the_buzz";
  const inQueue = !!bz.queue?.[playerId] || buzzed;
  const canBuzz = buzzPhase && bz.open && !inQueue && connected;

  let buzzLabel = "BUZZ";
  if (!buzzPhase) buzzLabel = "🐝";
  else if (inQueue) buzzLabel = "✓ You're in — watch the TV!";
  else if (!bz.open) buzzLabel = "Wait for it…";

  return (
    <div className="play">
      {!connected && <div className="reconnect-veil">Reconnecting…</div>}
      <header className="play-header">
        <div className="play-name">
          {me.name}{" "}
          <button
            className="not-me"
            onClick={() => {
              unclaimPlayer(playerId);
              localStorage.removeItem(CLAIM_KEY);
              window.location.hash = "#/play";
            }}
          >
            not you?
          </button>
        </div>
        <div className="play-team">
          {myTeam?.name} · {scoresVisible ? `${totals[me.teamId] ?? 0} pts` : "scores hidden 👀"}
        </div>
        {buzzPhase && <div className="play-rule">Buzz in — fastest spells first · +20 right · −10 wrong</div>}
      </header>

      <button
        className={`buzz-btn ${canBuzz ? "armed" : ""} ${inQueue && buzzPhase ? "won" : ""}`}
        disabled={!canBuzz}
        onClick={() => {
          setBuzzed(true); // instant feedback while the server write round-trips
          buzz(playerId, bz.openRoundId, bz);
        }}
      >
        {buzzLabel}
      </button>

      <section className="play-standings">
        {scoresVisible ? (
          rows.map((r, i) => (
            <div key={r.id} className={`play-row ${r.id === me.teamId ? "mine" : ""}`}>
              <span>{i + 1}. {r.name}</span>
              <span>{r.score}</span>
            </div>
          ))
        ) : (
          <div className="play-row">Scores hidden 👀</div>
        )}
      </section>
    </div>
  );
}
