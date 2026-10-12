# Escape from the Tower!

學生登入與成績上傳已停用。網站不再連接 Google Sheets 或 GAS，也不提供線上排行榜。姓名、遊戲進度和練習結果僅保留於此瀏覽器，供遊玩與重新整理後復原。

登入後可自由選擇練習或直接挑戰。

```sh
npm ci
npm run dev
npm run build
```

React、TypeScript、Vite、Tailwind CSS、Motion 與 Web Speech API。Vercel 使用 Vite 預設設定，建置指令 `npm run build`，輸出目錄 `dist`。不需要 Google Sheets 相關環境變數。

原有 backend/ 與 Google Sheets 文件為歷史參考，網站不再使用。已寫入的 Google Sheet 資料不會被此更新刪除。

來源圖片與題目對照見 docs/source-mapping.md；素材授權檢查見 docs/asset-rights.md。
