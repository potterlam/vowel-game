/* ===================================================
   VOWEL QUEST — Particle & Visual Effects System
   Canvas-based particles, confetti, score popups, etc.
   =================================================== */

const GameParticles = (() => {
  "use strict";

  let canvas = null;
  let ctx = null;
  let particles = [];

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animateLoop();
    ambientLoop();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const c = canvas.parentElement;
    canvas.width = c.clientWidth;
    canvas.height = c.clientHeight;
  }

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

  function spawn(x, y, count, color, size = 3, speed = 4, life = 40) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, color, Math.random() * size + 1, speed, life + Math.random() * 20));
    }
  }

  function animateLoop() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => { p.update(); p.draw(ctx); });
    requestAnimationFrame(animateLoop);
  }

  function ambientLoop() {
    if (!canvas) { requestAnimationFrame(ambientLoop); return; }
    if (Math.random() < 0.03) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.5;
      spawn(x, y, 1, "rgba(255,215,0,0.5)", 2, 0.5, 60);
    }
    if (Math.random() < 0.01) {
      const x = Math.random() * canvas.width;
      spawn(x, 0, 2, "rgba(155,89,182,0.4)", 2, 0.3, 80);
    }
    requestAnimationFrame(ambientLoop);
  }

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

  function showSlashEffect(targetEl) {
    const el = document.createElement("div");
    el.className = "slash-effect";
    targetEl.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }

  return {
    init,
    spawn,
    confettiBurst,
    showScorePopup,
    showSlashEffect,
    get canvas() { return canvas; },
  };
})();
