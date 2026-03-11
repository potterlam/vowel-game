# Vowel Quest: Castle of Letters 🏰

A mobile-friendly web game where kids identify vowels, consonants, and spell words while progressing through a fantasy castle adventure.

**🎮 Play Now → [https://potterlam.github.io/vowel-game/](https://potterlam.github.io/vowel-game/)**

## 🎮 How to Play

### 🔤 Vowel Mode (Main)
1. See a picture + word → tap the **vowel buttons** (A, E, I, O, U) that appear in the word → submit

### 🗡️ Consonant Mode (DLC)
1. Same questions → tap the **consonant buttons** instead

### ✏️ Spelling Mode (DLC)
1. See the picture + hear the word → **spell it letter by letter** using the on-screen A-Z keyboard or text input
2. The next expected letter glows green as a hint

## 🏯 Features

- **10 Levels** — Gate → Garden → Kitchen → Library → Armory → Dungeon → Wizard's Lab → Dragon's Lair → Throne Room → Boss 🐉
- **100 Picture Questions** with emoji illustrations
- **3 Game Modes** — Vowels, Consonants (DLC), Spelling (DLC)
- **Boss Battle** (Level 10) with countdown timer ⏱️
- **🌐 Bilingual** — English / 繁體中文 language toggle
- **🎵 Synthesized BGM** — 3 moods (title / game / boss) with volume slider
- **🔊 Sound Effects** — all synthesized via Web Audio API, zero external files
- **🗣️ Text-to-Speech** — hear each word pronounced
- **✨ Particle Effects** — sparkles, confetti, score popups
- **⭐ 3-Star Rating** per level
- **💾 Auto-Save** — progress saved per mode via localStorage
- **📱 Fully Responsive** — designed for smartphones (max-width 480px)
- **🧚 Companion Fairy** — random tips & encouragement

## 🚀 Play

Open `index.html` in any modern browser, or visit:

👉 **[https://potterlam.github.io/vowel-game/](https://potterlam.github.io/vowel-game/)**

## 📁 Project Structure

```
vowel-game/
├── index.html           # Main game page (all screens)
├── css/
│   └── style.css        # Fantasy castle theme + responsive
├── js/
│   ├── i18n.js          # EN/ZH translations
│   ├── questions.js     # 100-word question bank (3 levels)
│   └── game.js          # Game engine (~1400 lines)
└── README.md
```

## 🛠️ Tech Stack

- **Vanilla HTML / CSS / JavaScript** — zero frameworks, zero dependencies
- **Web Audio API** — synthesized SFX + BGM (no audio files)
- **Web Speech Synthesis API** — TTS word pronunciation
- **Canvas API** — particle effects system
- **localStorage** — per-mode progress saving + language/volume preferences
- **Google Fonts** — Cinzel (headings) + Nunito (body)

## 📜 License

MIT
