import React from "react";
import { standings } from "../scoring";

// Rows are absolutely positioned by rank and transition `top`, so score changes
// animate reorders without any FLIP bookkeeping. Compact past 6 teams.
export default function Leaderboard({ teams, totals, visible, compactThreshold = 6 }) {
  const rows = standings(teams, totals);
  if (!rows.length) return null;

  if (!visible) {
    return <div className="leaderboard hidden-card">Scores hidden 👀</div>;
  }

  const compact = rows.length > compactThreshold;
  const rowH = compact ? 44 : 64;
  return (
    <div
      className={`leaderboard ${compact ? "compact" : ""}`}
      style={{ height: rows.length * rowH }}
    >
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={`lb-row ${i === 0 && row.score > 0 ? "leader" : ""}`}
          style={{ top: i * rowH, height: rowH - 8 }}
        >
          <span className="lb-rank">{i + 1}</span>
          <span className="lb-name">{row.name}</span>
          <span className="lb-score">{row.score}</span>
        </div>
      ))}
    </div>
  );
}
