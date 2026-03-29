/* ===================================================
   VOWEL QUEST — Audio System
   Synthesized SFX and BGM using Web Audio API
   Standalone module — no dependency on game state
   =================================================== */

const GameAudio = (() => {
  "use strict";

  let audioCtx = null;
  let soundEnabled = true;

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function playTone(freq, dur, type = "sine", vol = 0.18) {
    if (!soundEnabled) return;
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

  /* ---------- Sound Effects ---------- */
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

  /* ---------- Background Music ---------- */
  const BGM = (() => {
    let bgmGain = null;
    let bgmInterval = null;
    let bgmPlaying = false;
    let bgmVolume = 0.07;
    let currentMood = "title";

    const MOODS = {
      title: {
        notes: [262,294,330,392,440, 523,587,659,784,880],
        tempo: 280,
        type: "sine",
        pattern: [0,2,4,7,9, 7,4,2, 0,4,7,9,7,4,2,0],
      },
      game: {
        notes: [330,392,440,523,587, 659,784,880],
        tempo: 220,
        type: "triangle",
        pattern: [0,2,4,6,7, 6,4,2, 0,1,3,5,7,5,3,1],
      },
      boss: {
        notes: [220,262,294,330,392,440,523],
        tempo: 180,
        type: "sawtooth",
        pattern: [0,3,5,6, 5,3,0,1, 3,5,6,5, 3,1,0,2],
      },
    };

    let noteIndex = 0;

    function scheduleNote() {
      if (!bgmPlaying || !soundEnabled || !audioCtx) return;
      const mood = MOODS[currentMood] || MOODS.title;
      const idx = mood.pattern[noteIndex % mood.pattern.length];
      const freq = mood.notes[idx % mood.notes.length];

      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const t = audioCtx.currentTime;

        osc.type = mood.type;
        osc.frequency.setValueAtTime(freq, t);

        const noteDur = mood.tempo / 1000 * 0.9;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(bgmVolume, t + 0.02);
        gain.gain.setValueAtTime(bgmVolume, t + noteDur * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + noteDur);

        if (!bgmGain) {
          bgmGain = audioCtx.createGain();
          bgmGain.connect(audioCtx.destination);
        }
        bgmGain.gain.value = 1;
        osc.connect(gain).connect(bgmGain);
        osc.start(t);
        osc.stop(t + noteDur + 0.05);
      } catch (_) {}

      noteIndex++;
    }

    return {
      play(mood) {
        if (mood) currentMood = mood;
        if (bgmPlaying) { this.setMood(mood || currentMood); return; }
        ensureAudio();
        bgmPlaying = true;
        noteIndex = 0;
        const tempo = () => (MOODS[currentMood] || MOODS.title).tempo;
        const loop = () => {
          if (!bgmPlaying) return;
          scheduleNote();
          bgmInterval = setTimeout(loop, tempo());
        };
        loop();
      },
      stop() {
        bgmPlaying = false;
        if (bgmInterval) { clearTimeout(bgmInterval); bgmInterval = null; }
        noteIndex = 0;
      },
      setMood(mood) {
        currentMood = mood;
        noteIndex = 0;
      },
      setVolume(v) {
        bgmVolume = Math.max(0, Math.min(1, v));
        if (bgmGain) bgmGain.gain.value = bgmVolume > 0 ? 1 : 0;
      },
      getVolume() { return bgmVolume; },
      isPlaying() { return bgmPlaying; },
    };
  })();

  return {
    ensureAudio,
    SFX,
    BGM,
    set soundEnabled(v) { soundEnabled = !!v; },
    get soundEnabled() { return soundEnabled; },
  };
})();
