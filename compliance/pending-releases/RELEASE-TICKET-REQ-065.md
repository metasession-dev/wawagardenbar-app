# Release Ticket: REQ-065 — Self-service data export + cookie consent banner (#117 P4 #19 + P4 #20)

**Status:** DRAFT
**Date:** 2026-06-03
**Requirement ID:** REQ-065
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 P4 #19 + P4 #20](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** [#274](https://github.com/metasession-dev/wawagardenbar-app/pull/274) — merged to develop 2026-06-03.
**Release PR:** (to be opened after this evidence pack lands)
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-065`, status `draft` → `uat_review` on this evidence push.
**Sign-off (dual-actor):** Pending UAT approval + Production approval on the DevAudit portal.

---

## Summary

Third of the post-REQ-062 trio (B → C → D). Two compliance/data-hygiene items shipped together:

- **P4 #19 — Self-service data export.** New `GET /api/user/export` returns JSON of the user's data footprint across 9 collections (profile + orders + pointsTransactions + tabs + rewards + supportTickets + notificationLog + incomingMessages + instagramPostCredits). Session-gated; rate-limited (1 request/user/60s). `<DataExportButton />` added to `/profile` triggers a browser download as `wawa-data-{userId}-{date}.json`.
- **P4 #20 — Cookie consent banner.** Informational mode — single "Got it" button persists `{ acceptedAt, version: 'v1' }` to localStorage. Banner renders on first visit; private-mode-safe (storage-throw → treats as consented to avoid banner loop). Embedded from `app/layout.tsx` so it shows on every page.

P4 #21 (signup-time consent capture) NOT in this REQ — already shipped under REQ-063's PIN-flow surface (operator decision recorded 2026-06-03).

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI). `e2e-test-engineer` skill invoked for the E2E coverage phase (earlier-execution pattern lesson from REQ-064 — author + run live BEFORE UAT approval rather than after).
- **AI-Generated Changes:** Implementation plan with 5 ACs + STRIDE; new export endpoint with parallel 9-collection projection + secret-stripping + session gate + rate-limit; new `lib/rate-limit.ts` utility; new `<DataExportButton />` client component with 429 retry-after handling; new `<CookieConsentBanner />` client component with private-mode-safe failure mode; 9 new vitest cases (4 rate-limit + 5 user-export); 3 new Playwright specs (live AC3 auth-gate + live AC5 cookie banner + `test.fixme`'d AC4 customer download flow); embedded the banner globally + added the data-export Card to `/profile`. See `compliance/evidence/REQ-065/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this cycle:** authorised Bundles B/C/D from the post-REQ-062 backlog; at plan time confirmed informational cookie mode (vs strict GDPR consent UI) over no-analytics state; chose the earlier-execution E2E pattern (author + run live during evidence pack) over the REQ-064 deferred pattern; chose the single-timestamp consent-audit shape over event-log; bundled P4 #21 into REQ-063 instead of REQ-065.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § Four-eyes attestation.

## Implementation Details

**Files Added:**

- `app/api/user/export/route.ts` — GET handler with session gate + rate limit + 9-collection projection.
- `lib/rate-limit.ts` — in-memory `checkRateLimit(key, windowMs)`. Forward-compatible to Redis.
- `components/features/profile/data-export-button.tsx` — client component, blob download, 429 retry-after toast.
- `components/shared/cookie-consent-banner.tsx` — client component, localStorage gate, private-mode-safe.
- `__tests__/lib/rate-limit.test.ts` — 4 cases.
- `__tests__/api/user-export.test.ts` — 5 cases.
- `e2e/smoke/data-export-auth-gate.spec.ts` — 1 live case (AC3).
- `e2e/smoke/cookie-consent-banner.spec.ts` — 2 live cases (AC5).
- `e2e/smoke/data-export-customer-flow.spec.ts` — 1 `test.fixme` case (AC4).
- `compliance/plans/REQ-065/implementation-plan.md`.

**Files Modified:**

- `app/(customer)/profile/page.tsx` — adds "Your data" Card section with the button + paragraph.
- `app/layout.tsx` — embeds `<CookieConsentBanner />` globally.
- `compliance/RTM.md` — REQ-065 IN PROGRESS row.

**Schema changes:** none — endpoint is read-only.

**Migration:** none.

## Test Plan & Evidence

See `compliance/evidence/REQ-065/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1072 pass / 4 skip / 0 fail (+9 from REQ-064 baseline of 1063).
- TypeScript: 0 errors.
- ESLint: 0 errors / 950 pre-existing warnings.
- Production build: green.
- Focused REQ-065 E2E against UAT: 4 passed / 1 skipped (`test.fixme`) / 0 failed.
- Full regression pack against UAT: see `test-execution-summary.md` (updated when run completes).
- Screenshots captured: `REQ-065-AC5-banner-first-visit.png`, `REQ-065-AC5-banner-dismissed-after-reload.png` (both `compliance/evidence/REQ-065/screenshots/`).

## Security & Compliance

- **Data-egress endpoint** is the load-bearing security concern. Mitigated by:
  - Session-gated — 401 if not logged in. No API-key path.
  - Every find filter keyed on `session.userId` server-side — no cross-user reads possible from endpoint shape.
  - User-doc secrets (`verificationPin`, `pinExpiresAt`, `sessionToken`) projected out explicitly.
  - Rate-limit (1/user/60s) prevents trivial dump-bots.
  - Response size bounded by the user's own data footprint — not a worst-case 100MB scenario.
- **Cookie banner** has no security surface — pure client UI + localStorage.
- STRIDE pass in `compliance/evidence/REQ-065/security-summary.md`.

## Rollback Plan

Revert PR #274. Endpoint removal is a clean reversion (no DB migration to undo). The cookie banner removal leaves consent records in users' localStorage but does no harm — a future re-introduction can read them as-is.

## Quality Gates

| Gate                            | Expected   | Actual (2026-06-03)                              |
| ------------------------------- | ---------- | ------------------------------------------------ |
| `npx tsc --noEmit`              | exit 0     | exit 0                                           |
| `npx vitest run` (full)         | 0 failures | 1072 pass / 4 skip / 0 fail                      |
| `npx eslint . --max-warnings=0` | 0 errors   | 0 errors / 950 pre-existing console warnings     |
| `npm run build`                 | exit 0     | exit 0                                           |
| Focused REQ-065 E2E (UAT)       | green      | 4 passed / 1 skipped (`test.fixme`) / 0 failed   |
| Full regression pack (UAT)      | green      | _filled by test-execution-summary on completion_ |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-065/implementation-plan.md`)
- [x] Stage 2 — Implement & test (PR #274 merged to develop)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Closes the #117 backlog's last P4-tier items currently in scope; closes the post-REQ-062 trio.
- Honesty note: super-admin auth-setup briefly timed out on UAT (21s vs ~4s for csr/admin) but completed successfully. Worth monitoring but not a blocker. May indicate intermittent UAT latency.
- Honesty note: REQ-065 spec captures are tagged `origin: 'regression'` on local runs because `process.env.E2E_NEW_SPECS` is empty outside CI. CI on the PR branch will tag them `origin: 'feature'` (the new specs land in `git diff --diff-filter=A` against the merge-base).
