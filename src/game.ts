export type Stage =
  | "login"
  | "menu"
  | "learn"
  | "vocab"
  | "listen"
  | "spell"
  | "intro"
  | "escape"
  | "result";
export type Attempt = {
  id: string;
  start: number;
  end?: number;
  wrong: number;
  monster: number;
  digits: string;
  practice: boolean;
  progress: {
    branch: number;
    route: string[];
    puzzleIndex: number;
    selections: number[][];
    countIndex: number;
    letters?: number[];
  };
  pending?: boolean;
  revision?: number;
};
export type State = {
  playerId: string;
  token?: string;
  name: string;
  stage: Stage;
  unlocked: number;
  scores: Record<string, { correct: number; incorrect: number; total: number }>;
  attempt?: Attempt;
  official?: Attempt;
};
export const emptyProgress = () => ({
  branch: 0,
  route: [],
  puzzleIndex: 0,
  selections: [[], [], [], []],
  countIndex: 0,
});
export function fresh(): State {
  return {
    playerId: crypto.randomUUID(),
    name: "",
    stage: "login",
    unlocked: 0,
    scores: {},
  };
}
export function elapsed(a: Attempt, now = Date.now()) {
  return Math.max(0, Math.floor(((a.end ?? now) - a.start) / 1000));
}
export function ranking(a: Attempt) {
  return elapsed(a) + a.wrong * 10;
}
export function time(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
