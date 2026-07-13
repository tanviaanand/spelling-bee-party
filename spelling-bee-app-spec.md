# Spelling Bee Party App — Product Spec (Final)

**Purpose:** A browser-based team spelling bee for an in-person party. The host runs it from a laptop that **AirPlays to the TV as a separate display** — the laptop screen shows a private **Admin** view (with the correct spellings), the TV shows a public **Presenter** view (no answers until revealed) plus all audio. Guests split into teams; each guest uses their own phone as a buzzer. Runs once, for one evening.

**This spec is authoritative and self-contained.** It replaces all earlier drafts. Build to match it exactly. Word banks are a drop-in content file (§11); seed the starter content given here so the app runs.

---

## 1. Constraints

- **Roster capacity:** support **up to 10 teams × up to 10 players each** (host configures the actual counts in setup). This is headroom for flexibility — the expected party is ~10 people in a handful of teams, and the turn-based rounds are tuned for that. Large rosters are allowed but not re-timed; a 10-team game means long waits between a team's turns.
- **Devices & display:**
  - **Laptop → TV via AirPlay, set to "Use As Separate Display" (not mirrored):** laptop screen = **Admin** view; TV = **Presenter** view (fullscreen). Separate Display is required — if AirPlay is mirroring, guests would see the Admin answers.
  - **Audio follows AirPlay:** with full-screen AirPlay, system audio (and thus TTS) routes to the TV/Apple TV. Verify this during the audio test — AirPlay audio occasionally lands on the wrong output. AirPlay adds mild latency; nothing here is frame-sensitive, so a slight lag on TTS/timer is fine.
  - **Phones (one per player):** buzzer + personal scoreboard.
- **Network:** deployed to the public internet — devices just open a URL. No LAN/same-WiFi requirement.
- **Lifespan:** single event. Optimize for "works reliably on the night," not scale.

### Explicit exclusions (do NOT build — removed by design)
- No power-ups (no "Free Bee," no "Honeypot").
- No steal mechanics. A missed word never transfers to another team **except** the buzzer rebound in The Buzz (§7.3), which is a buzz-race, not a steal.
- No twist cards.
- No phone-submitted wagers — wagers are host-entered (§7.4).

### Global assumptions (veto if wrong)
- **Team totals floor at 0** — a team's score can never go negative.
- **Bee Sharp is turn-based** because it's spoken (§7.2). (Alternative: revert to written-simultaneous like Worker Bees.)

---

## 2. Tech stack

- **Frontend:** React + Vite. (Plain HTML/JS acceptable, but three synchronized views over shared realtime state make a framework cleaner.)
- **Realtime state + hosting:** **Firebase** — Realtime Database (RTDB) for shared state, Firebase Hosting for the static app. One project.
- **Audio:** browser **Web Speech API** (`window.speechSynthesis`), spoken by the **Presenter view**, which is AirPlayed to the TV so audio comes out of the TV. Phones and Admin never emit sound; the host triggers audio from Admin and the Presenter speaks.
- **Target browser:** Chrome.

---

## 3. Views / routes

| Route | Device | Shows |
|---|---|---|
| `/present` (default) | TV (AirPlay) | **Public.** Big word/definition, current round + whose turn, countdown timer, leaderboard (obeys `scoresVisible`; compact/scrolling mode for many teams), buzz banner, wager reveal. **Never shows the correct spelling until `currentPrompt.revealed === true`.** Owns all audio. |
| `/admin` | Laptop screen | **Private.** Shows the **correct spellings** for the host to judge against, all controls, per-round marking, manual wager entry, **undo/edit ledger**, awards, reset. |
| `/play/:playerId` | Player phone | The player's name/team, live team score + standings, a **BUZZ** button (active only in The Buzz). Persists `playerId` in localStorage. |

The Presenter (TV) device holds the authoritative timer and audio.

---

## 4. App flow

```
Welcome  →  Setup  →  [ worker_bees → bee_sharp → the_buzz → queen_bee_gambit ]  →  Awards
```

- **Welcome screen** first (title, "Start setup" for host; phones landing here show "waiting for host / pick your name once teams are up").
- Host advances every phase manually.
- **All point values are ×10** (a "1-point" word = **10**).
- **Every round begins with a trial word** — a funny, non-scoring demo (`state.isTrial = true`) so guests see the format before it counts.
- Scoring applies only when `isTrial === false`.

