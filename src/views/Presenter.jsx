import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDbValue, useScores, useNow } from "../hooks";
import { speak, playCue } from "../tts";
import { RULES } from "../rules";
import Leaderboard from "./Leaderboard";
import {
  WelcomeStage,
  WorkerBeesStage,
  BeeSharpStage,
  BuzzStage,
  GambitStage,
  AwardsStage,
} from "./PresenterStages";

const PLAIN_TITLES = {
  welcome: "",
  setup: "Getting set up…",
  awards: "🏆 Awards 🏆",
};

// Ambient bees drifting across the TV. Randomized once per mount; pure decoration.
// Heights are stratified — one bee per horizontal band — so the whole screen
// gets traffic instead of them randomly clustering up top.
function Bees({ count = 7 }) {
  const bees = useMemo(() => {
    const band = 88 / count;
    return Array.from({ length: count }, (_, i) => ({
      top: 4 + i * band + Math.random() * band,
      dur: 14 + Math.random() * 16,
      delay: -Math.random() * 25,
      size: 2.5 + Math.random() * 3,
      bob: 1.8 + Math.random() * 2,
      reverse: Math.random() > 0.5,
    }));
  }, [count]);
  return (
    <div className="bees" aria-hidden="true">
      {bees.map((b, i) => (
        <span
          key={i}
          className={`bee ${b.reverse ? "reverse" : ""}`}
          style={{
            top: `${b.top}vh`,
            fontSize: `${b.size}vh`,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          }}
        >
          <span className="bee-inner" style={{ animationDuration: `${b.bob}s` }}>
            <span className="bee-emoji">🐝</span>
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Presenter() {
  const state = useDbValue("state");
  const teams = useDbValue("teams");
  const players = useDbValue("players");
  const awards = useDbValue("awards");
  const { totals } = useScores();

  const phase = state?.phase ?? "welcome";
  const timerActive = !!state?.timer?.endsAt;
  const buzzClockActive = !!state?.buzz?.answerDeadline;
  const now = useNow(timerActive || buzzClockActive || phase === "the_buzz");

  // ---- TTS consumer: speak on nonce change; swallow the value present at mount
  // so a refreshed Presenter never re-speaks the last utterance.
  const lastNonce = useRef(null);
  const [speaking, setSpeaking] = useState(false); // 🔊 chip while TTS talks
  const tts = state?.tts;
  useEffect(() => {
    if (state === undefined) return; // still loading — don't arm yet
    const nonce = tts?.nonce ?? 0;
    if (lastNonce.current === null) {
      lastNonce.current = nonce; // first load/refresh: swallow whatever was already there
      return;
    }
    if (!tts || nonce === lastNonce.current) return;
    lastNonce.current = nonce;
    if (tts.kind === "ding" || tts.kind === "buzz") playCue(tts.kind);
    else {
      setSpeaking(true);
      speak(tts.text, () => setSpeaking(false));
    }
  }, [state, tts]);

  // ---- Authoritative countdown + ding at zero (once per endsAt).
  const endsAt = state?.timer?.endsAt ?? null;
  const secondsLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
  const dingedFor = useRef(null);
  useEffect(() => {
    if (endsAt && secondsLeft === 0 && dingedFor.current !== endsAt) {
      dingedFor.current = endsAt;
      playCue("timesup"); // the full klaxon, not a polite beep
    }
  }, [endsAt, secondsLeft]);

  if (state === undefined) {
    return <div className="presenter"><div className="stage"><div className="big-cue">🐝</div></div></div>;
  }

  const scoresVisible = phase === "awards" ? true : state?.scoresVisible !== false;
  const showLeaderboard = !["welcome", "setup"].includes(phase);

  let stage;
  switch (phase) {
    case "worker_bees":
      stage = <WorkerBeesStage state={state} />;
      break;
    case "bee_sharp":
      stage = <BeeSharpStage state={state} teams={teams} />;
      break;
    case "the_buzz":
      stage = <BuzzStage state={state} teams={teams} players={players} now={now} />;
      break;
    case "queen_bee_gambit":
      stage = <GambitStage state={state} teams={teams} players={players} />;
      break;
    case "tiebreaker":
      stage = <GambitStage state={state} teams={teams} players={players} tiebreaker />;
      break;
    case "awards":
      stage = <AwardsStage awards={awards} teams={teams} players={players} totals={totals} />;
      break;
    default:
      stage = <WelcomeStage phase={phase} teams={teams} players={players} />;
  }

  const roundMeta = RULES[phase];
  return (
    <div className="presenter">
      <Bees />
      <header className="presenter-header">
        {roundMeta ? (
          <span className="round-badge">
            {roundMeta.round && <span className="round-eyebrow">Round {roundMeta.round}</span>}
            <span className="round-name">{roundMeta.emoji} {roundMeta.title}</span>
            <span className="round-pts">{roundMeta.points}</span>
          </span>
        ) : (
          <span className="round-title">{PLAIN_TITLES[phase] ?? ""}</span>
        )}
        {speaking && <span className="speaking-chip header-right-chip">🔊</span>}
        {endsAt && secondsLeft > 0 && (
          <span className={`big-timer ${secondsLeft <= 5 ? "urgent" : ""}`}>{secondsLeft}</span>
        )}
      </header>
      <main className="presenter-main">{stage}</main>
      {showLeaderboard && (
        <aside className="presenter-side">
          <Leaderboard teams={teams} totals={totals} visible={scoresVisible} />
        </aside>
      )}
    </div>
  );
}
