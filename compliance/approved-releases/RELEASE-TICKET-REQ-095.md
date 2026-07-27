# Release Ticket: REQ-095 — Cutoff-aware Daily Summary date ranges

**Status:** RELEASED
**Date:** 2026-07-26
**Requirement ID:** REQ-095
**Risk Level:** HIGH
**Issue:** [#603](https://github.com/metasession-dev/wawagardenbar-app/issues/603)
**Implementation PR:** [#604](https://github.com/metasession-dev/wawagardenbar-app/pull/604)
**Develop merge:** `92bbbedeb1dd22448ef4adee29bceecfe2b3ee95`

## Summary

Daily Summary selections now use one explicit WAT business-date contract. Today and
Yesterday remain adjacent regardless of the current cutoff position, Last 7 Days is
exactly seven business dates, and custom ranges are inclusive. Modern records query
persisted `businessDate`; legacy records without it use cutoff-to-cutoff `paidAt`
fallback bounds.

**Post-merge regression pass (this update):** the original PR shipped without the
Playwright coverage the implementation plan called for (see
`docs/issues/e2e-gate-verifies-recency-not-relevance.md`). Writing that coverage and
running it against the full regression suite found and fixed defects beyond the
original PR's scope:

- Today/Yesterday and the initial page load could show data that didn't match the
  _operational_ business date orders are actually attributed to before the cutoff —
  the original fix made the buttons adjacent to each other but didn't resolve them
  through the cutoff.
- Last 7 Days' displayed range could disagree with the range actually queried,
  same root cause.
- The CSV/PDF/Excel export period label dropped the range's end date entirely for
  multi-day reports (`report.date` was the only field ever populated; `endDate` was
  silently unused).
- **Scope addition:** `OrderService.generateOrderNumber()` had a pre-existing,
  unrelated race — two concurrent order-creation calls could collide on the unique
  `orderNumber` index, and because a failed insert never advances the source count,
  every later call that day recomputed the same taken number, permanently blocking
  order creation. Folded in here because it was found (it blocked verifying this
  REQ's own report-delta assertions), fixed, and verified in the same pass.

## AI contributors

| Tool        | Version  | Commits                                   | Date       |
| ----------- | -------- | ----------------------------------------- | ---------- |
| Codex       | GPT-5    | `a2f556c`, `b9caa56`                      | 2026-07-26 |
| Claude Code | Sonnet 5 | (uncommitted at time of writing — see PR) | 2026-07-27 |

Prompt and review record: `compliance/evidence/REQ-095/ai-prompts.md`.

## Implementation details

- `lib/business-date.ts` — shared label and query-range helpers.
- `services/financial-report-service.ts` — modern/legacy query boundaries; `startDate`/`endDate` now populated on range reports.
- `app/actions/reports/report-actions.ts` — `labelOffsetDays` for single-server-read Today/Yesterday resolution; returns `resolvedLabel`/`resolvedStartLabel`/`resolvedEndLabel`.
- `app/dashboard/reports/daily/daily-report-client.tsx` — cutoff-aware mount + quick-date resolution; explicit per-interaction fetches (no dependency-driven auto-load effect — see implementation-plan.md for why).
- `lib/report-export.ts` — period labels/filenames use the full range, not just the start date.
- `services/order-service.ts` + `models/order-number-counter-model.ts` — atomic order-number counter with collision-retry (scope addition).
- `scripts/seed-inventory.ts` — seeds one `trackByLocation` inventory item so `admin-order-inventory-delta.*` specs have a local candidate (found while regression-testing this REQ).
- `e2e/critical/{dashboard-revenue,express-order-report,reconciliation}.spec.ts` — hardened a shared flaky read-after-load-indicator pattern found during regression testing.
- Tests and SRS/RTM evidence updated under REQ-095.

## Test evidence

| Test type                                 | Passed | Failed | Evidence                                                                                                                   |
| ----------------------------------------- | -----: | -----: | -------------------------------------------------------------------------------------------------------------------------- |
| Vitest (full suite)                       |  1,304 |      0 | Local run, this update                                                                                                     |
| Focused business-date/service             |     35 |      0 | REQ-095 tests                                                                                                              |
| `order-service.generateOrderNumber` (new) |      3 |      0 | `__tests__/services/order-service.generateOrderNumber.test.ts`                                                             |
| Playwright — REQ-095 spec (new)           |     12 |      0 | `e2e/critical/daily-report-business-date-selection.spec.ts`, AC1-AC7, verified at both 1-worker and default parallelism    |
| Playwright — full `critical` project      |    292 |      0 | Local run at `CI=true` (matches `playwright.config.ts`'s CI-only `workers: 1, retries: 2`); 4 pre-existing unrelated skips |
| TypeScript/ESLint                         |   PASS |      0 | Local run, this update                                                                                                     |

Prior PR's CI-recorded numbers (182 E2E, Quality Gates run 30211223050) remain valid for what they covered; they did not include REQ-095-tagged E2E, which is what this update adds.

## UAT gate

- UAT health and home smoke: PASS (prior run).
- Feature-specific UAT review: PENDING authorised dual-actor reviewer — **still genuinely outstanding**; nothing in this update substitutes for a human executing UAT on the real UAT deployment.
- Export period/totals review: now covered by an automated E2E assertion (AC5), but the authorised reviewer should still confirm it visually on UAT per the checklist below.

## Acceptance criteria

- [x] Today and Yesterday resolve adjacent business-date labels.
- [x] Today resolves to the operational business date (not the raw calendar date) before the cutoff.
- [x] Last 7 Days resolves exactly seven business-date labels; displayed range matches the range queried.
- [x] Custom ranges are inclusive.
- [x] Cutoff boundary and legacy fallback tests pass.
- [x] Export period label reflects the full range, not just the start date.
- [x] Order numbers stay unique under concurrent creation (scope addition).
- [x] Automated CI gates pass (local, this update — not yet run through GitHub Actions on a PR head SHA).
- [ ] UAT feature-specific verification recorded.
- [ ] Independent code review recorded (see `docs/issues/stage2-independent-review-not-enforced.md` — neither #604 nor #605 had one; this update should not repeat that).
- [ ] Human release approval recorded.

## Post-deploy actions

None. No schema migration or data backfill is required. The order-number counter
collection bootstraps itself on first use per calendar day; the collision-retry loop
self-heals past any pre-existing numbers for the current day without a backfill step.

## Reviewer checklist

- [ ] Review implementation and REQ-095 evidence, including the scope addition and why it's bundled here rather than tracked separately.
- [ ] Confirm a second, independent reviewer (not the author) approves this PR before merge.
- [ ] On UAT, verify Today and Yesterday before/after cutoff semantics.
- [ ] Verify Last 7 Days is exactly seven business-date labels.
- [ ] Verify a custom range and export totals/period match the screen.
- [ ] Spot-check order creation under rapid repeated use (the original defect only manifested under concurrent/rapid order creation, not a single order).
- [ ] Record Stage 4 UAT execution with an authorised reviewer identity.
- [ ] Approve only after all evidence and checks are complete.