---

## 5. Welcome & Setup

- **Welcome screen** → host taps into Setup.
- **Setup (host builds everything):**
  - Create **teams** — any number **up to 10** (names).
  - Add **players** under each team — up to **10 per team** (host types the roster — players do NOT self-register).
  - Run the **audio test** on the Presenter/TV (§12), confirm sound is coming from the TV over AirPlay, and pick a voice.
- **Players claim a phone:** each guest opens the app, sees the roster, and **taps their own name** to bind that phone to their pre-created `playerId`. The binding is saved to **localStorage**, so if the phone sleeps and reopens, it returns to the same player (never spawns a duplicate).
- **Lobby/claim status:** Admin shows which players have claimed a phone, so the host can confirm everyone's in before starting.

---

## 6. Rounds — names & scoring

| # | Round | Format | Scoring |
|---|---|---|---|
| 1 | **Worker Bees** | pen & paper, all teams write every word | **+10** / correct |
| 2 | **Bee Sharp** | homophones by definition, spoken, turn-based | **+10** / correct spelling |
| 3 | **The Buzz** | individual rapid fire, buzzers, spoken | **+20** correct / **−10** wrong |
| 4 | **Queen Bee's Gambit** (turn-based, 2 turns/team) | champions wager, solo speller stands facing away & requests info | ± the team's wager |

---

## 7. Rounds — detail

### 7.1 Worker Bees — pen & paper — **+10 / word**
- Trial word first (e.g. `bumfuzzle`), then ~8 real words.
- Word is pronounced (TTS) and a countdown runs. **All teams write on paper.** On the host's call, teams reveal; **Admin displays the correct spelling**; host marks each team, **+10 per correct**.
- Every team plays every word. Written input; no buzzers.
- **Presenter:** timer + "WRITE!" then the correct spelling large **only after the host reveals**.
- Starter words: `bureaucracy, liaison, millennium, connoisseur, questionnaire, hemorrhage, silhouette, entrepreneur`.

### 7.2 Bee Sharp — homophones by definition — spoken, turn-based — **+10 / correct spelling**
- Trial pair first (e.g. `flour / flower`).
- Because homophones sound identical, the round is delivered **by definition**. Spoken answers can't be simultaneous, so it's **turn-based**: on a team's turn, the Presenter shows their definition set; the team **says both spellings aloud**; the host marks per answer against the Admin's correct spellings.
- **Scoring is per correct spelling:** a pair = 20 (each word +10), a triple like `cite / site / sight` = 30. Points only for correct spellings.
- Rotate through the teams; each team gets its own prompt(s) so no team can copy another's spoken answer.
- **Presenter:** whose turn + their definitions; correct spellings shown only on reveal.
- Starter sets (by definition): `complement/compliment`, `discreet/discrete`, `stationary/stationery`, `elicit/illicit`, `principal/principle`, `cite/site/sight`.
- *(If reverted to written-simultaneous: all teams write every prompt, reveal together — same as Worker Bees but scored per spelling.)*

### 7.3 The Buzz — individual rapid fire — spoken — **+20 correct / −10 wrong**
- Trial word first (e.g. `lollygag`).
- Word is pronounced. **Each person buzzes on their own phone.** First buzz wins and **spells aloud, solo — no team discussion.**
- **5-second answer clock:** once a player's buzz locks, a 5-second countdown shows on the Presenter. They must spell within it; if they freeze or run out, it's a miss.
- Correct = **+20** to their team **and** increments that player's `buzzWins`. Wrong buzz / miss / timeout = **−10** to their team.
- On a miss, the word **rebounds to the next-fastest player**: the missed player is excluded and buzzing re-opens to everyone else, repeating until someone gets it or the host moves on.
- Run a fixed list (~10–12 words) or a 3-minute clock.
- Buzz ordering is authoritative via an RTDB **transaction** (§8).
- **Presenter:** "LISTEN…" then the word, and a big "🔔 <PlayerName> (<Team>) BUZZED" + the 5s countdown the instant a winner locks.

