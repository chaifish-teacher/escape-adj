# Google Sheets 成績統計設定

登入後可直接選擇練習或挑戰。練習不是正式密室的前置條件；沒做的練習欄位保持空白，而非零分。練習成績儲存最近一次完成的結果，正式密室僅採計同一匿名玩家首次完成的成績。

## 1. 建立 Google 試算表

建立一份私人 Google Sheet，複製網址 `/d/` 與 `/edit` 之間的 ID。不要將試算表設定為任何人可編輯。

不必手動建立欄位：執行 GAS 的 `setup()` 就會建立下列兩個工作表及第一列英文欄位。請保留名稱與順序，不要自行插入、刪除或移動欄位；新建空白試算表最簡單。`setup()` 不會覆寫既有資料。

### STUDENT_RESULTS：成績表

| 欄位               | 意義                              |
| ------------------ | --------------------------------- |
| PlayerID           | 匿名玩家 ID，同名學生仍可分開記錄 |
| Name               | 姓名                              |
| LoginTime          | 首次登入時間                      |
| LastActiveTime     | 最近活動時間                      |
| VocabularyScore    | 最近完成的單字成績                |
| ListeningScore     | 最近完成的聽力成績                |
| SpellingScore      | 最近完成的拼字成績                |
| EscapeStartTime    | 正式密室開始時間                  |
| EscapeEndTime      | 正式密室完成時間                  |
| ActualTimeSeconds  | 實際耗時，秒                      |
| WrongAttempts      | 正式密室答錯次數                  |
| PenaltySeconds     | 加罰秒數，答錯次數 × 10           |
| RankingTimeSeconds | 排名秒數，實際耗時＋加罰          |
| Completed          | 是否正式完成，TRUE／FALSE         |
| OfficialAttemptID  | 伺服器產生的正式挑戰 ID           |

三項練習成績儲存為 JSON，例如 `{"correct":5,"incorrect":2,"total":6}`，代表答對 5 題、答錯嘗試 2 次、共 6 題；未完成練習時空白。這三欄目前不是直接可加總的數字欄。時間戳記欄為 Unix 毫秒，不能直接套用 Google Sheet 日期格式。如果需要在額外工作表轉成人類可讀時間，可參照 `=C2/86400000+DATE(1970,1,1)`（UTC 時間）；台灣時間再加 `8/24`，並設定顯示為日期時間。請勿修改原始紀錄。

### ESCAPE_PROGRESS：密室復原紀錄

| 欄位              | 意義                                  |
| ----------------- | ------------------------------------- |
| PlayerID          | 匿名玩家 ID                           |
| OfficialAttemptID | 正式挑戰 ID                           |
| CurrentMonster    | 目前怪物索引：0–3；4 為最後密碼       |
| CollectedDigits   | 已收集數字                            |
| WrongAttempts     | 答錯次數                              |
| EscapeStartTime   | 原始開始時間，不因重新整理重設        |
| LastSavedTime     | 最近同步時間                          |
| Status            | active／completed                     |
| AnswerProgress    | JSON 答題進度，含路線、拼字及人物選取 |

## 2. 設定 GAS

1. 開啟試算表 → **擴充功能 → Apps Script**。
2. 將 repository 的 `backend/Code.gs` 完整內容貼入編輯器，取代預設程式並儲存。
3. 左側 **專案設定 → 指令碼屬性** 新增：
   - `SPREADSHEET_ID`：剛才的試算表 ID。
   - `PROXY_SECRET`：自行產生的一串長隨機密鑰。此值稍後需與 Vercel 完全相同，不能放進前端或 GitHub。
4. 在上方函式下拉選單選 `setup`，按 **執行**，以試算表擁有者帳號授權。
5. 回到試算表，會看到上述兩個工作表。
6. **部署 → 新增部署 → 網頁應用程式**：執行身分選自己／擁有者；存取權限選任何人。這讓 Vercel 代理可呼叫，GAS 仍會檢查 `PROXY_SECRET`。
7. 複製部署後結尾為 `/exec` 的網址，不要使用 `/dev` 測試網址。

GAS 程式更新後需 **管理部署 → 編輯 → 新版本 → 部署**，只按儲存不會更新已部署版本。

## 3. 設定 Vercel

Project → Settings → Environment Variables，新增並選擇要使用的 Preview／Production 環境：

| 名稱                 | 值                              | 用途                     |
| -------------------- | ------------------------------- | ------------------------ |
| GAS_WEB_APP_URL      | GAS 的 `/exec` 網址             | 僅伺服器使用             |
| GAS_PROXY_SECRET     | 與 GAS 的 PROXY_SECRET 完全相同 | 僅伺服器使用，設為敏感值 |
| VITE_BACKEND_ENABLED | true                            | 啟用前端線上紀錄         |

`GAS_WEB_APP_URL` 和 `GAS_PROXY_SECRET` **不要**加 `VITE_` 前綴。設定後重新部署網站。GAS 的 `SPREADSHEET_ID` 不需要加到 Vercel。

單純 Vite 本機開發不提供 `/api/game`，需經 Vercel 部署或 `vercel dev` 使用 API 代理。只想先測試練習功能時，保留 `VITE_BACKEND_ENABLED=false`。

## 4. 開啟統計後的行為

- 登入：新增或更新同一玩家的 STUDENT_RESULTS。
- 完成任一練習：更新對應成績，其他未練習項目不會補零。
- 直接開始挑戰：建立正式挑戰與伺服器開始时间；不要求完成練習。
- 通關：寫入正式成績；之後密室重玩為練習，不改排名。
- 網路暫時中斷：保留裝置進度；尚未確認的提交會查詢收據。請保留原瀏覽器資料。
- 排行榜：從 Google Sheet 的正式完成紀錄取得 Top 10，以 RankingTimeSeconds 排序，同分比 ActualTimeSeconds。

姓名不是唯一識別。清除瀏覽器資料或改用其他裝置會產生新的匿名身分，因此不能保證每位真實學生只能登錄一次。
