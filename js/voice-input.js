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

  /* --------------------------------------------------------
     PRONUNCIATION MAP — spoken sound → uppercase letter
     -------------------------------------------------------- */
  const LETTER_MAP = {};
  function addMap(letter, variants) {
    variants.forEach(v => { LETTER_MAP[v.toLowerCase()] = letter; });
  }

  // Vowels
  addMap("A", ["a","ay","aye","eh","hey","alpha","ah","aay","eight"]);
  addMap("E", ["e","ee","eee","echo","he"]);
  addMap("I", ["i","eye","ai","india"]);
  addMap("O", ["o","oh","ooh","oooh","ohhh","oscar","owe","eau"]);
  addMap("U", ["u","you","yu","ew","uniform","yoo","yew","ooh"]);

  // Consonants
  addMap("B", ["b","be","bee","bravo"]);
  addMap("C", ["c","see","sea","charlie","si","ce"]);
  addMap("D", ["d","dee","delta"]);
  addMap("F", ["f","ef","eff","foxtrot"]);
  addMap("G", ["g","gee","jee","golf"]);
  addMap("H", ["h","aitch","hotel","age","ach"]);
  addMap("J", ["j","jay","juliet"]);
  addMap("K", ["k","kay","kilo","okay"]);
  addMap("L", ["l","el","ell","lima"]);
  addMap("M", ["m","em","mike"]);
  addMap("N", ["n","en","november"]);
  addMap("P", ["p","pee","papa"]);
  addMap("Q", ["q","queue","cue","quebec"]);
  addMap("R", ["r","are","ar","romeo"]);
  addMap("S", ["s","es","sierra"]);
  addMap("T", ["t","tee","tea","tango"]);
  addMap("V", ["v","vee","victor"]);
  addMap("W", ["w","double u","double you","whiskey","doubleyou"]);
  addMap("X", ["x","ex","x-ray","xray"]);
  addMap("Y", ["y","why","wye","yankee"]);
  addMap("Z", ["z","zed","zee","zulu"]);

  /* ========================================================
     LETTER MODE  — vowel / consonant
     Continuous listening, short detection window.
     Each speech result fires one toggle then auto-restarts.
     ======================================================== */

  /** Parse transcript into deduplicated letter array */
  function parseLetters(transcript) {
    const raw = transcript.trim().toLowerCase();
    if (!raw) return [];
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
    // If nothing matched from map, try treating each raw char as a letter
    if (letters.length === 0) {
      const ch = raw.replace(/[^a-z]/g, "");
      if (ch.length === 1) letters.push(ch.toUpperCase());
    }
    return [...new Set(letters)];
  }

  function createLetterRecognition() {
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = true;       // stay open — no restart gaps
    rec.interimResults = true;   // get partial results for faster feedback
    rec.maxAlternatives = 5;

    // Track which result indices we already processed
    let processedUpTo = 0;

    rec.onresult = (event) => {
      for (let i = processedUpTo; i < event.results.length; i++) {
        const result = event.results[i];

        // Only act on final (confirmed) segments
        if (!result.isFinal) continue;
        processedUpTo = i + 1;

        // Collect alternatives for this segment
        const alts = [];
        for (let j = 0; j < result.length; j++) {
          alts.push(result[j].transcript);
        }

        // Use first alternative that yields valid letters
        for (const t of alts) {
          const letters = parseLetters(t);
          if (letters.length > 0) {
            if (resultCallback) resultCallback(letters, currentMode);
            break;
          }
        }
      }
    };

    rec.onend = () => {
      // If user still wants to listen, restart (browser may stop continuous)
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
      if (event.error === "no-speech") {
        // Browser fires no-speech after ~5s silence in continuous mode;
        // onend will auto-restart if wantContinuous is true
        return;
      }
      if (event.error === "aborted") return;
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
    onResult(cb) { resultCallback = cb; },
    onStateChange(cb) { stateCallback = cb; },
  };
})();
