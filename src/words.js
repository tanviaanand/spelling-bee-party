// words.js — Spelling Bee content banks (SEED)
// -------------------------------------------------------------------
// Starter content for the four rounds + trial words, matching the data
// shapes in the spec (§11). Iterate freely — add/remove entries, tweak
// definitions/sentences, adjust tiers. The app reads these arrays directly.
//
// Shapes:
//   Standard word (Worker Bees, The Buzz, Gambit):
//     { word, definition, origin, sentence, tier }
//   Bee Sharp set (delivered by definition; answers = the spellings judged):
//     { definitions: [...], answers: [...] }
//
// Notes:
//  - `origin` is what a Gambit speller hears when they ask "language of origin."
//  - The Gambit list must stay >= (number of teams x 2) so no word repeats
//    when it's shown on screen. There's headroom below for tiebreakers.
//  - Tiers: 1 = warm-up, 2 = rapid-fire, 3 = champions.
// -------------------------------------------------------------------

// ===== Trial words (non-scoring demo before each round) =====
export const trialWords = {
  worker_bees: {
    word: "bumfuzzle",
    definition: "to confuse or fluster someone.",
    origin: "American English dialect.",
    sentence: "The tangle of instructions completely bumfuzzled me.",
  },
  bee_sharp: {
    definitions: [
      "a powder made by grinding grain, used in baking.",
      "the seed-bearing, often colorful part of a plant.",
    ],
    answers: ["flour", "flower"],
  },
  the_buzz: {
    word: "lollygag",
    definition: "to spend time aimlessly; to dawdle.",
    origin: "American English.",
    sentence: "Quit lollygagging — we're going to be late.",
  },
  queen_bee_gambit: {
    word: "collywobbles",
    definition: "stomach pain or a feeling of nervousness.",
    origin: "English, likely a fanciful blend of 'colic' and 'wobble.'",
    sentence: "The final round gave her the collywobbles.",
  },
};

// ===== Round 1 — Worker Bees (pen & paper, +10) =====
export const workerBees = [
  { word: "bureaucracy", definition: "a system of administration marked by many departments and complex procedures.", origin: "French, from 'bureau' (desk) + Greek '-kratia' (rule).", sentence: "Renewing the permit meant wading through layers of bureaucracy.", tier: 1 },
  { word: "liaison", definition: "communication or cooperation between groups; a person who facilitates it.", origin: "French, from 'lier' (to bind).", sentence: "She acted as the liaison between design and engineering.", tier: 1 },
  { word: "millennium", definition: "a period of one thousand years.", origin: "Latin, 'mille' (thousand) + 'annus' (year).", sentence: "The manuscript survived more than a millennium.", tier: 1 },
  { word: "connoisseur", definition: "an expert judge in matters of taste.", origin: "French, from Old French 'connoistre' (to know).", sentence: "He's a connoisseur of single-origin coffee.", tier: 1 },
  { word: "questionnaire", definition: "a set of printed questions used to gather information.", origin: "French, from 'question.'", sentence: "Please fill out the onboarding questionnaire.", tier: 1 },
  { word: "hemorrhage", definition: "an escape of blood from a ruptured vessel; a rapid uncontrolled loss.", origin: "Greek, 'haima' (blood) + 'rhegnynai' (to burst).", sentence: "The team worked quickly to stop the hemorrhage.", tier: 1 },
  { word: "silhouette", definition: "the dark outline of something seen against a lighter background.", origin: "French, named after Etienne de Silhouette.", sentence: "The skyline's silhouette glowed at dusk.", tier: 1 },
  { word: "entrepreneur", definition: "a person who sets up a business, taking on financial risk.", origin: "French, from 'entreprendre' (to undertake).", sentence: "The entrepreneur pitched to a room of investors.", tier: 1 },
];

// ===== Round 2 — Bee Sharp (homophones by definition, +10 per correct spelling) =====
export const beeSharp = [
  { definitions: ["something that completes or pairs well with another.", "a polite expression of praise or admiration."], answers: ["complement", "compliment"] },
  { definitions: ["careful and tactful in speech or action.", "individually separate and distinct."], answers: ["discreet", "discrete"] },
  { definitions: ["not moving; fixed in one place.", "writing paper and related materials."], answers: ["stationary", "stationery"] },
  { definitions: ["to draw out a response or reaction.", "forbidden by law or rules."], answers: ["elicit", "illicit"] },
  { definitions: ["most important; or the head of a school.", "a fundamental truth or rule of conduct."], answers: ["principal", "principle"] },
  // Triple (worth 30):
  { definitions: ["to quote or refer to as evidence.", "a location or place.", "the faculty of vision, or something seen."], answers: ["cite", "site", "sight"] },
];

