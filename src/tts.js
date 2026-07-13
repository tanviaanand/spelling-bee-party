// Presenter-only audio: Web Speech API + WebAudio cues. Nothing here runs on
// Admin or phones — they write /state/tts and the Presenter speaks.

const VOICE_KEY = "bee.voiceName";

let cachedVoices = [];
function refreshVoices() {
  cachedVoices = window.speechSynthesis?.getVoices() ?? [];
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}

export function getVoices() {
  refreshVoices();
  return cachedVoices;
}

export function getSavedVoiceName() {
  return localStorage.getItem(VOICE_KEY) || "";
}
export function saveVoiceName(name) {
  localStorage.setItem(VOICE_KEY, name);
}

function pickVoice() {
  const voices = getVoices();
  const saved = getSavedVoiceName();
  return (
    voices.find((v) => v.name === saved) ||
    voices.find((v) => v.lang?.startsWith("en") && v.localService) ||
    voices.find((v) => v.lang?.startsWith("en")) ||
    voices[0] ||
    null
  );
}

export function speak(text, onend) {
  if (!text || !window.speechSynthesis) {
    onend?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel(); // a stuck utterance otherwise silently blocks the queue
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.rate = 0.9;
  if (onend) {
    u.onend = onend;
    u.onerror = onend;
  }
  synth.speak(u);
}

// ---- short cues (WebAudio, no assets) ----
let audioCtx = null;
function ctx() {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, start, dur, type = "sine", gainPeak = 0.25) {
  const a = ctx();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(a.destination);
  const t = a.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function playCue(kind) {
  try {
    if (kind === "ding") {
      tone(880, 0, 0.18);
      tone(1318, 0.12, 0.35);
    } else if (kind === "buzz") {
      tone(110, 0, 0.45, "sawtooth", 0.3);
      tone(104, 0, 0.45, "square", 0.15);
    } else if (kind === "tick") {
      tone(1500, 0, 0.05, "square", 0.1);
    } else if (kind === "timesup") {
      // TIME'S UP — full klaxon: three rising two-voice blasts, frantic high
      // tremolo on top, then a long descending buzzer to land it.
      for (let i = 0; i < 3; i++) {
        const t = i * 0.28;
        tone(330 + i * 90, t, 0.22, "sawtooth", 0.32);
        tone(392 + i * 110, t, 0.22, "square", 0.18);
      }
      for (let i = 0; i < 8; i++) tone(1760 + (i % 2) * 220, 0.06 + i * 0.11, 0.07, "square", 0.12);
      tone(220, 0.9, 0.7, "sawtooth", 0.35);
      tone(165, 0.95, 0.75, "square", 0.22);
      tone(110, 1.0, 0.8, "sawtooth", 0.3);
    }
  } catch {
    // audio context blocked pre-gesture — the setup audio test unlocks it
  }
}

// Unlock both audio paths from the required user gesture ("Test audio" button).
export function unlockAudio(sampleText) {
  ctx();
  speak(sampleText);
}
