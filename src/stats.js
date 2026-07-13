// Anonymous usage counters, shown as live badges on the GitHub README.
//
// Every deployment (including forks running their own Firebase) sends two
// fire-and-forget pings to the ORIGINAL project's public stats node:
//   gamesPlayed  +1  when a host starts Round 1
//   playersJoined +1 when a phone claims a player
// Nothing else is sent — no names, no words, no scores, no identifiers.
// Forks: set STATS_URL to null to opt out, or point it at your own RTDB.
import { LOCAL_MODE } from "./firebase";

const STATS_URL = "https://spelling-bee-party-default-rtdb.firebaseio.com/publicStats";

export function bumpStat(key, n = 1) {
  if (!STATS_URL || LOCAL_MODE) return; // local trials don't inflate the public badges

  try {
    fetch(`${STATS_URL}.json`, {
      method: "PATCH",
      body: JSON.stringify({ [key]: { ".sv": { increment: n } } }),
    }).catch(() => {});
  } catch {
    /* never let telemetry touch the game */
  }
}
