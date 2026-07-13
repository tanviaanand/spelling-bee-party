// Short per-round rules, shown on the Presenter whenever no word is loaded
// (i.e. while the host introduces the round).
export const RULES = {
  worker_bees: {
    round: 1,
    emoji: "📝",
    title: "Worker Bees",
    points: "+10 per word",
    lines: [
      "Listen to the word — every team writes it down on paper.",
      "When time's up, all teams reveal together.",
      "+10 points for each correctly spelled word.",
      "📵 Phones AWAY — spotted phone = −100!",
    ],
  },
  bee_sharp: {
    round: 2,
    emoji: "🎵",
    title: "Bee Sharp",
    points: "+10 per spelling",
    lines: [
      "Homophones — words that sound the same but are spelled differently.",
      "We read the definitions — EVERY team writes ALL the spellings at once.",
      "Reveal together: +10 per correct spelling (a pair = 20, a triple = 30).",
      "📵 Phones still AWAY — spotted phone = −100!",
    ],
  },
  the_buzz: {
    round: 3,
    emoji: "🔔",
    title: "The Buzz",
    points: "+20 correct · −10 wrong",
    lines: [
      "📱 Phones OUT at last — scan the QR and tap your name!",
      "Rapid fire — every player for themselves. EVERYONE can buzz; you're ranked by speed.",
      "Fastest goes first: spell ALONE, within 5 seconds. No team help.",
      "+20 if right, −10 if wrong — then it passes down the list.",
    ],
  },
  queen_bee_gambit: {
    round: 4,
    emoji: "👑",
    title: "Queen Bee’s Gambit",
    points: "win or lose your wager",
    lines: [
      "EVERY team locks a blind wager first — kept SECRET until the rotation ends.",
      "Then one by one: your speller stands with their back to the screen; the room sees the word.",
      "The speller must ASK: “may I have the definition / origin / sentence?”",
      "Spell it right: +wager. Miss: −wager. Then a fresh round of wagers — two rotations!",
    ],
  },
  tiebreaker: {
    emoji: "⚡",
    title: "Sudden Death",
    points: "first correct spelling wins",
    lines: [
      "Tied teams each send up a solo speller — same format as the Gambit, no wager.",
      "First correct spelling takes the crown.",
    ],
  },
};
