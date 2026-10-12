# Validation report

Validated in this cloud environment on 2026-10-12. Node 24.19.0; React 19; Vite 6; system Chromium. This report describes this instance, not a published Vercel/Google deployment.

## Passed

- Frozen-lockfile dependency installation (`npm ci`); production TypeScript check and Vite build (`npm run build`). Production JS approximately 127 KB gzip, CSS approximately 7 KB gzip.
- `npm test`: 5 tests passed across 2 files. Verified all 24 vocabulary images and source crops; original ENGLISH blue-letter extraction, 3412 code, branching answer 4, counting answer 1121; timestamp recovery and separate 10-second penalties; simulated Apps Script locking/identity, first official attempt, duplicate finish receipts, immutable completion and practice rejection.
- `npm run test:e2e`: 6 tests passed in Chromium across desktop (1440px) and mobile (390px). Each full adventure exercised name validation, all 8 vocabulary / 6 listening / 6 spelling questions, incorrect responses, page refresh recovery, original four challenges and final code. Checked image loads, horizontal overflow, result rendering and lack of page script errors. Separate audio-unavailable tests confirmed fallback text, continued gameplay, and music toggle behavior.
- Development server started with saved instructions on port 5173. Application and castle asset return HTTP 200. Browser tests made functional requests and completed gameplay, beyond an open-port check.
- Extracted source media retains original dimensions and alpha. Runtime PNGs are losslessly compressed; original archive and source documents stay in ignored `materials/`. Desktop and mobile screenshots were visually inspected; captures remain in ignored `test-results/`.
- `install_script` and `start_skill` were saved in the cloud environment draft. Saving does not publish or verify snapshot restoration in a new task.

## Deployment checks not run

- Live Google Apps Script / Sheets writes and live Vercel proxy requests: required deployment URL and proxy secret are absent. Current default is explicitly practice mode. Server logic tests use simulated Google services, not a real Sheet.
- Natural voice quality on students' devices: en-US synthesis is configured and US voices preferred, but installed voices depend on browser/OS. Unsupported audio behavior was tested; audible voice quality requires classroom device review.
- Public publication and fresh-task snapshot restoration have not been performed. Source asset licensing must be reviewed before public redistribution; see asset-rights.md.

## Live integration acceptance procedure

1. Configure the private Sheet, Apps Script and Vercel per README; enable VITE_BACKEND_ENABLED only after the server is configured.
2. Start a test identity, complete learning, enter official mode. Inspect one STUDENT_RESULTS row and one ESCAPE_PROGRESS row with matching server attempt ID.
3. Refresh in each monster; verify original start, wrong count and answer progress. Interrupt network and reconnect; confirm pending sync catches up without restarting the attempt.
4. Complete code 3412. Verify server end timestamp, actual elapsed seconds, wrong × 10 penalty and ranking sum.
5. Retry the same finish request, then a new finish request. Confirm no duplicate row and no changed completion time.
6. Replay in practice; confirm the official row and leaderboard remain unchanged. Test two names that match: distinct UUIDs remain separate records.
7. Simulate a lost finish response; the client checks its receipt before resubmission. Verify the first completed server result remains authoritative.
8. Check leaderboard sorting by ranking time then actual time, Top 10, and result position. No private IDs or tokens should appear in response entries.
