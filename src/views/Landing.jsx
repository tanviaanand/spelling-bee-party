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
        <p className="landing-sub">A game show for your living room — you run it from your laptop, the TV is the stage, and phones are the buzzers.</p>

        <div className="landing-actions">
          <div className="landing-block">
            <h2>Hosting?</h2>
            <button className="landing-btn primary" onClick={startGame} disabled={busy}>
              ✨ Start a new game
            </button>
            <p className="landing-hint">You’ll get a game code to share. Takes ~30 seconds to set up.</p>
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

        <div className="landing-how">
          <h3 className="landing-how-title">One game, three screens</h3>
          <div className="how-cards">
            <div className="how-card host">
              <div className="how-icon">💻</div>
              <div className="how-name">Your laptop</div>
              <div className="how-tag">host — private</div>
              <p>The control panel. <b>Only you see this.</b> Read words aloud, mark answers, keep score, run the rounds.</p>
            </div>
            <div className="how-card host">
              <div className="how-icon">📺</div>
              <div className="how-name">The TV</div>
              <div className="how-tag">host — everyone watches</div>
              <p>The stage. Plug your laptop into the telly — one tap opens it. Words, timers, the leaderboard, big reveals. <b>No answers leak here.</b></p>
            </div>
            <div className="how-card player">
              <div className="how-icon">📱</div>
              <div className="how-name">Phones</div>
              <div className="how-tag">players</div>
              <p>Everyone’s buzzer. Players scan the QR on the TV (or type the code), tap their name, and they’re in.</p>
            </div>
          </div>
          <p className="landing-hint how-foot">
            <b>Hosting?</b> Start a game → put the TV screen on your telly → share the code. That’s it — the game walks you through the rest.
          </p>
        </div>

        <footer className="landing-foot">
          <a href="https://github.com/tanviaanand/spelling-bee-party" target="_blank" rel="noreferrer">★ Fork it on GitHub</a>
          <span className="foot-dot">·</span>
          <span>made by <a href="https://tanvianand.com" target="_blank" rel="noreferrer">Tanvi Anand</a></span>
        </footer>
      </div>
    </div>
  );
}
