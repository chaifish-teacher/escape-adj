import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
it("backend locks official identity, receipts, completion timestamp and practice exclusion", () => {
  class Sheet {
    rows: unknown[][] = [];
    appendRow(r: unknown[]) {
      this.rows.push([...r]);
    }
    getLastRow() {
      return this.rows.length;
    }
    setFrozenRows() {}
    getDataRange() {
      return { getValues: () => this.rows.map((r) => [...r]) };
    }
    getRange(row: number) {
      return {
        setValues: (r: unknown[][]) => {
          this.rows[row - 1] = [...r[0]];
        },
      };
    }
  }
  const sheets: Record<string, Sheet> = {};
  const properties: Record<string, string> = {
    SPREADSHEET_ID: "test",
    PROXY_SECRET: "secret",
  };
  let uuid = 0;
  const context = vm.createContext({
    Date,
    JSON,
    Object,
    String,
    Number,
    Error,
    Math,
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (n: string) => sheets[n],
        insertSheet: (n: string) => (sheets[n] = new Sheet()),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => properties[k],
        setProperty: (k: string, v: string) => (properties[k] = v),
        getProperties: () => ({ ...properties }),
        deleteProperty: (k: string) => delete properties[k],
      }),
    },
    Utilities: {
      getUuid: () => `attempt-${++uuid}`,
      base64Encode: (s: string) => s,
      computeDigest: (_: unknown, s: string) =>
        createHash("sha256").update(s).digest("hex"),
      DigestAlgorithm: { SHA_256: 1 },
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
    },
    ContentService: {
      createTextOutput: (s: string) => ({ setMimeType: () => s }),
      MimeType: { JSON: 1 },
    },
  });
  vm.runInContext(readFileSync("backend/Code.gs", "utf8"), context);
  vm.runInContext("setup()", context);
  const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    token = id + id;
  const send = (
    action: string,
    payload: Record<string, unknown> = {},
    requestId = `r-${++uuid}`,
  ) => {
    context.input = {
      postData: {
        contents: JSON.stringify({
          action,
          payload: { playerId: id, token, ...payload },
          requestId,
          proxySecret: "secret",
        }),
      },
    };
    return JSON.parse(vm.runInContext("doPost(input)", context));
  };
  expect(send("login", { name: "Hero" }).ok).toBe(true);
  expect(send("login", { name: "Hero" }).ok).toBe(true);
  expect(sheets.STUDENT_RESULTS.rows).toHaveLength(2);
  const started = send("start", {}, "start-1").data.attempt;
  expect(send("start", {}, "start-1").data.attempt.id).toBe(started.id);
  expect(
    send("finish", { attemptId: started.id, code: "3412", wrong: 0 }).ok,
  ).toBe(false);
  expect(
    send("progress", {
      attemptId: started.id,
      attempt: { ...started, practice: true, monster: 4, digits: "3412" },
    }).ok,
  ).toBe(false);
  expect(
    send("progress", {
      attemptId: started.id,
      attempt: { ...started, monster: 4, digits: "3412", wrong: 3 },
    }).ok,
  ).toBe(true);
  const result = send(
    "finish",
    { attemptId: started.id, code: "3412", wrong: 3 },
    "finish-1",
  );
  expect(result.ok).toBe(true);
  expect(send("receipt", { lookup: "finish-1" }).data.result).toEqual(
    result.data,
  );
  expect(
    send(
      "finish",
      { attemptId: started.id, code: "3412", wrong: 50 },
      "finish-2",
    ).data,
  ).toEqual(result.data);
  expect(sheets.STUDENT_RESULTS.rows).toHaveLength(2);
  expect(sheets.STUDENT_RESULTS.rows[1][11]).toBe(30);
  const board = send("leaderboard").data.entries;
  expect(board).toHaveLength(1);
  expect(board[0]).not.toHaveProperty("playerId");
  expect(send("restore", { token: "wrong" }).ok).toBe(false);
});
