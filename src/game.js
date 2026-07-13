// Game rooms: every party is a code, and all its RTDB data lives under
// /games/<code>/… so one deployment hosts many games at once. The code comes
// from the URL hash (#/<CODE>/<view>/<param>); this module is the single source
// of "which game am I in".

// Friendly, unambiguous alphabet — no I/O/0/1 to fumble when typing or reading aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newGameCode(len = 4) {
  let code = "";
  for (let i = 0; i < len; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}

function parseCode(hash) {
  const parts = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  return parts[0] ? parts[0].toUpperCase() : null;
}

let current = typeof window !== "undefined" ? parseCode(window.location.hash) : null;
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    current = parseCode(window.location.hash);
  });
}

export const gameCode = () => current;

// game-relative path → full RTDB path. gamePath("state") → games/BEEZ/state
export const gamePath = (sub) => `games/${current}${sub ? "/" + sub : ""}`;
