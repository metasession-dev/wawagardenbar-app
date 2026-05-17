# Implementation Plan — REQ-040

**Risk Level:** LOW
**Issue:** [#89](https://github.com/metasession-dev/wawagardenbar-app/issues/89)
**Date:** 2026-05-17

## Codebase reconnaissance findings (2026-05-17)

1. **`lib/mongodb.ts`** — the app-side `connectDB()` reads URI from env and includes the database name as a build-time decision. Out of scope.
2. **`scripts/backfill-inventory-kind.ts`** — operator script that takes a URI from argv / env, calls `mongoose.connect()`, then queries `Inventory` + `MenuItem` collections. The connect call has no DB-name guard.
3. **`scripts/audit-expense-link-units.ts`** — shaped identically. Same gap.
4. **Node stdlib `URL` parser** — handles `mongodb://` and `mongodb+srv://` schemes correctly (Node 18+). Reuse it; don't hand-roll regex parsing.

## Single-PR plan

Three file groups; lands inside the REQ-038 + REQ-039 + REQ-040 bundled PR.

## Order of work

Tests-first per `[[feedback_tests_before_push]]`:

1. Write `__tests__/lib/mongo-uri.test.ts` with the full happy + error matrix (8+ tests). All initially fail — file doesn't exist yet.
2. Create `lib/mongo-uri.ts` with `assertMongoUriHasDatabase`. Tests go green.
3. Wire into `scripts/backfill-inventory-kind.ts` — call helper at top, log resolved DB on success, exit-1 on throw.
4. Wire into `scripts/audit-expense-link-units.ts` — same.
5. UAT-checklist with positive + negative manual runs.

## Files (create)

- `lib/mongo-uri.ts` (~30 lines)
- `__tests__/lib/mongo-uri.test.ts` (~80 lines)

## Files (modify)

- `scripts/backfill-inventory-kind.ts` (+~5 lines near top)
- `scripts/audit-expense-link-units.ts` (+~5 lines near top)
- `compliance/RTM.md` (REQ-040 row → DRAFT → TESTED → RELEASED through lifecycle)

## AC coverage

All 5 ACs ship in this REQ's commits.

## Risk register

| Risk                                                         | Mitigation                                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| URL parser disagrees on `mongodb+srv://` format              | Test happy-path explicitly with srv scheme                                             |
| Helper rejects URIs that Mongo driver would accept           | Test the actual happy paths that ops uses today (path-db + path-db with retry options) |
| Wiring step forgets to call helper BEFORE `mongoose.connect` | Code review check; commit message explicitly cites order                               |

## Backout

Single-commit revert. No schema change; no migration; no env-var contract change. Scripts return to their pre-REQ-040 behaviour (silent connect to default DB).

## AI involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** all helper + tests + script edits + this scaffold.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per LOW Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit.
- **Prompt log:** `compliance/evidence/REQ-040/ai-prompts.md`
