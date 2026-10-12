import { Audio, Leaderboard, Letters, Quiz } from "./components";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  Volume2,
  Music,
  Music2,
  Clock,
  KeyRound,
  Shield,
  Star,
  Trophy,
  RotateCcw,
  Check,
  Lock,
  BookOpen,
  Headphones,
  SpellCheck,
  ChevronRight,
} from "lucide-react";
import {
  vocabulary,
  questions,
  shuffle,
  description,
  characters,
  monsters,
  puzzle,
  branchTree,
  countPrompts,
  countPeople,
  code,
  type Question,
} from "./data";
import {
  fresh,
  emptyProgress,
  elapsed,
  ranking,
  time,
  type State,
  type Attempt,
  type Stage,
} from "./game";
import { call, hasBackend, type Leader } from "./api";
import { music, sound, speak } from "./audio";
const stageNames = [
  "Word collection",
  "Vocabulary challenge",
  "Listening challenge",
  "Spelling challenge",
  "Enter the tower",
];
export default function App() {
  const [state, setState] = useState<State>(fresh),
    [name, setName] = useState(state.name),
    [wordIndex, setWordIndex] = useState(0),
    [category, setCategory] = useState("all"),
    [musicOn, setMusicOn] = useState(false),
    [now, setNow] = useState(Date.now()),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [syncError, setSyncError] = useState(""),
    [resultRefresh, setResultRefresh] = useState(0),
    [position, setPosition] = useState<number | null>(null),
    [codeInput, setCodeInput] = useState(["", "", "", ""]),
    [letters, setLetters] = useState<number[]>(
      state.attempt?.progress.letters ?? [],
    ),
    [celebrate, setCelebrate] = useState(false);
  const a = state.attempt;
  const active = state.stage === "escape";
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    music(musicOn);
    return () => music(false);
  }, [musicOn]);
  useEffect(() => {
    // Delete only this game's old saved data; the current game stays in memory.
    try {
      localStorage.removeItem("tower-adventure-v1");
      localStorage.removeItem("tower-sheet-records-v1");
    } catch {
      /* Storage may be unavailable; gameplay needs no storage. */
    }
  }, []);
  const patch = (p: Partial<State>) => setState((s) => ({ ...s, ...p }));
  const updateAttempt = (p: Partial<Attempt>) => {
    setState((s) =>
      s.attempt
        ? {
            ...s,
            attempt: {
              ...s.attempt,
              ...p,
              revision: (s.attempt.revision ?? 0) + 1,
            },
          }
        : s,
    );
  };
  // Debounced progress writes are monotonic on the server and never move the start timestamp.
  useEffect(() => {
    if (!hasBackend() || !a || a.practice || !state.token || a.end) return;
    const timer = setTimeout(() => {
      call("progress", {
        playerId: state.playerId,
        token: state.token,
        attemptId: a.id,
        attempt: a,
      })
        .then(() => setSyncError(""))
        .catch(() =>
          setSyncError(
            "Saved on this device. Online sync pending. 已存於此裝置，等待線上同步。",
          ),
        );
    }, 900);
    return () => clearTimeout(timer);
  }, [a, state.token, state.playerId]);
  useEffect(() => {
    if (!hasBackend() || !state.token) return;
    call("restore", { playerId: state.playerId, token: state.token })
      .then((data) => {
        if (data.attempt)
          setState((s) => {
            const remote = data.attempt as Attempt;
            if (remote.end)
              return {
                ...s,
                official: remote,
                ...(s.attempt?.id === remote.id
                  ? { attempt: remote, stage: "result" as Stage }
                  : {}),
              };
            if (
              !s.attempt ||
              (s.attempt.id === remote.id && remote.monster > s.attempt.monster)
            )
              return { ...s, attempt: remote, stage: "escape" };
            return s;
          });
      })
      .catch(() =>
        setSyncError(
          "Online recovery unavailable. Device progress retained. 暫時無法線上復原，已保留裝置進度。",
        ),
      );
  }, []);
  useEffect(() => {
    if (state.stage === "result") {
      sound("victory");
      if (state.attempt && !state.attempt.practice && state.token)
        call("rank", { playerId: state.playerId, token: state.token })
          .then((data) => setPosition(data.position))
          .catch(() => setPosition(null));
    }
  }, [state.stage]);
  const login = async () => {
    const trimmed = name.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!trimmed) {
      setFeedback("Enter your name. 請輸入姓名。");
      return;
    }
    setBusy(true);
    let token = state.token ?? crypto.randomUUID() + crypto.randomUUID();
    patch({ token });
    try {
      if (hasBackend()) {
        const data = await call("login", {
          playerId: state.playerId,
          token,
          name: trimmed,
        });
        token = data.token;
      }
    } catch {
      setSyncError(
        "Offline learning is available. Connect before an official escape. 可離線練習；正式挑戰需要連線。",
      );
    }
    setState((s) => ({
      ...s,
      name: trimmed,
      token,
      stage: s.attempt && !s.attempt.end ? "escape" : "menu",
    }));
    setFeedback("");
    setBusy(false);
  };
  const begin = async () => {
    setBusy(true);
    setFeedback("");
    let attempt: Attempt = {
      id: crypto.randomUUID(),
      start: Date.now(),
      wrong: 0,
      monster: 0,
      digits: "",
      practice: true,
      progress: emptyProgress(),
    };
    try {
      if (hasBackend() && state.token && !state.official) {
        const data = await call("start", {
          playerId: state.playerId,
          token: state.token,
        });
        attempt = data.attempt;
        if (attempt.end) {
          patch({ official: attempt });
          attempt = {
            ...attempt,
            id: crypto.randomUUID(),
            start: Date.now(),
            end: undefined,
            wrong: 0,
            monster: 0,
            digits: "",
            practice: true,
            progress: emptyProgress(),
          };
        }
      }
    } catch {
      setFeedback(
        "Cannot start an official attempt yet. Retry when connected. 目前無法開始正式挑戰，請連線後再試。",
      );
      setBusy(false);
      return;
    }
    patch({ attempt, stage: "escape" });
    setLetters([]);
    setBusy(false);
  };
  const wrong = () => {
    if (!a) return;
    updateAttempt({ wrong: a.wrong + 1 });
    setFeedback("Try again! Take another look. 再試一次！仔細觀察。");
    sound("wrong");
  };
  const defeat = () => {
    if (!a) return;
    sound("correct");
    setFeedback(
      `Monster defeated! Digit ${code[a.monster]} unlocked. 成功打敗怪物！獲得密碼。`,
    );
    setCelebrate(true);
  };
  const nextMonster = () => {
    if (!a) return;
    updateAttempt({
      monster: a.monster + 1,
      digits: code.slice(0, a.monster + 1),
      progress: emptyProgress(),
    });
    setFeedback("");
    setCelebrate(false);
    setLetters([]);
  };
  const finish = async () => {
    if (!a) return;
    if (codeInput.join("") !== code) {
      wrong();
      return;
    }
    setBusy(true);
    const completed = { ...a, end: Date.now() };
    if (!a.practice) {
      const requestId = `finish-${a.id}`;
      try {
        await call("progress", {
          playerId: state.playerId,
          token: state.token,
          attemptId: a.id,
          attempt: a,
        });
        const data = await call(
          "finish",
          {
            playerId: state.playerId,
            token: state.token,
            attemptId: a.id,
            code: codeInput.join(""),
            wrong: a.wrong,
            progress: a.progress,
          },
          requestId,
        );
        patch({
          attempt: data.attempt,
          official: data.attempt,
          stage: "result",
        });
        setSyncError("");
      } catch {
        updateAttempt({ pending: true });
        setSyncError(
          "Submission not confirmed. Your attempt is saved; retry to check its receipt. 成績尚未確認，挑戰已保留；請重試確認。",
        );
        setBusy(false);
        return;
      }
    } else patch({ attempt: completed, stage: "result" });
    sound("victory");
    setResultRefresh((r) => r + 1);
    setBusy(false);
  };
  const trainingDone = (kind: string, c: number, w: number, t: number) => {
    const unlocked = Math.max(
      state.unlocked,
      kind === "vocab" ? 2 : kind === "listen" ? 3 : 4,
    );
    patch({
      scores: {
        ...state.scores,
        [kind]: { correct: c, incorrect: w, total: t },
      },
      stage: "menu",
      unlocked,
    });
    if (hasBackend() && state.token)
      call("scores", {
        playerId: state.playerId,
        token: state.token,
        scores: { [kind]: { correct: c, incorrect: w, total: t } },
      }).catch(() =>
        setSyncError("Learning score sync pending. 學習成績等待同步。"),
      );
  };
  const words = vocabulary.filter(
      (w) => category === "all" || w.category === category,
    ),
    word = words[wordIndex % words.length];
  const navStages: Stage[] = ["learn", "vocab", "listen", "spell", "intro"];
  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <header className="topbar">
          <button
            className="brand"
            onClick={() => {
              if (!active) patch({ stage: "login" });
            }}
            aria-label="Tower home"
          >
            <Shield size={24} />
            <span>
              TOWER <b>QUEST</b>
              <small>THE ENGLISH ADVENTURE</small>
            </span>
          </button>
          <div className="top-actions">
            <span className="edition">A1–A2 · ENGLISH ADVENTURE</span>
            <button
              className="icon-button"
              onClick={() => setMusicOn(!musicOn)}
              aria-label={musicOn ? "Turn music off" : "Turn music on"}
            >
              {musicOn ? <Music2 size={19} /> : <Music size={19} />}
              <span>Music {musicOn ? "ON" : "OFF"} 音樂</span>
            </button>
          </div>
        </header>
        {state.stage === "login" ? (
          <main className="landing">
            <section className="hero">
              <div className="eyebrow">
                <span className="spark">✦</span> YOUR ADVENTURE STARTS HERE ·
                冒險即將展開
              </div>
              <h1>
                ESCAPE FROM
                <br />
                THE <em>TOWER!</em>
              </h1>
              <p className="hero-subtitle">The Ultimate English Challenge</p>
              <p className="hero-copy">
                Learn English. Beat the Monsters.
                <br />
                Escape the Tower!<small>學習英語，擊敗怪物，逃出高塔！</small>
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void login();
                }}
                className="login-card"
              >
                <label htmlFor="name">
                  What should we call you?<small>勇者，請輸入你的姓名</small>
                </label>
                <input
                  id="name"
                  maxLength={40}
                  autoComplete="name"
                  placeholder="Your name / 你的姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button className="primary" disabled={busy}>
                  {busy ? "Preparing 準備中…" : "START ADVENTURE"}
                  <ArrowRight size={20} />
                </button>
                <p role="status" className="feedback">
                  {feedback}
                </p>
                <span className="fine">
                  <Lock size={12} /> No account needed · 不需要註冊帳號
                </span>
              </form>
              <div className="hero-stats">
                <span>
                  <Clock />
                  15–20 min<small>冒險時間</small>
                </span>
                <span>
                  <Shield />4 monsters<small>四大怪物</small>
                </span>
                <span>
                  <KeyRound />1 secret code<small>一組神祕密碼</small>
                </span>
              </div>
            </section>
            <section className="castle-scene" aria-label="The enchanted tower">
              <div className="moon" />
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <span className="scene-star star-one">✦</span>
              <span className="scene-star star-two">✧</span>
              <img
                className="castle"
                src="/assets/castle/tower.png"
                alt="The original golden castle"
              />
              <div className="castle-ground" />
              <motion.img
                className="scene-monster dragon"
                src={monsters[0]}
                alt="Dragon guardian"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
              <motion.img
                className="scene-monster octopus"
                src={monsters[3]}
                alt="Octopus guardian"
                animate={{ y: [0, 9, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <div className="scene-plaque">
                <span>THE ENCHANTED TOWER</span>
                <small>Four guardians. Four digits. One way out.</small>
              </div>
              <span className="scene-tag">
                <i /> QUEST READY · 任務就緒
              </span>
            </section>
            <div className="landing-bottom">
              <div className="quest-preview">
                <div className="section-label">YOUR QUEST MAP · 冒險地圖</div>
                <div className="preview-steps">
                  {[
                    [BookOpen, "Learn", "學習單字"],
                    [Headphones, "Listen", "聆聽線索"],
                    [SpellCheck, "Spell", "拼出魔法"],
                    [KeyRound, "Escape", "逃出高塔"],
                  ].map(([Icon, en, zh], i) => {
                    const I = Icon as typeof BookOpen;
                    return (
                      <div key={i}>
                        <span className="step-circle">
                          <I size={21} />
                        </span>
                        <b>{en as string}</b>
                        <small>{zh as string}</small>
                        {i < 3 && (
                          <ChevronRight className="step-arrow" size={17} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="guardian-note">
                  <img
                    src="/assets/monsters/image32.png"
                    alt="Friendly guardian"
                  />
                  <p>
                    A little English. A lot of adventure.
                    <small>準備好你的勇氣，一起展開英語冒險。</small>
                  </p>
                  <Star size={20} />
                </div>
              </div>
              <Leaderboard />
            </div>
          </main>
        ) : (
          <main className="game-layout">
            <aside className="quest-sidebar">
              <div className="section-label">ADVENTURE MAP · 冒險地圖</div>
              <h3>
                Hello, {state.name}
                <small>準備好冒險了嗎？</small>
              </h3>
              <button
                className="quiet mode-home"
                disabled={active}
                onClick={() => patch({ stage: "menu" })}
              >
                Choose mode 選擇模式
              </button>
              <nav>
                {stageNames.map((n, i) => (
                  <button
                    key={n}
                    className={state.stage === navStages[i] ? "selected" : ""}
                    disabled={active}
                    onClick={() => {
                      patch({ stage: navStages[i] });
                      setFeedback("");
                    }}
                  >
                    <span>
                      {(i === 0 && state.unlocked > 0) ||
                      (i > 0 &&
                        i < 4 &&
                        state.scores[["", "vocab", "listen", "spell"][i]]) ||
                      (i === 4 && state.official) ? (
                        <Check size={15} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      {n}
                      <small>
                        {
                          [
                            "單字學習",
                            "單字挑戰",
                            "聽力挑戰",
                            "拼字挑戰",
                            "密室逃脫",
                          ][i]
                        }
                      </small>
                    </div>
                  </button>
                ))}
              </nav>
              <div className="adventurer">
                <img
                  src="/assets/vocabulary/image9.png"
                  alt="Your young adventurer companion"
                />
                <p>
                  Every word is a little magic.
                  <small>每個單字都是小小的魔法。</small>
                </p>
              </div>
            </aside>
            <section className="game-panel">
              {active && a && (
                <div className="escape-hud">
                  <span className={elapsed(a, now) >= 780 ? "time-up" : ""}>
                    <Clock size={18} />
                    {elapsed(a, now) >= 780
                      ? "TIME'S UP!"
                      : time(780 - elapsed(a, now))}
                    <small>
                      {elapsed(a, now) >= 780 ? "時間到，仍可繼續" : "剩餘時間"}
                    </small>
                  </span>
                  <span>
                    <Shield size={17} />
                    {a.practice ? "CHALLENGE 挑戰模式" : "OFFICIAL 正式挑戰"}
                  </span>
                  <span>
                    × {a.wrong}
                    <small>Wrong 答錯</small>
                  </span>
                  <div className="digits">
                    {[0, 1, 2, 3].map((i) => (
                      <b key={i}>{a.digits[i] ?? "?"}</b>
                    ))}
                  </div>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.stage + (active ? a?.monster : "")}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {state.stage === "menu" && (
                    <div className="mode-menu">
                      <div className="eyebrow">
                        YOUR ADVENTURE, YOUR CHOICE · 自由選擇冒險
                      </div>
                      <h2>
                        Practice or challenge?
                        <small>你想練習，還是直接挑戰？</small>
                      </h2>
                      <p className="muted">
                        You can enter the tower anytime. Practice is optional.
                        <br />
                        不必完成練習，也能直接進入密室挑戰。
                      </p>
                      <div className="mode-cards">
                        <section className="mode-card">
                          <BookOpen size={32} />
                          <h3>Practice 練習</h3>
                          <p>
                            Learn at your own pace.
                            <br />
                            自由選擇想練習的項目，可重複練習。
                          </p>
                          {navStages.slice(0, 4).map((stage, i) => (
                            <button
                              className="stone"
                              key={stage}
                              onClick={() => patch({ stage })}
                            >
                              {
                                [
                                  "Vocabulary learning 單字學習",
                                  "Vocabulary quiz 單字練習",
                                  "Listening 聽力練習",
                                  "Spelling 拼字練習",
                                ][i]
                              }
                              <ArrowRight size={16} />
                            </button>
                          ))}
                        </section>
                        <section className="mode-card challenge-card">
                          <Shield size={32} />
                          <h3>Challenge 挑戰</h3>
                          <p>
                            Four monsters. One secret code.
                            <br />
                            直接挑戰四隻怪物，收集密碼逃出高塔！
                          </p>
                          <p className="notice">
                            {state.official
                              ? "Official result saved. Your next escape is practice. 正式成績已保留，接下來為密室練習。"
                              : hasBackend()
                                ? "Your first official escape counts toward ranking. 首次正式完成將列入排名。"
                                : "Choose your challenge freely. Refreshing starts a new adventure. 自由挑戰，重新整理會開始新的冒險。"}
                          </p>
                          <button
                            className="primary"
                            onClick={() => patch({ stage: "intro" })}
                          >
                            CHALLENGE THE TOWER 挑戰高塔
                            <ArrowRight size={18} />
                          </button>
                        </section>
                      </div>
                    </div>
                  )}
                  {state.stage === "learn" && (
                    <>
                      <div className="eyebrow">
                        YOUR FIRST SPELL · 第一個魔法
                      </div>
                      <h2>
                        Collect your words<small>收集你的單字魔法</small>
                      </h2>
                      <p className="muted">
                        Look, listen, and learn. Explore at your own pace.
                        <br />
                        看看圖片、聽聽發音，依自己的步調學習。
                      </p>
                      <div className="tabs">
                        {[
                          ["all", "All 全部"],
                          ["appearance", "Appearance 外貌"],
                          ["clothes", "Clothes 衣物"],
                        ].map(([v, l]) => (
                          <button
                            key={v}
                            className={category === v ? "selected" : ""}
                            onClick={() => {
                              setCategory(v);
                              setWordIndex(0);
                            }}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <div className="vocabulary-card">
                        <div className="vocab-image">
                          <img src={word.image} alt={word.word} />
                          <span className="image-label">
                            WORD{" "}
                            {String((wordIndex % words.length) + 1).padStart(
                              2,
                              "0",
                            )}
                          </span>
                        </div>
                        <div className="vocab-text">
                          <span className="badge">
                            {word.category === "clothes"
                              ? "CLOTHES & ACCESSORIES"
                              : "APPEARANCE"}
                          </span>
                          <h3>{word.word}</h3>
                          <p className="translation">{word.zh}</p>
                          <Audio
                            text={word.word}
                            label="Listen to word 單字發音"
                          />
                          <hr />
                          <p>{word.example}</p>
                          <Audio
                            text={word.example}
                            label="Listen to sentence 例句發音"
                          />
                        </div>
                      </div>
                      <div className="actions spread">
                        <button
                          className="quiet"
                          onClick={() =>
                            setWordIndex(
                              (wordIndex - 1 + words.length) % words.length,
                            )
                          }
                        >
                          <ArrowLeft size={17} />
                          Previous 上一個
                        </button>
                        <span className="muted">
                          {(wordIndex % words.length) + 1} / {words.length}
                        </span>
                        <button
                          className="quiet"
                          onClick={() =>
                            setWordIndex((wordIndex + 1) % words.length)
                          }
                        >
                          Next 下一個
                          <ArrowRight size={17} />
                        </button>
                      </div>
                      <button
                        className="primary"
                        onClick={() =>
                          patch({
                            stage: "vocab",
                            unlocked: Math.max(1, state.unlocked),
                          })
                        }
                      >
                        I'm ready! 準備好了
                        <ArrowRight size={18} />
                      </button>
                    </>
                  )}
                  {(["vocab", "listen", "spell"] as Stage[]).includes(
                    state.stage,
                  ) && (
                    <Quiz
                      kind={state.stage as "vocab" | "listen" | "spell"}
                      onDone={(c, w, t) => trainingDone(state.stage, c, w, t)}
                    />
                  )}
                  {state.stage === "intro" && (
                    <div className="intro">
                      <img
                        className="intro-castle"
                        src="/assets/castle/tower.png"
                        alt="Castle tower"
                      />
                      <div className="eyebrow">THE FINAL QUEST · 最終任務</div>
                      <h2>
                        Oh no! You're trapped!
                        <small>糟糕！你被困在高塔上！</small>
                      </h2>
                      <p>
                        You're at the top of a tall, tall tower.
                        <br />
                        Four monsters are waiting for you.
                        <br />
                        Complete their challenges. Collect four secret digits.
                        <br />
                        Enter the code to escape!
                      </p>
                      <p className="muted">
                        四隻怪物等著你。完成挑戰，收集四個數字，輸入密碼逃出高塔！
                      </p>
                      <div className="intro-monsters">
                        {monsters.map((m, i) => (
                          <img src={m} alt={`Monster ${i + 1}`} key={m} />
                        ))}
                      </div>
                      <div className="rules">
                        <span>
                          <Clock />
                          13-minute challenge
                          <small>13 分鐘挑戰，時間到仍可繼續</small>
                        </span>
                        <span>
                          <RotateCcw />
                          Unlimited retries
                          <small>每次答錯，排名時間加 10 秒</small>
                        </span>
                      </div>
                      <p className="notice">
                        {state.official
                          ? "Your official result is safe. This is practice. 正式成績已保留，接下來是練習模式。"
                          : !hasBackend()
                            ? "Challenge anytime. Progress is not saved. 隨時挑戰，遊戲進度不會儲存。"
                            : "Your first completed official escape counts. 首次完成的正式挑戰將列入排名。"}
                      </p>
                      <button
                        className="primary"
                        onClick={() => void begin()}
                        disabled={busy}
                      >
                        {busy
                          ? "Preparing 準備中…"
                          : "ENTER THE TOWER 進入高塔"}
                        <ArrowRight size={18} />
                      </button>
                      <p role="status">{feedback}</p>
                    </div>
                  )}
                  {active && a && a.monster < 4 && (
                    <>
                      <div className="monster-heading">
                        <motion.img
                          animate={
                            celebrate
                              ? { scale: [1, 1.12, 0], opacity: [1, 1, 0] }
                              : { y: [0, -6, 0] }
                          }
                          transition={{
                            duration: celebrate ? 0.8 : 3,
                            repeat: celebrate ? 0 : Infinity,
                          }}
                          src={monsters[a.monster]}
                          alt={`Guardian ${a.monster + 1}`}
                        />
                        <div>
                          <div className="eyebrow">
                            GUARDIAN {a.monster + 1} OF 4 · 第 {a.monster + 1}{" "}
                            位守護者
                          </div>
                          <h2>
                            {
                              [
                                "Who am I?",
                                "Follow the clues",
                                "The word puzzle",
                                "Count carefully",
                              ][a.monster]
                            }
                            <small>
                              {
                                [
                                  "我描述的是誰？",
                                  "沿著線索前進",
                                  "神祕單字拼圖",
                                  "仔細數一數",
                                ][a.monster]
                              }
                            </small>
                          </h2>
                        </div>
                      </div>
                      <fieldset disabled={celebrate} className="puzzle-field">
                        {a.monster === 0 && (
                          <>
                            <p className="description">{description}</p>
                            <Audio text={description} />
                            <p className="muted">
                              Choose the person. 選出描述的人物。
                            </p>
                            <div className="character-grid">
                              {characters.map((src, i) => (
                                <button
                                  key={src}
                                  onClick={() => (i === 2 ? defeat() : wrong())}
                                >
                                  <img
                                    src={src}
                                    alt={`Original person ${i + 1}`}
                                  />
                                  <b>{i + 1}</b>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {a.monster === 1 && (
                          <div className="branch-puzzle">
                            <img
                              src="/assets/puzzles/woman.png"
                              alt="Woman in the original branching puzzle"
                            />
                            <div className="branch-content">
                              <div className="route">
                                {a.progress.route.map((r, i) => (
                                  <span key={i}>
                                    {r}
                                    <ChevronRight size={14} />
                                  </span>
                                ))}
                              </div>
                              <h3>{branchTree[a.progress.branch].question}</h3>
                              <Audio
                                text={branchTree[a.progress.branch].question}
                              />
                              <div className="branch-options">
                                {branchTree[a.progress.branch].options.map(
                                  (o, i) => (
                                    <button
                                      className="stone"
                                      key={o}
                                      onClick={() => {
                                        const node =
                                          branchTree[a.progress.branch];
                                        if (node.next)
                                          updateAttempt({
                                            progress: {
                                              ...a.progress,
                                              branch: node.next[i],
                                              route: [...a.progress.route, o],
                                            },
                                          });
                                        else {
                                          if (node.digits![i] === 4) defeat();
                                          else {
                                            wrong();
                                            updateAttempt({
                                              wrong: a.wrong + 1,
                                              progress: {
                                                ...a.progress,
                                                branch: 0,
                                                route: [],
                                              },
                                            });
                                          }
                                        }
                                      }}
                                    >
                                      {o}
                                      <span>↓</span>
                                    </button>
                                  ),
                                )}
                              </div>
                              <button
                                className="quiet"
                                onClick={() =>
                                  updateAttempt({
                                    progress: {
                                      ...a.progress,
                                      branch: 0,
                                      route: [],
                                    },
                                  })
                                }
                              >
                                Reset path 重選路線
                              </button>
                              <details className="tree-reference">
                                <summary>
                                  View the complete map 查看完整路線圖
                                </summary>
                                <div className="tree-root">
                                  Does the woman have long hair?
                                </div>
                                <div className="tree-sides">
                                  {[1, 2].map((n, j) => (
                                    <div key={n}>
                                      <b>{j ? "NO" : "YES"} ↓</b>
                                      <p>{branchTree[n].question}</p>
                                      {branchTree[n].next!.map((leaf, k) => (
                                        <div className="tree-leaf" key={leaf}>
                                          <b>{k ? "NO" : "YES"} ↓</b>
                                          <p>{branchTree[leaf].question}</p>
                                          <span>
                                            {branchTree[leaf].options
                                              .map(
                                                (op, l) =>
                                                  `${op} → ${branchTree[leaf].digits![l]}`,
                                              )
                                              .join(" / ")}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          </div>
                        )}
                        {a.monster === 2 && (
                          <>
                            <p>
                              Look at the pictures. Spell the words. Collect the
                              blue letters.
                              <br />
                              <span className="muted">
                                看圖拼字，收集藍色格子的字母。
                              </span>
                            </p>
                            <div className="hidden-letters">
                              {puzzle.map((p, i) => (
                                <b
                                  className={
                                    i < a.progress.puzzleIndex ? "unlocked" : ""
                                  }
                                  key={i}
                                >
                                  {i < a.progress.puzzleIndex
                                    ? p.word
                                        .replaceAll(" ", "")
                                        [p.highlight].toUpperCase()
                                    : "?"}
                                </b>
                              ))}
                            </div>
                            {a.progress.puzzleIndex < 7 ? (
                              <>
                                <div className="puzzle-picture">
                                  <span className="badge">
                                    WORD {a.progress.puzzleIndex + 1} / 7
                                  </span>
                                  <img
                                    src={puzzle[a.progress.puzzleIndex].image}
                                    alt={`Original word puzzle picture ${a.progress.puzzleIndex + 1}`}
                                  />
                                </div>
                                <Letters
                                  key={a.progress.puzzleIndex}
                                  initial={letters}
                                  word={puzzle[a.progress.puzzleIndex].word}
                                  highlight={
                                    puzzle[a.progress.puzzleIndex].highlight
                                  }
                                  onChange={(selected) => {
                                    setLetters(selected);
                                    updateAttempt({
                                      progress: {
                                        ...a.progress,
                                        letters: selected,
                                      },
                                    });
                                  }}
                                  onSubmit={(answer) => {
                                    const p = puzzle[a.progress.puzzleIndex];
                                    if (answer === p.word.replaceAll(" ", "")) {
                                      sound("correct");
                                      updateAttempt({
                                        progress: {
                                          ...a.progress,
                                          puzzleIndex:
                                            a.progress.puzzleIndex + 1,
                                          letters: [],
                                        },
                                      });
                                      setLetters([]);
                                      setFeedback("Word unlocked! 單字解鎖！");
                                    } else wrong();
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                <h3>
                                  Which word do the blue letters spell?
                                  <small>藍色字母拼出哪個單字？</small>
                                </h3>
                                <div className="option-list">
                                  {[
                                    "English",
                                    "encrypt",
                                    "easiest",
                                    "engines",
                                    "equally",
                                  ].map((w, i) => (
                                    <button
                                      className="stone"
                                      key={w}
                                      onClick={() =>
                                        i === 0 ? defeat() : wrong()
                                      }
                                    >
                                      {i + 1} · {w}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                        {a.monster === 3 && (
                          <>
                            <p>
                              The number of people in the picture who{" "}
                              {countPrompts[a.progress.countIndex]}.<br />
                              <span className="muted">
                                {
                                  ["戴眼鏡", "有捲髮", "有短髮", "有金髮"][
                                    a.progress.countIndex
                                  ]
                                }
                                的人有幾位？
                              </span>
                            </p>
                            <div className="count-tabs">
                              {countPrompts.map((_, i) => (
                                <button
                                  className={
                                    a.progress.countIndex === i
                                      ? "selected"
                                      : ""
                                  }
                                  key={i}
                                  onClick={() =>
                                    updateAttempt({
                                      progress: {
                                        ...a.progress,
                                        countIndex: i,
                                      },
                                    })
                                  }
                                >
                                  {
                                    [
                                      "Glasses 眼鏡",
                                      "Curly 捲髮",
                                      "Short 短髮",
                                      "Blonde 金髮",
                                    ][i]
                                  }
                                  <b>{a.progress.selections[i].length}</b>
                                </button>
                              ))}
                            </div>
                            <div className="count-image">
                              <img
                                src="/assets/puzzles/counting.png"
                                alt="Original group of four people at a table"
                              />
                              {[0, 1, 2, 3].map((i) => (
                                <button
                                  aria-label={`Select person ${i + 1}`}
                                  aria-pressed={a.progress.selections[
                                    a.progress.countIndex
                                  ].includes(i)}
                                  className={
                                    a.progress.selections[
                                      a.progress.countIndex
                                    ].includes(i)
                                      ? "selected"
                                      : ""
                                  }
                                  style={{
                                    left: `${[7, 30, 54, 74][i]}%`,
                                    top: `${[0, 0, 2, 10][i]}%`,
                                    width: "22%",
                                    height: "50%",
                                  }}
                                  key={i}
                                  onClick={() => {
                                    const selections =
                                      a.progress.selections.map((s, j) =>
                                        j !== a.progress.countIndex
                                          ? s
                                          : s.includes(i)
                                            ? s.filter((x) => x !== i)
                                            : [...s, i],
                                      );
                                    updateAttempt({
                                      progress: { ...a.progress, selections },
                                    });
                                  }}
                                >
                                  <span>
                                    {i + 1}
                                    {a.progress.selections[
                                      a.progress.countIndex
                                    ].includes(i)
                                      ? " ✓"
                                      : ""}
                                  </span>
                                </button>
                              ))}
                            </div>
                            <p className="live-count">
                              Selected 已選：
                              <strong>
                                {
                                  a.progress.selections[a.progress.countIndex]
                                    .length
                                }
                              </strong>
                            </p>
                            <div className="actions">
                              <button
                                className="quiet"
                                onClick={() =>
                                  updateAttempt({
                                    progress: {
                                      ...a.progress,
                                      selections: a.progress.selections.map(
                                        (s, j) =>
                                          j === a.progress.countIndex ? [] : s,
                                      ),
                                    },
                                  })
                                }
                              >
                                Clear 清除
                              </button>
                              <button
                                className="quiet"
                                onClick={() =>
                                  updateAttempt({
                                    progress: {
                                      ...a.progress,
                                      countIndex:
                                        (a.progress.countIndex + 1) % 4,
                                    },
                                  })
                                }
                              >
                                Next count 下一個
                                <ArrowRight size={16} />
                              </button>
                            </div>
                            <h3>
                              Which number sequence is correct?
                              <small>哪一組數字正確？</small>
                            </h3>
                            <div className="option-list">
                              {["1224", "1121", "3313", "1432"].map(
                                (seq, i) => (
                                  <button
                                    className="stone"
                                    key={seq}
                                    onClick={() => {
                                      const valid = countPeople.every(
                                        (expected, j) =>
                                          expected.length ===
                                            a.progress.selections[j].length &&
                                          expected.every((n) =>
                                            a.progress.selections[j].includes(
                                              n,
                                            ),
                                          ),
                                      );
                                      if (i === 1 && valid) defeat();
                                      else {
                                        wrong();
                                        if (i === 1 && !valid)
                                          setFeedback(
                                            "Check your selected people in all four tasks. 請檢查四個任務中選取的人物。",
                                          );
                                      }
                                    }}
                                  >
                                    {i + 1} · {seq}
                                  </button>
                                ),
                              )}
                            </div>
                          </>
                        )}
                      </fieldset>
                      <p
                        role="status"
                        className={`feedback ${celebrate ? "success" : ""}`}
                      >
                        {feedback}
                      </p>
                      {celebrate && (
                        <div className="digit-reveal">
                          <motion.b
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                          >
                            {code[a.monster]}
                          </motion.b>
                          <button className="primary" onClick={nextMonster}>
                            Collect digit 收集數字
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {active && a && a.monster === 4 && (
                    <div className="secret-door">
                      <KeyRound size={44} />
                      <div className="eyebrow">THE FINAL LOCK · 最後的鎖</div>
                      <h2>
                        One code. One way out.
                        <small>輸入密碼，逃出高塔。</small>
                      </h2>
                      <p>
                        Use your four collected digits. 使用收集到的四個數字。
                      </p>
                      <div className="door-arch">
                        <div className="code-inputs">
                          {codeInput.map((v, i) => (
                            <input
                              key={i}
                              aria-label={`Code digit ${i + 1}`}
                              inputMode="numeric"
                              pattern="[0-9]"
                              maxLength={1}
                              value={v}
                              onChange={(e) => {
                                const value = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(-1);
                                setCodeInput((prev) =>
                                  prev.map((x, j) => (j === i ? value : x)),
                                );
                                if (value)
                                  (
                                    e.currentTarget
                                      .nextElementSibling as HTMLInputElement
                                  )?.focus();
                              }}
                            />
                          ))}
                        </div>
                        <button
                          className="primary"
                          disabled={busy || codeInput.some((v) => !v)}
                          onClick={() => void finish()}
                        >
                          {busy
                            ? "Checking 確認中…"
                            : "UNLOCK THE DOOR 開啟大門"}
                          <Lock size={17} />
                        </button>
                      </div>
                      <p role="status" className="feedback">
                        {feedback}
                      </p>
                      {a.pending && (
                        <p className="notice">
                          Keep this page open or return later to confirm
                          submission. 請保留此頁或稍後回來確認成績。
                        </p>
                      )}
                    </div>
                  )}
                  {state.stage === "result" && a && (
                    <div className="result">
                      <div className="victory-stars">✦ ✧ ✦</div>
                      <Trophy className="trophy" size={60} />
                      <div className="eyebrow">QUEST COMPLETE · 任務完成</div>
                      <h2>
                        YOU ESCAPED
                        <br />
                        THE TOWER!<small>恭喜你逃出高塔！</small>
                      </h2>
                      <p>
                        {state.name}, you're a{" "}
                        <strong>Castle Hero 城堡勇者</strong>!
                      </p>
                      <p className="muted">
                        Every challenge made your English stronger.
                        <br />
                        每次挑戰，都讓你的英語更進步。
                      </p>
                      <span className="badge">
                        {a.practice
                          ? "CHALLENGE RESULT · 挑戰結果"
                          : "OFFICIAL RESULT · 正式成績"}
                      </span>
                      <div className="result-stats">
                        {[
                          ["Actual time 實際時間", time(elapsed(a))],
                          ["Wrong attempts 答錯次數", a.wrong],
                          ["Penalty time 加罰時間", time(a.wrong * 10)],
                          ["Ranking time 排名時間", time(ranking(a))],
                        ].map(([l, v]) => (
                          <div key={l}>
                            <small>{l}</small>
                            <strong>{v}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="learning-scores">
                        {["vocab", "listen", "spell"].map((k, i) => (
                          <span key={k}>
                            {
                              [
                                "Vocabulary 單字",
                                "Listening 聽力",
                                "Spelling 拼字",
                              ][i]
                            }
                            <b>
                              {state.scores[k]
                                ? `${state.scores[k].correct} / ${state.scores[k].total}`
                                : "Not practised 未練習"}
                            </b>
                            <small>
                              {state.scores[k]
                                ? `Incorrect 答錯 ${state.scores[k].incorrect}`
                                : "—"}
                            </small>
                          </span>
                        ))}
                      </div>
                      <p className="notice">
                        {a.practice
                          ? "Great adventure! You can play again anytime. 冒險完成！隨時可以再挑戰。"
                          : "Your first official result has been saved. 首次正式成績已儲存。"}
                      </p>
                      <Leaderboard refresh={resultRefresh} />
                      <button
                        className="primary"
                        onClick={() => {
                          patch({ stage: "menu" });
                          setCodeInput(["", "", "", ""]);
                          setFeedback("");
                        }}
                      >
                        PLAY AGAIN 再玩一次
                        <RotateCcw size={18} />
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </section>
          </main>
        )}
        {syncError && (
          <div role="status" className="sync-notice">
            {syncError}
          </div>
        )}
        <footer>
          <span>✦ A little courage. A little English. A great adventure.</span>
          <span>一點勇氣，一點英語，一場精彩冒險。</span>
        </footer>
      </div>
    </MotionConfig>
  );
}
