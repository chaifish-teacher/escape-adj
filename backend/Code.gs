/** Escape from the Tower — deploy as web app, execute as owner.
 * Script Properties: SPREADSHEET_ID, PROXY_SECRET. Run setup() once.
 * No credentials belong in the browser. Anonymous tokens are hashed at rest.
 */
const RESULTS = [
  "PlayerID",
  "Name",
  "LoginTime",
  "LastActiveTime",
  "VocabularyScore",
  "ListeningScore",
  "SpellingScore",
  "EscapeStartTime",
  "EscapeEndTime",
  "ActualTimeSeconds",
  "WrongAttempts",
  "PenaltySeconds",
  "RankingTimeSeconds",
  "Completed",
  "OfficialAttemptID",
];
const PROGRESS = [
  "PlayerID",
  "OfficialAttemptID",
  "CurrentMonster",
  "CollectedDigits",
  "WrongAttempts",
  "EscapeStartTime",
  "LastSavedTime",
  "Status",
  "AnswerProgress",
];
function setup() {
  const ss = database();
  [
    ["STUDENT_RESULTS", RESULTS],
    ["ESCAPE_PROGRESS", PROGRESS],
  ].forEach(function (pair) {
    let s = ss.getSheetByName(pair[0]);
    if (!s) s = ss.insertSheet(pair[0]);
    if (s.getLastRow() === 0) {
      s.appendRow(pair[1]);
      s.setFrozenRows(1);
    }
  });
}
function database() {
  return SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID"),
  );
}
function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function hash(value) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value),
  );
}
function assert(ok, message) {
  if (!ok) throw new Error(message);
}
function sheetRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++)
    if (String(data[i][0]) === id) return { index: i + 1, values: data[i] };
  return null;
}
function safeName(value) {
  const s = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
  assert(s.length > 0, "Name required");
  return /^[=+@\-]/.test(s) ? "\u200b" + s : s;
}
function getAttempt(row) {
  if (!row) return null;
  const v = row.values;
  const saved = JSON.parse(String(v[8] || "{}"));
  return {
    id: String(v[1]),
    start: Number(v[5]),
    wrong: Number(v[4]),
    monster: Number(v[2]),
    digits: String(v[3]),
    practice: false,
    progress: saved.progress || {
      branch: 0,
      route: [],
      puzzleIndex: 0,
      selections: [[], [], [], []],
      countIndex: 0,
    },
    revision: saved.revision || 0,
    end: saved.end || undefined,
  };
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const body = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    assert(
      body.proxySecret &&
        body.proxySecret === props.getProperty("PROXY_SECRET"),
      "Unauthorized proxy",
    );
    const action = body.action,
      p = body.payload || {},
      requestId = String(body.requestId || "");
    assert(/^[A-Za-z0-9-]{1,100}$/.test(requestId), "Invalid request ID");
    locked = lock.tryLock(15000);
    assert(locked, "Busy; retry same request");
    const ss = database(),
      results = ss.getSheetByName("STUDENT_RESULTS"),
      progress = ss.getSheetByName("ESCAPE_PROGRESS");
    assert(results && progress, "Run setup() first");
    if (action === "leaderboard") {
      const entries = results
        .getDataRange()
        .getValues()
        .slice(1)
        .filter((r) => r[13] === true || r[13] === "TRUE")
        .map((r) => ({
          name: String(r[1]),
          rankingTime: Number(r[12]),
          actualTime: Number(r[9]),
        }))
        .sort(
          (a, b) =>
            a.rankingTime - b.rankingTime || a.actualTime - b.actualTime,
        )
        .slice(0, 10);
      return json({ ok: true, data: { entries } });
    }
    const id = String(p.playerId || "");
    assert(/^[a-f0-9-]{36}$/i.test(id), "Invalid player ID");
    const tokenKey = "player:" + id;
    let stored = props.getProperty(tokenKey);
    let row = sheetRow(results, id);
    if (action === "login") {
      if (stored) {
        assert(
          p.token && hash(String(p.token)) === stored,
          "Player token required",
        );
        row.values[1] = safeName(p.name);
        row.values[3] = Date.now();
        results
          .getRange(row.index, 1, 1, RESULTS.length)
          .setValues([row.values]);
        return json({ ok: true, data: { token: p.token } });
      }
      const token = String(p.token || "");
      assert(/^[a-f0-9-]{72}$/i.test(token), "Invalid anonymous token");
      props.setProperty(tokenKey, hash(token));
      const t = Date.now();
      results.appendRow([
        id,
        safeName(p.name),
        t,
        t,
        "",
        "",
        "",
        "",
        "",
        0,
        0,
        0,
        0,
        false,
        "",
      ]);
      return json({ ok: true, data: { token } });
    }
    assert(
      stored && p.token && hash(String(p.token)) === stored,
      "Invalid player token",
    );
    assert(row, "Player not found");
    const receiptKey =
      "receipt:" +
      id +
      ":" +
      (action === "receipt" ? String(p.lookup) : requestId);
    const previous = props.getProperty(receiptKey);
    if (action === "receipt")
      return json({
        ok: true,
        data: previous
          ? { found: true, result: JSON.parse(previous).result }
          : { found: false },
      });
    if (previous) return json({ ok: true, data: JSON.parse(previous).result });
    let attemptRow = sheetRow(progress, id),
      attempt = getAttempt(attemptRow),
      data;
    if (attempt && (row.values[13] === true || row.values[13] === "TRUE")) {
      attempt.end = Number(row.values[8]);
      attempt.wrong = Number(row.values[10]);
      attempt.monster = 4;
      attempt.digits = "3412";
    }
    if (action === "rank") {
      const ranked = results
        .getDataRange()
        .getValues()
        .slice(1)
        .filter((r) => r[13] === true || r[13] === "TRUE")
        .sort(
          (a, b) =>
            Number(a[12]) - Number(b[12]) || Number(a[9]) - Number(b[9]),
        );
      const place = ranked.findIndex((r) => String(r[0]) === id);
      data = { position: place < 0 ? null : place + 1 };
    } else if (action === "restore") {
      data = { attempt };
    } else if (action === "scores") {
      ["vocab", "listen", "spell"].forEach(function (k, i) {
        if (p.scores && p.scores[k]) {
          const s = p.scores[k],
            total = i ? 6 : 8;
          assert(
            Number.isInteger(s.correct) &&
              s.correct >= 0 &&
              s.correct <= total &&
              Number.isInteger(s.incorrect) &&
              s.incorrect >= 0 &&
              s.total === total,
            "Invalid score",
          );
          row.values[4 + i] = JSON.stringify(s);
        }
      });
      row.values[3] = Date.now();
      results.getRange(row.index, 1, 1, RESULTS.length).setValues([row.values]);
      data = { saved: true };
    } else if (action === "start") {
      if (!attempt) {
        attempt = {
          id: Utilities.getUuid(),
          start: Date.now(),
          wrong: 0,
          monster: 0,
          digits: "",
          practice: false,
          progress: {
            branch: 0,
            route: [],
            puzzleIndex: 0,
            selections: [[], [], [], []],
            countIndex: 0,
          },
        };
        progress.appendRow([
          id,
          attempt.id,
          0,
          "",
          0,
          attempt.start,
          Date.now(),
          "active",
          JSON.stringify({
            progress: attempt.progress,
            revision: attempt.revision || 0,
          }),
        ]);
        row.values[7] = attempt.start;
        row.values[14] = attempt.id;
        results
          .getRange(row.index, 1, 1, RESULTS.length)
          .setValues([row.values]);
      }
      data = { attempt };
    } else if (action === "progress") {
      assert(attempt && attempt.id === p.attemptId, "Invalid attempt");
      if (!attempt.end) {
        const incoming = p.attempt;
        assert(
          incoming && !incoming.practice && incoming.start === attempt.start,
          "Invalid official state",
        );
        assert(
          Number.isInteger(incoming.monster) &&
            incoming.monster >= 0 &&
            incoming.monster <= 4,
          "Invalid stage",
        );
        assert(
          incoming.digits === "3412".slice(0, incoming.monster),
          "Invalid digits",
        );
        assert(
          Number.isInteger(incoming.wrong) &&
            incoming.wrong >= 0 &&
            incoming.wrong <= 100000,
          "Invalid wrong count",
        );
        if (
          incoming.monster > attempt.monster ||
          (incoming.monster === attempt.monster &&
            (incoming.revision || 0) >= (attempt.revision || 0))
        ) {
          attempt.revision = incoming.revision || 0;
          attempt.monster = incoming.monster;
          attempt.digits = incoming.digits;
          attempt.progress = incoming.progress;
          assert(
            JSON.stringify(attempt.progress).length < 8000,
            "Progress too large",
          );
        }
        attempt.wrong = Math.max(attempt.wrong, incoming.wrong);
        progress
          .getRange(attemptRow.index, 1, 1, PROGRESS.length)
          .setValues([
            [
              id,
              attempt.id,
              attempt.monster,
              attempt.digits,
              attempt.wrong,
              attempt.start,
              Date.now(),
              "active",
              JSON.stringify({
                progress: attempt.progress,
                revision: attempt.revision || 0,
              }),
            ],
          ]);
      }
      data = { saved: true, attempt };
    } else if (action === "finish") {
      assert(attempt && attempt.id === p.attemptId, "Invalid attempt");
      if (!attempt.end) {
        assert(p.code === "3412", "Incorrect code");
        assert(
          attempt.monster === 4 && attempt.digits === "3412",
          "Finish all four monsters first",
        );
        assert(
          Number.isInteger(p.wrong) && p.wrong >= 0 && p.wrong <= 100000,
          "Invalid wrong count",
        );
        attempt.wrong = Math.max(attempt.wrong, p.wrong);
        attempt.end = Date.now();
        const seconds = Math.max(
          0,
          Math.floor((attempt.end - attempt.start) / 1000),
        );
        row.values[3] = attempt.end;
        row.values[8] = attempt.end;
        row.values[9] = seconds;
        row.values[10] = attempt.wrong;
        row.values[11] = attempt.wrong * 10;
        row.values[12] = seconds + attempt.wrong * 10;
        row.values[13] = true;
        results
          .getRange(row.index, 1, 1, RESULTS.length)
          .setValues([row.values]);
        progress
          .getRange(attemptRow.index, 1, 1, PROGRESS.length)
          .setValues([
            [
              id,
              attempt.id,
              4,
              "3412",
              attempt.wrong,
              attempt.start,
              attempt.end,
              "completed",
              JSON.stringify({
                progress: attempt.progress,
                revision: attempt.revision || 0,
                end: attempt.end,
              }),
            ],
          ]);
      }
      data = { attempt };
    } else throw new Error("Unknown action");
    if (!["restore", "progress", "rank"].includes(action)) {
      props.setProperty(
        receiptKey,
        JSON.stringify({ time: Date.now(), result: data }),
      );
      const all = props.getProperties();
      Object.keys(all)
        .filter((k) => k.indexOf("receipt:") === 0)
        .forEach((k) => {
          try {
            if (Date.now() - JSON.parse(all[k]).time > 7 * 86400000)
              props.deleteProperty(k);
          } catch {}
        });
    }
    return json({ ok: true, data });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) });
  } finally {
    if (locked) lock.releaseLock();
  }
}
