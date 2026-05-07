# AI Use Note — REQ-035

**Requirement:** REQ-035 — Tip recording at express checkout + tips breakdown in Daily Financial Report
**Risk Level:** HIGH (2 reviewers + AI-prompts artefact required)
**Date:** 2026-05-07
**AI Tool:** Claude Code (Claude Opus 4.7, 1M context)

## Scope of AI involvement

| Surface                                                                                                                                           | AI authored                   | Human reviewed            |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------- |
| Interface (`payment-method.interface.ts`)                                                                                                         | Yes                           | Yes — pre-merge PR review |
| Order schema additions + `pre('validate')` hook                                                                                                   | Yes                           | Yes                       |
| Tab schema additions + `pre('save')` derived-tip recompute                                                                                        | Yes                           | Yes                       |
| Pure helpers (`lib/tip-aggregation.ts`)                                                                                                           | Yes (tests-first)             | Yes                       |
| Pure-helper tests (`__tests__/lib/tip-aggregation.test.ts`)                                                                                       | Yes (tests-first)             | Yes                       |
| OrderService extension                                                                                                                            | Yes (tests-first)             | Yes                       |
| TabService extension (closing-payment-as-partial pattern)                                                                                         | Yes (tests-first)             | Yes                       |
| Service-layer tests (3 specs)                                                                                                                     | Yes (tests-first)             | Yes                       |
| Daily-report aggregator extension (paymentBreakdown vs tipsBreakdown split)                                                                       | Yes (tests-first)             | Yes                       |
| Aggregator regression test for AC6                                                                                                                | Yes (tests-first)             | Yes                       |
| Server-action extensions (express + tab actions)                                                                                                  | Yes                           | Yes                       |
| `<TipInputRow>` component                                                                                                                         | Yes                           | Yes                       |
| `<TipsSection>` component                                                                                                                         | Yes                           | Yes                       |
| Express create-order page wiring                                                                                                                  | Yes                           | Yes                       |
| `admin-pay-tab-dialog.tsx` wiring (full + partial flows)                                                                                          | Yes                           | Yes                       |
| Daily report client wiring                                                                                                                        | Yes                           | Yes                       |
| PDF / Excel / CSV export extensions                                                                                                               | Yes                           | Yes                       |
| Backfill script (`backfill-tip-payment-method.ts`)                                                                                                | Yes (mirrors REQ-033 pattern) | Yes                       |
| Playwright E2E specs (express tip + close-tab tip)                                                                                                | Yes                           | Yes                       |
| Mongoose 8.7.0 → 8.23.1 baseline-clearing bump                                                                                                    | Yes (CVE-driven, single-line) | Yes                       |
| Compliance artefacts (test-scope, test-plan, implementation-plan, security-summary, test-execution-summary, ai-prompts, this file, uat-checklist) | Yes                           | Yes                       |

## AI-specific risks for this REQ

### Risk: AI silently changes load-bearing behaviour to support new feature

REQ-035 changes `completeTabPaymentManually` to push a closing partial-payment row instead of just setting tab-level fields. This is a behavioural change that downstream consumers might depend on (e.g. UI that hides partial-payment rows for one-shot tabs).

**Mitigation:**

- Math impact analysed before code: the daily-report's REQ-013 double-count guard backs out per-tab partial sums from order totals. Pushing a closing row equal to the outstanding balance changes the per-bucket attribution but produces the same `paymentBreakdown.total`. Captured in `security-summary.md` "Double-counting Prevention" and tested by AC6 regression unit test.
- Flagged in `ai-prompts.md` as a **judgement call requiring extra reviewer scrutiny**: reviewers asked to confirm no other consumer depends on `partialPayments` being empty for one-shot tabs.
- Existing partial-payments E2E (`e2e/partial-payments.spec.ts`) and express-order-report E2E continue to pass in CI on `72b862c`.

### Risk: AI introduces double-counting in revenue/tip aggregation

The AC6 invariant — `paymentBreakdown.total` stays revenue-only — is the single most reviewable correctness property of REQ-035.

**Mitigation:** `__tests__/services/financial-report-service.tip.test.ts` "AC6 — paymentBreakdown.total is unchanged when tips are present" was authored **before** the aggregator changes and asserts the exact invariant against a fixture where one order has `tipAmount: 500`. Test runs on every CI build.

### Risk: AI bumps a dependency without verifying compat

Mongoose 8.7.0 → 8.23.1 was a CVE-driven bump committed at `72b862c` to clear `GHSA-wpg9-53fq-2r8h`.

**Mitigation:**

- Bump is within existing semver range (`^8.7.0` already permits 8.23.x).
- Full vitest run (512 tests) executed locally after the bump, all green.
- TypeScript noEmit clean.
- CI (`72b862c`) ran end-to-end pass including E2E suite + build.
- The bump is in its own commit (`72b862c`) so it can be reverted independently if needed.

### Risk: AI declares "Tests to Update: None" without auditing

Documented as a real risk in REQ-033's ai-use-note. For REQ-035, the test-plan.md explicitly enumerates the audited surfaces and the rationale for "no update needed" on each, and identifies the few specs that DO need updating (e.g. `__tests__/services/financial-report-service.test.ts` extension to assert `paymentBreakdown.total` invariant under tips).

### Risk: AI skips post-CI evidence files (per REQ-033 retro)

REQ-033's ai-use-note flagged that the AI had skipped writing security-summary / test-execution-summary / etc. before pushing. Memory feedback `feedback_wait_for_ci.md` mitigates by requiring a CI-green wait before evidence compilation.

**Mitigation in REQ-035:** This file, `security-summary.md`, `test-execution-summary.md`, `ai-prompts.md`, and `uat-checklist.md` are all authored **after** CI went green on `72b862c` (run #75). The release ticket has the green-SHA in its Quality Gates section.

### Risk: AI under auto-mode auto-merges or skips review pause

Memory feedback `feedback_sdlc_impl_plan_review.md`: HIGH-risk REQs require explicit human approval of `implementation-plan.md` before any code lands.

**Mitigation:** the AI committed the implementation-plan.md as scaffold-only (commit `ef36d96`) and explicitly paused for the user's "approve" reply before starting code. No code in `0ad8edf` (implementation commit) was authored before the user said "approved".

## Components Regenerated

None — every edit is targeted at existing infrastructure (REQ-012 partial-payments pattern, REQ-013 double-count guard, REQ-031/032 financial-report-service shape, REQ-033 SDLC artefact pattern). No file was rewritten from scratch.

## Reviewer Sign-off (post-merge)

- **Lead reviewer (1 of 2, HIGH baseline):** ostendo-io
- **Second reviewer (2 of 2, HIGH baseline):** TBD — required before merge to main.
- **AI-involvement bump applied:** No additional bump — the change is contained, deterministic, all logic in pure helpers + service-layer methods that mirror existing REQ-013/031/033 audited patterns. Risk is already at HIGH (financial-data write path).
- **Sign-off date:** TBD (post-PR merge)
