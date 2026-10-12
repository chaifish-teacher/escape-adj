# Implementation plan and verified source decisions

1. Inventory and extract PowerPoint media with exact slide crop rectangles; retain originals. Build typed vocabulary and puzzle data.
2. Implement React/Vite/TypeScript/Tailwind/Motion frontend, bilingual mobile fantasy interface, speech and original synthesized audio.
3. Persist learning progress and timestamp-based escape progress. Keep disconnected sessions in practice mode; official attempts require server acknowledgement.
4. Implement Vercel proxy and Google Apps Script with anonymous bearer tokens, server timestamps, locking, request receipts and immutable completion.
5. Validate source data, game state, build and browser workflows; document deployment and asset rights review.

## Proposed structure

`src/data.ts`, `src/App.tsx`, `src/game.ts`, `src/api.ts`, `src/audio.ts`, `src/style.css`; `api/game.ts`; `backend/Code.gs`; `public/assets/{castle,monsters,characters,vocabulary,puzzles}`; `docs/`; `tests/`.

## Ambiguities and resolutions

- PPT slide 8 uses tall / brown shoes; PDF page 6 uses short and slim / blue shoes. Use PPT wording only. PPT options 3 and 6 are composite source images with crop rectangles: preserve each original crop.
- PPT slide 11 says “third digit” in its instructions, a source typo. It is the fourth challenge; show “fourth digit” in interface guidance, retain original quotation in mapping.
- PPT slide 10 letters have lost explicit blue font color, but blue background rectangles identify the highlighted cells. Cross-check matching word layout against student PDF p8. Extracted letters spell ENGLISH in numbered puzzle order.
- No new illustration generation authorized. Reuse source young character as fixed adventurer; original CSS lighting and synthesized audio require no third-party assets.
- Google deployment URL and shared proxy secret not supplied. Local learning/practice fully usable; online official ranking requires deployment. Never manufacture leaderboard rows.