### 7.4 Queen Bee's Gambit — champions wager, solo speller — **turn-based**, two turns per team — the board-flipper
- Trial turn first (e.g. `collywobbles`) so a speller sees the stand-and-request format before it counts.
- **Format:** teams take turns. On a team's turn, that team sends up **one solo speller** who **stands in front of the TV, facing the room with their back to the screen** — they cannot see it. Each team gets its **own word** (words are burned once shown, never reused).
- **Per turn:**
  1. **Wager phase (blind):** the team huddles and tells the host its wager. **The host enters it manually on Admin.** The wager is **capped at the team's current score** (a wrong answer drops them toward 0 but never below). Entered before the word is shown to anyone.
  2. **The speller stands** (back to the TV). The **word, language of origin, definition, and a sentence are now shown on the Presenter for the room** — this round deliberately shows the correct spelling openly to the audience; secrecy is physical, from the speller facing away.
  3. **Request-driven info (the speller must ask):** the speller receives nothing automatically. They request each piece — "may I have the **pronunciation** / **definition** / **language of origin** / **sentence**?" — and on each request the host triggers it (read aloud via TTS) and it **reveals progressively on the Presenter** for the room.
  4. **Spell:** the speller spells aloud, solo — no coaching from the team. The host marks against Admin's correct spelling.
  5. **Score:** correct → **+wager**; wrong → **−wager** (logged to the ledger).
- **Repeat** so each team spells **twice** (two full rotations; a team may send a different speller each turn).
- Blind wagering (the team commits before its word is shown) is what creates the tension — enter the wager before revealing the word.
- **Presenter (this round only):** speller's name + team, the word shown openly, and origin/definition/sentence panels that **fill in as requested**. Wager shown after it's entered.
- *(Content note: needs ≥ teams × 2 champions words so none repeat.)*

### 7.5 Tiebreaker (if needed)
- If two or more teams are tied for the lead after the Gambit, run **sudden-death**: each tied team sends a solo speller (same stand-and-request format), each gets a fresh champions-tier word, first to spell correctly wins. Repeat with new words until broken.

### 7.6 Awards
- **Champion Team** — highest final score (tiebreak per §7.5).
- **Top Buzzer** — player with the most `buzzWins`.
- **Most Creative Misspelling** — host-entered; funniest wrong answer of the night, read aloud via TTS.
- `scoresVisible` forced `true` here.

---

## 8. Buzzer logic (critical — The Buzz)

Implement with an RTDB **transaction**, never `set()`:

- Each phone, on BUZZ, runs `runTransaction` on `/state/buzz/winner`.
- Commit the `playerId` **only if** the value is `null` **and** the player is not in `/state/buzz/excluded`; else abort.
- First transaction to commit while `null` wins; everyone else reads it already-set and locks out.
- On win, set `/state/buzz/answerDeadline = now + 5000` for the Presenter countdown.
- **Rebound:** host presses rebound → app adds the missed player to `excluded`, resets `winner` to `null`, bumps `openRoundId`. Buzzing re-opens to remaining players. Repeat until success or the host advances.
- Presenter + phones subscribe to `/state/buzz`.

> A plain `set()` here yields last-write-wins ties and is wrong. Use a transaction.

---

## 9. Scoring backbone — the ledger (must be robust)

Scores are the top dispute risk, so the app is the ledger, not the host's memory.

- **Append-only log:** every point event is a `/ledger` entry: `{ ts, teamId, playerId?, phase, delta, note, voided }`.
- **Totals derive from the log:** team score = sum of `delta` for non-voided entries, **floored at 0**. Per-round subtotals = filter by `phase`. Don't treat a bare total as source of truth.
- **Undo / edit is required.** Admin must **void the last entry** (one keypress, `U`) and **edit any entry**. A fat-finger during The Buzz must be recoverable in one action.
- **Player attribution:** when the host marks a correct answer, they select the player who gave it → increments that player's `correct` (and `buzzWins` in The Buzz). This is how the host "puts the correct player."
- Totals mirror live to the Presenter leaderboard and every phone.

---

## 10. Data model (RTDB tree)

