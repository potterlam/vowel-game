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
     Covers: exact letter, phonetic name, NATO alphabet, rhymes,
     common mishears, homophones, short phrases, and words that
     start with the target sound.
     -------------------------------------------------------- */
  const LETTER_MAP = {};
  function addMap(letter, variants) {
    variants.forEach(v => { LETTER_MAP[v.toLowerCase()] = letter; });
  }

  // ── Vowels ──
  addMap("A", [
    // Core
    "a","ay","aye","eh","hey","ah","ha","aah","aaa",
    // NATO / phonetic
    "alpha","alfa",
    // Homophones & mishears
    "eight","ate","hey","hay",
    // Common words API returns for "A" sound
    "aim","age","ace","ape","aid","ale","air","arc","art","ask","add","apt","axe",
    "bay","day","fay","gay","hay","jay","kay","lay","may","nay","pay","ray","say","way","yay",
    "play","pray","stay","grey","gray","slay","clay","fray","tray","spray","stray","sway",
    // Long-A words
    "wait","late","fate","gate","hate","rate","date","mate","plate","state","great","skate",
    "name","fame","came","game","same","make","take","bake","cake","lake","wake","fake","sake",
    "shake","stake","grade","made","save","gave","wave","brave","grave","slave","shave",
    "face","place","race","space","trace","grace","base","case","chase","phase",
    "rain","pain","gain","main","brain","train","chain","plain","drain","grain","strain","spain",
    "tail","fail","mail","nail","rail","sail","jail","trail","snail",
    "weigh","weight","they","obey","okay","today","away","delay","display","essay","hooray",
    // Short sounds
    "at","an","as","am","and","ant","app","apple","animal","answer","angry","angel",
    "a.","letter a","the letter a",
  ]);
  addMap("E", [
    // Core
    "e","ee","eee","eh","he","she","we","me","be","the",
    // NATO / phonetic
    "echo",
    // Homophones & mishears
    "ye","yea","yeah","yee","yi",
    // Common words API returns for "E" sound
    "eat","each","ease","east","ear","eel","eve","even","ever","every","evil","era","equal",
    "eagle","eager","early","earth","easy","edge","else","end","enter","email","emoji","empty",
    // Long-EE words
    "free","tree","three","see","fee","knee","key","pee","tea","flee","agree","degree",
    "bee","dee","gee","lee","tee","wee","plea","flea","sea","pea",
    "seed","feed","need","reed","deed","weed","speed","bleed","breed","greed","steed",
    "deep","keep","sleep","sheep","sweep","creep","steep","jeep","beep","peep","seep","weep",
    "deal","real","meal","seal","heal","steal","feel","heel","peel","reel","steel","wheel",
    "mean","lean","clean","bean","dean","jean","green","screen","queen","keen","seen","teen",
    "sheet","meet","feet","sweet","street","beat","heat","seat","neat","treat","wheat","cheat",
    "leaf","leaf","beach","reach","teach","peach","leach",
    "dream","cream","stream","team","beam","steam","gleam",
    "brief","chief","thief","piece","peace","feast","least","beast","priest",
    "ski","debris",
    // Short-E words
    "bed","red","led","fed","shed","bread","head","dead","said","read","thread","spread",
    "set","get","let","met","net","pet","wet","bet","jet","yet","vet",
    "best","rest","test","west","nest","chest","quest","guest","fest","vest",
    "bell","cell","dell","fell","hell","sell","tell","well","yell","shell","spell","smell","dwell",
    "ten","pen","hen","den","men","then","when","blend","trend","friend","spend",
    "e.","letter e","the letter e",
  ]);
  addMap("I", [
    // Core
    "i","eye","aye","hi","high",
    // NATO / phonetic
    "india",
    // Homophones & mishears
    "ai","i'm","i'll","i've","i'd",
    // Common words API returns for "I" sound
    "ice","eyes","isle","aisle","iron","idea","item","ivory","ivy","idle",
    // Long-I words (say "I" and API hears these)
    "buy","by","my","tie","die","lie","pie","guy","fly","try","cry","dry","fry","sky","spy","shy",
    "sigh","thigh","apply","reply","supply","deny","rely","comply","imply","ally","july",
    "night","right","light","sight","might","fight","tight","knight","bright","flight","fright","slight","height",
    "like","bike","hike","mike","strike","spike","hike",
    "time","dime","lime","mine","fine","line","nine","wine","vine","pine","dine","sign","shine","spine","divine","combine",
    "side","hide","ride","wide","guide","pride","slide","bride","tide","stride","provide","decide","inside","outside",
    "five","dive","drive","live","alive","arrive","thrive","survive",
    "white","write","quite","bite","kite","site","lite","spite","invite","polite","ignite","excite","recite",
    "life","wife","knife","strife",
    "fire","hire","wire","tire","desire","inspire","require","admire",
    "mile","smile","while","file","tile","pile","style","aisle",
    "kind","mind","find","wind","blind","behind","remind","grind",
    "type","pipe","ripe","wipe","swipe","stripe",
    "nice","price","rice","dice","mice","twice","slice","spice","advice","device",
    "child","wild","mild",
    "climb","island",
    // Short-I words
    "bit","sit","fit","hit","kit","lit","pit","wit","grit","spit","quit","knit","split",
    "big","dig","fig","pig","rig","wig","gig","jig","twig",
    "bill","fill","hill","kill","mill","pill","will","till","still","skill","drill","grill","thrill","chill","spill",
    "win","bin","din","fin","gin","pin","sin","tin","thin","chin","grin","spin","twin","begin","within",
    "is","it","if","in","his","this","did","hid","kid","lid","bid","rid","grid","slid",
    "dish","fish","wish","rich","which","pitch","switch","ditch","stitch",
    "i.","letter i","the letter i",
  ]);
  addMap("O", [
    // Core
    "o","oh","ooh","oooh","ohhh","ow",
    // NATO / phonetic
    "oscar",
    // Homophones & mishears
    "owe","eau","awe","whoa","yo",
    // Common words API returns for "O" sound
    "or","on","own","old","only","over","oak","oat","oath","oil","open","ocean","omit","orange","order","other",
    // Long-O words
    "go","no","so","low","know","show","flow","grow","blow","slow","snow","throw","glow","crow","row","bow","tow","mow","sow",
    "toe","foe","hoe","joe","doe","woe","roe","aloe",
    "home","bone","tone","zone","cone","phone","stone","alone","throne","clone","drone","ozone","postpone",
    "note","vote","quote","wrote","code","mode","node","rode","role","hole","pole","sole","whole","stole","mole","goal",
    "hope","rope","cope","pope","slope","scope","elope",
    "nose","rose","chose","close","those","pose","dose","froze","prose",
    "joke","broke","spoke","stroke","smoke","woke","poke","coke","choke","folk",
    "road","load","toad",
    "boat","coat","goat","float","throat",
    "cold","gold","hold","bold","fold","told","sold","old","mold","scold",
    "most","post","host","ghost","coast","toast","roast","boast",
    "both","cloth",
    "door","floor","four","pour","more","core","bore","sore","store","score","shore","ignore","explore","before",
    "zero","hero","below","follow","yellow","window","elbow","shadow","pillow","hollow","borrow","tomorrow",
    // Short-O words
    "hot","not","got","lot","pot","dot","rot","shot","spot","slot","knot","plot","trot",
    "box","fox","rock","lock","clock","block","knock","shock","stock","sock","dock","mock",
    "top","pop","stop","drop","hop","cop","shop","crop","chop","prop","flop",
    "dog","fog","log","frog","blog","jog",
    "off","soft","lost","cost","cross","boss","toss","moss","frost",
    "o.","letter o","the letter o",
  ]);
  addMap("U", [
    // Core
    "u","you","yu","ew","oo","ooh",
    // NATO / phonetic
    "uniform",
    // Homophones & mishears
    "yoo","yew","ewe","who","hue","queue","cue",
    // Common words API returns for "U" sound
    "use","used","user","us","up","under","until","upon","unit","union","unique","universe","university",
    // Long-U / OO words
    "new","few","view","due","sue","true","blue","clue","glue","pursue","review","issue","value","argue","continue",
    "grew","drew","flew","knew","blew","threw","crew","brew","stew","chew","screw",
    "huge","cube","tube","cute","mute","duke","rule","rude","dude","nude","crude","prude","lude","include","exclude",
    "mood","food","cool","pool","tool","school","fool","drool","spool","stool",
    "room","moon","soon","noon","spoon","bloom","broom","groom","zoom","boom","doom","loom","gloom","mushroom",
    "too","two","do","to","who","shoe","move","prove","lose","choose","approve","improve","remove","groove",
    "fruit","suit","juice","cruise","bruise","recruit",
    "truth","youth","tooth","smooth","booth","roof","proof","hoof","goof","spoof","aloof",
    "loop","soup","group","troop","scoop","swoop","stoop","droop",
    "you're","your","you'd","you'll","you've",
    // Short-U words
    "but","cut","gut","hut","jut","nut","put","rut","shut","strut",
    "bug","dug","hug","jug","mug","rug","tug","plug","slug","drug","shrug","snug",
    "bus","fuss","plus","thus","must","just","dust","gust","rust","trust","crust","adjust",
    "fun","gun","nun","pun","run","sun","bun","done","none","one","won","son","ton","stun","spun",
    "cup","pup","sup","up",
    "luck","duck","muck","puck","suck","tuck","truck","stuck","struck","pluck","chuck",
    "bump","dump","hump","jump","lump","pump","stump","trump","clump","grump",
    "lunch","bunch","punch","crunch","munch",
    "u.","letter u","the letter u",
  ]);

  // ── Consonants ──
  addMap("B", [
    // Core & phonetic
    "b","be","bee","bravo",
    // Homophones
    "bead","bean","beach","beam","bear","beat","beef","beer","beard","beast","bees","beep","beet","being",
    "boy","ball","bat","bad","bag","ban","bar","bed","bell","belt","bench","bend","best","bet","bid","big",
    "bill","bird","black","blade","blame","blank","blast","blend","bless","blind","block","blood","blow","board",
    "b.","letter b","the letter b",
  ]);
  addMap("C", [
    // Core & phonetic
    "c","see","sea","charlie",
    // Homophones & mishears
    "si","ce","seed","seen","seal","seat","seem","seek","seize","scene","screen","seeing",
    "cedar","ceiling","cellar","center","central","certain","cease","celebrate",
    "c.","letter c","the letter c",
  ]);
  addMap("D", [
    // Core & phonetic
    "d","dee","delta",
    // Homophones
    "deal","dean","dear","deep","deed","deem","deer","degree",
    "d.","letter d","the letter d",
  ]);
  addMap("F", [
    // Core & phonetic
    "f","ef","eff","foxtrot",
    // Homophones & mishears
    "if","off","half","Jeff","deaf","chef","shelf","self",
    "effort","effect","after",
    "f.","letter f","the letter f",
  ]);
  addMap("G", [
    // Core & phonetic
    "g","gee","jee","golf",
    // Homophones
    "geek","gene","genie","jeep","genius","gentle","general","geography",
    "g.","letter g","the letter g",
  ]);
  addMap("H", [
    // Core & phonetic
    "h","aitch","hotel",
    // Homophones & mishears
    "ach","ache","age","each","8","h8",
    "edge","etch","ash","hatch","match","catch","latch","patch","watch",
    "h.","letter h","the letter h",
  ]);
  addMap("J", [
    // Core & phonetic
    "j","jay","juliet",
    // Homophones
    "jade","jail","jane","james","jake","jam","jar","jazz","jet","job","join","joke","joy","judge","jump",
    "j.","letter j","the letter j",
  ]);
  addMap("K", [
    // Core & phonetic
    "k","kay","kilo",
    // Homophones & mishears
    "okay","ok","kate","cake","keep","keen","kick","kid","kill","kind","king","kiss","kite","knit","know",
    "que","kei",
    "k.","letter k","the letter k",
  ]);
  addMap("L", [
    // Core & phonetic
    "l","el","ell","lima",
    // Homophones
    "ale","all","else","elf","elm","elbow","elegant","element","elephant","eleven","elevator","elite",
    "l.","letter l","the letter l",
  ]);
  addMap("M", [
    // Core & phonetic
    "m","em","mike",
    // Homophones & mishears
    "am","aim","elm","arm","um","mmm","hmm",
    "m.","letter m","the letter m",
  ]);
  addMap("N", [
    // Core & phonetic
    "n","en","november",
    // Homophones & mishears
    "an","in","and","end","inn","any","engine","enter","enjoy","enough","enemy","energy","entire","envelope",
    "n.","letter n","the letter n",
  ]);
  addMap("P", [
    // Core & phonetic
    "p","pee","papa",
    // Homophones
    "pe","pea","peak","peace","peel","peep","peer","people","period","person","piece",
    "p.","letter p","the letter p",
  ]);
  addMap("Q", [
    // Core & phonetic
    "q","queue","cue","quebec",
    // Homophones
    "cute","cube","kyu","q-tip","quest","question","quick","quiet","quite","quiz",
    "q.","letter q","the letter q",
  ]);
  addMap("R", [
    // Core & phonetic
    "r","are","ar","romeo",
    // Homophones & mishears
    "our","or","err","her","art","ark","arm","arch","argue",
    "r.","letter r","the letter r",
  ]);
  addMap("S", [
    // Core & phonetic
    "s","es","sierra",
    // Homophones & mishears
    "as","ass","ace","ice","yes","guess","less","mess","dress","press","stress","bless","excess",
    "s.","letter s","the letter s",
  ]);
  addMap("T", [
    // Core & phonetic
    "t","tee","tea","tango",
    // Homophones
    "te","teen","team","teeth","teal","tear","teach","teacher",
    "t.","letter t","the letter t",
  ]);
  addMap("V", [
    // Core & phonetic
    "v","vee","victor",
    // Homophones & mishears
    "ve","vie","via","very","voice","van","vet","vine","visa","visit","vote","vow",
    "v.","letter v","the letter v",
  ]);
  addMap("W", [
    // Core & phonetic
    "w","double u","double you","whiskey","doubleyou",
    // Homophones
    "dub","double","w.","letter w","the letter w",
  ]);
  addMap("X", [
    // Core & phonetic
    "x","ex","x-ray","xray",
    // Homophones & mishears
    "eggs","acts","axe","ax","hex","next","text","flex","rex","sex","six","mix","fix",
    "x.","letter x","the letter x",
  ]);
  addMap("Y", [
    // Core & phonetic
    "y","why","wye","yankee",
    // Homophones & mishears (note: many Y-sounds overlap with I)
    "wise","wild","wind","wing","will","with","wish","which","witch","width",
    "yard","yarn","yawn","year","yell","yes","yet","yield","yoke","young",
    "y.","letter y","the letter y",
  ]);
  addMap("Z", [
    // Core & phonetic
    "z","zed","zee","zulu",
    // Homophones & mishears
    "said","zeal","zen","zip","zone","zoo","zero","zigzag","zinc","zombie","zap",
    "z.","letter z","the letter z",
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

    // Track which letters we've already fired for the current segment
    // so growing transcripts ("I" → "I India" → "I India hi") only
    // fire "I" once, not three times.
    const firedLetters = new Set();

    rec.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      if (!latest || latest.length === 0) return;

      const isFinal = latest.isFinal;

      // Collect alternatives for this segment
      const alts = [];
      for (let j = 0; j < latest.length; j++) {
        alts.push(latest[j].transcript);
      }

      // Parse all alternatives, merge letters
      const allLetters = new Set();
      for (const t of alts) {
        for (const l of parseLetters(t)) allLetters.add(l);
      }

      // Only fire letters we haven't already fired for this segment
      const newLetters = [...allLetters].filter(l => !firedLetters.has(l));
      if (newLetters.length > 0) {
        newLetters.forEach(l => firedLetters.add(l));
        console.log("[Voice]", isFinal ? "FINAL" : "interim",
          JSON.stringify(alts[0]), "→", newLetters.join(","));
        if (resultCallback) resultCallback(newLetters, currentMode);
      }

      // On final, reset tracking for next utterance
      if (isFinal) firedLetters.clear();
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
