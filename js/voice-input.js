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
  let onResult = null;   // callback: (letters: string[]) => void
  let onStateChange = null; // callback: (listening: boolean) => void
  let currentMode = "vowel"; // "vowel" | "consonant" | "spelling"

  /* --------------------------------------------------------
     PRONUNCIATION MAP
     Maps spoken sounds → letter(s). Each key is a lowercase
     transcript token; value is the uppercase letter it means.
     Includes phonetic names, NATO alphabet, common mishears,
     and extended pronunciations (oh→O, ooh→O, etc.)
     -------------------------------------------------------- */
  const LETTER_MAP = {};

  function addMappings(letter, variants) {
    variants.forEach(v => { LETTER_MAP[v.toLowerCase()] = letter.toUpperCase(); });
  }

  // Vowels — extensive pronunciation mappings
  addMappings("A", [
    "a", "ay", "aye", "eh", "hey", "alpha",
    "ae", "aay", "aey", "ah",
  ]);
  addMappings("E", [
    "e", "ee", "eee", "echo",
    "ea", "ie", "ey",
  ]);
  addMappings("I", [
    "i", "eye", "ai", "india",
    "aye aye", "ih",
  ]);
  addMappings("O", [
    "o", "oh", "ooh", "oooh", "ohhh", "oo",
    "oscar", "owe",
  ]);
  addMappings("U", [
    "u", "you", "yu", "ew", "uniform",
    "ooh", // note: "ooh" could be O or U — we default O, handle in context
    "yoo", "yew",
  ]);

  // Consonants — phonetic, NATO, and common mishears
  addMappings("B", ["b", "be", "bee", "bravo", "bee"]);
  addMappings("C", ["c", "see", "sea", "charlie", "si", "ce"]);
  addMappings("D", ["d", "dee", "delta", "the"]);
  addMappings("F", ["f", "ef", "eff", "foxtrot", "ph"]);
  addMappings("G", ["g", "gee", "jee", "golf"]);
  addMappings("H", ["h", "aitch", "ach", "hotel", "age"]);
  addMappings("J", ["j", "jay", "juliet", "jey"]);
  addMappings("K", ["k", "kay", "kilo", "key"]);
  addMappings("L", ["l", "el", "ell", "lima"]);
  addMappings("M", ["m", "em", "mike", "am"]);
  addMappings("N", ["n", "en", "november", "an"]);
  addMappings("P", ["p", "pee", "papa", "pe"]);
  addMappings("Q", ["q", "queue", "cue", "quebec", "kyu"]);
  addMappings("R", ["r", "are", "ar", "romeo", "ah"]);
  addMappings("S", ["s", "es", "sierra", "ass"]);
  addMappings("T", ["t", "tee", "tea", "tango"]);
  addMappings("V", ["v", "vee", "victor", "ve"]);
  addMappings("W", ["w", "double u", "double you", "whiskey", "doubleyou"]);
  addMappings("X", ["x", "ex", "x-ray", "xray", "eggs"]);
  addMappings("Y", ["y", "why", "wye", "yankee"]);
  addMappings("Z", ["z", "zed", "zee", "zulu", "said"]);

  /* --------------------------------------------------------
     Parse transcript into letters
     Handles single-letter, multi-letter, and full-word input
     -------------------------------------------------------- */
  function parseTranscript(transcript) {
    const raw = transcript.trim().toLowerCase();
    if (!raw) return [];

    const letters = [];

    // For spelling mode: if the transcript looks like a whole word, return it as-is
    if (currentMode === "spelling") {
      // Try to match as a single word first (common for spelling mode)
      const cleaned = raw.replace(/[^a-z]/g, "");
      if (cleaned.length > 0) {
        return cleaned.toUpperCase().split("");
      }
    }

    // Split by spaces, commas, "and"
    const tokens = raw
      .replace(/\band\b/g, " ")
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    for (const token of tokens) {
      // Direct single letter (a-z)
      if (token.length === 1 && /^[a-z]$/.test(token)) {
        letters.push(token.toUpperCase());
        continue;
      }

      // Check pronunciation map
      if (LETTER_MAP[token]) {
        letters.push(LETTER_MAP[token]);
        continue;
      }

      // Handle multi-word mappings (e.g. "double u" → W)
      // Already handled in token splitting but check compound
      const compound = token.replace(/\s+/g, " ");
      if (LETTER_MAP[compound]) {
        letters.push(LETTER_MAP[compound]);
        continue;
      }
    }

    // Also check the whole raw string for compound phrases
    if (letters.length === 0) {
      if (LETTER_MAP[raw]) {
        letters.push(LETTER_MAP[raw]);
      } else {
        // Last resort: treat each character as a letter
        const chars = raw.replace(/[^a-z]/g, "").toUpperCase().split("");
        return chars;
      }
    }

    // Deduplicate for vowel/consonant modes (selecting unique letters)
    if (currentMode !== "spelling") {
      return [...new Set(letters)];
    }

    return letters;
  }

  /* --------------------------------------------------------
     Start / Stop recognition
     -------------------------------------------------------- */
  function createRecognition() {
    if (!supported) return null;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 5;

    rec.onresult = (event) => {
      const results = [];
      for (let i = 0; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          results.push(event.results[i][j].transcript);
        }
      }

      // Try all alternatives, pick the one that produces the most valid letters
      let bestLetters = [];
      for (const transcript of results) {
        const parsed = parseTranscript(transcript);
        if (parsed.length > bestLetters.length) {
          bestLetters = parsed;
        }
      }

      if (bestLetters.length > 0 && onResult) {
        onResult(bestLetters);
      }
    };

    rec.onend = () => {
      listening = false;
      if (onStateChange) onStateChange(false);
    };

    rec.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Voice input error:", event.error);
      }
      listening = false;
      if (onStateChange) onStateChange(false);
    };

    return rec;
  }

  function start(mode) {
    if (!supported) return;
    if (listening) stop();
    currentMode = mode || currentMode;
    recognition = createRecognition();
    if (!recognition) return;
    try {
      recognition.start();
      listening = true;
      if (onStateChange) onStateChange(true);
    } catch (e) {
      console.warn("Voice start failed:", e);
    }
  }

  function stop() {
    if (!recognition) return;
    try {
      recognition.abort();
    } catch (_) {}
    listening = false;
    if (onStateChange) onStateChange(false);
  }

  function toggle(mode) {
    if (listening) {
      stop();
    } else {
      start(mode);
    }
  }

  /* --------------------------------------------------------
     Public API
     -------------------------------------------------------- */
  return {
    get supported() { return supported; },
    get listening() { return listening; },
    start,
    stop,
    toggle,
    setMode(mode) { currentMode = mode; },
    onResult(cb) { onResult = cb; },
    onStateChange(cb) { onStateChange = cb; },
    parseTranscript, // exported for testing
  };
})();