```
/state
  phase: "welcome" | "setup" | "worker_bees" | "bee_sharp" | "the_buzz" | "queen_bee_gambit" | "awards"
  isTrial: boolean
  currentPrompt: { type: "word"|"homophones", word?: string, definitions?: string[], answers?: string[], origin?: string, sentence?: string, revealed: boolean } | null
  activeTeam: string|null            # whose turn (Bee Sharp; Gambit)
  gambit: {
    spellerId: string|null           # the solo speller standing at the TV
    turnRound: 1 | 2                  # which of the two rotations
    wager: number|null               # host-entered for the active team, capped at its score
    wagerEntered: boolean
    infoShown: { word: bool, pronunciation: bool, definition: bool, origin: bool, sentence: bool }  # progressive reveal on request
  }
  scoresVisible: boolean             # host show/hide toggle
  timer: { endsAt: number|null, seconds: number }
  buzz: { openRoundId: string, winner: string|null, lockedAt: number|null, answerDeadline: number|null, excluded: string[] }

/teams
  <teamId>: { name: string, score: number }        # mirror of ledger, floored at 0

/players
  <playerId>: { name: string, teamId: string, claimed: boolean, buzzWins: number, correct: number }

/ledger
  <entryId>: { ts: number, teamId: string, playerId: string|null, phase: string, delta: number, note: string, voided: boolean }

/awards
  champion: string|null
  topBuzzer: string|null
  creativeMisspelling: string|null
```

**Writers:** only **Admin** writes `/teams`, `/ledger`, `/awards`, `/state` (incl. wagers, reveal flags). **Player phones** write only their own buzz transaction (§8) and set their own `claimed`. Keep the tree flat.

---

## 11. Content / word banks

Build against these shapes; a fuller content file drops in later. Seed with §7 starter content now.

```js
// Standard words (Worker Bees, The Buzz, Queen Bee's Gambit)
{ word: "bureaucracy", definition: "...", sentence: "...", origin: "...", tier: 1 }

// Bee Sharp sets (delivered by definition; answers are the spellings the host judges against)
{ definitions: ["a thing that completes", "an expression of praise"], answers: ["complement", "compliment"] }

// Trial words per round
{ worker_bees: "bumfuzzle", bee_sharp: { definitions: [...], answers: ["flour","flower"] },
  the_buzz: "lollygag", queen_bee_gambit: "collywobbles" }
```

`answers`, `definition`, `sentence`, `origin` are shown on **Admin** for judging (and feed host-triggered TTS). Empty fields are skipped, not errored. The **Presenter** shows a spelling only when `currentPrompt.revealed` is true — **except in Queen Bee's Gambit**, where the word and its info are shown openly to the room (the speller faces away), revealing progressively as requested via `gambit.infoShown`.

---

## 12. Audio / TTS

- `window.speechSynthesis` on the **Presenter (TV) device only**; host triggers it from Admin via `/state`, Presenter speaks.
- **Unlock on setup:** browsers block audio until a user gesture — setup needs a **"Test audio"** button on the Presenter that speaks a sample word; don't leave setup until it works. Include a **voice picker**.
- Separate host triggers: word / definition / sentence / origin.
- **Bee Sharp:** TTS reads the **definitions**, never the homophones.
- Short cues: "ding" on correct, "buzz" on wrong/rebound.

---

## 13. Admin controls & keyboard shortcuts (`/admin`)

- **Space** pronounce · **D** definition · **S** sentence · **O** origin
- **C** correct · **X** wrong — for the active target; opens a quick **player attribution** picker on a correct mark
- **Number keys** mark a specific team correct for the first few teams (Worker Bees); Shift+number = wrong. Past ~6 teams, mark via the on-screen team row rather than number keys.
- **T** rebound (The Buzz)
- **W** enter the active team's wager (Gambit)
- **In Gambit**, the info-request keys (Space pronounce · D definition · O origin · S sentence) both read aloud **and** reveal that panel on the Presenter (`gambit.infoShown`) — driven by the speller's requests. Also: select the standing **speller** for the active team, and advance turns/rotations.
- **V** reveal correct spelling on Presenter (`currentPrompt.revealed = true`) — used in the non-Gambit rounds
- **H** toggle score visibility
- **U** undo/void last ledger entry
- **Enter** next word · **→** next phase
- Buttons for all of the above. Plus: team/player setup + lobby, trial on/off, wager entry, speller picker, enter "Most Creative Misspelling," **edit any ledger entry**, **Reset game**.

