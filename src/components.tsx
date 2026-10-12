import { useEffect, useState } from "react";
import { Volume2, Trophy, ArrowRight, Check } from "lucide-react";
import { questions, shuffle, type Question } from "./data";
import { call, hasBackend, type Leader } from "./api";
import { speak, sound } from "./audio";
import { time } from "./game";
export function Audio({
  text,
  label = "Listen 聆聽",
}: {
  text: string;
  label?: string;
}) {
  const [fallback, setFallback] = useState(false);
  return (
    <>
      <button
        className="audio"
        onClick={() => speak(text, () => setFallback(true))}
      >
        <Volume2 size={18} />
        {label}
      </button>
      {fallback && (
        <p className="muted">
          Audio unavailable. Read: {text}
          <br />
          語音無法使用，請閱讀文字。
        </p>
      )}
    </>
  );
}
export function Leaderboard({ refresh = 0 }: { refresh?: number }) {
  const [rows, setRows] = useState<Leader[]>([]),
    [status, setStatus] = useState("Loading… 載入中");
  useEffect(() => {
    let live = true;
    if (!hasBackend()) {
      setStatus("The leaderboard is resting. 線上排行榜尚未連接。");
      return;
    }
    call("leaderboard")
      .then((data) => {
        if (live) {
          setRows(data.entries);
          setStatus(
            data.entries.length
              ? ""
              : "Be the first tower hero! 成為第一位勇者！",
          );
        }
      })
      .catch(() => {
        if (live)
          setStatus(
            "Temporarily unavailable. You can still play. 暫時無法讀取，你仍可遊玩。",
          );
      });
    return () => {
      live = false;
    };
  }, [refresh]);
  return (
    <section className="leaderboard">
      <div className="section-label">
        <Trophy size={17} /> HALL OF HEROES <span>TOP 10</span>
      </div>
      <h3>
        The fastest escapes <small>最快逃脫紀錄</small>
      </h3>
      {rows.length ? (
        <ol>
          {rows.map((r, i) => (
            <li key={i}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span>{r.name}</span>
              <strong>{time(r.rankingTime)}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">{status}</p>
      )}
      <p className="fine">
        First official escape only · 每位玩家僅採計首次正式完成
      </p>
    </section>
  );
}
export function Letters({
  word,
  onSubmit,
  highlight,
  onChange,
  initial = [],
}: {
  word: string;
  onSubmit: (answer: string) => void;
  highlight?: number;
  onChange?: (selected: number[]) => void;
  initial?: number[];
}) {
  const [tiles] = useState(() =>
    shuffle(
      word
        .replaceAll(" ", "")
        .split("")
        .map((letter, id) => ({ letter, id })),
    ),
  );
  const [chosen, setChosen] = useState<number[]>(initial);
  const update = (n: number[]) => {
    setChosen(n);
    onChange?.(n);
  };
  let position = 0;
  return (
    <div className="letter-game">
      <div className="answer-slots">
        {word.split(" ").map((part, p) => (
          <div className="word-slots" key={p}>
            {part.split("").map((_, i) => {
              const index = position++;
              return (
                <span
                  className={highlight === index ? "blue-letter" : ""}
                  key={i}
                >
                  {chosen[index] === undefined
                    ? ""
                    : word.replaceAll(" ", "")[chosen[index]].toUpperCase()}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="letter-bank">
        {tiles.map((t) => (
          <button
            disabled={chosen.includes(t.id)}
            key={t.id}
            onClick={() => update([...chosen, t.id])}
          >
            {t.letter.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="quiet" onClick={() => update(chosen.slice(0, -1))}>
          ↶ Undo 復原
        </button>
        <button className="quiet" onClick={() => update([])}>
          Reset 重設
        </button>
        <button
          className="primary"
          disabled={chosen.length !== tiles.length}
          onClick={() =>
            onSubmit(chosen.map((i) => word.replaceAll(" ", "")[i]).join(""))
          }
        >
          Check 檢查 <Check size={17} />
        </button>
      </div>
    </div>
  );
}
export function Quiz({
  kind,
  onDone,
}: {
  kind: "vocab" | "listen" | "spell";
  onDone: (correct: number, incorrect: number, total: number) => void;
}) {
  const [qs] = useState<Question[]>(() => questions(kind)),
    [index, setIndex] = useState(0),
    [tries, setTries] = useState(0),
    [correct, setCorrect] = useState(0),
    [wrong, setWrong] = useState(0),
    [resolved, setResolved] = useState(false),
    [feedback, setFeedback] = useState("");
  const q = qs[index];
  const choose = (answer: string) => {
    if (resolved) return;
    if (
      answer === q.target.word.replaceAll(" ", "") ||
      answer === q.target.word
    ) {
      setResolved(true);
      setCorrect((c) => c + 1);
      setFeedback("Great job! 答對了！");
      sound("correct");
      if (kind === "spell") speak(q.target.word);
    } else {
      setWrong((w) => w + 1);
      setTries((t) => t + 1);
      sound("wrong");
      if (tries === 0)
        setFeedback(
          `Try again! 再試一次！ Hint 提示：${q.target.zh}${kind === "spell" ? ` · starts with ${q.target.word[0].toUpperCase()}` : ""}`,
        );
      else {
        setResolved(true);
        setFeedback(
          `Answer 答案：${q.target.word} — ${q.target.zh}. ${q.target.example}`,
        );
        if (kind === "spell") speak(q.target.word);
      }
    }
  };
  return (
    <>
      <div className="eyebrow">TRAINING GROUNDS · 練習場</div>
      <div className="title-row">
        <h2>
          {kind === "vocab"
            ? "Know your words"
            : kind === "listen"
              ? "Listen closely"
              : "Spell your magic"}
          <small>
            {kind === "vocab"
              ? "單字挑戰"
              : kind === "listen"
                ? "聽力挑戰"
                : "拼字挑戰"}
          </small>
        </h2>
        <span className="badge">
          {index + 1} / {qs.length}
        </span>
      </div>
      <div className="mini-progress">
        <i style={{ width: `${(index / qs.length) * 100}%` }} />
      </div>
      <p>
        {kind === "spell"
          ? "Tap the letters in order. 依序點選字母。"
          : kind === "listen"
            ? "Listen and choose the picture. 聆聽並選擇圖片。"
            : q.type === "word"
              ? "Look and choose the word. 看圖選單字。"
              : "Read and choose the picture. 看單字選圖片。"}
      </p>
      {kind === "listen" ? (
        <>
          <Audio
            text={q.type === "sentence" ? q.target.example : q.target.word}
            label="Play clue 播放線索"
          />
          <details className="audio-transcript">
            <summary>Audio unavailable? 語音無法使用？</summary>
            {q.type === "sentence" ? q.target.example : q.target.word}
          </details>
        </>
      ) : kind === "spell" || q.type === "word" ? (
        <img
          className="quiz-target"
          src={q.target.image}
          alt={
            kind === "spell"
              ? "Spelling clue 拼字圖片"
              : "Vocabulary clue 單字圖片"
          }
        />
      ) : (
        <h3 className="prompt-word">{q.target.word}</h3>
      )}
      {kind === "spell" ? (
        <Letters key={index} word={q.target.word} onSubmit={choose} />
      ) : (
        <div className="choice-grid">
          {q.options.map((w, i) => (
            <button
              className={`choice ${resolved && w.word === q.target.word ? "correct" : ""}`}
              disabled={resolved}
              key={w.word}
              onClick={() => choose(w.word)}
            >
              {kind === "listen" || q.type !== "word" ? (
                <img src={w.image} alt={`Picture option ${i + 1}`} />
              ) : (
                <span>{w.word}</span>
              )}
              <b>{String.fromCharCode(65 + i)}</b>
            </button>
          ))}
        </div>
      )}
      <p role="status" className={`feedback ${resolved ? "success" : ""}`}>
        {feedback}
      </p>
      {resolved && (
        <button
          className="primary"
          onClick={() => {
            if (index === qs.length - 1) onDone(correct, wrong, qs.length);
            else {
              setIndex(index + 1);
              setTries(0);
              setResolved(false);
              setFeedback("");
            }
          }}
        >
          {index === qs.length - 1 ? "Finish 完成" : "Next 下一題"}
          <ArrowRight size={18} />
        </button>
      )}
    </>
  );
}
