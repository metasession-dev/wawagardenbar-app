# Test Scope — REQ-035

**Risk Level:** HIGH (financial-data write path; multi-collection schema additions on `Order` + `Tab`; daily-report aggregator change)
**Requirement:** Tip recording at express checkout + tips breakdown in Daily Financial Report. Staff capture a tip amount and an independent tip-payment-method (cash / POS / transfer) on (a) the Express create-order flow and (b) each partial-payment row of the close-tab flow. The Daily Financial Report gains a new "Tips received" section beneath "Revenue by method".
**GitHub Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**Date:** 2026-05-07

## Test Approach

HIGH-risk additive feature on top of existing financial-data flows. No schema removal, no destructive migration. The `Order.tipAmount` field already exists (REQ-013-era) and is reused; `Order` gains a new optional `tipPaymentMethod` field. `Tab.partialPayments[]` subdocs gain an optional `tipAmount` field. Tab-level `tipAmount` becomes a derived sum maintained server-side via a `pre('save')` hook.

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Dependency audit: 0 new high/critical vulnerabilities (REQ-033 baseline preserved)
- Vitest unit suite: existing baseline + new tip-aggregation + service tests all pass
- Playwright E2E: existing suites unchanged + new express-tip-capture and close-tab-tip-capture specs pass
- Human code review via PR (×2 — HIGH baseline two-reviewer policy, AI-prompts artefact required)

**Security testing:**

- [ ] Access control: tip capture surfaces are inside existing admin-only express + close-tab flows. No new auth surface. Verified via `requireAdmin` / `requireSuperAdmin` already on the page guards and server actions.
- [ ] Audit logging: tip persisted on the Order or partial-payment subdoc with `processedBy` (existing field on partial-payments) — every tip carries the staff member's user id. Daily report aggregation is read-only.
- [ ] Input validation: server-side guards reject negative or non-numeric `tipAmount`; reject `tipAmount > 0` without a valid `tipPaymentMethod` (Order) or `paymentType` (partial-payment row); reject `tipPaymentMethod` outside the enum. Validated at the action boundary via Zod and at the schema layer via Mongoose enum + min:0.
- [ ] Backfill safety: `scripts/backfill-tip-payment-method.ts` is idempotent (skip rows where `tipPaymentMethod` is already set) and only writes if `tipAmount > 0`. No destructive operation.
- [ ] Double-counting prevention: `paymentBreakdown.total` continues to mean revenue-only. Tips are tracked in a parallel `tipsBreakdown` block and never added into revenue figures. Existing `aggregatePartialPayments` double-count guard (REQ-013, financial-report-service.ts:121-122) is preserved.

**Additional HIGH testing:**

- [ ] Independent review: 2 human reviewers per Risk-Tiered Review Policy. AI-prompts artefact (`ai-prompts.md`) required and committed.
- [ ] Penetration testing: not warranted — no new endpoints, no new auth surface, no schema additions beyond optional fields with strict enum validation.
- [ ] Concurrency: tip writes go through the existing transactional `completeOrderPaymentManually` / `completeTabPaymentManually` paths. No new write contention surface.

## Out of Scope (per design decision)

- **Customer-side checkout tip flow** (`components/features/checkout/tip-input-step.tsx` — preset 5/10/15/20% percentages). Untouched by REQ-035; if it currently writes `tipAmount`, the order-service change picks up `tipPaymentMethod = paymentMethod` automatically. Verify no double-handling during implementation.
- **Tip allocation across staff members for end-of-shift split** — single tip per order/partial; no per-staff distribution.
- **Tip reporting beyond the Daily Financial Report** — analytics dashboards, profitability report, and exports outside `lib/report-export.ts` are not extended.
- **Refund/void of tips** — handled implicitly by existing order/tab void flows; tip becomes 0 when the parent record is voided. No separate tip-void surface.

## Rollback / Recovery

Single additive change; rollback = revert the merge commit. The schema additions are optional fields with defaults (Order: `tipPaymentMethod` is `undefined` by default; Tab partial-payment: `tipAmount` defaults to 0), so reverting code does not break existing rows. The backfill script only writes if `tipAmount > 0` and `tipPaymentMethod` is unset — re-running post-rollback is a no-op. No DB migration to reverse.
