/* ===================================================
   VOWEL QUEST — Game Engine
   Handles all game logic, screens, speech, effects
   =================================================== */

(function () {
  "use strict";

  /* ---------- Constants ---------- */
  const VOWELS = ["A", "E", "I", "O", "U"];
  const Q_PER_LEVEL = 10;
  const MAX_LIVES = 3;
  const BOSS_TIMER = 120;            // seconds
  const PTS_CORRECT = 100;
  const PTS_FIRST_TRY = 50;
  const PTS_BOSS_MULTI = 2;
  const FEEDBACK_DELAY = 1400;       // ms before auto-dismiss

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
    currentLevel: 1,
    currentQ: 0,          // index within level (0-9)
    score: 0,
    levelScore: 0,
    levelCorrect: 0,
    levelMistakes: 0,
    lives: MAX_LIVES,
    selectedVowels: new Set(),
    answered: false,
    stars: {},             // { 1: 3, 2: 2, ... }
    completedLevels: new Set(),
    bossHP: Q_PER_LEVEL,
    bossTimer: BOSS_TIMER,
    bossInterval: null,
    soundOn: true,
    firstTry: true,        // track if current Q answered without mistake
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
    correct()  { playTone(523, 0.15); setTimeout(() => playTone(659, 0.15), 100); setTimeout(() => playTone(784, 0.25), 200); },
    wrong()    { playTone(200, 0.25, "square", 0.12); setTimeout(() => playTone(160, 0.3, "square", 0.1), 150); },
    select()   { playTone(440, 0.08, "triangle", 0.1); },
    levelUp()  { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f, 0.2), i*120)); },
    bossTick() { playTone(880, 0.05, "square", 0.06); },
    victory()  { [523,659,784,1047,784,1047].forEach((f,i) => setTimeout(() => playTone(f, 0.2, "triangle", 0.15), i*150)); },
    defeat()   { [400,350,300,200].forEach((f,i) => setTimeout(() => playTone(f, 0.3, "sawtooth", 0.08), i*200)); },
  };

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
      this.vy += 0.02; // gravity
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
    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => { p.update(); p.draw(ctx); });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  /* Confetti burst */
  function confettiBurst() {
    const colors = ["#ffd700", "#e74c3c", "#2ecc71", "#3498db", "#9b59b6", "#f39c12"];
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

  /* Score popup */
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

  /* ============================
     SCREEN MANAGEMENT
     ============================ */
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  /* ============================
     SAVE / LOAD
     ============================ */
  function saveProgress() {
    const data = {
      currentLevel: state.currentLevel,
      score: state.score,
      stars: state.stars,
      completedLevels: [...state.completedLevels],
      soundOn: state.soundOn,
    };
    try { localStorage.setItem("vowelquest_save", JSON.stringify(data)); } catch (_) {}
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem("vowelquest_save");
      if (!raw) return false;
      const d = JSON.parse(raw);
      state.currentLevel = d.currentLevel || 1;
      state.score = d.score || 0;
      state.stars = d.stars || {};
      state.completedLevels = new Set(d.completedLevels || []);
      if (d.soundOn !== undefined) state.soundOn = d.soundOn;
      return state.currentLevel > 1 || state.completedLevels.size > 0;
    } catch (_) { return false; }
  }

  function resetProgress() {
    state.currentLevel = 1;
    state.score = 0;
    state.stars = {};
    state.completedLevels = new Set();
    try { localStorage.removeItem("vowelquest_save"); } catch (_) {}
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
  }

  function updateSoundBtn() {
    $("#sound-toggle").textContent = state.soundOn ? "🔊" : "🔇";
  }

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
  function showStoryForLevel(lvlId) {
    const level = LEVELS.find((l) => l.id === lvlId);
    if (!level) { showMapScreen(); return; }
    $("#story-character").textContent = level.emoji;
    // Typewriter effect
    const full = level.introStory;
    const el = $("#story-text");
    el.textContent = "";
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += full[i];
      i++;
      if (i >= full.length) clearInterval(interval);
    }, 25);
    showScreen("story");
  }

  $("#story-continue-btn").addEventListener("click", () => {
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

    const totalAnswered = Object.keys(state.stars).reduce((sum, k) => sum + Q_PER_LEVEL, 0);
    const pct = (state.completedLevels.size / LEVELS.length) * 100;
    $("#progress-fill").style.width = pct + "%";
    $("#progress-text").textContent = `${state.completedLevels.size * Q_PER_LEVEL} / ${LEVELS.length * Q_PER_LEVEL}`;
    $("#total-score").textContent = state.score;

    LEVELS.forEach((lvl) => {
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
      const starsHTML = [1, 2, 3].map((s) =>
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
     GAME SCREEN
     ============================ */
  function startLevel(lvlId) {
    const level = LEVELS.find((l) => l.id === lvlId);
    state.currentLevel = lvlId;
    state.currentQ = 0;
    state.levelScore = 0;
    state.levelCorrect = 0;
    state.levelMistakes = 0;
    state.lives = MAX_LIVES;
    state.answered = false;
    state.firstTry = true;

    // HUD
    $("#level-label").textContent = level.name;
    updateLives();

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
    loadQuestion();
  }

  function loadQuestion() {
    const questions = QUESTIONS.filter((q) => q.level === state.currentLevel);
    if (state.currentQ >= questions.length) {
      completeLevel();
      return;
    }
    const q = questions[state.currentQ];
    state.answered = false;
    state.firstTry = true;
    state.selectedVowels.clear();

    // Progress
    $("#q-progress").textContent = `${state.currentQ + 1} / ${Q_PER_LEVEL}`;
    $("#game-score").textContent = state.score + state.levelScore;

    // Picture & letters
    $("#word-emoji").textContent = q.emoji;
    const lettersEl = $("#word-letters");
    lettersEl.innerHTML = "";
    q.word.split("").forEach((ch) => {
      const tile = document.createElement("span");
      tile.className = "letter-tile";
      tile.textContent = ch;
      tile.dataset.letter = ch;
      lettersEl.appendChild(tile);
    });

    // Reset vowel buttons
    $$(".vowel-btn").forEach((btn) => {
      btn.classList.remove("selected", "correct", "wrong", "missed");
      btn.disabled = false;
    });

    // Hide feedback
    const fb = $("#feedback-overlay");
    fb.classList.add("hidden");

    // Enable submit
    $("#submit-btn").disabled = false;
  }

  /* ---------- Vowel Button Clicks ---------- */
  $$(".vowel-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.answered) return;
      SFX.select();
      const v = btn.dataset.vowel;
      if (state.selectedVowels.has(v)) {
        state.selectedVowels.delete(v);
        btn.classList.remove("selected");
      } else {
        state.selectedVowels.add(v);
        btn.classList.add("selected");
      }
      highlightLetters();
    });
  });

  function highlightLetters() {
    $$(".letter-tile").forEach((tile) => {
      const ch = tile.dataset.letter;
      if (state.selectedVowels.has(ch)) {
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
    if (state.selectedVowels.size === 0) return; // must select something

    const questions = QUESTIONS.filter((q) => q.level === state.currentLevel);
    const q = questions[state.currentQ];
    const correctSet = new Set(q.vowels);
    const playerSet = state.selectedVowels;

    // Compare
    const isCorrect = correctSet.size === playerSet.size && [...correctSet].every((v) => playerSet.has(v));

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

    // Highlight buttons green
    $$(".vowel-btn").forEach((btn) => {
      if (correctSet.has(btn.dataset.vowel)) btn.classList.add("correct");
    });
    // Highlight letters
    $$(".letter-tile").forEach((tile) => {
      if (VOWELS.includes(tile.dataset.letter) && correctSet.has(tile.dataset.letter)) {
        tile.classList.remove("vowel-highlight");
        tile.classList.add("correct-highlight");
      }
    });

    // Score
    let pts = PTS_CORRECT;
    if (state.firstTry) pts += PTS_FIRST_TRY;
    const level = LEVELS.find((l) => l.id === state.currentLevel);
    if (level && level.isBoss) pts *= PTS_BOSS_MULTI;
    state.levelScore += pts;
    state.levelCorrect++;

    // Boss damage
    if (level && level.isBoss) {
      state.bossHP = Math.max(0, state.bossHP - 1);
      updateBossHUD();
      spawnParticles(canvas.width / 2, 60, 20, "#e74c3c", 4, 5, 30);
    }

    // Particles & popup
    const card = $("#question-card");
    const rect = card.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "#ffd700", 3, 5, 35);
    showScorePopup(pts, card);

    // Feedback
    showFeedback(true, `+${pts} points!`, q.hint);

    // Next question after delay
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

    // Show correct / wrong on buttons
    $$(".vowel-btn").forEach((btn) => {
      const v = btn.dataset.vowel;
      if (correctSet.has(v) && !state.selectedVowels.has(v)) {
        btn.classList.add("missed");
      } else if (!correctSet.has(v) && state.selectedVowels.has(v)) {
        btn.classList.add("wrong");
      } else if (correctSet.has(v) && state.selectedVowels.has(v)) {
        btn.classList.add("correct");
      }
    });

    // Highlight letters
    $$(".letter-tile").forEach((tile) => {
      const ch = tile.dataset.letter;
      if (VOWELS.includes(ch) && correctSet.has(ch)) {
        tile.classList.add("correct-highlight");
      }
      if (VOWELS.includes(ch) && state.selectedVowels.has(ch) && !correctSet.has(ch)) {
        tile.classList.add("wrong-highlight");
      }
    });

    // Shake card
    const card = $("#question-card");
    card.style.animation = "shakeTile .4s";
    setTimeout(() => { card.style.animation = ""; }, 500);

    const vowelAnswer = q.vowels.join(", ");
    showFeedback(false, "Not quite!", `The vowels are: ${vowelAnswer}`);

    // Check lives
    if (state.lives <= 0) {
      const level = LEVELS.find((l) => l.id === state.currentLevel);
      if (level && level.isBoss) {
        setTimeout(() => gameOver(), FEEDBACK_DELAY);
      } else {
        // Retry level option — just move to next question and reset lives
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
    const lvl = LEVELS.find((l) => l.id === state.currentLevel);

    // Calculate stars
    let stars = 1;
    if (state.levelMistakes <= 3) stars = 2;
    if (state.levelMistakes <= 1) stars = 3;

    // Update state
    state.score += state.levelScore;
    state.stars[state.currentLevel] = Math.max(state.stars[state.currentLevel] || 0, stars);
    state.completedLevels.add(state.currentLevel);

    // If boss defeated
    if (lvl && lvl.isBoss) {
      saveProgress();
      SFX.victory();
      confettiBurst();
      showVictory();
      return;
    }

    SFX.levelUp();
    confettiBurst();

    // Stars display
    const starsEl = $("#stars-earned");
    starsEl.innerHTML = [1, 2, 3].map((s) =>
      `<span class="star-pop">${s <= stars ? "⭐" : "☆"}</span>`
    ).join("");

    // Stats
    $("#level-score-value").textContent = state.levelScore;
    $("#level-correct-value").textContent = state.levelCorrect;

    // Story
    $("#complete-story-text").textContent = lvl ? lvl.completeStory : "";

    // Advance to next level
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

  /* ============================
     VICTORY
     ============================ */
  function showVictory() {
    confettiBurst();
    setTimeout(confettiBurst, 800);
    $("#final-score").textContent = state.score;
    const totalStars = Object.values(state.stars).reduce((a, b) => a + b, 0);
    $("#final-stars").textContent = totalStars;
    showScreen("victory");
  }

  $("#play-again-btn").addEventListener("click", () => {
    SFX.select();
    resetProgress();
    initTitle();
    showScreen("title");
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

  /* ============================
     SPEECH RECOGNITION
     ============================ */
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.addEventListener("result", (e) => {
      const transcript = e.results[0][0].transcript.toUpperCase().trim();
      // Extract vowel letters from speech
      VOWELS.forEach((v) => {
        if (transcript.includes(v)) {
          state.selectedVowels.add(v);
          const btn = $(`.vowel-btn[data-vowel="${v}"]`);
          if (btn) btn.classList.add("selected");
        }
      });
      highlightLetters();
      stopListening();
    });

    recognition.addEventListener("end", () => { stopListening(); });
    recognition.addEventListener("error", () => { stopListening(); });
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
    if (isListening) { stopListening(); }
    else { startListening(); }
  });

  // Hide mic button if not supported
  if (!SpeechRecognition) {
    $("#mic-btn").style.display = "none";
  }

  /* ============================
     AMBIENT PARTICLES (background stars)
     ============================ */
  function ambientStars() {
    if (Math.random() < 0.03) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.5;
      spawnParticles(x, y, 1, "rgba(255,215,0,0.5)", 2, 0.5, 60);
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

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
