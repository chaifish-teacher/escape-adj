export type Word = {
  word: string;
  zh: string;
  example: string;
  image: string;
  category: "appearance" | "clothes";
};
const rows: [string, string, string, number][] = [
  ["tall", "高的", "She is tall.", 8],
  ["short", "矮的", "She is short.", 6],
  ["young", "年輕的", "He is young.", 9],
  ["elderly", "年長的", "He is elderly.", 15],
  ["slim", "纖瘦的", "She is slim.", 10],
  ["bald", "禿頭的", "He is bald.", 16],
  ["long hair", "長髮", "She has long hair.", 5],
  ["short hair", "短髮", "She has short hair.", 7],
  ["curly hair", "捲髮", "He has curly hair.", 14],
  ["straight hair", "直髮", "She has straight hair.", 13],
  ["blonde hair", "金髮", "She has blonde hair.", 12],
  ["dark hair", "深色頭髮", "He has dark hair.", 17],
  ["beard", "鬍鬚", "He has a beard.", 11],
  ["moustache", "上唇鬍鬚", "He has a moustache.", 18],
  ["glasses", "眼鏡", "These are glasses.", 25],
  ["scarf", "圍巾", "This is a scarf.", 26],
  ["gloves", "手套", "These are gloves.", 24],
  ["shoes", "鞋子", "These are shoes.", 28],
  ["cap", "鴨舌帽", "This is a cap.", 21],
  ["trousers", "長褲", "These are trousers.", 20],
  ["handbag", "手提包", "This is a handbag.", 23],
  ["hat", "帽子", "This is a hat.", 22],
  ["jacket", "外套", "This is a jacket.", 19],
  ["jumper", "毛衣", "This is a jumper.", 27],
];
export const vocabulary: Word[] = rows.map(([word, zh, example, n], i) => ({
  word,
  zh,
  example,
  image: `/assets/vocabulary/image${n}.png`,
  category: i < 14 ? "appearance" : "clothes",
}));
export const description =
  "He's tall and has short brown hair. He's wearing blue jeans, a shirt and brown shoes. He doesn't have a moustache or a beard.";
export const characters = [36, 37, 38, 39, 40, 41].map(
  (n) => `/assets/characters/slide8-image${n}.png`,
);
export const monsters = [30, 31, 32, 33].map(
  (n) => `/assets/monsters/image${n}.png`,
);
export const puzzle = [
  ["beard", 45, 1],
  ["long hair", 49, 2],
  ["young", 50, 4],
  ["slim", 46, 1],
  ["short hair", 48, 7],
  ["glasses", 51, 3],
  ["moustache", 47, 7],
].map(([word, image, highlight]) => ({
  word: String(word),
  image: `/assets/puzzles/slide10-image${image}.png`,
  highlight: Number(highlight),
}));
export const branchTree = [
  {
    question: "Does the woman have long hair?",
    options: ["YES", "NO"],
    next: [1, 2],
  },
  {
    question: "Is she wearing a jacket?",
    options: ["YES", "NO"],
    next: [3, 4],
  },
  {
    question: "Does she have glasses on?",
    options: ["YES", "NO"],
    next: [5, 6],
  },
  {
    question: "Is she wearing a scarf?",
    options: ["YES", "NO"],
    digits: [1, 2],
  },
  {
    question: "What colour are her trousers?",
    options: ["BLACK", "BLUE"],
    digits: [3, 4],
  },
  {
    question: "What colour is her hair?",
    options: ["BLONDE", "BROWN"],
    digits: [5, 6],
  },
  {
    question: "Is she carrying a handbag?",
    options: ["YES", "NO"],
    digits: [7, 8],
  },
];
export const countPrompts = [
  "wear glasses",
  "have curly hair",
  "have short hair",
  "have blonde hair",
];
export const countPeople = [[3], [0], [1, 3], [1]];
export const code = "3412";
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Curated alternatives avoid pictures with overlapping correct hair attributes.
const pictureDistractors: Record<string, string[]> = {
  "long hair": ["short hair", "young", "moustache"],
  "short hair": ["long hair", "blonde hair", "straight hair"],
  "curly hair": ["short hair", "straight hair", "young"],
  beard: ["short hair", "curly hair", "moustache"],
};
const wordDistractors: Record<string, string[]> = {
  "long hair": ["short hair", "bald", "glasses"],
  "short hair": ["long hair", "bald", "glasses"],
  "curly hair": ["straight hair", "bald", "glasses"],
  beard: ["bald", "long hair", "glasses"],
};
export type Question = {
  target: Word;
  options: Word[];
  type: "word" | "picture" | "sentence";
};
export function questions(kind: string): Question[] {
  const people = vocabulary.filter((w) => w.word in pictureDistractors);
  const clothes = vocabulary.filter((w) => w.category === "clothes");
  const selected =
    kind === "listen"
      ? shuffle([
          ...shuffle(people).slice(0, 3),
          ...shuffle(clothes).slice(0, 3),
        ])
      : shuffle([...people, ...clothes]).slice(0, kind === "vocab" ? 8 : 6);
  return selected.map((target, i) => {
    const type: Question["type"] =
      kind === "listen"
        ? target.category === "appearance"
          ? "sentence"
          : "picture"
        : i % 2
          ? "picture"
          : "word";
    const alternatives =
      target.category === "clothes"
        ? shuffle(clothes.filter((w) => w !== target)).slice(0, 3)
        : (type === "word" ? wordDistractors : pictureDistractors)[
            target.word
          ].map((word) => vocabulary.find((w) => w.word === word)!);
    return { target, type, options: shuffle([target, ...alternatives]) };
  });
}
