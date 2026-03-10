/* ===================================================
   VOWEL QUEST — Game Engine  v2
   - 3 Levels × 5 random questions
   - TTS (text-to-speech) for questions
   - Fixed speech recognition (multi-vowel)
   - Hint toggle (show/hide word)
   - Consonant DLC mode
   - More visual effects & companion fairy
   =================================================== */

(function () {
  "use strict";

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

  /* Companion messages */
  const COMPANION_TIPS = {
    vowel: [
      "Remember: A, E, I, O, U!",
      "Listen carefully to the word! 👂",
      "Vowels make words sing! 🎵",
      "You're doing great, knight! ⚔️",
      "Tap the speaker to hear the word!",
    ],
    consonant: [
      "All letters except A,E,I,O,U!",
      "Listen for the hard sounds! 👂",
      "Consonants are the bones of words!",
      "You've unlocked the DLC! 🗡️",
      "Tap the speaker to hear the word!",
    ],
    spelling: [
      "Listen and type the whole word! ⌨️",
      "Sound it out letter by letter!",
      "You can do it, brave speller! 📝",
      "Tap the speaker to hear it again!",
      "Spelling masters rule the kingdom! 👑",
    ],
  };

  /* ============================
     AUDIO — synthesized sounds
     ============================ */
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function playTone(freq, dur, type = "sine", vol = 0.18) {
    if (!state.soundOn) return;
    try {
      ensureAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (_) {}
  }

  const SFX = {
    correct()  { playTone(523,.15); setTimeout(()=>playTone(659,.15),100); setTimeout(()=>playTone(784,.25),200); },
    wrong()    { playTone(200,.25,"square",.12); setTimeout(()=>playTone(160,.3,"square",.1),150); },
    select()   { playTone(440,.08,"triangle",.1); },
    levelUp()  { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,.2),i*120)); },
    bossTick() { playTone(880,.05,"square",.06); },
    victory()  { [523,659,784,1047,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,.2,"triangle",.15),i*150)); },
    defeat()   { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,.3,"sawtooth",.08),i*200)); },
    tts()      { playTone(330,.06,"triangle",.06); },
  };

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
    // Visual feedback on TTS button
    const btn = $("#tts-btn");
    btn.classList.add("speaking");
    utter.onend = () => btn.classList.remove("speaking");
    utter.onerror = () => btn.classList.remove("speaking");
    window.speechSynthesis.speak(utter);
  }

  /* ============================
     PARTICLES
     ============================ */
  const canvas = $("#particles");
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resizeCanvas() {
    const c = $("#game-container");
    canvas.width = c.clientWidth;
    canvas.height = c.clientHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor(x, y, color, size, speed, life) {
      this.x = x; this.y = y;
      this.color = color;
      this.size = size;
      this.vx = (Math.random() - 0.5) * speed;
      this.vy = (Math.random() - 0.5) * speed - 1;
      this.life = life;
      this.maxLife = life;
      this.alpha = 1;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.02;
      this.life--;
      this.alpha = this.life / this.maxLife;
    }
    draw(c) {
      c.save();
      c.globalAlpha = this.alpha;
      c.fillStyle = this.color;
      c.beginPath();
      c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  function spawnParticles(x, y, count, color, size = 3, speed = 4, life = 40) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, color, Math.random() * size + 1, speed, life + Math.random() * 20));
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => { p.update(); p.draw(ctx); });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  function confettiBurst() {
    const colors = ["#ffd700","#e74c3c","#2ecc71","#3498db","#9b59b6","#f39c12"];
    for (let i = 0; i < 50; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.left = Math.random() * 100 + "%";
      el.style.top = "-10px";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = (1 + Math.random()) + "s";
      el.style.animationDelay = Math.random() * 0.5 + "s";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    }
  }

  function showScorePopup(amount, parent) {
    const el = document.createElement("div");
    el.className = "score-popup";
    el.textContent = "+" + amount;
    const rect = parent.getBoundingClientRect();
    el.style.left = rect.left + rect.width / 2 - 20 + "px";
    el.style.top = rect.top + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function showSlashEffect() {
    const el = document.createElement("div");
    el.className = "slash-effect";
    const bossHud = $("#boss-hud");
    bossHud.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }

  /* ============================
     SCREEN MANAGEMENT
     ============================ */
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
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
      // Hide letter buttons, show text input
      letterPanel.classList.add("hidden");
      spellingPanel.classList.remove("hidden");
      $("#spelling-input").value = "";
      $("#mic-btn").style.display = "none";
      return;
    }

    // Show letter buttons, hide text input
    letterPanel.classList.remove("hidden");
    spellingPanel.classList.add("hidden");
    $("#mic-btn").style.display = "";

    if (state.mode === "vowel") {
      container.classList.remove("consonant-mode");
      VOWELS.forEach(v => {
        const btn = document.createElement("button");
        btn.className = "vowel-btn";
        btn.dataset.letter = v;
        btn.textContent = v;
        container.appendChild(btn);
      });
      $("#panel-label").textContent = "Which vowels are in this word?";
    } else {
      container.classList.add("consonant-mode");
      CONSONANTS.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "vowel-btn";
        btn.dataset.letter = c;
        btn.textContent = c;
        container.appendChild(btn);
      });
      $("#panel-label").textContent = "Which consonants are in this word?";
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
    const hasProgress = loadProgress();
    const contBtn = $("#continue-btn");
    if (hasProgress) contBtn.classList.remove("hidden");
    else contBtn.classList.add("hidden");
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
    resetProgress();
    state.currentLevel = 1;
    showStoryForLevel(1);
  });

  $("#continue-btn").addEventListener("click", () => {
    ensureAudio();
    SFX.select();
    showMapScreen();
  });

  $("#sound-toggle").addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    updateSoundBtn();
    saveProgress();
    if (state.soundOn) { ensureAudio(); SFX.select(); }
  });

  /* ============================
     STORY SCREEN
     ============================ */
  let typewriterInterval = null;

  function showStoryForLevel(lvlId) {
    const level = LEVELS.find(l => l.id === lvlId);
    if (!level) { showMapScreen(); return; }
    $("#story-character").textContent = level.emoji;
    const full = level.introStory;
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
    $("#mode-badge-display").textContent = state.mode === "vowel" ? "🔤 Vowels Mode" : state.mode === "consonant" ? "🗡️ Consonants DLC" : "✏️ Spelling DLC";

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
          <h3>${lvl.id}. ${lvl.name}${lvl.isBoss ? " ⚡" : ""}</h3>
          <p>${lvl.description}</p>
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
      btn.querySelector(".hint-label").textContent = "Hide Word";
      letters.classList.remove("hidden-hint");
    } else {
      btn.classList.remove("hint-on");
      btn.querySelector(".hint-label").textContent = "Show Word";
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
    const tips = COMPANION_TIPS[state.mode] || COMPANION_TIPS.vowel;
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
    $("#level-label").textContent = level.name;
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

  /* ---------- Spelling Mode Submit ---------- */
  function submitSpellingAnswer() {
    const input = $("#spelling-input");
    const typed = (input.value || "").toUpperCase().trim();
    if (!typed) return;

    const q = state.levelQuestions[state.currentQ];
    const correct = q.word.toUpperCase();
    const isCorrect = typed === correct;

    state.answered = true;
    $("#submit-btn").disabled = true;

    // Reveal the word on answer
    $("#word-letters").classList.remove("hidden-hint");

    if (isCorrect) {
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
      spawnParticles(canvas.width / 2, 60, 20, "#e74c3c", 4, 5, 30);
    }

    const card = $("#question-card");
    const rect = card.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "#ffd700", 3, 5, 35);
    showScorePopup(pts, card);

    showFeedback(true, `+${pts} points!`, q.hint);

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

    // Highlight correct vs wrong letters in the word display
    $$(".letter-tile").forEach(tile => tile.classList.add("correct-highlight"));

    const card = $("#question-card");
    card.style.animation = "shakeTile .4s";
    setTimeout(() => card.style.animation = "", 500);

    showFeedback(false, "Not quite!", `The correct spelling is: ${correct}`);

    if (state.lives <= 0) {
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
      setTimeout(() => {
        state.currentQ++;
        loadQuestion();
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
      spawnParticles(canvas.width / 2, 60, 20, "#e74c3c", 4, 5, 30);
    }

    const card = $("#question-card");
    const rect = card.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "#ffd700", 3, 5, 35);
    showScorePopup(pts, card);

    showFeedback(true, `+${pts} points!`, q.hint);

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
      if (allTarget.includes(ch) && state.selectedLetters.has(ch) && !correctSet.has(ch)) {
        tile.classList.add("wrong-highlight");
      }
    });

    // Also reveal the word letters on wrong answer
    $("#word-letters").classList.remove("hidden-hint");

    const card = $("#question-card");
    card.style.animation = "shakeTile .4s";
    setTimeout(() => card.style.animation = "", 500);

    const answerStr = [...correctSet].join(", ");
    const label = state.mode === "vowel" ? "vowels" : state.mode === "consonant" ? "consonants" : "letters";
    showFeedback(false, "Not quite!", `The ${label} are: ${answerStr}`);

    if (state.lives <= 0) {
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
      setTimeout(() => {
        state.currentQ++;
        loadQuestion();
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
    $("#complete-story-text").textContent = lvl ? lvl.completeStory : "";

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
      ? "You defeated the Dark Sorcerer and restored all vowels to the Kingdom of Letters!"
      : state.mode === "consonant"
      ? "You defeated the Dark Sorcerer and restored all consonants to the Kingdom of Letters!"
      : "You defeated the Dark Sorcerer by spelling every word perfectly! The Kingdom of Letters is saved!";
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
     SPEECH RECOGNITION — FIXED
     Supports multi-letter detection:
     Uses continuous mode + processes all
     alternatives + letter-by-letter parsing
     ============================ */
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.addEventListener("result", (e) => {
      if (state.answered) { stopListening(); return; }

      // Collect ALL transcripts from all alternatives
      const allText = [];
      for (let i = 0; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          allText.push(e.results[i][j].transcript.toUpperCase().trim());
        }
      }
      const combined = allText.join(" ");

      // Determine which letters we're looking for
      const targetPool = state.mode === "vowel" ? VOWELS : state.mode === "consonant" ? CONSONANTS : [];

      // Strategy 1: Check for letter names spoken individually 
      // e.g. "A E I" or "A, E, I" or "AEI"
      targetPool.forEach(letter => {
        // Check if the letter appears as a standalone word or in the string
        // Use word boundary or just character presence
        if (combined.includes(letter)) {
          state.selectedLetters.add(letter);
          const btn = $(`.vowel-btn[data-letter="${letter}"]`);
          if (btn) btn.classList.add("selected");
        }
      });

      // Strategy 2: Check for phonetic letter names
      // e.g., "ay" = A, "ee" = E, "eye" = I, "oh" = O, "you" = U
      const phoneticMap = {
        "A": ["AY","AEI","LETTER A"],
        "E": ["EE","LETTER E"],
        "I": ["EYE","AI","LETTER I"],
        "O": ["OH","LETTER O"],
        "U": ["YOU","YU","LETTER U"],
        // Consonant phonetics
        "B": ["BEE","BE"],
        "C": ["SEE","CE","SI"],
        "D": ["DEE","DE"],
        "F": ["EF","EFF"],
        "G": ["GEE","JEE"],
        "H": ["AITCH","ATCH"],
        "J": ["JAY"],
        "K": ["KAY"],
        "L": ["EL","ELL"],
        "M": ["EM"],
        "N": ["EN"],
        "P": ["PEE","PE"],
        "Q": ["CUE","QUE","QUEUE"],
        "R": ["ARE","AR"],
        "S": ["ES","ESS"],
        "T": ["TEE","TE"],
        "V": ["VEE","VE"],
        "W": ["DOUBLE U","DOUBLE YOU","DOUBLE"],
        "X": ["EX"],
        "Y": ["WHY","WY"],
        "Z": ["ZEE","ZED"],
      };

      targetPool.forEach(letter => {
        const phonetics = phoneticMap[letter] || [];
        for (const ph of phonetics) {
          if (combined.includes(ph)) {
            state.selectedLetters.add(letter);
            const btn = $(`.vowel-btn[data-letter="${letter}"]`);
            if (btn) btn.classList.add("selected");
            break;
          }
        }
      });

      highlightLetters();
      stopListening();
    });

    recognition.addEventListener("end", () => stopListening());
    recognition.addEventListener("error", () => stopListening());
  }

  function startListening() {
    if (!recognition || state.answered) return;
    try {
      isListening = true;
      recognition.start();
      $("#mic-btn").classList.add("listening");
    } catch (_) {}
  }

  function stopListening() {
    isListening = false;
    $("#mic-btn").classList.remove("listening");
    try { if (recognition) recognition.stop(); } catch (_) {}
  }

  $("#mic-btn").addEventListener("click", () => {
    ensureAudio();
    if (isListening) stopListening();
    else startListening();
  });

  if (!SpeechRecognition) {
    $("#mic-btn").style.display = "none";
  }

  /* ============================
     AMBIENT PARTICLES
     ============================ */
  function ambientStars() {
    if (Math.random() < 0.03) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.5;
      spawnParticles(x, y, 1, "rgba(255,215,0,0.5)", 2, 0.5, 60);
    }
    if (Math.random() < 0.01) {
      const x = Math.random() * canvas.width;
      spawnParticles(x, 0, 2, "rgba(155,89,182,0.4)", 2, 0.3, 80);
    }
    requestAnimationFrame(ambientStars);
  }
  ambientStars();

  /* ============================
     INIT
     ============================ */
  function init() {
    initTitle();
    showScreen("title");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
