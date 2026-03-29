/* ===================================================
   VOWEL QUEST — Voice Input System
   Two separate recognition strategies:
     • Letter mode  (vowel / consonant) — continuous listening,
       short utterances, auto-restart so user says one letter
       at a time without re-clicking mic.
     • Spelling mode — single-shot per click, recognises a
       whole word. Uses the expected answer to disambiguate
       similar-sounding alternatives ("duck" vs "tuck").
   =================================================== */

const VoiceInput = (() => {
  "use strict";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition;

  let recognition = null;
  let listening = false;
  let wantContinuous = false;  // true only in letter mode
  let resultCallback = null;   // (letters: string[], mode: string) => void
  let stateCallback = null;    // (listening: boolean) => void
  let currentMode = "vowel";
  let expectedWord = "";       // uppercase, set by game for spelling disambiguation
  let validLetters = null;     // Set of uppercase letters valid for current mode

  /* --------------------------------------------------------
     PRONUNCIATION MAP — spoken sound → uppercase letter
     The Web Speech API returns full English words for short
     utterances, so we map every common transcription variant.
     -------------------------------------------------------- */
  const LETTER_MAP = {};
  function addMap(letter, variants) {
    variants.forEach(v => { LETTER_MAP[v.toLowerCase()] = letter; });
  }

  // ── Vowels (extensive — these are the hardest to detect) ──
  addMap("A", [
    "a","ay","aye","eh","hey","alpha","ah","aay","eight","ate",
    "aim","age","ace","ape","aid","ale","hay","ha","huh",
    "ei","ey","they","say","way","day","may","pay","ray","bay",
    "play","pray","stay","grey","gray","lay","jay","nay","yay",
    "weigh","weight","wait","late","fate","gate","hate","rate",
    "name","fame","came","game","same","make","take","bake","cake",
    "lake","wake","shake","stake","grade","made","save","gave",
    "a.","letter a",
  ]);
  addMap("E", [
    "e","ee","eee","echo","he","she","we","me","be","the",
    "eat","each","ease","east","ear","eel","eve","even",
    "eagle","eager","era","equal","evil",
    "free","tree","three","see","fee","knee","key","pee","tea","flee",
    "bee","dee","gee","lee","tee","wee","plea",
    "seed","feed","need","reed","deed","weed","speed","bleed","breed",
    "deep","keep","sleep","sheep","sweep","creep","steep",
    "sea","pea","flea","deal","real","meal","seal","heal","steal",
    "mean","lean","clean","bean","dean","jean",
    "sheet","meet","feet","sweet","street","beat","heat","seat","neat",
    "ye","yea","yeah","yee","year","easy","email","emoji",
    "e.","letter e",
  ]);
  addMap("I", [
    "i","eye","ai","india","hi","high","buy","by","my","tie","die",
    "lie","pie","guy","fly","try","cry","dry","fry","sky","spy","shy",
    "why","sigh","thigh",
    "ice","eyes","I'm","I'll","aisle","isle","iron",
    "night","right","light","sight","might","fight","tight","knight",
    "like","bike","hike","mike","strike","spike",
    "time","dime","lime","mine","fine","line","nine","wine","vine","pine",
    "side","hide","ride","wide","guide","pride","slide","bride",
    "five","dive","drive","live","alive","arrive",
    "white","write","quite","bite","kite","site","lite",
    "i.","letter i",
  ]);
  addMap("O", [
    "o","oh","ooh","oooh","ohhh","oscar","owe","eau",
    "awe","or","all","on","own","old","only","over",
    "go","no","so","low","know","show","flow","grow","blow","slow","snow",
    "throw","glow", "row","bow","tow","mow","sow",
    "home","bone","tone","zone","cone","phone","stone","alone",
    "note","vote","quote","wrote","code","mode","node","rode","role","hole",
    "hope","rope","cope","pope","slope",
    "open","ocean","omit",
    "oak","oat","oath","oil",
    "o.","letter o","zero","whoa",
  ]);
  addMap("U", [
    "u","you","yu","ew","uniform","yoo","yew",
    "who","hue","new","few","view","due","sue","true","blue","clue","glue",
    "grew","drew","flew","knew","blew","threw","crew","brew","stew",
    "use","used","user","huge","cube","tube","cute","mute","duke","rule",
    "rude","dude","nude","mood","food","cool","pool","tool","school","fool",
    "room","moon","soon","noon","spoon","bloom","broom","groom","zoom",
    "too","two","do","to","shoe","move","prove","lose","choose",
    "you're","your","youth",
    "u.","letter u","ooh","oo",
  ]);

  // ── Consonants ──
  addMap("B", [
    "b","be","bee","bravo","beat","beef","bead","bean","beach","beam",
    "beer","beard","beast","bees","beep","beet","being",
    "b.","letter b",
  ]);
  addMap("C", [
    "c","see","sea","charlie","si","ce","seed","seen","seal","seat",
    "seem","seek","seize","scene","screen","seeing","seeing",
    "c.","letter c",
  ]);
  addMap("D", [
    "d","dee","delta","deal","dean","dear","deep","deed","deem","deer",
    "d.","letter d",
  ]);
  addMap("F", [
    "f","ef","eff","foxtrot","if","off","half",
    "f.","letter f",
  ]);
  addMap("G", [
    "g","gee","jee","golf","geek","gene","genie","jeep",
    "g.","letter g",
  ]);
  addMap("H", [
    "h","aitch","hotel","age","ach","ache","each","8",
    "h.","letter h","edge","etch","ash","h8",
  ]);
  addMap("J", [
    "j","jay","juliet","jade","jail","jane","james","jake","jam",
    "j.","letter j",
  ]);
  addMap("K", [
    "k","kay","kilo","okay","ok","kate","cake",
    "k.","letter k","que","kei",
  ]);
  addMap("L", [
    "l","el","ell","lima","ale","all","else","elf","elm","elbow",
    "l.","letter l",
  ]);
  addMap("M", [
    "m","em","mike","am","aim","elm","arm","um",
    "m.","letter m",
  ]);
  addMap("N", [
    "n","en","november","an","in","and","end","inn",
    "n.","letter n",
  ]);
  addMap("P", [
    "p","pee","papa","pe","pea","peak","peace","peel","peep","peer",
    "p.","letter p",
  ]);
  addMap("Q", [
    "q","queue","cue","quebec","cute","cube",
    "q.","letter q","kyu",
  ]);
  addMap("R", [
    "r","are","ar","romeo","our","or","err","her",
    "r.","letter r",
  ]);
  addMap("S", [
    "s","es","sierra","as","ass","ace","ice",
    "s.","letter s",
  ]);
  addMap("T", [
    "t","tee","tea","tango","te","teen","team","teeth","teal","tear",
    "t.","letter t",
  ]);
  addMap("V", [
    "v","vee","victor","ve","vie","via",
    "v.","letter v",
  ]);
  addMap("W", [
    "w","double u","double you","whiskey","doubleyou","dub",
    "w.","letter w",
  ]);
  addMap("X", [
    "x","ex","x-ray","xray","eggs","acts","axe","ax","hex",
    "x.","letter x",
  ]);
  addMap("Y", [
    "y","why","wye","yankee","wise","white","wide","wine",
    "y.","letter y",
  ]);
  addMap("Z", [
    "z","zed","zee","zulu","said","set","zeal","zen","zip",
    "z.","letter z",
  ]);

  /* ========================================================
     LETTER MODE  — vowel / consonant
     Continuous listening, short detection window.
     Each speech result fires one toggle then auto-restarts.
     ======================================================== */

  /** Parse transcript into deduplicated letter array.
   *  If validLetters is set, prefer letters in that set. */
  function parseLetters(transcript) {
    const raw = transcript.trim().toLowerCase();
    if (!raw) return [];

    // Check whole phrase against map
    if (LETTER_MAP[raw]) return [LETTER_MAP[raw]];

    const tokens = raw.replace(/\band\b/g, " ").replace(/,/g, " ")
      .split(/\s+/).filter(Boolean);
    const letters = [];
    for (const token of tokens) {
      if (token.length === 1 && /^[a-z]$/.test(token)) {
        letters.push(token.toUpperCase());
      } else if (LETTER_MAP[token]) {
        letters.push(LETTER_MAP[token]);
      }
    }

    // Fallback: first alphabetic character from raw transcript
    if (letters.length === 0) {
      const match = raw.match(/[a-z]/);
      if (match) letters.push(match[0].toUpperCase());
    }

    const unique = [...new Set(letters)];

    // If we have a valid set, filter to only valid letters
    if (validLetters && unique.length > 0) {
      const filtered = unique.filter(l => validLetters.has(l));
      return filtered.length > 0 ? filtered : unique;
    }
    return unique;
  }

  function createLetterRecognition() {
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    // Dedup: track the last letter+time we fired so rapid interim
    // updates for the same utterance don't toggle twice
    let lastFired = "";       // last letter string we sent
    let lastFiredAt = 0;      // timestamp
    const DEDUP_MS = 800;     // ignore same letter within this window
    let lastInterimText = ""; // avoid re-processing identical interim text

    rec.onresult = (event) => {
      // Process ALL results — use the latest one
      const latest = event.results[event.results.length - 1];
      if (!latest || latest.length === 0) return;

      const transcript = latest[0].transcript;
      const isFinal = latest.isFinal;

      // Skip if the interim text hasn't changed
      if (!isFinal && transcript === lastInterimText) return;
      lastInterimText = transcript;

      // Collect alternatives
      const alts = [];
      for (let j = 0; j < latest.length; j++) {
        alts.push(latest[j].transcript);
      }

      // Try each alternative
      for (const t of alts) {
        const letters = parseLetters(t);
        if (letters.length > 0) {
          const key = letters.join(",");
          const now = Date.now();

          // Dedup: don't fire same letter again within DEDUP_MS
          if (key === lastFired && now - lastFiredAt < DEDUP_MS) break;

          console.log("[Voice]", isFinal ? "FINAL" : "interim",
            JSON.stringify(t), "→", letters.join(","));

          lastFired = key;
          lastFiredAt = now;
          if (resultCallback) resultCallback(letters, currentMode);
          break;
        }
      }
    };

    rec.onend = () => {
      if (wantContinuous) {
        try {
          recognition = createLetterRecognition();
          recognition.start();
          return;
        } catch (_) { /* fall through */ }
      }
      listening = false;
      if (stateCallback) stateCallback(false);
    };

    rec.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed" || event.error === "service-not-available") {
        wantContinuous = false;
        listening = false;
        if (stateCallback) stateCallback(false);
      }
      console.warn("Voice letter error:", event.error);
    };

    return rec;
  }

  /* ========================================================
     SPELLING MODE — single-shot, whole-word recognition.
     Uses expectedWord to pick the best alternative.
     ======================================================== */

  /** Simple edit distance (Levenshtein) for scoring alternatives */
  function editDistance(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  /** Parse a transcript into uppercase letter array for spelling */
  function parseSpelling(transcript) {
    const raw = transcript.trim().toLowerCase();
    if (!raw) return [];

    // Try letter-by-letter first ("are oh see kay" → R O C K)
    const tokens = raw.replace(/\band\b/g, " ").replace(/,/g, " ")
      .split(/\s+/).filter(Boolean);
    const mapped = [];
    let allMapped = true;
    for (const token of tokens) {
      if (token.length === 1 && /^[a-z]$/.test(token)) {
        mapped.push(token.toUpperCase());
      } else if (LETTER_MAP[token]) {
        mapped.push(LETTER_MAP[token]);
      } else { allMapped = false; break; }
    }
    if (allMapped && mapped.length > 0) return mapped;

    // Otherwise treat as whole word
    const cleaned = raw.replace(/[^a-z]/g, "");
    return cleaned.length > 0 ? cleaned.toUpperCase().split("") : [];
  }

  function createSpellingRecognition() {
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 10; // more alternatives for better disambiguation

    rec.onresult = (event) => {
      const alts = [];
      if (event.results[0]) {
        for (let j = 0; j < event.results[0].length; j++) {
          alts.push(event.results[0][j].transcript);
        }
      }
      handleSpellingResult(alts);
    };

    rec.onend = () => {
      listening = false;
      if (stateCallback) stateCallback(false);
    };

    rec.onerror = (event) => {
      listening = false;
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Voice spelling error:", event.error);
      }
      if (stateCallback) stateCallback(false);
    };

    return rec;
  }

  /** Pick best alternative using expected word for disambiguation */
  function handleSpellingResult(alternatives) {
    // Parse all alternatives into candidate words
    const candidates = [];
    for (const t of alternatives) {
      const letters = parseSpelling(t);
      if (letters.length > 0) {
        candidates.push(letters);
      }
    }
    if (candidates.length === 0) return;

    // If we have an expected word, score by edit distance
    if (expectedWord) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < candidates.length; i++) {
        const word = candidates[i].join("");
        const dist = editDistance(word, expectedWord);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
        if (dist === 0) break; // exact match — done
      }
      if (resultCallback) resultCallback(candidates[bestIdx], currentMode);
    } else {
      // No expected word — use first (highest confidence)
      if (resultCallback) resultCallback(candidates[0], currentMode);
    }
  }

  /* --------------------------------------------------------
     Public: start / stop / toggle
     -------------------------------------------------------- */
  function start(mode) {
    if (!supported) return;
    if (listening) stop();
    currentMode = mode || currentMode;

    if (currentMode === "spelling") {
      wantContinuous = false;
      recognition = createSpellingRecognition();
    } else {
      wantContinuous = true;
      recognition = createLetterRecognition();
    }
    if (!recognition) return;
    try {
      recognition.start();
      listening = true;
      if (stateCallback) stateCallback(true);
    } catch (e) {
      console.warn("Voice start failed:", e);
      wantContinuous = false;
    }
  }

  function stop() {
    wantContinuous = false;
    if (!recognition) return;
    try { recognition.abort(); } catch (_) {}
    listening = false;
    if (stateCallback) stateCallback(false);
  }

  function toggle(mode) {
    if (listening) stop(); else start(mode);
  }

  return {
    get supported() { return supported; },
    get listening() { return listening; },
    start,
    stop,
    toggle,
    setMode(mode) { currentMode = mode; },
    /** Set expected answer word (uppercase) for spelling disambiguation */
    setExpectedWord(word) { expectedWord = (word || "").toUpperCase(); },
    /** Set which letters are valid for the current game mode */
    setValidLetters(letters) { validLetters = letters ? new Set(letters) : null; },
    onResult(cb) { resultCallback = cb; },
    onStateChange(cb) { stateCallback = cb; },
  };
})();
