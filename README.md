# 🐝 Spelling Bee Party

**Turn any get-together into a game show.** Your TV becomes the stage, your laptop runs the show, and everyone's phone is a buzzer. Teams, trash talk, dramatic reveals — all the fun of a spelling bee, none of the school-gym energy.

### ▶️ [**Start a game →**](https://spelling-bee-party.web.app)

![Games played](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fspelling-bee-party-default-rtdb.firebaseio.com%2FpublicStats.json&query=%24.gamesPlayed&label=%F0%9F%8E%89%20games%20played&color=f5b301&cacheSeconds=300)
![Players joined](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fspelling-bee-party-default-rtdb.firebaseio.com%2FpublicStats.json&query=%24.playersJoined&label=%F0%9F%93%B1%20players%20joined&color=f5b301&cacheSeconds=300)

---

## How it works (about 30 seconds)

Nothing to install. Nobody makes an account.

1. **Open the link** on the computer you'll hook up to the TV → tap **Start a new game**.
2. You get a little **game code** (like `BEEZ`). Put the TV screen up (there's a one-tap "Open TV screen" button), and keep the control panel on your laptop.
3. When it's phone time, players **scan the QR code on the TV** (or type the code) and tap their name. Done — they're buzzing in.

That's the whole setup. Everything else — teams, words, scores, the drama — happens as you play.

## The four rounds

🐝 **Worker Bees** — Old school. A word is read aloud, every team scribbles it on paper, everyone reveals at once. Phones away!

🎵 **Bee Sharp** — Homophones. You hear the *definitions* ("a polite compliment" vs "something that completes") and every team writes *all* the spellings. Sneaky.

🔔 **The Buzz** — Phones out, gloves off. A word is read and **everyone races to buzz** — the screen ranks who was fastest, and they spell solo against a 5-second clock. Get it wrong and it passes to the next-fastest.

👑 **Queen Bee's Gambit** — The board-flipper. Every team secretly **wagers** points *before* seeing their word, then a speller stands with their back to the screen and has to *ask* for the definition, origin, or sentence. Bet big, win big — you can even bet more than you have and go negative. 😈

Then a sudden-death tiebreaker if needed, and a proper awards ceremony with drumroll reveals (👑 Champions, 🐝 The Humble Bumbles, 🔔 Top Buzzer, 🎨 Most Creative Misspelling).

## Want your own words?

The word list is one friendly file — [`src/words.js`](src/words.js) — written in plain English. Each word is just:

```js
{ word: "bureaucracy", definition: "a system with lots of departments and red tape.",
  sentence: "Renewing the permit meant endless bureaucracy.", origin: "French.", tier: 1 }
```

Swap in inside jokes, your friend group's vocabulary, another language, kid-friendly words — whatever your crowd will love. *(Editing words means running your own copy for now — see below. An in-app word editor is on the wishlist.)*

## 🛠️ For tinkerers — run your own copy

<details>
<summary>Try it locally in 2 minutes (no accounts)</summary>

```bash
git clone https://github.com/tanviaanand/spelling-bee-party.git
cd spelling-bee-party
cp src/firebase-config.example.js src/firebase-config.js
npm install
npm run dev
```

Leaving the config as-is runs **local test mode** — the whole game works in one browser (open the admin, TV, and phone views in separate tabs). Perfect for editing words and trying things.
</details>

<details>
<summary>Host your own live version (real phones)</summary>

1. Make a free [Firebase](https://console.firebase.google.com) project → **Build → Realtime Database → Create database**.
2. Project settings → **Your apps → Web** → register an app, paste the config into `src/firebase-config.js`.
3. `cp .firebaserc.example .firebaserc`, add your project id, then:
   ```bash
   npx firebase-tools login
   npm run build
   npx firebase-tools deploy --only database,hosting
   ```

⚠️ **Heads up:** the database is wide open by design — this is a one-night party app, not a bank. Anyone with a game code can peek at that game. Keep codes among your guests.
</details>

<details>
<summary>Host keyboard shortcuts</summary>

`Space` say word · `D` definition · `S` sentence · `O` origin · `C`/`X` right/wrong · `V` reveal spelling on TV · `Enter` next word · `B` open buzzing · `T` start/next buzzer · `W` wager · `H` hide scores · `U` undo · `→` next round
</details>

<details>
<summary>How the badges work</summary>

Every game sends two anonymous tallies to this project — `+1 game` when Round 1 starts, `+1 player` when a phone joins. **That's it** — no names, words, or scores ever leave your game. Turn it off (or point it at your own database) with one line in [`src/stats.js`](src/stats.js).
</details>

## Built with

React + Vite, Firebase Realtime Database, the browser's built-in text-to-speech for reading words aloud, and a little WebAudio for the dings and the time's-up klaxon. One stylesheet, no frameworks.

---

Made for one very competitive living room by [**Tanvi Anand**](https://tanvianand.com). May the best hive win. 🐝🏆
