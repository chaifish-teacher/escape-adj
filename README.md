# Escape from the Tower!

Bilingual English learning adventure for Taiwanese vocational high school students (A1–A2). React, TypeScript, Vite, Tailwind CSS, Motion, Web Speech API; Google Apps Script / Sheets records through a Vercel serverless proxy.

## Develop

Node 22+ (validated on Node 24). Use the existing checkout; cloud tasks already run in isolated environments and do not need a new worktree.

```sh
cd /workspace/escape-adj
npm ci
npm run dev
```

Learning and practice work without credentials. `VITE_BACKEND_ENABLED=false` is the default; no fake leaderboard or official results are created. Vite alone does not serve `/api/game`; use Vercel for online records (or `vercel dev` after configuring the server variables).

```sh
npm run build
npm test
npm run test:e2e
```

Browser tests use `/usr/bin/chromium` in this cloud environment. On another machine update `playwright.config.ts` to your Chromium installation or install Playwright Chromium and remove `executablePath`.

登入後可自由選擇練習或直接挑戰；不要求完成練習。繁體中文設定文件：[Google Sheets 成績統計設定](docs/google-sheets-setup.zh-TW.md)。

## 最簡單的登入／成績紀錄（推薦）

使用 [backend/SimpleRecords.gs](backend/SimpleRecords.gs)，在新的 Google Sheet 執行 `setupRecords()`，部署為任何人可存取的網頁應用程式。將 `/exec` 網址填入 `src/recording-config.ts` 後重新建置即可。沒有網址前不會上傳紀錄。不需要密鑰或 Vercel 環境變數。此模式記錄每次登入與每次活動成績，不提供正式排行榜。

完整步驟與九個自動建立的欄位：[簡化設定文件](docs/simple-google-sheets.zh-TW.md)。不要同時貼入 SimpleRecords.gs 和下方進階版 GAS。

## Google Sheets and Apps Script（進階版，非簡化模式）

1. Create a private Google Sheet in the teacher's account. Open Extensions → Apps Script. Paste `backend/Code.gs`.
2. In Apps Script Project Settings → Script Properties, add `SPREADSHEET_ID` (the Sheet ID from its URL) and `PROXY_SECRET` (a new long random secret). Never put either in frontend source or chat.
3. Run `setup()` once and authorize the script. It creates `STUDENT_RESULTS` and `ESCAPE_PROGRESS`. `AnswerProgress` is an additional JSON column for complete recovery.
4. Deploy → New deployment → Web app. Execute as the teacher/owner; access “Anyone” so the proxy can reach it. Record the `/exec` URL. Requests still require the proxy shared secret. Do not share the Sheet edit URL with students.
5. In Vercel server environment variables, add `GAS_WEB_APP_URL` and `GAS_PROXY_SECRET` (same secret). Add `VITE_BACKEND_ENABLED=true`. Redeploy after changing the build flag.
6. Make a real test player, complete the game, refresh during an attempt, retry a submission, and inspect both sheets before classroom use. Current repository tests simulate Apps Script services; they do not prove a deployed Google connection works.

The proxy follows Apps Script redirects server-side, avoids browser CORS issues and keeps its secret out of the JS bundle. The Apps Script response is consistently `{ok,data}` or `{ok:false,error}`. Writes use script locking. Start and finish are idempotent; request receipts are retained for seven days. If a response is lost, the client queries its request receipt before retrying. Repeated finish requests cannot change a completed result even after receipt cleanup. Names beginning with spreadsheet formula characters are neutralized.

## GitHub + Vercel deployment

1. Review source mappings and asset permissions in `docs/asset-rights.md` before public deployment.
2. Commit intended source, lockfile, documentation and authorized assets to this repository; `materials/`, `.env*` secrets, dependencies and build outputs are excluded. No upload or push has been performed by this setup.
3. Import the GitHub repository into Vercel. Framework: Vite; install: `npm ci`; build: `npm run build`; output: `dist`.
4. Set server variables above, enable the frontend flag, deploy and run the real integration acceptance checks.
5. Share the deployed application URL with students after licensing and acceptance review. There is no teacher dashboard; records are in the private Sheet.

## Identity, recovery and ranking

Only a name is required. A random player UUID and separate anonymous bearer token persist on this device. The server assigns an official attempt ID and start/end timestamps; the first completed result is immutable. After it completes, escape replays are practice. Score = actual elapsed seconds + incorrect attempts × 10. Penalties never change the live countdown; after 13 minutes students can continue.

Recovery retains stage, digits, timestamp, wrong count, branching route, puzzle letters and counting selections locally and in `ESCAPE_PROGRESS`. A server result takes priority after confirmed completion. An unfinished attempt resumes from its original start. Learning scores are separate and can be repeated. Leaderboard contains only names, actual time and ranking time; it excludes database IDs and tokens.

Name-only anonymous login cannot guarantee one result per real student: clearing browser storage or changing devices creates another identity. Tokens in local storage are bearer credentials; do not use this game for high-stakes assessment. Content answers are available in the educational client, so this is not a cheating-resistant exam. The Google Properties store and Sheets have service quotas; this design is intended for classroom-size deployments, not unrestricted large-scale traffic. Retain/delete student names according to your school policy.

## Audio and accessibility

User-triggered en-US speech prefers an installed US voice while retaining British source terms. Device voices vary. Visible source text and optional listening transcripts keep activities usable without speech support. Original oscillator music and effects require no external sound assets; music ducks during speech and respects autoplay interaction. Reduced-motion settings, keyboard focus, large touch buttons and mobile grids are supported.

## Source provenance and current verification

`docs/source-inventory.json` lists every PPT slide text and media position. `docs/source-mapping.md` records the precise puzzle content, crops and answers. Source originals were supplied by the teacher and remain local in ignored `materials/`. All source artwork was extracted; no replacement illustrations were generated. See `docs/validation.md` for executed checks and deployment checks still required.