### Per-round marking UI (build all four)
- **Worker Bees:** a row/grid of all teams (wraps or scrolls for many teams); tick each correct/incorrect for the current word.
- **Bee Sharp:** the active team's prompt with a tick **per answer word** (so 1-of-2 = +10).
- **The Buzz:** single-target — the buzzed player; correct (+20, attribute) or wrong (−10) + rebound.
- **Gambit:** the active team's solo speller with correct/incorrect, applied against that team's entered wager; info-request buttons (pronounce/definition/origin/sentence) that reveal progressively on the Presenter.

---

## 14. Show / hide scores

- `/state/scoresVisible`, toggled by host (`H`). When `false`, Presenter + phones show a "Scores hidden 👀" card.
- Suggested: visible throughout; optionally **hide the leaderboard right before the Gambit's final turns** so the standings land as a reveal at Awards. (The Gambit's *word/info* are shown openly regardless — this toggle only governs the score leaderboard.) Forced `true` on Awards.

---

## 15. Visual design

- **Presenter (TV-first):** dark background, very large high-contrast type, minimal chrome. Current word/definition dominant; timer clear; leaderboard persistent (when shown), sorted, **animates on score change**, with a **compact/scrolling layout that stays readable as team count grows** (comfortable at a handful of teams, still legible near the 10-team cap). Distinct states: WRITE (Worker Bees), whose-turn + definitions (Bee Sharp), LISTEN/BUZZED + 5s clock (The Buzz), Gambit (speller name + team, the word shown openly, origin/definition/sentence panels filling in as requested), celebration (Awards).
- **Admin:** dense and functional — correct spellings prominent, big obvious Correct/Wrong controls, the all-teams marking row, ledger with undo/edit, wager entry fields.
- **Phone:** minimal, thumb-friendly — name, team, score, standings, big BUZZ button.

---

## 16. Suggested build order

1. Firebase project + RTDB + tree (§10); deploy hello-world to Hosting to prove the pipeline.
2. Welcome + Setup: host creates teams (up to 10) + players (up to 10 each); phones claim a name; **localStorage reconnection**; lobby/claim status on Admin.
3. Presenter + Admin shells over `/state`; manual phase switching; trial on/off; **reveal flag** so Presenter hides answers.
4. **Ledger + leaderboard + undo/edit + player attribution** (§9) — the scoring spine, before any round uses it.
5. Worker Bees (all-teams marking, TTS, timer, reveal).
6. Show/hide scores.
7. The Buzz + **buzz transaction** + 5s clock + rebound + phone BUZZ view — riskiest piece, test with 2+ phones early; `buzzWins`.
8. Bee Sharp (turn-based, per-answer marking).
9. Queen Bee's Gambit (turn-based solo speller facing away, per-team wager entered by host & capped at score, request-driven progressive info reveal on Presenter, two turns per team).
10. Tiebreaker + Awards (Champion, Top Buzzer, Most Creative Misspelling).
11. Polish: sounds, animations, round-state visuals.

---

## 17. Acceptance checklist (party-night readiness)

- [ ] AirPlay set to **Use As Separate Display** (not mirrored): Admin stays on laptop, Presenter on TV, **audio confirmed coming from the TV**.
- [ ] Setup: host can add **up to 10 teams and up to 10 players each**; each phone claims a name; **a slept phone reopens to the same player** (localStorage).
- [ ] Presenter leaderboard stays readable as team count grows (compact/scrolling).
- [ ] Presenter **never shows a correct spelling** until the host reveals it; Admin always shows it.
- [ ] Ledger: every mark logs an entry; totals derive from it and **floor at 0**; **undo (U) and edit both work**; correct answers attribute to a player.
- [ ] Worker Bees: +10/word, all teams marked per word.
- [ ] Bee Sharp: turn-based; **per-answer** scoring (pair = 20, triple = 30); TTS reads definitions.
- [ ] The Buzz: two phones can buzz, **first buzz always wins**, others lock out; **5-second clock** enforced; wrong = −10; **rebound to next-fastest** works; `buzzWins` increments.
- [ ] Gambit: turn-based; each team's solo speller stands facing away; word + origin/definition/sentence show **openly on the Presenter** and **reveal progressively as the speller requests** them; host enters each wager, **capped at current score**, never below 0; each team spells **twice**.
- [ ] Tiebreaker sudden-death available; Awards compute Champion + Top Buzzer; creative-misspelling entry works.
- [ ] Every round has a working trial (non-scoring) mode.
- [ ] Refreshing any device restores state from RTDB.
