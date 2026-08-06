# Release Ticket: REQ-098 — Dormant tab write-off — bad-debt accounting

**Status:** RELEASED
**Date:** 2026-08-03
**Requirement ID:** REQ-098
**Risk Level:** HIGH
**Issue:** [#626](https://github.com/metasession-dev/wawagardenbar-app/issues/626)
**Implementation branch:** `feat/REQ-098-dormant-tab-write-off`

## Summary

On 2026-07-31, a bulk manual tab-closure event retroactively marked 51 dormant dine-in tabs (some dormant 4+ months) as `paymentStatus: 'paid'`, inflating that day's revenue report by ₦290,200 across orders that carry every signature of stale tabs being force-closed, not real customer payments. This REQ gives managers a formal, audit-trailed way to reclassify a dormant/uncollectible tab as written-off bad debt — excluding it from recognized revenue — additive alongside (never replacing) the existing pay-tab and delete-tab paths, plus a scoped one-time script to correct the 51 already-contaminated production records.

## AI contributors

| Tool        | Version  | Commits                                                         | Date       |
| ----------- | -------- | --------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `b4cada5` (plan), `1c821b0` (implementation), `b037552` (tests) | 2026-08-03 |

Prompt and review record: `compliance/evidence/REQ-098/ai-use-note.md`.

## Implementation details

- `models/tab-model.ts`, `models/order-model.ts` — `'written-off'` added to `paymentStatus` enums; new `writeOff` subdocument (ADR-003).
- `services/tab-service.ts` — `writeOffTab()` (additive; refuses only an already-written-off tab, accepts `partialPayments` unlike `deleteTab`) and `scanDormantOpenTabs()` (mirrors `scanStalePaidOrders`).
- `app/actions/tabs/tab-actions.ts` — `writeOffTabAction`, RBAC-gated identically to `deleteTabAction`.
- `components/features/admin/tabs/write-off-tab-dialog.tsx` — new confirmation dialog, reason required, rendered alongside `DeleteTabDialog`.
- `services/system-settings-service.ts` — `getDormantTabThresholdHours`/`updateDormantTabThresholdHours` (default 24h), mirroring `getBusinessDayCutoff`.
- `models/incident-event-model.ts`, `services/incident-event-service.ts`, `lib/scheduled-jobs.ts` — new `dormant_open_tab` incident kind + scan wired into the existing reconciliation cron.
- `components/features/admin/tabs/dashboard-tabs-list-client.tsx` — dormant badge + "Show dormant only" filter on the tabs list.
- `services/financial-report-service.ts`, `components/features/reports/written-off-section.tsx`, `lib/report-export.ts` — "Written off (bad debt)" section on the daily/period report, on-screen and in all three export formats.
- `scripts/write-off-dormant-tabs-2026-07-31.ts` — scoped, idempotent, dry-run-first remediation script for the 51 contaminated tabs (30+ day gap threshold, mongodump backup before any write).
- `docs/SRS.md` — `REQ-TABMGT-007`/`REQ-TABMGT-008`/`REQ-INV-019`/`REQ-REPORT-006` (new).
- `docs/ADR/ADR-003-write-off-subdocument-shape.md` (new).
- `compliance/risk-register.md` — `R-019`–`R-022` (new, MITIGATED).
- Tests: 35 new unit/integration tests across 6 files; `e2e/critical/write-off-tab.spec.ts` (AC4), `e2e/orders/dormant-tab-visibility.spec.ts` (AC5).
- Separate housekeeping PR #635 (merged to `develop` ahead of this REQ) fixed two unrelated npm audit findings (socket.io-parser, fast-uri) discovered while validating this REQ's quality gates.

## Verification

- Unit: 1,375 passed, 4 skipped (full suite), 35 new for this REQ.
- E2E: 2/2 targeted, run locally against a real dev server + MongoDB, verified twice. Full adjacent-area sweep attempted but hit unrelated local dev-server instability — accepted skip, see `compliance/evidence/REQ-098/test-execution-summary.md`.
- TypeScript/ESLint: 0 errors.
- npm audit: 16 accepted, 0 unresolved.
- Full detail: `compliance/evidence/REQ-098/test-execution-summary.md`.

## Important operator note

The AC7 remediation script (`scripts/write-off-dormant-tabs-2026-07-31.ts`) ships in this release but has **not** been run against production. Its dry-run selection logic is unit-tested against a seeded 51-order-profile fixture; running it for real against the actual 51 contaminated tabs is a separate, explicit post-release operator action, gated on reviewing the dry-run output against the known tab list first.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. The operator independently reviewed and approved the HIGH-risk implementation plan (including ADR-003, the risk register entries, and the AC7 gap threshold) before implementation began, and will review the PR + perform the portal UAT review before Production approval.
