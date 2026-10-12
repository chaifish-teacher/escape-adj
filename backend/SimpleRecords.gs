/** Paste this ONE file in the Apps Script bound to your Google Sheet.
 * Run setupRecords() once, then deploy as a web app: execute as Me; Anyone.
 * No API key, proxy secret or Vercel environment variables are required.
 */
const RECORD_HEADERS = [
  "紀錄ID",
  "學生ID",
  "姓名",
  "紀錄時間",
  "活動",
  "分數",
  "總分",
  "答錯次數",
  "挑戰秒數",
];
function setupRecords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss)
    throw new Error(
      "Please open Apps Script from your Google Sheet and run setupRecords.",
    );
  PropertiesService.getScriptProperties().setProperty(
    "RECORDS_SHEET_ID",
    ss.getId(),
  );
  ss.setSpreadsheetTimeZone("Asia/Taipei");
  let sheet = ss.getSheetByName("學生紀錄");
  if (!sheet) sheet = ss.insertSheet("學生紀錄");
  if (sheet.getLastRow() === 0) sheet.appendRow(RECORD_HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange("D:D").setNumberFormat("yyyy-mm-dd hh:mm:ss");
}
function recordSheet() {
  const id =
    PropertiesService.getScriptProperties().getProperty("RECORDS_SHEET_ID");
  if (!id) throw new Error("Run setupRecords() first.");
  const sheet = SpreadsheetApp.openById(id).getSheetByName("學生紀錄");
  if (!sheet) throw new Error("Missing 學生紀錄 worksheet.");
  return sheet;
}
function hasReceipt(sheet, id) {
  if (sheet.getLastRow() < 2) return false;
  return Boolean(
    sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(id)
      .matchEntireCell(true)
      .findNext(),
  );
}
function doGet(e) {
  const callback = String(e.parameter.callback || "");
  const id = String(e.parameter.requestId || "");
  if (
    !/^towerReceipt_[a-f0-9_]+$/i.test(callback) ||
    !/^[a-f0-9-]{36}$/i.test(id)
  ) {
    return ContentService.createTextOutput("Invalid receipt request");
  }
  let saved = false;
  try {
    saved = hasReceipt(recordSheet(), id);
  } catch (_) {}
  // Only a random receipt ID is queried. Never return student names or grades publicly.
  return ContentService.createTextOutput(
    callback + "(" + JSON.stringify({ saved: saved }) + ");",
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const p = JSON.parse(e.postData.contents);
    if (
      !/^[a-f0-9-]{36}$/i.test(String(p.requestId || "")) ||
      !/^[a-f0-9-]{36}$/i.test(String(p.playerId || ""))
    )
      throw new Error("Invalid ID");
    const labels = {
      login: "登入",
      vocab: "單字練習",
      listen: "聽力練習",
      spell: "拼字練習",
      escape: "密室挑戰",
    };
    if (!Object.prototype.hasOwnProperty.call(labels, p.activity))
      throw new Error("Invalid activity");
    let name = String(p.name || "")
      .trim()
      .slice(0, 40);
    if (!name) throw new Error("Name required");
    if (/^[=+@\-]/.test(name)) name = "\u200b" + name;
    const number = function (value) {
      if (value === undefined || value === null) return "";
      if (!Number.isInteger(value) || value < 0 || value > 10000000)
        throw new Error("Invalid number");
      return value;
    };
    const score = number(p.score),
      total = number(p.total),
      wrong = number(p.wrong),
      seconds = number(p.elapsed);
    if (score !== "" && (total === "" || score > total))
      throw new Error("Invalid score");
    locked = lock.tryLock(15000);
    if (!locked) throw new Error("Busy; retry same record ID");
    const sheet = recordSheet();
    if (!hasReceipt(sheet, p.requestId)) {
      sheet.appendRow([
        p.requestId,
        p.playerId,
        name,
        new Date(),
        labels[p.activity],
        score,
        total,
        wrong,
        seconds,
      ]);
    }
    return ContentService.createTextOutput(
      JSON.stringify({ saved: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ saved: false, error: String(error.message || error) }),
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (locked) lock.releaseLock();
  }
}
