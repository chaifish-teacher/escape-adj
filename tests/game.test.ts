import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { elapsed, ranking, time, emptyProgress } from "../src/game";
import {
  vocabulary,
  puzzle,
  characters,
  code,
  questions,
  branchTree,
  countPeople,
} from "../src/data";
describe("source content", () => {
  it("preserves all original words and extracted images", () => {
    expect(vocabulary).toHaveLength(24);
    for (const w of vocabulary)
      expect(existsSync(`public${w.image}`)).toBe(true);
    for (const image of characters)
      expect(existsSync(`public${image}`)).toBe(true);
    for (const p of puzzle) expect(existsSync(`public${p.image}`)).toBe(true);
    expect(vocabulary.map((w) => w.word)).toEqual(
      expect.arrayContaining(["trousers", "jumper", "moustache"]),
    );
  });
  it("retains original blue-letter logic and four digits", () => {
    expect(
      puzzle
        .map((p) => p.word.replaceAll(" ", "")[p.highlight])
        .join("")
        .toUpperCase(),
    ).toBe("ENGLISH");
    expect(code).toBe("3412");
    expect(branchTree[4].digits![1]).toBe(4);
    expect(countPeople.map((x) => x.length).join("")).toBe("1121");
  });
  it("creates unique questions with four choices and exact spelling letters", () => {
    for (const kind of ["vocab", "listen", "spell"]) {
      const q = questions(kind);
      expect(q).toHaveLength(kind === "vocab" ? 8 : 6);
      expect(new Set(q.map((x) => x.target.word)).size).toBe(q.length);
      q.forEach((x) => {
        expect(x.options).toHaveLength(4);
        expect(x.options.filter((o) => o.word === x.target.word)).toHaveLength(
          1,
        );
      });
    }
  });
});
describe("timer and ranking", () => {
  it("uses original timestamp through reload and separates penalties", () => {
    const a = {
      id: "a",
      start: 100000,
      wrong: 3,
      monster: 2,
      digits: "34",
      practice: false,
      progress: emptyProgress(),
    };
    const restored = JSON.parse(JSON.stringify(a));
    expect(elapsed(restored, 610000)).toBe(510);
    restored.end = 610000;
    expect(ranking(restored)).toBe(540);
    expect(time(ranking(restored))).toBe("09:00");
    expect(elapsed(restored, 999999)).toBe(510);
  });
});
