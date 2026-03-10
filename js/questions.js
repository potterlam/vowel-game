/* ===================================================
   VOWEL QUEST — 100 Question Bank
   10 Levels × 10 Questions
   Each question: word, emoji picture, unique vowels
   =================================================== */

const LEVELS = [
  {
    id: 1,
    name: "Castle Gate",
    emoji: "🚪",
    description: "Simple words guard the entrance.",
    introStory: "You arrive at the gates of the Enchanted Castle. The gates are sealed with ancient word magic. To enter, you must prove your knowledge of vowels! Identify the vowels in simple words to unlock the gate.",
    completeStory: "The Castle Gate groans open! Torches flicker to life along the corridor. Your vowel knowledge has impressed the ancient guardians. Onward, brave adventurer!",
    bg: "#1a0a40"
  },
  {
    id: 2,
    name: "Garden Path",
    emoji: "🌿",
    description: "Nature words bloom in the enchanted garden.",
    introStory: "Beyond the gate lies a beautiful but enchanted garden. The plants whisper words that have lost their vowels. Can you help the garden bloom again?",
    completeStory: "Flowers burst into color as vowels return to the garden words! Butterflies dance around you, guiding the way deeper into the castle.",
    bg: "#0a2a1a"
  },
  {
    id: 3,
    name: "Kitchen Hall",
    emoji: "🍳",
    description: "The castle cook needs your help!",
    introStory: "The castle kitchen is in disarray! The cook has lost all the vowels in the recipe words. Without them, no feast can be prepared. Help restore order to the kitchen!",
    completeStory: "Delicious aromas fill the air as recipes are restored! The cook hands you a magical cookie that glows with golden light. Your strength grows!",
    bg: "#2a1a0a"
  },
  {
    id: 4,
    name: "Library Tower",
    emoji: "📚",
    description: "Ancient wisdom awaits in dusty tomes.",
    introStory: "You climb the winding staircase to the Library Tower. Ancient books fill the shelves, their words fading without vowels. Wisdom awaits those who can restore them.",
    completeStory: "Books glow with renewed magic as their vowels return! A secret passage opens behind a bookshelf, revealing a spiral staircase leading deeper into the castle.",
    bg: "#1a1a3a"
  },
  {
    id: 5,
    name: "Armory Room",
    emoji: "⚔️",
    description: "Weapons of power need their vowels.",
    introStory: "The Armory gleams with legendary weapons and enchanted armor. Each piece is inscribed with words of power — but the vowels have been stolen! Find them to unlock their strength.",
    completeStory: "The weapons hum with restored power! A magnificent sword floats toward you — the Vowel Blade, which glows brighter with each vowel you identify. You are ready for the dangers below!",
    bg: "#2a0a0a"
  },
  {
    id: 6,
    name: "Dungeon Depths",
    emoji: "🕯️",
    description: "Dark words lurk in the shadows.",
    introStory: "You descend into the castle dungeons. Shadows dance on the walls and strange sounds echo through dark corridors. Words of darkness test even the bravest knights. Stay sharp!",
    completeStory: "Light returns to the dungeon as you conquer the shadow words! Strange runes on the wall begin to glow, revealing a hidden passage to the mysterious Wizard's Lab above.",
    bg: "#0a0a20"
  },
  {
    id: 7,
    name: "Wizard's Lab",
    emoji: "🔮",
    description: "Magical experiments need vowel power.",
    introStory: "The Wizard's Lab bubbles with magical experiments. Potions glow in colorful vials and spell books float in the air. These magical words need their vowels to work properly. One wrong vowel could be disaster!",
    completeStory: "Potions stabilize and spells reactivate! The wizard's crystal ball shows a vision — a great dragon guards the treasure chamber ahead. But now you have magical knowledge on your side!",
    bg: "#200a30"
  },
  {
    id: 8,
    name: "Dragon's Lair",
    emoji: "🐉",
    description: "Face the dragon's riddle of words.",
    introStory: "A great dragon coils around its treasure hoard in the deepest chamber. Its eyes gleam with ancient intelligence. 'Solve my word riddles,' it rumbles, 'and I shall let you pass.'",
    completeStory: "The dragon bows its great head in respect. 'You are worthy,' it says, and moves aside to reveal a golden door. Beyond it lies the Throne Room of the castle!",
    bg: "#2a1000"
  },
  {
    id: 9,
    name: "Throne Room",
    emoji: "👑",
    description: "Royal words of great importance.",
    introStory: "You've reached the Throne Room! Magnificent tapestries line the walls and a jeweled throne sits upon a dais. But the royal words inscribed here are incomplete. Prove your worth to earn the right to face the Dark Sorcerer!",
    completeStory: "The throne room fills with golden light! A crown materializes above your head — you are now the Champion of Vowels! But one final challenge remains: the Dark Sorcerer himself awaits in the tower above!",
    bg: "#1a0a2a"
  },
  {
    id: 10,
    name: "Dark Sorcerer",
    emoji: "🧙‍♂️",
    description: "⚡ BOSS BATTLE — Beat the timer!",
    introStory: "The Dark Sorcerer appears in a flash of dark lightning! 'Foolish knight!' he cackles. 'You will NEVER restore the vowels to this kingdom!' His dark magic creates a time vortex — you must defeat him before time runs out!",
    completeStory: "The Dark Sorcerer screams as his power shatters! Light floods through every window of the castle as vowels flow back into every word in the kingdom. You have saved the Kingdom of Letters!",
    bg: "#1a0008",
    isBoss: true,
    timerSeconds: 120
  }
];