// ===== Round 3 — The Buzz (individual rapid fire, +20 / -10) =====
export const theBuzz = [
  { word: "bourgeoisie", definition: "the middle class; in Marxist theory, the capital-owning class.", origin: "French.", sentence: "The novel gently mocked the comfortable bourgeoisie.", tier: 2 },
  { word: "minuscule", definition: "extremely small; tiny.", origin: "Latin, 'minusculus' (rather small).", sentence: "A minuscule error threw off the whole result.", tier: 2 },
  { word: "sacrilegious", definition: "involving violation or misuse of something sacred.", origin: "Latin, 'sacrilegus' (one who steals sacred things).", sentence: "Talking during the vows felt almost sacrilegious.", tier: 2 },
  { word: "onomatopoeia", definition: "the forming of a word from a sound associated with what it names.", origin: "Greek, 'onoma' (name) + 'poiein' (to make).", sentence: "'Buzz' is a fitting onomatopoeia for a bee.", tier: 2 },
  { word: "fluorescent", definition: "emitting light when exposed to radiation such as ultraviolet.", origin: "English, from 'fluorspar' + '-escent.'", sentence: "The lab's fluorescent lights hummed overhead.", tier: 2 },
  { word: "isthmus", definition: "a narrow strip of land connecting two larger land areas.", origin: "Greek, 'isthmos.'", sentence: "Panama lies on a narrow isthmus.", tier: 2 },
  { word: "mnemonic", definition: "a device or pattern that aids the memory.", origin: "Greek, 'mnemonikos' (of memory).", sentence: "She used a mnemonic to memorize the sequence.", tier: 2 },
  { word: "byzantine", definition: "excessively complicated or devious.", origin: "From Byzantium (the ancient city).", sentence: "The approval process was maddeningly byzantine.", tier: 2 },
  { word: "quixotic", definition: "extremely idealistic and impractical.", origin: "From the character Don Quixote.", sentence: "His quixotic plan to green the desert.", tier: 2 },
  { word: "zephyr", definition: "a gentle, mild breeze.", origin: "Greek, 'Zephyros' (the west wind).", sentence: "A zephyr drifted through the open window.", tier: 2 },
  { word: "chiaroscuro", definition: "the treatment of light and shade in drawing and painting.", origin: "Italian, 'chiaro' (light) + 'scuro' (dark).", sentence: "Caravaggio was a master of chiaroscuro.", tier: 2 },
  { word: "susurrus", definition: "a soft whispering or rustling sound.", origin: "Latin, 'susurrus' (a murmur).", sentence: "The susurrus of leaves filled the grove.", tier: 2 },
];

// ===== Round 4 — Queen Bee's Gambit (champions tier; speller may request origin/definition/sentence) =====
// Keep this list >= teams x 2. Extras below serve tiebreakers.
export const queenBeeGambit = [
  { word: "appoggiatura", definition: "a musical grace note that delays the following principal note.", origin: "Italian, from 'appoggiare' (to lean).", sentence: "The violinist added a delicate appoggiatura.", tier: 3 },
  { word: "stichomythia", definition: "dialogue in alternating single lines, as in Greek drama.", origin: "Greek, 'stichos' (line) + 'mythos' (speech).", sentence: "The argument played out in tense stichomythia.", tier: 3 },
  { word: "erysipelas", definition: "an acute bacterial skin infection producing red, inflamed patches.", origin: "Greek, likely 'erythros' (red) + 'pella' (skin).", sentence: "The clinician recognized the signs of erysipelas.", tier: 3 },
  { word: "cymotrichous", definition: "having wavy hair.", origin: "Greek, 'kyma' (wave) + 'thrix' (hair).", sentence: "The passport described him as cymotrichous.", tier: 3 },
  { word: "scherenschnitte", definition: "the art of cutting paper into delicate decorative designs.", origin: "German, 'Scheren' (scissors) + 'Schnitte' (cuts).", sentence: "She framed an intricate scherenschnitte.", tier: 3 },
  { word: "guerdon", definition: "a reward or recompense.", origin: "Old French, from Medieval Latin.", sentence: "A fitting guerdon for years of quiet work.", tier: 3 },
  { word: "feuilleton", definition: "a part of a newspaper devoted to fiction, criticism, or light literature.", origin: "French, from 'feuille' (leaf, sheet).", sentence: "Readers turned first to the paper's feuilleton.", tier: 3 },
  { word: "autochthonous", definition: "indigenous; formed or originating in the place where found.", origin: "Greek, 'autos' (self) + 'chthon' (earth).", sentence: "The valley has several autochthonous species.", tier: 3 },
  { word: "prospicience", definition: "the act of looking forward; foresight.", origin: "Latin, from 'prospicere' (to look ahead).", sentence: "Her prospicience spared the team a costly mistake.", tier: 3 },
  { word: "laodicean", definition: "lukewarm or indifferent, especially in matters of belief.", origin: "From Laodicea, an ancient city.", sentence: "He took a laodicean view of the whole debate.", tier: 3 },
  { word: "smaragdine", definition: "of or relating to emeralds; emerald-green in color.", origin: "Greek/Latin, from 'smaragdus' (emerald).", sentence: "The lagoon shone a smaragdine green.", tier: 3 },
  { word: "staphylococci", definition: "spherical bacteria that group in grapelike clusters (plural).", origin: "Greek, 'staphyle' (bunch of grapes) + 'kokkos' (berry).", sentence: "The sample cultured staphylococci overnight.", tier: 3 },
];

export default { trialWords, workerBees, beeSharp, theBuzz, queenBeeGambit };
