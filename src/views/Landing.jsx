import React, { useState } from "react";
import { newGameCode } from "../game";
import { createGame, gameExists } from "../db";

export default function Landing() {
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  async function startGame() {
    if (busy) return;
    setBusy(true);
    // Generate a code that isn't already taken (collisions are rare; retry a few times).
    let code = newGameCode();
    for (let i = 0; i < 5 && (await gameExists(code)); i++) code = newGameCode();
    await createGame(code);
    window.location.hash = `#/${code}/admin`;
  }

  async function joinGame(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 3) return setJoinError("Enter your game code.");
    setBusy(true);
    setJoinError("");
    if (await gameExists(code)) {
      window.location.hash = `#/${code}/play`;
    } else {
      setJoinError(`Hmm — no game called "${code}". Double-check with your host?`);
      setBusy(false);
    }
  }

  return (
    <div className="landing">
      <div className="landing-card">
        <h1 className="landing-title">🐝 Spelling Bee Party</h1>
        <p className="landing-sub">A game show for your living room. Your TV is the stage, your phone is the buzzer.</p>

        <div className="landing-actions">
          <div className="landing-block">
            <h2>Hosting?</h2>
            <button className="landing-btn primary" onClick={startGame} disabled={busy}>
              ✨ Start a new game
            </button>
            <p className="landing-hint">You’ll get a game code to share. Put the next screen on your TV.</p>
          </div>

          <div className="landing-divider"><span>or</span></div>

          <div className="landing-block">
            <h2>Joining?</h2>
            <form onSubmit={joinGame} className="landing-join">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="GAME CODE"
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
              />
              <button className="landing-btn" type="submit" disabled={busy}>Join →</button>
            </form>
            {joinError && <p className="landing-error">{joinError}</p>}
            <p className="landing-hint">Ask your host for the code, or scan the QR on the TV.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
