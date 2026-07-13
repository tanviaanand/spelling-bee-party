# 🐝 Spelling Bee Party

A living-room game show. The TV is the stage, the host's laptop is the control room, and every guest's phone is a buzzer.

![Games played](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fspelling-bee-party-default-rtdb.firebaseio.com%2FpublicStats.json&query=%24.gamesPlayed&label=%F0%9F%8E%89%20games%20played&color=f5b301&cacheSeconds=300)
![Players joined](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fspelling-bee-party-default-rtdb.firebaseio.com%2FpublicStats.json&query=%24.playersJoined&label=%F0%9F%93%B1%20players%20joined&color=f5b301&cacheSeconds=300)

Three synchronized views over one realtime database:

| View | Device | What it shows |
|---|---|---|
| `/#/present` | TV (AirPlay / HDMI, fullscreen) | Hero round intros with rules, words & timers, ranked buzz order, wager boards, staged awards reveal — plus text-to-speech for every word and ambient bees 🐝 |
| `/#/admin` | Host's laptop (private!) | Correct spellings, one-key judging with on-the-fly re-scoring, an append-only score ledger with undo/edit, wager collection, keyboard shortcuts for everything |
| `/#/play` | Guests' phones | Tap-your-name claim (via QR on the TV) and a big red BUZZ button |

## The rounds

1. **📝 Worker Bees** — pen & paper; everyone writes every word. +10 each.
2. **🎵 Bee Sharp** — homophones by definition; every team writes ALL the spellings. +10 per spelling.
3. **🔔 The Buzz** — rapid fire on the phones. *Every* buzz is collected and ranked by server-stamped speed; the host reveals the order on the TV and works down the list. +20 / −10.
4. **👑 Queen Bee's Gambit** — every team locks a secret blind wager, then spellers stand with their backs to the screen and must *ask* for the definition, origin, or sentence. ±wager, two rotations, wagers revealed at the end. Yes, you can bet more than you have. Yes, you can go negative.

Plus sudden-death tiebreaker, and awards with bee puns (👑 Queen Bees, 🐝 The Humble Bumbles, 🔔 Top Buzzer, 🎨 Most Creative Misspelling) revealed one drum-roll at a time.

## Quick start (2 minutes, no accounts)

```bash
git clone https://github.com/tanviaanand/spelling-bee-party.git
cd spelling-bee-party
cp src/firebase-config.example.js src/firebase-config.js
npm install
npm run dev
```

That's **local test mode**: the full game runs in your browser (state syncs across tabs, not devices). Open `localhost:5173/#/admin`, `#/present`, and `#/play` in three windows and play a round.

## Going live (real phones, ~10 minutes)

1. Create a free [Firebase](https://console.firebase.google.com) project → **Build → Realtime Database → Create database** (locked mode is fine, the deploy overwrites rules).
2. Project settings → **General → Your apps → Web** → register an app, paste its config into `src/firebase-config.js`.
3. `cp .firebaserc.example .firebaserc` and put your project id in it.
4. ```bash
   npx firebase-tools login
   npm run build
   npx firebase-tools deploy --only database,hosting
   ```
5. Open the hosting URL on the TV (`/#/present`), your laptop (`/#/admin`), and let the QR code on Round 3's intro screen do the rest.

> ⚠️ **Security model: there isn't one.** The database rules are wide open by design — this is a party app with a lifespan of one evening. Anyone with your URL can read and write. Don't share the URL beyond your guests, and hit *Reset game* when the night's over.

## Make it yours

- **Words** — everything lives in [`src/words.js`](src/words.js): four word banks + trial words, each entry a plain object with definition/origin/sentence. Swap in your own theme, language, or difficulty.
- **Rules copy & round names** — [`src/rules.js`](src/rules.js), shown on the TV intro screens.
- **Awards & puns** — the awards cards in [`src/views/PresenterStages.jsx`](src/views/PresenterStages.jsx).
- **Scoring** — point values are inline where each round marks (`src/views/Admin.jsx`); totals derive from the ledger in [`src/scoring.js`](src/scoring.js).

## Host cheat-sheet (Admin keyboard)

`Space` say word · `D` definition · `S` sentence · `O` origin · `C`/`X` correct/wrong · `V` reveal spelling on TV · `Enter` next word · `B` open buzzing · `T` start/next buzzer · `W` focus wager · `H` hide scores · `U` undo last score · `→` next round

## Anonymous usage ping

The badges above count real games: every deployment sends two fire-and-forget counters to this repo's stats endpoint — `gamesPlayed +1` when a host starts Round 1, `playersJoined +1` when a phone claims a name. **Nothing else is sent** — no names, words, scores, or identifiers. Forks can opt out (or point the counter at their own database) by editing one constant in [`src/stats.js`](src/stats.js).

## Stack

React + Vite, Firebase Realtime Database + Hosting, Web Speech API for the voice, WebAudio for the dings and the time's-up klaxon, `qrcode` for the join screen. No CSS framework, no state library — one stylesheet and a ledger.

---

Built for one very competitive living room. May the best hive win. 🐝🏆
