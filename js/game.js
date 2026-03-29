/* ===================================================
   VOWEL QUEST — Game Engine  v3
   Modules: audio.js, particles.js, voice-input.js, i18n.js, questions.js
   This file: game logic, UI, state management
   =================================================== */

(function () {
  "use strict";

  /* ---------- Module aliases ---------- */
  const { ensureAudio, SFX, BGM } = GameAudio;
  const spawnParticles = GameParticles.spawn;
  const confettiBurst = GameParticles.confettiBurst;
  const showScorePopup = GameParticles.showScorePopup;

  /* ---------- Constants ---------- */
  const VOWELS = ["A", "E", "I", "O", "U"];
  const CONSONANTS = ["B","C","D","F","G","H","J","K","L","M","N","P","Q","R","S","T","V","W","X","Y","Z"];
  const Q_PER_LEVEL = 5;
  const MAX_LIVES = 3;
  const BOSS_TIMER = 90;
  const PTS_CORRECT = 100;
  const PTS_FIRST_TRY = 50;
  const PTS_BOSS_MULTI = 2;
  const FEEDBACK_DELAY = 1500;

  /* ---------- DOM refs ---------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const screens = {
    title: $("#title-screen"),
    story: $("#story-screen"),
    map: $("#map-screen"),
    game: $("#game-screen"),
    complete: $("#complete-screen"),
    victory: $("#victory-screen"),
    gameover: $("#gameover-screen"),
  };

  /* ---------- Game State ---------- */
  const state = {
    mode: "vowel",         // "vowel", "consonant", or "spelling"
    currentLevel: 1,
    currentQ: 0,
    score: 0,
    levelScore: 0,
    levelCorrect: 0,
    levelMistakes: 0,
    lives: MAX_LIVES,
    selectedLetters: new Set(),
    answered: false,
    stars: {},
    completedLevels: new Set(),
    bossHP: Q_PER_LEVEL,
    bossTimer: BOSS_TIMER,
    bossInterval: null,
    soundOn: true,
    firstTry: true,
    hintOn: true,          // show word by default
    levelQuestions: [],     // randomly picked questions for current level
  };

  /* Companion messages — now driven by i18n */

  /* ---------- Sync audio module with game state ---------- */
  function syncAudio() {
    GameAudio.soundEnabled = state.soundOn;
  }

  /* ============================
     TEXT-TO-SPEECH
     ============================ */
  function speakWord(word) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "en-US";
    utter.rate = 0.85;
    utter.pitch = 1.0;
    utter.volume = state.soundOn ? 1 : 0;
    const btn = $("#tts-btn");
    btn.classList.add("speaking");
    utter.onend = () => btn.classList.remove("speaking");
    utter.onerror = () => btn.classList.remove("speaking");
    window.speechSynthesis.speak(utter);
  }

  /* ---------- Slash effect helper ---------- */
  function showSlashEffect() {
    GameParticles.showSlashEffect($("#boss-hud"));
  }

  /* ============================
     SCREEN MANAGEMENT
     ============================ */
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");

    // BGM mood changes per screen
    if (state.soundOn) {
      if (name === "title" || name === "map" || name === "story" ||
          name === "complete" || name === "victory") {
        BGM.play("title");
      } else if (name === "game") {
        // Boss mood is set separately in startLevel
        BGM.play("game");
      } else if (name === "gameover") {
        BGM.stop();
      }
    }
  }

  /* ============================
     SAVE / LOAD
     ============================ */
  function saveKey() {
    if (state.mode === "consonant") return "vowelquest_cons_save";
    if (state.mode === "spelling") return "vowelquest_spell_save";
    return "vowelquest_save";
  }

  function saveProgress() {
    const data = {
      currentLevel: state.currentLevel,
      score: state.score,
      stars: state.stars,
      completedLevels: [...state.completedLevels],
      soundOn: state.soundOn,
      hintOn: state.hintOn,
      mode: state.mode,
    };
    try { localStorage.setItem(saveKey(), JSON.stringify(data)); } catch (_) {}
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(saveKey());
      if (!raw) return false;
      const d = JSON.parse(raw);
      state.currentLevel = d.currentLevel || 1;
      state.score = d.score || 0;
      state.stars = d.stars || {};
      state.completedLevels = new Set(d.completedLevels || []);
      if (d.soundOn !== undefined) state.soundOn = d.soundOn;
      if (d.hintOn !== undefined) state.hintOn = d.hintOn;
      return state.currentLevel > 1 || state.completedLevels.size > 0;
    } catch (_) { return false; }
  }

  function resetProgress() {
    state.currentLevel = 1;
    state.score = 0;
    state.stars = {};
    state.completedLevels = new Set();
    try { localStorage.removeItem(saveKey()); } catch (_) {}
  }

  /* ============================
     RANDOM QUESTION PICKER
     ============================ */
  function pickRandomQuestions(levelId, count) {
    const pool = QUESTIONS.filter(q => q.level === levelId);
    // Shuffle Fisher-Yates
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  /* ============================
     LETTER CHOICES BUILDER
     ============================ */
  function getTargetLetters(q) {
    if (state.mode === "consonant") return q.consonants;
    if (state.mode === "spelling") return q.word.split(""); // full word
    return q.vowels;
  }

  function buildLetterButtons() {
    const container = $("#letter-choices");
    const letterPanel = $("#letter-panel");
    const spellingPanel = $("#spelling-panel");
    container.innerHTML = "";

    if (state.mode === "spelling") {
      // Hide letter buttons, show spelling panel
      letterPanel.classList.add("hidden");
      spellingPanel.classList.remove("hidden");
      $("#spelling-input").value = "";
      state.spelledLetters = [];
      renderSpellingTiles();
      // Highlight expected first letter on A-Z keyboard
      setTimeout(highlightExpectedKey, 50);
      return;
    }

    // Show letter buttons, hide text input
    letterPanel.classList.remove("hidden");
    spellingPanel.classList.add("hidden");

    if (state.mode === "vowel") {
      container.classList.remove("consonant-mode");
      VOWELS.forEach(v => {
        const btn = document.createElement("button");
        btn.className = "vowel-btn";
        btn.dataset.letter = v;
        btn.textContent = v;
        container.appendChild(btn);
      });
      $("#panel-label").textContent = t("panelVowel");
    } else {
      container.classList.add("consonant-mode");
      CONSONANTS.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "vowel-btn";
        btn.dataset.letter = c;
        btn.textContent = c;
        container.appendChild(btn);
      });
      $("#panel-label").textContent = t("panelCons");
    }

    // Attach click handlers
    $$(".vowel-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (state.answered) return;
        SFX.select();
        const v = btn.dataset.letter;
        if (state.selectedLetters.has(v)) {
          state.selectedLetters.delete(v);
          btn.classList.remove("selected");
        } else {
          state.selectedLetters.add(v);
          btn.classList.add("selected");
        }
        highlightLetters();
      });
    });
  }

  /* ============================
     TITLE SCREEN
     ============================ */
  function initTitle() {
    loadProgress();
    syncAudio();
    // Always show continue — lets player jump to map from any mode
    $("#continue-btn").classList.remove("hidden");
    updateSoundBtn();
    updateModeButtons();
  }

  function updateSoundBtn() {
    $("#sound-toggle").textContent = state.soundOn ? "🔊" : "🔇";
  }

  function updateModeButtons() {
    const vBtn = $("#mode-vowel");
    const cBtn = $("#mode-consonant");
    const sBtn = $("#mode-spelling");
    [vBtn, cBtn, sBtn].forEach(b => b.classList.remove("active-mode"));
    if (state.mode === "vowel") vBtn.classList.add("active-mode");
    else if (state.mode === "consonant") cBtn.classList.add("active-mode");
    else sBtn.classList.add("active-mode");
  }

  $("#mode-vowel").addEventListener("click", () => {
    state.mode = "vowel";
    updateModeButtons();
    loadProgress(); // reload correct save
    initTitle();
    SFX.select();
  });

  $("#mode-consonant").addEventListener("click", () => {
    state.mode = "consonant";
    updateModeButtons();
    loadProgress();
    initTitle();
    SFX.select();
  });

  $("#mode-spelling").addEventListener("click", () => {
    state.mode = "spelling";
    updateModeButtons();
    loadProgress();
    initTitle();
    SFX.select();
  });

  $("#start-btn").addEventListener("click", () => {
    ensureAudio();
    SFX.select();
    if (state.soundOn) BGM.play("title");
    resetProgress();
    state.currentLevel = 1;
    showStoryForLevel(1);
  });

  $("#continue-btn").addEventListener("click", () => {
    ensureAudio();
    SFX.select();
    if (state.soundOn) BGM.play("title");
    showMapScreen();
  });

  $("#sound-toggle").addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    syncAudio();
    updateSoundBtn();
    saveProgress();
    if (state.soundOn) {
      ensureAudio();
      SFX.select();
      BGM.play("title");
    } else {
      BGM.stop();
    }
  });

  /* ============================
     STORY SCREEN
     ============================ */
  let typewriterInterval = null;

  function showStoryForLevel(lvlId) {
    const level = LEVELS.find(l => l.id === lvlId);
    if (!level) { showMapScreen(); return; }
    $("#story-character").textContent = level.emoji;
    const full = tLevel(lvlId, "intro");
    const el = $("#story-text");
    el.textContent = "";
    let i = 0;
    if (typewriterInterval) clearInterval(typewriterInterval);
    typewriterInterval = setInterval(() => {
      el.textContent += full[i];
      i++;
      if (i >= full.length) clearInterval(typewriterInterval);
    }, 22);
    showScreen("story");
  }

  $("#story-continue-btn").addEventListener("click", () => {
    if (typewriterInterval) clearInterval(typewriterInterval);
    SFX.select();
    startLevel(state.currentLevel);
  });

  /* ============================
     MAP SCREEN
     ============================ */
  function showMapScreen() {
    renderMap();
    showScreen("map");
  }

  function renderMap() {
    const map = $("#level-map");
    map.innerHTML = "";

    const totalQ = LEVELS.length * Q_PER_LEVEL;
    const doneQ = state.completedLevels.size * Q_PER_LEVEL;
    const pct = (state.completedLevels.size / LEVELS.length) * 100;
    $("#progress-fill").style.width = pct + "%";
    $("#progress-text").textContent = `${doneQ} / ${totalQ}`;
    $("#total-score").textContent = state.score;
    $("#mode-badge-display").textContent = state.mode === "vowel" ? t("badgeVowel") : state.mode === "consonant" ? t("badgeCons") : t("badgeSpell");

    LEVELS.forEach(lvl => {
      const node = document.createElement("div");
      node.className = "level-node";

      const isCompleted = state.completedLevels.has(lvl.id);
      const isCurrent = lvl.id === state.currentLevel && !isCompleted;
      const isUnlocked = lvl.id <= state.currentLevel;

      if (isCompleted) node.classList.add("completed");
      else if (isCurrent) node.classList.add("current", "unlocked");
      else if (isUnlocked) node.classList.add("unlocked");
      else node.classList.add("locked");

      const starCount = state.stars[lvl.id] || 0;
      const starsHTML = [1,2,3].map(s =>
        `<span class="${s <= starCount ? '' : 'star-empty'}">⭐</span>`
      ).join("");

      node.innerHTML = `
        <div class="level-emoji">${lvl.emoji}</div>
        <div class="level-info-text">
          <h3>${lvl.id}. ${tLevel(lvl.id, "name")}${lvl.isBoss ? " ⚡" : ""}</h3>
          <p>${tLevel(lvl.id, "desc")}</p>
        </div>
        <div class="level-stars">${starsHTML}</div>
      `;

      if (isUnlocked || isCompleted) {
        node.addEventListener("click", () => {
          SFX.select();
          state.currentLevel = lvl.id;
          showStoryForLevel(lvl.id);
        });
      }

      map.appendChild(node);
    });
  }

  /* ============================
     HINT TOGGLE
     ============================ */
  function updateHintUI() {
    const btn = $("#hint-toggle");
    const letters = $("#word-letters");
    if (state.hintOn) {
      btn.classList.add("hint-on");
      btn.querySelector(".hint-label").textContent = t("hintHide");
      letters.classList.remove("hidden-hint");
    } else {
      btn.classList.remove("hint-on");
      btn.querySelector(".hint-label").textContent = t("hintShow");
      letters.classList.add("hidden-hint");
    }
  }

  $("#hint-toggle").addEventListener("click", () => {
    state.hintOn = !state.hintOn;
    updateHintUI();
    SFX.select();
  });

  /* ============================
     COMPANION FAIRY
     ============================ */
  function showCompanionTip() {
    const key = state.mode === "vowel" ? "companionVowel" : state.mode === "consonant" ? "companionCons" : "companionSpell";
    const tips = t(key) || [];
    if (!tips.length) return;
    const msg = tips[Math.floor(Math.random() * tips.length)];
    const el = $("#companion-msg");
    el.textContent = msg;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3000);
  }

  /* ============================
     GAME SCREEN
     ============================ */
  function startLevel(lvlId) {
    const level = LEVELS.find(l => l.id === lvlId);
    state.currentLevel = lvlId;
    state.currentQ = 0;
    state.levelScore = 0;
    state.levelCorrect = 0;
    state.levelMistakes = 0;
    state.lives = MAX_LIVES;
    state.answered = false;
    state.firstTry = true;

    // Pick random questions for this level
    state.levelQuestions = pickRandomQuestions(lvlId, Q_PER_LEVEL);

    // Build letter buttons for current mode
    buildLetterButtons();

    // HUD
    $("#level-label").textContent = tLevel(lvlId, "name");
    updateLives();
    updateHintUI();

    // Boss setup
    const bossHud = $("#boss-hud");
    if (level.isBoss) {
      bossHud.classList.remove("hidden");
      state.bossHP = Q_PER_LEVEL;
      state.bossTimer = level.timerSeconds || BOSS_TIMER;
      updateBossHUD();
      startBossTimer();
    } else {
      bossHud.classList.add("hidden");
      clearBossTimer();
    }

    showScreen("game");
    // Switch to boss BGM for boss levels
    if (level.isBoss) BGM.setMood("boss");
    showCompanionTip();
    loadQuestion();
  }

  function loadQuestion() {
    if (state.currentQ >= state.levelQuestions.length) {
      completeLevel();
      return;
    }
    const q = state.levelQuestions[state.currentQ];
    state.answered = false;
    state.firstTry = true;
    state.selectedLetters.clear();

    // Progress
    $("#q-progress").textContent = `${state.currentQ + 1} / ${Q_PER_LEVEL}`;
    $("#game-score").textContent = state.score + state.levelScore;

    // Picture & letters
    $("#word-emoji").textContent = q.emoji;
    const lettersEl = $("#word-letters");
    lettersEl.innerHTML = "";
    q.word.split("").forEach(ch => {
      const tile = document.createElement("span");
      tile.className = "letter-tile";
      tile.textContent = ch;
      tile.dataset.letter = ch;
      lettersEl.appendChild(tile);
    });

    // Apply hint state
    updateHintUI();

    // Reset letter buttons
    $$(".vowel-btn").forEach(btn => {
      btn.classList.remove("selected","correct","wrong","missed");
      btn.disabled = false;
    });

    // Hide feedback
    $("#feedback-overlay").classList.add("hidden");
    $("#submit-btn").disabled = false;

    // Spelling mode: reset input, auto-hide word
    if (state.mode === "spelling") {
      const inp = $("#spelling-input");
      inp.value = "";
      inp.classList.remove("spelling-correct", "spelling-wrong");
      state.spelledLetters = [];
      renderSpellingTiles();
      // In spelling mode, always hide word (the challenge IS to spell it)
      $("#word-letters").classList.add("hidden-hint");
    } else {
      // Reset letter buttons
      $$(".vowel-btn").forEach(btn => {
        btn.classList.remove("selected","correct","wrong","missed");
        btn.disabled = false;
      });
    }
    setTimeout(() => {
      if (state.hintOn) {
        speakWord(q.word);
      } else {
        speakWord(q.word); // speak even if hidden — audio hint!
      }
    }, 400);

    // Companion tip occasionally
    if (Math.random() < 0.3) {
      setTimeout(showCompanionTip, 1200);
    }
  }

  /* ---------- TTS button ---------- */
  $("#tts-btn").addEventListener("click", () => {
    const q = state.levelQuestions[state.currentQ];
    if (q) speakWord(q.word);
    SFX.tts();
  });

  /* ---------- Spelling input Enter key ---------- */
  $("#spelling-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAnswer();
    }
  });

  /* Sync text input → spelling tiles on each keystroke */
  $("#spelling-input").addEventListener("input", () => {
    const val = ($("#spelling-input").value || "").toUpperCase();
    state.spelledLetters = val.split("");
    renderSpellingTiles();
  });

  /* ---------- Spelling Tiles Renderer ---------- */
  function renderSpellingTiles() {
    const container = $("#spelling-tiles");
    if (!container) return;
    container.innerHTML = "";
    (state.spelledLetters || []).forEach((ch, idx) => {
      const tile = document.createElement("span");
      tile.className = "spell-tile";
      tile.textContent = ch;
      tile.style.animationDelay = (idx * 0.04) + "s";
      container.appendChild(tile);
    });
    // Also keep the hidden text input in sync
    $("#spelling-input").value = (state.spelledLetters || []).join("");
  }

  /**
   * Get the expected next letter(s) in spelling mode.
   * Returns { expected: "P", word: "APPLE", position: 2 } or null.
   */
  function getSpellingContext() {
    if (state.mode !== "spelling") return null;
    const q = state.levelQuestions && state.levelQuestions[state.currentQ];
    if (!q) return null;
    const word = q.word.toUpperCase();
    const pos = (state.spelledLetters || []).length;
    if (pos >= word.length) return null;
    return { expected: word[pos], word, position: pos };
  }

  /* Undo last letter */
  $("#spell-undo-btn").addEventListener("click", () => {
    if (state.answered) return;
    if (!state.spelledLetters || state.spelledLetters.length === 0) return;
    state.spelledLetters.pop();
    renderSpellingTiles();
    highlightExpectedKey();
    SFX.select();
  });

  /* Clear all */
  $("#spell-clear-btn").addEventListener("click", () => {
    if (state.answered) return;
    state.spelledLetters = [];
    renderSpellingTiles();
    highlightExpectedKey();
    SFX.select();
  });

  /* ---------- On-screen A-Z Keyboard ---------- */
  $$(".kb-letter").forEach(btn => {
    btn.addEventListener("click", () => {
      if (state.answered) return;
      const letter = btn.dataset.kb;
      if (!letter) return;
      if (!state.spelledLetters) state.spelledLetters = [];
      state.spelledLetters.push(letter);
      renderSpellingTiles();
      highlightExpectedKey();
      SFX.select();
      // Brief flash
      btn.classList.add("kb-flash");
      setTimeout(() => btn.classList.remove("kb-flash"), 150);
    });
  });

  /** Highlight the next expected letter key on the on-screen keyboard */
  function highlightExpectedKey() {
    $$(".kb-letter").forEach(b => b.classList.remove("kb-expected"));
    const ctx = getSpellingContext();
    if (!ctx || !ctx.expected) return;
    const btn = document.querySelector(`.kb-letter[data-kb="${ctx.expected}"]`);
    if (btn) btn.classList.add("kb-expected");
  }

  /* ---------- Spelling Mode Submit ---------- */
  function submitSpellingAnswer() {
    // Prefer spelledLetters (from mic), fallback to text input
    const fromTiles = (state.spelledLetters || []).join("").toUpperCase().trim();
    const fromInput = ($("#spelling-input").value || "").toUpperCase().trim();
    const typed = fromTiles || fromInput;
    if (!typed) return;

    const q = state.levelQuestions[state.currentQ];
    const correct = q.word.toUpperCase();
    const isCorrect = typed === correct;

    state.answered = true;
    $("#submit-btn").disabled = true;

    const input = $("#spelling-input");
    if (isCorrect) {
      // Reveal the word on correct answer
      $("#word-letters").classList.remove("hidden-hint");
      input.classList.add("spelling-correct");
      handleCorrectSpelling(q);
    } else {
      input.classList.add("spelling-wrong");
      handleWrongSpelling(q, correct, typed);
    }
  }

  function handleCorrectSpelling(q) {
    SFX.correct();

    // Mark all letter tiles green
    $$(".letter-tile").forEach(tile => tile.classList.add("correct-highlight"));

    let pts = PTS_CORRECT;
    if (state.firstTry) pts += PTS_FIRST_TRY;
    const level = LEVELS.find(l => l.id === state.currentLevel);
    if (level && level.isBoss) pts *= PTS_BOSS_MULTI;
    state.levelScore += pts;
    state.levelCorrect++;

    if (level && level.isBoss) {
      state.bossHP = Math.max(0, state.bossHP - 1);
      updateBossHUD();
      showSlashEffect();
      spawnParticles(GameParticles.canvas.width / 2, 60, 20, "#e74c3c", 4, 5, 30);
    }

    const card = $("#question-card");
    const rect = card.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "#ffd700", 3, 5, 35);
    showScorePopup(pts, card);

    showFeedback(true, `+${pts} ${t("pointsSuffix")}`, tHint(q));

    setTimeout(() => {
      state.currentQ++;
      loadQuestion();
    }, FEEDBACK_DELAY);
  }

  function handleWrongSpelling(q, correct, typed) {
    SFX.wrong();
    state.firstTry = false;
    state.levelMistakes++;
    state.lives--;
    updateLives();

    const card = $("#question-card");
    card.style.animation = "shakeTile .4s";
    setTimeout(() => card.style.animation = "", 500);

    if (state.lives <= 0) {
      // Out of lives — reveal answer then advance or game over
      $$(".letter-tile").forEach(tile => tile.classList.add("correct-highlight"));
      $("#word-letters").classList.remove("hidden-hint");

      showFeedback(false, t("feedbackWrong"), `${t("feedbackSpellAns")} ${correct}`);

      const level = LEVELS.find(l => l.id === state.currentLevel);
      if (level && level.isBoss) {
        setTimeout(() => gameOver(), FEEDBACK_DELAY);
      } else {
        setTimeout(() => {
          state.lives = MAX_LIVES;
          updateLives();
          state.currentQ++;
          loadQuestion();
        }, FEEDBACK_DELAY);
      }
    } else {
      // Still have lives — allow retry on same question
      showFeedback(false, t("feedbackWrong"), "");

      setTimeout(() => {
        state.answered = false;
        state.spelledLetters = [];
        renderSpellingTiles();
        const input = $("#spelling-input");
        input.value = "";
        input.classList.remove("spelling-wrong");
        $("#feedback-overlay").classList.add("hidden");
        $("#submit-btn").disabled = false;
        highlightExpectedKey();
      }, FEEDBACK_DELAY);
    }
  }

  /* ---------- Highlight letters in word ---------- */
  function highlightLetters() {
    const targetLetters = state.mode === "vowel" ? VOWELS : CONSONANTS;
    $$(".letter-tile").forEach(tile => {
      const ch = tile.dataset.letter;
      if (state.selectedLetters.has(ch) && targetLetters.includes(ch)) {
        tile.classList.add("vowel-highlight");
      } else {
        tile.classList.remove("vowel-highlight");
      }
    });
  }

  /* ---------- Submit Answer ---------- */
  $("#submit-btn").addEventListener("click", submitAnswer);

  function submitAnswer() {
    if (state.answered) return;

    if (state.mode === "spelling") {
      submitSpellingAnswer();
      return;
    }

    if (state.selectedLetters.size === 0) return;

    const q = state.levelQuestions[state.currentQ];
    const correctArr = getTargetLetters(q);
    const correctSet = new Set(correctArr);
    const playerSet = state.selectedLetters;

    const isCorrect = correctSet.size === playerSet.size && [...correctSet].every(v => playerSet.has(v));

    state.answered = true;
    $("#submit-btn").disabled = true;

    if (isCorrect) {
      handleCorrect(q, correctSet);
    } else {
      handleWrong(q, correctSet);
    }
  }

  function handleCorrect(q, correctSet) {
    SFX.correct();

    $$(".vowel-btn").forEach(btn => {
      if (correctSet.has(btn.dataset.letter)) btn.classList.add("correct");
    });
    const allTarget = state.mode === "vowel" ? VOWELS : CONSONANTS;
    $$(".letter-tile").forEach(tile => {
      if (allTarget.includes(tile.dataset.letter) && correctSet.has(tile.dataset.letter)) {
        tile.classList.remove("vowel-highlight");
        tile.classList.add("correct-highlight");
      }
    });

    let pts = PTS_CORRECT;
    if (state.firstTry) pts += PTS_FIRST_TRY;
    const level = LEVELS.find(l => l.id === state.currentLevel);
    if (level && level.isBoss) pts *= PTS_BOSS_MULTI;
    state.levelScore += pts;
    state.levelCorrect++;

    if (level && level.isBoss) {
      state.bossHP = Math.max(0, state.bossHP - 1);
      updateBossHUD();
      showSlashEffect();
      spawnParticles(GameParticles.canvas.width / 2, 60, 20, "#e74c3c", 4, 5, 30);
    }

    const card = $("#question-card");
    const rect = card.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "#ffd700", 3, 5, 35);
    showScorePopup(pts, card);

    showFeedback(true, `+${pts} ${t("pointsSuffix")}`, tHint(q));

    setTimeout(() => {
      state.currentQ++;
      loadQuestion();
    }, FEEDBACK_DELAY);
  }

  function handleWrong(q, correctSet) {
    SFX.wrong();
    state.firstTry = false;
    state.levelMistakes++;
    state.lives--;
    updateLives();

    const card = $("#question-card");
    card.style.animation = "shakeTile .4s";
    setTimeout(() => card.style.animation = "", 500);

    if (state.lives <= 0) {
      // Out of lives — reveal answer then advance or game over
      $$(".vowel-btn").forEach(btn => {
        const v = btn.dataset.letter;
        if (correctSet.has(v) && !state.selectedLetters.has(v)) {
          btn.classList.add("missed");
        } else if (!correctSet.has(v) && state.selectedLetters.has(v)) {
          btn.classList.add("wrong");
        } else if (correctSet.has(v) && state.selectedLetters.has(v)) {
          btn.classList.add("correct");
        }
      });

      const allTarget = state.mode === "vowel" ? VOWELS : CONSONANTS;
      $$(".letter-tile").forEach(tile => {
        const ch = tile.dataset.letter;
        if (allTarget.includes(ch) && correctSet.has(ch)) {
          tile.classList.add("correct-highlight");
        }
      });

      $("#word-letters").classList.remove("hidden-hint");

      const answerStr = [...correctSet].join(", ");
      const label = state.mode === "vowel" ? t("feedbackVowelAns") : t("feedbackConsAns");
      showFeedback(false, t("feedbackWrong"), `${label} ${answerStr}`);

      const level = LEVELS.find(l => l.id === state.currentLevel);
      if (level && level.isBoss) {
        setTimeout(() => gameOver(), FEEDBACK_DELAY);
      } else {
        setTimeout(() => {
          state.lives = MAX_LIVES;
          updateLives();
          state.currentQ++;
          loadQuestion();
        }, FEEDBACK_DELAY);
      }
    } else {
      // Still have lives — allow retry on same question
      showFeedback(false, t("feedbackWrong"), "");

      setTimeout(() => {
        state.answered = false;
        state.selectedLetters.clear();
        $$(".vowel-btn").forEach(btn => {
          btn.classList.remove("selected", "correct", "wrong", "missed");
          btn.disabled = false;
        });
        $$(".letter-tile").forEach(tile => {
          tile.classList.remove("vowel-highlight", "correct-highlight", "wrong-highlight");
        });
        $("#feedback-overlay").classList.add("hidden");
        $("#submit-btn").disabled = false;
      }, FEEDBACK_DELAY);
    }
  }

  function showFeedback(isCorrect, text, detail) {
    const overlay = $("#feedback-overlay");
    const content = $("#feedback-content");
    overlay.classList.remove("hidden");
    content.className = "feedback-content " + (isCorrect ? "correct" : "wrong");
    content.innerHTML = `
      <div class="feedback-emoji">${isCorrect ? "✨" : "💔"}</div>
      <div class="feedback-text">${text}</div>
      <div class="feedback-detail">${detail || ""}</div>
    `;
  }

  function updateLives() {
    const bar = $("#lives-bar");
    bar.innerHTML = "";
    for (let i = 0; i < MAX_LIVES; i++) {
      const heart = document.createElement("span");
      heart.className = "heart" + (i >= state.lives ? " lost" : "");
      heart.textContent = "❤️";
      bar.appendChild(heart);
    }
  }

  /* ============================
     BOSS FIGHT TIMER
     ============================ */
  function startBossTimer() {
    clearBossTimer();
    state.bossInterval = setInterval(() => {
      state.bossTimer--;
      updateBossTimer();
      if (state.bossTimer <= 15) {
        $(".boss-timer").classList.add("urgent");
        SFX.bossTick();
      }
      if (state.bossTimer <= 0) {
        clearBossTimer();
        gameOver();
      }
    }, 1000);
  }

  function clearBossTimer() {
    if (state.bossInterval) {
      clearInterval(state.bossInterval);
      state.bossInterval = null;
    }
    const timerEl = $(".boss-timer");
    if (timerEl) timerEl.classList.remove("urgent");
  }

  function updateBossTimer() {
    $("#timer-value").textContent = state.bossTimer;
  }

  function updateBossHUD() {
    const pct = (state.bossHP / Q_PER_LEVEL) * 100;
    $("#boss-hp-fill").style.width = pct + "%";
    $("#boss-hp-text").textContent = `${state.bossHP} / ${Q_PER_LEVEL}`;
  }

  /* ============================
     LEVEL COMPLETE
     ============================ */
  function completeLevel() {
    clearBossTimer();
    const lvl = LEVELS.find(l => l.id === state.currentLevel);

    let stars = 1;
    if (state.levelMistakes <= 2) stars = 2;
    if (state.levelMistakes === 0) stars = 3;

    state.score += state.levelScore;
    state.stars[state.currentLevel] = Math.max(state.stars[state.currentLevel] || 0, stars);
    state.completedLevels.add(state.currentLevel);

    if (lvl && lvl.isBoss) {
      saveProgress();
      SFX.victory();
      confettiBurst();
      showVictory();
      return;
    }

    SFX.levelUp();
    confettiBurst();

    const starsEl = $("#stars-earned");
    starsEl.innerHTML = [1,2,3].map(s =>
      `<span class="star-pop">${s <= stars ? "⭐" : "☆"}</span>`
    ).join("");

    $("#level-score-value").textContent = state.levelScore;
    $("#level-correct-value").textContent = state.levelCorrect;
    $("#complete-story-text").textContent = lvl ? tLevel(state.currentLevel, "complete") : "";

    // Loot item
    const lootEl = $("#loot-item");
    lootEl.textContent = lvl && lvl.loot ? lvl.loot : "🎁";

    if (state.currentLevel < LEVELS.length) {
      state.currentLevel++;
    }
    saveProgress();

    showScreen("complete");
  }

  $("#next-level-btn").addEventListener("click", () => {
    SFX.select();
    showStoryForLevel(state.currentLevel);
  });

  $("#complete-lobby-btn").addEventListener("click", () => {
    SFX.select();
    goToLobby();
  });

  /* ============================
     VICTORY
     ============================ */
  function showVictory() {
    confettiBurst();
    setTimeout(confettiBurst, 800);
    $("#final-score").textContent = state.score;
    const totalStars = Object.values(state.stars).reduce((a, b) => a + b, 0);
    $("#final-stars").textContent = totalStars;
    const modeText = state.mode === "vowel"
      ? t("victoryVowelText")
      : state.mode === "consonant"
      ? t("victoryConsText")
      : t("victorySpellText");
    $("#victory-text").textContent = modeText;
    showScreen("victory");
  }

  $("#play-again-btn").addEventListener("click", () => {
    SFX.select();
    resetProgress();
    initTitle();
    showScreen("title");
  });

  $("#victory-lobby-btn").addEventListener("click", () => {
    SFX.select();
    goToLobby();
  });

  /* ============================
     GAME OVER
     ============================ */
  function gameOver() {
    clearBossTimer();
    SFX.defeat();
    state.score += state.levelScore;
    $("#gameover-score").textContent = state.score;
    saveProgress();
    showScreen("gameover");
  }

  $("#retry-btn").addEventListener("click", () => {
    SFX.select();
    startLevel(state.currentLevel);
  });

  $("#back-map-btn").addEventListener("click", () => {
    SFX.select();
    showMapScreen();
  });

  $("#gameover-lobby-btn").addEventListener("click", () => {
    SFX.select();
    goToLobby();
  });

  /* ============================
     BACK TO LOBBY
     ============================ */
  function goToLobby() {
    clearBossTimer();
    window.speechSynthesis && window.speechSynthesis.cancel();
    if (typeof VoiceInput !== "undefined") VoiceInput.stop();
    saveProgress();
    initTitle();
    showScreen("title");
  }

  $("#map-lobby-btn").addEventListener("click", () => {
    SFX.select();
    goToLobby();
  });

  $("#game-lobby-btn").addEventListener("click", () => {
    SFX.select();
    goToLobby();
  });

  /* ============================
     VOICE INPUT INTEGRATION
     ============================ */
  const micBtn = $("#mic-btn");
  if (typeof VoiceInput !== "undefined" && VoiceInput.supported) {
    micBtn.classList.remove("hidden");

    VoiceInput.onStateChange((isListening) => {
      micBtn.classList.toggle("mic-active", isListening);
      micBtn.textContent = isListening ? "🔴" : "🎤";
    });

    VoiceInput.onResult((letters) => {
      if (state.answered) return;

      if (state.mode === "spelling") {
        // In spelling mode, append recognized letters to the spelling tiles
        if (!state.spelledLetters) state.spelledLetters = [];
        letters.forEach(ch => state.spelledLetters.push(ch));
        renderSpellingTiles();
        highlightExpectedKey();
        SFX.select();
      } else {
        // In vowel/consonant mode, toggle the recognized letters
        const validSet = state.mode === "vowel"
          ? new Set(VOWELS)
          : new Set(CONSONANTS);

        letters.forEach(letter => {
          if (!validSet.has(letter)) return;
          const btn = document.querySelector(`.vowel-btn[data-letter="${letter}"]`);
          if (!btn || btn.disabled) return;

          if (state.selectedLetters.has(letter)) {
            state.selectedLetters.delete(letter);
            btn.classList.remove("selected");
          } else {
            state.selectedLetters.add(letter);
            btn.classList.add("selected");
          }
        });
        highlightLetters();
        SFX.select();
      }
    });

    micBtn.addEventListener("click", () => {
      if (state.answered) return;
      VoiceInput.toggle(state.mode);
    });
  } else {
    micBtn.classList.add("hidden");
  }

  /* ============================
     LANGUAGE TOGGLE
     ============================ */
  function updateLangBtn() {
    const btn = $("#lang-toggle");
    if (btn) btn.textContent = currentLang === "en" ? "中" : "EN";
  }

  $("#lang-toggle").addEventListener("click", () => {
    currentLang = currentLang === "en" ? "zh" : "en";
    updateLangBtn();
    refreshI18nDOM();
    // Re-render active screen dynamic text
    updateHintUI();
    if (!screens.title.classList.contains("active")) {
      // refresh map badge if on map
      if (!screens.map.classList.contains("hidden") && screens.map.classList.contains("active")) {
        renderMap();
      }
    }
    localStorage.setItem("vowelquest_lang", currentLang);
    SFX.select();
  });

  /* ============================
     BGM VOLUME SLIDER
     ============================ */
  const bgmSlider = $("#bgm-slider");
  if (bgmSlider) {
    bgmSlider.addEventListener("input", () => {
      const v = parseInt(bgmSlider.value, 10) / 100;
      BGM.setVolume(v);
      localStorage.setItem("vowelquest_bgm_vol", bgmSlider.value);
    });
    // Restore saved volume
    const savedVol = localStorage.getItem("vowelquest_bgm_vol");
    if (savedVol !== null) {
      bgmSlider.value = savedVol;
      BGM.setVolume(parseInt(savedVol, 10) / 100);
    }
  }

  /* ============================
     INIT
     ============================ */
  function init() {
    // Initialize particles on the canvas
    GameParticles.init(document.querySelector("#particles"));

    // Load language preference
    const savedLang = localStorage.getItem("vowelquest_lang");
    if (savedLang && I18N[savedLang]) currentLang = savedLang;
    updateLangBtn();
    refreshI18nDOM();
    syncAudio();
    initTitle();
    showScreen("title");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