const QUESTIONS = [
  /* ========================
     LEVEL 1 — Castle Gate
     Simple 3-letter words
     ======================== */
  { id:1,  level:1,  word:"CAT",    emoji:"🐱", vowels:["A"],   hint:"A furry pet that purrs" },
  { id:2,  level:1,  word:"DOG",    emoji:"🐕", vowels:["O"],   hint:"Man's best friend" },
  { id:3,  level:1,  word:"SUN",    emoji:"☀️",  vowels:["U"],   hint:"It shines in the sky" },
  { id:4,  level:1,  word:"BED",    emoji:"🛏️",  vowels:["E"],   hint:"You sleep here" },
  { id:5,  level:1,  word:"PIG",    emoji:"🐷", vowels:["I"],   hint:"A pink farm animal" },
  { id:6,  level:1,  word:"CUP",    emoji:"☕",  vowels:["U"],   hint:"You drink from it" },
  { id:7,  level:1,  word:"HAT",    emoji:"🎩", vowels:["A"],   hint:"Worn on your head" },
  { id:8,  level:1,  word:"BUS",    emoji:"🚌", vowels:["U"],   hint:"A large vehicle" },
  { id:9,  level:1,  word:"PEN",    emoji:"✏️",  vowels:["E"],   hint:"Used for writing" },
  { id:10, level:1,  word:"FIN",    emoji:"🦈", vowels:["I"],   hint:"A fish uses this to swim" },

  /* ========================
     LEVEL 2 — Garden Path
     Nature & garden words
     ======================== */
  { id:11, level:2,  word:"TREE",   emoji:"🌳", vowels:["E"],        hint:"It has leaves and branches" },
  { id:12, level:2,  word:"ROSE",   emoji:"🌹", vowels:["O","E"],    hint:"A beautiful flower" },
  { id:13, level:2,  word:"BIRD",   emoji:"🐦", vowels:["I"],        hint:"It flies in the sky" },
  { id:14, level:2,  word:"FROG",   emoji:"🐸", vowels:["O"],        hint:"It says ribbit" },
  { id:15, level:2,  word:"FISH",   emoji:"🐟", vowels:["I"],        hint:"It lives in water" },
  { id:16, level:2,  word:"LEAF",   emoji:"🍃", vowels:["E","A"],    hint:"Grows on a tree branch" },
  { id:17, level:2,  word:"SEED",   emoji:"🌱", vowels:["E"],        hint:"Plant this to grow something" },
  { id:18, level:2,  word:"ROCK",   emoji:"🪨", vowels:["O"],        hint:"A hard natural object" },
  { id:19, level:2,  word:"VINE",   emoji:"🌿", vowels:["I","E"],    hint:"A climbing plant" },
  { id:20, level:2,  word:"POND",   emoji:"🌊", vowels:["O"],        hint:"A small body of water" },

  /* ========================
     LEVEL 3 — Kitchen Hall
     Food & kitchen words
     ======================== */
  { id:21, level:3,  word:"CAKE",   emoji:"🎂", vowels:["A","E"],    hint:"A sweet birthday treat" },
  { id:22, level:3,  word:"RICE",   emoji:"🍚", vowels:["I","E"],    hint:"A grain eaten worldwide" },
  { id:23, level:3,  word:"SOUP",   emoji:"🍲", vowels:["O","U"],    hint:"A warm liquid food" },
  { id:24, level:3,  word:"MILK",   emoji:"🥛", vowels:["I"],        hint:"A white drink from cows" },
  { id:25, level:3,  word:"MEAT",   emoji:"🥩", vowels:["E","A"],    hint:"Protein from animals" },
  { id:26, level:3,  word:"APPLE",  emoji:"🍎", vowels:["A","E"],    hint:"A crunchy red fruit" },
  { id:27, level:3,  word:"JUICE",  emoji:"🧃", vowels:["U","I","E"],hint:"A fruity drink" },
  { id:28, level:3,  word:"TOAST",  emoji:"🍞", vowels:["O","A"],    hint:"Crispy browned bread" },
  { id:29, level:3,  word:"SPOON",  emoji:"🥄", vowels:["O"],        hint:"Used for eating soup" },
  { id:30, level:3,  word:"PLATE",  emoji:"🍽️",  vowels:["A","E"],    hint:"You put food on it" },

  /* ========================
     LEVEL 4 — Library Tower
     Knowledge & learning words
     ======================== */
  { id:31, level:4,  word:"BOOK",   emoji:"📚", vowels:["O"],        hint:"You read this" },
  { id:32, level:4,  word:"PAGE",   emoji:"📄", vowels:["A","E"],    hint:"One sheet in a book" },
  { id:33, level:4,  word:"GLOBE",  emoji:"🌍", vowels:["O","E"],    hint:"A model of the Earth" },
  { id:34, level:4,  word:"CLOCK",  emoji:"🕐", vowels:["O"],        hint:"It tells the time" },
  { id:35, level:4,  word:"MUSIC",  emoji:"🎵", vowels:["U","I"],    hint:"Sound arranged in melody" },
  { id:36, level:4,  word:"RULER",  emoji:"📏", vowels:["U","E"],    hint:"Measures length" },
  { id:37, level:4,  word:"CANDLE", emoji:"🕯️",  vowels:["A","E"],    hint:"Burns with a flame" },
  { id:38, level:4,  word:"QUILL",  emoji:"✒️",  vowels:["U","I"],    hint:"An old-fashioned pen" },
  { id:39, level:4,  word:"PUZZLE", emoji:"🧩", vowels:["U","E"],    hint:"A game to solve" },
  { id:40, level:4,  word:"POTION", emoji:"🧪", vowels:["O","I"],    hint:"A magical liquid" },

  /* ========================
     LEVEL 5 — Armory Room
     Battle & weapon words
     ======================== */
  { id:41, level:5,  word:"SWORD",  emoji:"⚔️",  vowels:["O"],        hint:"A long sharp blade" },
  { id:42, level:5,  word:"SHIELD", emoji:"🛡️",  vowels:["I","E"],    hint:"Blocks attacks" },
  { id:43, level:5,  word:"ARMOR",  emoji:"🪖", vowels:["A","O"],    hint:"Metal body protection" },
  { id:44, level:5,  word:"LANCE",  emoji:"🗡️",  vowels:["A","E"],    hint:"A long jousting weapon" },
  { id:45, level:5,  word:"ARROW",  emoji:"🏹", vowels:["A","O"],    hint:"Shot from a bow" },
  { id:46, level:5,  word:"BLADE",  emoji:"🔪", vowels:["A","E"],    hint:"The sharp edge of a weapon" },
  { id:47, level:5,  word:"HORSE",  emoji:"🐴", vowels:["O","E"],    hint:"A knight rides this" },
  { id:48, level:5,  word:"STEEL",  emoji:"⚙️",  vowels:["E"],        hint:"A strong metal alloy" },
  { id:49, level:5,  word:"BRAVE",  emoji:"💪", vowels:["A","E"],    hint:"Having courage" },
  { id:50, level:5,  word:"HELM",   emoji:"⛑️",  vowels:["E"],        hint:"A protective helmet" },

  /* ========================
     LEVEL 6 — Dungeon Depths
     Dark & mystery words
     ======================== */
  { id:51, level:6,  word:"STONE",  emoji:"🪨", vowels:["O","E"],    hint:"A piece of rock" },
  { id:52, level:6,  word:"FLAME",  emoji:"🔥", vowels:["A","E"],    hint:"Fire's dancing light" },
  { id:53, level:6,  word:"SNAKE",  emoji:"🐍", vowels:["A","E"],    hint:"A slithering reptile" },
  { id:54, level:6,  word:"CHAIN",  emoji:"⛓️",  vowels:["A","I"],    hint:"Metal links connected" },
  { id:55, level:6,  word:"BONES",  emoji:"🦴", vowels:["O","E"],    hint:"Inside your body" },
  { id:56, level:6,  word:"GHOST",  emoji:"👻", vowels:["O"],        hint:"A spooky spirit" },
  { id:57, level:6,  word:"TORCH",  emoji:"🔦", vowels:["O"],        hint:"Portable light source" },
  { id:58, level:6,  word:"SPIDER", emoji:"🕷️",  vowels:["I","E"],    hint:"Spins a web" },
  { id:59, level:6,  word:"SKULL",  emoji:"💀", vowels:["U"],        hint:"Head bones" },
  { id:60, level:6,  word:"VAULT",  emoji:"🔒", vowels:["A","U"],    hint:"A secure room" },

  /* ========================
     LEVEL 7 — Wizard's Lab
     Magic & arcane words
     ======================== */
  { id:61, level:7,  word:"SPELL",  emoji:"🪄", vowels:["E"],        hint:"Words of magic" },
  { id:62, level:7,  word:"WAND",   emoji:"⭐",  vowels:["A"],        hint:"A wizard's tool" },
  { id:63, level:7,  word:"ROBE",   emoji:"🧙", vowels:["O","E"],    hint:"A wizard's garment" },
  { id:64, level:7,  word:"STAFF",  emoji:"🏒", vowels:["A"],        hint:"A long magical stick" },
  { id:65, level:7,  word:"RUNE",   emoji:"🔮", vowels:["U","E"],    hint:"An ancient magical symbol" },
  { id:66, level:7,  word:"ELIXIR", emoji:"🧪", vowels:["E","I"],    hint:"A magical healing drink" },
  { id:67, level:7,  word:"SMOKE",  emoji:"💨", vowels:["O","E"],    hint:"Comes from fire" },
  { id:68, level:7,  word:"CURSE",  emoji:"😈", vowels:["U","E"],    hint:"An evil spell" },
  { id:69, level:7,  word:"BOTTLE", emoji:"🍾", vowels:["O","E"],    hint:"Holds a potion" },
  { id:70, level:7,  word:"PRISM",  emoji:"🔷", vowels:["I"],        hint:"Splits light into colors" },

  /* ========================
     LEVEL 8 — Dragon's Lair
     Treasure & creature words
     ======================== */
  { id:71, level:8,  word:"DRAGON", emoji:"🐉", vowels:["A","O"],    hint:"A fire-breathing beast" },
  { id:72, level:8,  word:"SCALE",  emoji:"🐲", vowels:["A","E"],    hint:"Covers a dragon's body" },
  { id:73, level:8,  word:"WINGS",  emoji:"🦅", vowels:["I"],        hint:"Used for flying" },
  { id:74, level:8,  word:"CLAW",   emoji:"🐾", vowels:["A"],        hint:"A sharp curved nail" },
  { id:75, level:8,  word:"FIRE",   emoji:"🔥", vowels:["I","E"],    hint:"Hot and bright" },
  { id:76, level:8,  word:"GOLD",   emoji:"🪙", vowels:["O"],        hint:"A precious yellow metal" },
  { id:77, level:8,  word:"JEWEL",  emoji:"💎", vowels:["E"],        hint:"A precious stone" },
  { id:78, level:8,  word:"PEARL",  emoji:"📿", vowels:["E","A"],    hint:"Found inside an oyster" },
  { id:79, level:8,  word:"CAVE",   emoji:"🕳️",  vowels:["A","E"],    hint:"A natural underground space" },
  { id:80, level:8,  word:"TAIL",   emoji:"🦎", vowels:["A","I"],    hint:"At the back of an animal" },

  /* ========================
     LEVEL 9 — Throne Room
     Royal & noble words
     ======================== */
  { id:81, level:9,  word:"CROWN",  emoji:"👑", vowels:["O"],        hint:"Worn by a king or queen" },
  { id:82, level:9,  word:"THRONE", emoji:"🪑", vowels:["O","E"],    hint:"A royal seat" },
  { id:83, level:9,  word:"QUEEN",  emoji:"👸", vowels:["U","E"],    hint:"A female ruler" },
  { id:84, level:9,  word:"PRINCE", emoji:"🤴", vowels:["I","E"],    hint:"Son of a king" },
  { id:85, level:9,  word:"ROYAL",  emoji:"🏰", vowels:["O","A"],    hint:"Of a king or queen" },
  { id:86, level:9,  word:"CASTLE", emoji:"🏯", vowels:["A","E"],    hint:"A fortified building" },
  { id:87, level:9,  word:"NOBLE",  emoji:"🎭", vowels:["O","E"],    hint:"Of high birth" },
  { id:88, level:9,  word:"FEAST",  emoji:"🍽️",  vowels:["E","A"],    hint:"A grand celebration meal" },
  { id:89, level:9,  word:"BANNER", emoji:"🚩", vowels:["A","E"],    hint:"A flag or sign" },
  { id:90, level:9,  word:"PALACE", emoji:"🏛️",  vowels:["A","E"],    hint:"A grand royal home" },

  /* ========================
     LEVEL 10 — Dark Sorcerer (BOSS)
     Challenging longer words
     ======================== */
  { id:91,  level:10, word:"SORCERER",  emoji:"🧙‍♂️", vowels:["O","E"],        hint:"An evil magic user" },
  { id:92,  level:10, word:"ULTIMATE",  emoji:"💫",  vowels:["U","I","A","E"], hint:"The greatest of all" },
  { id:93,  level:10, word:"ENCHANT",   emoji:"✨",  vowels:["E","A"],         hint:"To cast a magical spell" },
  { id:94,  level:10, word:"UNIVERSE",  emoji:"🌌",  vowels:["U","I","E"],     hint:"Everything that exists" },
  { id:95,  level:10, word:"ADVENTURE", emoji:"🗺️",  vowels:["A","E","U"],     hint:"An exciting journey" },
  { id:96,  level:10, word:"POWERFUL",  emoji:"⚡",  vowels:["O","E","U"],     hint:"Having great strength" },
  { id:97,  level:10, word:"CHAMPION",  emoji:"🏆",  vowels:["A","I","O"],     hint:"The winner" },
  { id:98,  level:10, word:"CONQUER",   emoji:"🏴",  vowels:["O","U","E"],     hint:"To defeat and take over" },
  { id:99,  level:10, word:"VICTORY",   emoji:"🎯",  vowels:["I","O"],         hint:"Winning a battle" },
  { id:100, level:10, word:"KINGDOM",   emoji:"👑",  vowels:["I","O"],         hint:"A land ruled by a king" }
];
