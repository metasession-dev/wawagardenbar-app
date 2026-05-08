# Test Scope — REQ-036

**Risk Level:** MEDIUM (add-on to REQ-035; financial-data-adjacent additive schema + UI display + thin service passthrough)
**Requirement:** Quick-action tip-method parity + tip display on order surfaces. Add an independently-selectable tip payment method dropdown to (a) the Process Tab Payment dialog (Full + Partial branches) and (b) the customer-checkout Tip step. Display the tip + method on admin order detail, customer checkout summary, and the tab detail's partial-payment history. Update the Daily Financial Report aggregator to honour the explicit override.
**GitHub Issue:** [#77](https://github.com/metasession-dev/wawagardenbar-app/issues/77)
**Parent Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76) (REQ-035)
**Date:** 2026-05-07

## Test Approach

MEDIUM-risk additive feature on top of REQ-035's already-shipped tip plumbing. Reuses the existing `<TipInputRow>` component (the dropdown variant is already supported via props) and the existing `Order.tipPaymentMethod` field. The only schema change is an additive optional field on `Tab.partialPayments[]` (`tipPaymentMethod`). No destructive migration, no backfill required (legacy rows fall back to the row's `paymentType`).

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Dependency audit: 0 new high/critical vulnerabilities (REQ-035 baseline preserved)
- Vitest unit suite: 512 baseline (REQ-035 SHA `72b862c`) + new tests pass
- Playwright E2E: existing suites unchanged + new admin-pay-tab tip-method spec
- Human code review via PR (×1 — MEDIUM baseline single-reviewer policy)

**Security testing:**

- [ ] Access control: tip capture surfaces remain inside existing admin-only flows. `TipInputStep` on customer checkout is reachable to all authenticated users today (customer + staff); tip method is just an extra metadata field, no privilege change.
- [ ] Input validation: server-side rejects `tipPaymentMethod` outside the enum. Mongoose schema enforces; service-layer guards on top.
- [ ] Audit logging: per-payment audit preserved by reusing existing `processedBy` field on partial-payment subdocs. No new audit surface.
- [ ] Double-counting prevention: aggregator update is a one-line `??` fallback. Explicit AC8 regression test asserts `paymentBreakdown.total` invariant from REQ-035 still holds.

**Additional MEDIUM testing:**

- [ ] Independent review: 1 human reviewer per Risk-Tiered Review Policy. AI-prompts artefact still authored as good hygiene given financial-data-adjacent context (carries forward from REQ-035 expectations).
- [ ] Penetration testing: not warranted — no new endpoint, no new auth surface, no new query operator keys.
- [ ] Concurrency: behaviour identical to REQ-035 (per-tab serialisation via Mongoose findById + save).

## Out of Scope (per design decision)

- **AdminPayOrderDialog** tip capture — track separately. The user did not call out this surface; it has no tip section at all today.
- **Customer "Download Receipt" PDF stub** — receipt rendering not implemented; defer.
- **Tab-list / customer order history list** adding a tip column — UX call deferred.
- **Kitchen ticket** — kitchen doesn't need tip context.

## Rollback / Recovery

Single additive change. Rollback = revert the merge commit. The new schema field on `Tab.partialPayments[].tipPaymentMethod` is optional — reverting code does not break existing rows (they have no `tipPaymentMethod` property; the application reads it as `undefined` and falls back to `paymentType`). The aggregator's `??` fallback means the report continues to work pre- or post-rollback. No DB migration to reverse.
