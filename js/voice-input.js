/* ===================================================
   VOWEL QUEST — Voice Input System
   Uses Web Speech API (SpeechRecognition)
   Maps spoken words/sounds to letter selections
   Supports all 3 game modes: vowel, consonant, spelling
   =================================================== */

const VoiceInput = (() => {
  "use strict";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition;

  let recognition = null;
  let listening = false;
  let resultCallback = null;   // (letters: string[], mode: string) => void
  let stateCallback = null;    // (listening: boolean) => void
  let currentMode = "vowel";

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

  /* --------------------------------------------------------
     Parse transcript → array of uppercase letters
     -------------------------------------------------------- */

  /** For vowel/consonant mode: extract individual letter names from speech */
  function parseLetters(transcript) {
    const raw = transcript.trim().toLowerCase();
    if (!raw) return [];

    // First check if the whole phrase is one letter mapping
    if (LETTER_MAP[raw]) return [LETTER_MAP[raw]];

    // Split by spaces, commas, "and"
    const tokens = raw.replace(/\band\b/g, " ").replace(/,/g, " ")
      .split(/\s+/).filter(Boolean);

    const letters = [];
    for (const token of tokens) {
      if (token.length === 1 && /^[a-z]$/.test(token)) {
        letters.push(token.toUpperCase());
      } else if (LETTER_MAP[token]) {
        letters.push(LETTER_MAP[token]);
      }
      // Skip unrecognized tokens — don't fall back to raw chars
    }
    return [...new Set(letters)]; // deduplicate
  }

  /** For spelling mode: extract the word from speech */
  function parseSpelling(transcript) {
    const raw = transcript.trim().toLowerCase();
    if (!raw) return [];

    // If it sounds like individual letter names ("are oh see kay" = R O C K),
    // try mapping each token to a letter first
    const tokens = raw.replace(/\band\b/g, " ").replace(/,/g, " ")
      .split(/\s+/).filter(Boolean);

    const letterByLetter = [];
    let allMapped = true;
    for (const token of tokens) {
      if (token.length === 1 && /^[a-z]$/.test(token)) {
        letterByLetter.push(token.toUpperCase());
      } else if (LETTER_MAP[token]) {
        letterByLetter.push(LETTER_MAP[token]);
      } else {
        allMapped = false;
        break;
      }
    }

    // If every token mapped to a letter, user was spelling out loud
    if (allMapped && letterByLetter.length > 0) {
      return letterByLetter;
    }

    // Otherwise treat it as a whole word
    const cleaned = raw.replace(/[^a-z]/g, "");
    if (cleaned.length > 0) return cleaned.toUpperCase().split("");
    return [];
  }

  /* --------------------------------------------------------
     Recognition lifecycle — single-shot per mic press
     -------------------------------------------------------- */
  function createRecognition() {
    if (!supported) return null;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 5;

    rec.onresult = (event) => {
      // Collect all alternatives from the first (and only) result
      const alternatives = [];
      if (event.results[0]) {
        for (let j = 0; j < event.results[0].length; j++) {
          alternatives.push(event.results[0][j].transcript);
        }
      }

      if (currentMode === "spelling") {
        handleSpellingResult(alternatives);
      } else {
        handleLetterResult(alternatives);
      }
    };

    rec.onend = () => {
      listening = false;
      if (stateCallback) stateCallback(false);
    };

    rec.onerror = (event) => {
      listening = false;
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Voice input error:", event.error);
      }
      if (stateCallback) stateCallback(false);
    };

    return rec;
  }

  /** Vowel/Consonant mode: use FIRST alternative that yields any valid letters */
  function handleLetterResult(alternatives) {
    for (const transcript of alternatives) {
      const letters = parseLetters(transcript);
      if (letters.length > 0) {
        if (resultCallback) resultCallback(letters, currentMode);
        return;
      }
    }
    // None worked — try raw first alternative as fallback
    if (alternatives.length > 0) {
      const raw = alternatives[0].trim().toUpperCase().replace(/[^A-Z]/g, "");
      if (raw.length === 1) {
        if (resultCallback) resultCallback([raw], currentMode);
      }
    }
  }

  /** Spelling mode: use FIRST alternative that produces a clean word */
  function handleSpellingResult(alternatives) {
    for (const transcript of alternatives) {
      const letters = parseSpelling(transcript);
      if (letters.length > 0) {
        if (resultCallback) resultCallback(letters, currentMode);
        return;
      }
    }
  }

  /* --------------------------------------------------------
     Public: start / stop / toggle
     Single-shot: one recognition per click (no auto-restart)
     -------------------------------------------------------- */
  function start(mode) {
    if (!supported) return;
    if (listening) stop();
    currentMode = mode || currentMode;
    recognition = createRecognition();
    if (!recognition) return;
    try {
      recognition.start();
      listening = true;
      if (stateCallback) stateCallback(true);
    } catch (e) {
      console.warn("Voice start failed:", e);
    }
  }

  function stop() {
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
    onResult(cb) { resultCallback = cb; },
    onStateChange(cb) { stateCallback = cb; },
  };
})();
