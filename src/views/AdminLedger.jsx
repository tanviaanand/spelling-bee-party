import React, { useState } from "react";
import { voidEntry, editEntry } from "../db";

function EditRow({ id, entry, teams, onDone, ledger }) {
  const [delta, setDelta] = useState(entry.delta);
  const [teamId, setTeamId] = useState(entry.teamId);
  const [note, setNote] = useState(entry.note ?? "");
  return (
    <tr className="ledger-edit">
      <td colSpan={6}>
        <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} style={{ width: 70 }} />
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {Object.entries(teams ?? {}).map(([tid, t]) => (
            <option key={tid} value={tid}>{t.name}</option>
          ))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note" />
        <button
          onClick={() => {
            editEntry(ledger, id, { delta: Number(delta) || 0, teamId, note });
            onDone();
          }}
        >
          Save
        </button>
        <button onClick={onDone}>Cancel</button>
        <span className="muted"> edits fix team points only — to fix who answered, void and re-mark</span>
      </td>
    </tr>
  );
}

export default function AdminLedger({ ledger, teams, players }) {
  const [editingId, setEditingId] = useState(null);
  const rows = Object.entries(ledger ?? {}).sort((a, b) => b[1].ts - a[1].ts);
  if (!rows.length) return <div className="panel"><h2>Ledger</h2><p className="muted">No score events yet.</p></div>;

  return (
    <div className="panel ledger-panel">
      <h2>Ledger <span className="muted">(newest first — U voids the latest)</span></h2>
      <table className="ledger-table">
        <tbody>
          {rows.map(([id, e]) =>
            editingId === id ? (
              <EditRow key={id} id={id} entry={e} teams={teams} ledger={ledger} onDone={() => setEditingId(null)} />
            ) : (
              <tr key={id} className={e.voided ? "voided" : ""}>
                <td className="muted">{new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                <td>{teams?.[e.teamId]?.name ?? "?"}</td>
                <td>{e.playerId ? players?.[e.playerId]?.name ?? "?" : ""}</td>
                <td className={e.delta >= 0 ? "pos" : "neg"}>{e.delta >= 0 ? `+${e.delta}` : e.delta}</td>
                <td className="muted">{e.phase.replaceAll("_", " ")}{e.note ? ` · ${e.note}` : ""}</td>
                <td className="ledger-actions">
                  {!e.voided && <button className="tiny" onClick={() => voidEntry(ledger, id)}>void</button>}
                  <button className="tiny" onClick={() => setEditingId(id)}>edit</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
