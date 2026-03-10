/* ===================================================
   Vowel Quest — Internationalization (i18n)
   Supports: English (en), 繁體中文 (zh)
   =================================================== */

const I18N = {
  en: {
    gameTitle: "Vowel Quest",
    gameSubtitle: "Castle of Letters",
    tagline: "Find the vowels. Save the kingdom.",
    startBtn: "⚔️ Start Adventure",
    continueBtn: "📜 Continue Quest",
    modeVowelLabel: "🔤 Vowels",
    modeConsLabel: "🗡️ Consonants",
    modeSpellLabel: "✏️ Spelling",
    dlcBadge: "DLC",
    mapTitle: "🗺️ Castle Map",
    badgeVowel: "🔤 Vowels Mode",
    badgeCons: "🗡️ Consonants DLC",
    badgeSpell: "✏️ Spelling DLC",
    panelVowel: "Which vowels are in this word?",
    panelCons: "Which consonants are in this word?",
    panelSpell: "Spell the word letter by letter! 🎤",
    spellPlaceholder: "or type here...",
    hintShow: "Show Word",
    hintHide: "Hide Word",
    submitBtn: "✅ Submit",
    bossName: "Dark Sorcerer",
    pointsSuffix: "points!",
    feedbackWrong: "Not quite!",
    feedbackVowelAns: "The vowels are:",
    feedbackConsAns: "The consonants are:",
    feedbackLetterAns: "The letters are:",
    feedbackSpellAns: "The correct spelling is:",
    completeTitle: "🎉 Level Complete!",
    scoreLabel: "Score:",
    correctLabel: "Correct:",
    nextLevelBtn: "Next Level ➜",
    victoryTitle: "🏆 Victory! 🏆",
    victorySub: "The Kingdom is Saved!",
    victoryVowelText: "You defeated the Dark Sorcerer and restored all vowels to the Kingdom of Letters!",
    victoryConsText: "You defeated the Dark Sorcerer and restored all consonants to the Kingdom of Letters!",
    victorySpellText: "You defeated the Dark Sorcerer by spelling every word perfectly! The Kingdom of Letters is saved!",
    finalScoreLabel: "Final Score:",
    totalStarsLabel: "Total Stars:",
    playAgainBtn: "🔄 Play Again",
    gameoverTitle: "Defeated!",
    gameoverText: "The Dark Sorcerer's power was too great…",
    gameoverSub: "But a true knight never gives up!",
    gameoverScoreLabel: "Score:",
    retryBtn: "⚔️ Try Again",
    backMapBtn: "🗺️ Back to Map",
    lobbyBtn: "🏠 Back to Lobby",
    storyContBtn: "Continue ➜",
    companionVowel: [
      "Remember: A, E, I, O, U!",
      "Listen carefully to the word! 👂",
      "Vowels make words sing! 🎵",
      "You're doing great, knight! ⚔️",
      "Tap the speaker to hear the word!",
    ],
    companionCons: [
      "All letters except A,E,I,O,U!",
      "Listen for the hard sounds! 👂",
      "Consonants are the bones of words!",
      "You've unlocked the DLC! 🗡️",
      "Tap the speaker to hear the word!",
    ],
    companionSpell: [
      "Listen and type the whole word! ⌨️",
      "Sound it out letter by letter!",
      "You can do it, brave speller! 📝",
      "Tap the speaker to hear it again!",
      "Spelling masters rule the kingdom! 👑",
    ],
    hints: {}
  },

  zh: {
    gameTitle: "母音大冒險",
    gameSubtitle: "字母城堡",
    tagline: "找出母音，拯救王國。",
    startBtn: "⚔️ 開始冒險",
    continueBtn: "📜 繼續任務",
    modeVowelLabel: "🔤 母音",
    modeConsLabel: "🗡️ 子音",
    modeSpellLabel: "✏️ 拼字",
    dlcBadge: "DLC",
    mapTitle: "🗺️ 城堡地圖",
    badgeVowel: "🔤 母音模式",
    badgeCons: "🗡️ 子音 DLC",
    badgeSpell: "✏️ 拼字 DLC",
    panelVowel: "這個單字裡有哪些母音？",
    panelCons: "這個單字裡有哪些子音？",
    panelSpell: "一個字母一個字母拼出來！🎤",
    spellPlaceholder: "或在此輸入...",
    hintShow: "顯示單字",
    hintHide: "隱藏單字",
    submitBtn: "✅ 提交",
    bossName: "黑暗巫師",
    pointsSuffix: "分！",
    feedbackWrong: "不太對！",
    feedbackVowelAns: "母音是：",
    feedbackConsAns: "子音是：",
    feedbackLetterAns: "字母是：",
    feedbackSpellAns: "正確拼法是：",
    completeTitle: "🎉 關卡完成！",
    scoreLabel: "分數：",
    correctLabel: "正確：",
    nextLevelBtn: "下一關 ➜",
    victoryTitle: "🏆 勝利！🏆",
    victorySub: "王國得救了！",
    victoryVowelText: "你打敗了黑暗巫師，把所有母音歸還給了字母王國！",
    victoryConsText: "你打敗了黑暗巫師，把所有子音歸還給了字母王國！",
    victorySpellText: "你透過完美拼出每個單字打敗了黑暗巫師！字母王國得救了！",
    finalScoreLabel: "最終分數：",
    totalStarsLabel: "總星數：",
    playAgainBtn: "🔄 再玩一次",
    gameoverTitle: "戰敗！",
    gameoverText: "黑暗巫師的力量太強大了⋯",
    gameoverSub: "但真正的騎士永不放棄！",
    gameoverScoreLabel: "分數：",
    retryBtn: "⚔️ 再試一次",
    backMapBtn: "🗺️ 返回地圖",
    lobbyBtn: "🏠 返回大廳",
    storyContBtn: "繼續 ➜",
    companionVowel: [
      "記住：A、E、I、O、U！",
      "仔細聽這個單字！👂",
      "母音讓單字歌唱！🎵",
      "你做得很好，騎士！⚔️",
      "點擊喇叭聽單字發音！",
    ],
    companionCons: [
      "除了 A、E、I、O、U 以外的字母！",
      "聽聽那些硬音！👂",
      "子音是單字的骨架！",
      "你解鎖了 DLC！🗡️",
      "點擊喇叭聽單字發音！",
    ],
    companionSpell: [
      "仔細聽然後拼出整個單字！⌨️",
      "一個字母一個字母地拼！",
      "你做得到的，勇敢的拼字者！📝",
      "點擊喇叭再聽一次！",
      "拼字大師統治王國！👑",
    ],
    levels: {
      1: {
        name: "城堡大門",
        desc: "簡單的詞語守衛著入口。",
        intro: "你來到了魔法城堡的大門前。古老的守衛者用文字魔法封印了入口！證明你的字母知識就能通過。你的精靈夥伴在身邊翩翩飛舞，準備好幫助你！",
        complete: "城堡大門吱嘎作響地打開了！走廊上的火把紛紛點亮。你的字母知識讓古老的守衛者印象深刻。你發現地上有一把發光的魔法鑰匙！"
      },
      2: {
        name: "龍之巢穴",
        desc: "面對巨龍的文字謎題。",
        intro: "在大門之後，一條巨龍盤踞在牠的寶藏堆上。牠金色的眼睛閃爍著古老的智慧。「回答我的文字謎題，」牠轟隆著說，「我就讓你通過去黑暗巫師的高塔！」",
        complete: "巨龍恭敬地低下了牠偉大的頭顱。「你是值得的，」牠說，然後移開身體露出一扇金色的門。牠賜予你一片龍鱗作為保護！"
      },
      3: {
        name: "黑暗巫師",
        desc: "⚡ 魔王戰 — 在時間內擊敗他！",
        intro: "黑暗巫師在一道黑色閃電中現身！「愚蠢的騎士！」他咯咯笑著。「你永遠無法把字母歸還給這個王國！」他的黑暗魔法創造了一個時間漩渦——你必須在時間耗盡前擊敗他！",
        complete: "黑暗巫師因力量崩碎而尖叫！光線從城堡的每扇窗戶湧入，字母流回了王國中的每個詞語。你拯救了字母王國！"
      }
    },
    hints: {
      1: "一隻會呼嚕叫的毛茸茸寵物",
      2: "人類最好的朋友",
      3: "它在天空中照耀",
      4: "你在這裡睡覺",
      5: "粉紅色的農場動物",
      6: "你用它來喝東西",
      7: "戴在頭上的東西",
      8: "一種大型交通工具",
      9: "用來寫字的工具",
      10: "魚用它來游泳",
      11: "有葉子和樹枝",
      12: "一朵美麗的花",
      13: "在天空中飛翔",
      14: "會說呱呱",
      15: "生活在水裡",
      16: "長在樹枝上",
      17: "種下去就會長出東西",
      18: "堅硬的天然物體",
      19: "一種攀爬植物",
      20: "小型的水域",
      21: "甜甜的生日甜點",
      22: "全球食用的穀物",
      23: "溫暖的流質食物",
      24: "來自牛的白色飲料",
      25: "來自動物的蛋白質",
      26: "你拿來閱讀的東西",
      27: "在夜空中發光",
      28: "在天空中閃爍",
      29: "有鬍子的農場動物",
      30: "會叮噹叮噹響",
      31: "會嘎嘎叫和游泳",
      32: "鳥的家",
      33: "從雲裡掉下來",
      34: "漂浮在水面上",
      35: "隨風飛翔的東西",
      36: "用敲打演奏的樂器",
      37: "包裝好的禮物",
      38: "會發出光亮",
      39: "戴在手指上的東西",
      40: "你用它來揮手",
      41: "一把長而鋒利的刀刃",
      42: "用來擋住攻擊",
      43: "金屬製的身體防護",
      44: "長矛式的武器",
      45: "從弓射出的東西",
      46: "武器的鋒利邊緣",
      47: "騎士騎乘的動物",
      48: "擁有勇氣的",
      49: "一塊岩石",
      50: "火焰的舞動光芒",
      51: "會滑行的爬蟲類",
      52: "連接在一起的金屬環",
      53: "恐怖的靈魂",
      54: "可攜帶的光源",
      55: "魔法的咒語",
      56: "古老的魔法符號",
      57: "從火中產生的東西",
      58: "會噴火的野獸",
      59: "覆蓋龍身體的東西",
      60: "尖銳彎曲的指甲",
      61: "又熱又亮",
      62: "珍貴的黃色金屬",
      63: "珍貴的寶石",
      64: "國王或女王戴的",
      65: "皇家的座椅",
      66: "女性的統治者",
      67: "國王的兒子",
      68: "堅固的城堡建築",
      69: "出身高貴的人",
      70: "盛大的慶祝宴席",
      71: "在牡蠣裡面找到的",
      72: "天然的地下空間",
      73: "用來飛行的東西",
      74: "組成旋律的聲音",
      75: "頭部的骨頭",
      76: "脆脆的紅色水果",
      77: "烤過的脆麵包",
      78: "放食物的餐具",
      79: "告訴你現在幾點",
      80: "地球的模型",
      81: "邪惡的魔法使用者",
      82: "最偉大的",
      83: "施展魔法咒語",
      84: "存在的一切事物",
      85: "一段令人興奮的旅程",
      86: "擁有強大的力量",
      87: "最終的贏家",
      88: "打敗並佔領",
      89: "贏得一場戰鬥",
      90: "國王統治的土地",
      91: "珍貴的財富寶藏",
      92: "在危險中保持勇敢",
      93: "魔法的液體",
      94: "需要解開的遊戲",
      95: "用火焰燃燒",
      96: "會織網的生物",
      97: "宏偉的皇家住所",
      98: "旗幟或標誌",
      99: "魔法治療飲料",
      100: "用來裝藥水的容器"
    }
  }
};

let currentLang = "en";

/* Get a translated string by key */
function t(key) {
  const val = I18N[currentLang]?.[key];
  if (val !== undefined) return val;
  return I18N["en"][key] || key;
}

/* Get translated level data field (name, desc, intro, complete) */
function tLevel(levelId, field) {
  const langLevels = I18N[currentLang]?.levels;
  if (langLevels?.[levelId]?.[field]) return langLevels[levelId][field];
  const lvl = (typeof LEVELS !== "undefined") && LEVELS.find(l => l.id === levelId);
  if (lvl) {
    const map = { name: "name", desc: "description", intro: "introStory", complete: "completeStory" };
    return lvl[map[field]] || "";
  }
  return "";
}

/* Get translated hint for a question */
function tHint(q) {
  const hints = I18N[currentLang]?.hints;
  if (hints && hints[q.id]) return hints[q.id];
  return q.hint;
}

/* Refresh all DOM elements with data-i18n attribute */
function refreshI18nDOM() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (typeof val === "string") {
      if (el.tagName === "INPUT") el.placeholder = val;
      else el.textContent = val;
    }
  });
}
