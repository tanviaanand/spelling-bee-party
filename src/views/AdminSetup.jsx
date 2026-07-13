import React, { useState } from "react";
import { addTeam, renameTeam, removeTeam, addPlayer, removePlayer, resetGame } from "../db";

const MAX_TEAMS = 10;
const MAX_PLAYERS = 10;

function PlayerAdder({ teamId, count }) {
  const [name, setName] = useState("");
  const full = count >= MAX_PLAYERS;
  const submit = () => {
    const n = name.trim();
    if (!n || full) return;
    addPlayer(teamId, n);
    setName("");
  };
  return (
    <div className="inline-add">
      <input
        placeholder={full ? "team full (10)" : "add player…"}
        value={name}
        disabled={full}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button onClick={submit} disabled={full}>+</button>
    </div>
  );
}

export default function AdminSetup({ teams, players }) {
  const [teamName, setTeamName] = useState("");
  const teamIds = Object.keys(teams ?? {});
  const teamsFull = teamIds.length >= MAX_TEAMS;

  const submitTeam = () => {
    const n = teamName.trim();
    if (!n || teamsFull) return;
    addTeam(n);
    setTeamName("");
  };

  const playersOf = (tid) => Object.entries(players ?? {}).filter(([, p]) => p.teamId === tid);
  const claimedCount = Object.values(players ?? {}).filter((p) => p.claimed).length;
  const totalPlayers = Object.keys(players ?? {}).length;

  return (
    <div className="panel setup-panel">
      <h2>
        Teams & players{" "}
        <span className="muted">
          ({claimedCount}/{totalPlayers} phones claimed)
        </span>
      </h2>
      <div className="inline-add">
        <input
          placeholder={teamsFull ? "max 10 teams" : "new team name…"}
          value={teamName}
          disabled={teamsFull}
          onChange={(e) => setTeamName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitTeam()}
        />
        <button onClick={submitTeam} disabled={teamsFull}>Add team</button>
      </div>

      <div className="setup-teams">
        {teamIds.map((tid) => (
          <div key={tid} className="setup-team">
            <div className="setup-team-head">
              <input
                className="team-name-input"
                value={teams[tid].name}
                onChange={(e) => renameTeam(tid, e.target.value)}
              />
              <button
                className="danger small"
                onClick={() => {
                  if (window.confirm(`Delete team "${teams[tid].name}" and its players?`)) {
                    removeTeam(tid, players);
                  }
                }}
              >
                ✕
              </button>
            </div>
            <ul className="setup-players">
              {playersOf(tid).map(([pid, p]) => (
                <li key={pid}>
                  <span className={p.claimed ? "claimed-dot" : "unclaimed-dot"}>●</span> {p.name}
                  <button className="danger tiny" onClick={() => removePlayer(pid)}>✕</button>
                </li>
              ))}
            </ul>
            <PlayerAdder teamId={tid} count={playersOf(tid).length} />
          </div>
        ))}
      </div>

      <div className="setup-footer">
        <button
          className="danger"
          onClick={() => {
            if (window.confirm("Reset the ENTIRE game? Scores, ledger, claims and awards are wiped. Teams and players are kept.")) {
              resetGame(teams, players);
            }
          }}
        >
          ⚠ Reset game
        </button>
      </div>
    </div>
  );
}
