# Test Scope — REQ-032

**Risk Level:** MEDIUM
**Requirement:** Create pending expense group from existing expenses — multi-select on the Expenses page → bulk-action button → reuse existing Add Expense dialog pre-populated with mapped line items → submit as a new `PendingExpenseGroup` (status `pending`). Standalone copy: source `Expense` rows are not modified, no back-link.
**GitHub Issue:** TBD
**Date:** 2026-04-30

## Test Approach

MEDIUM-risk additive feature on top of REQ-026's existing pending-expense-group workflow. No schema migration, no new server action, no public-facing endpoint. Mapping logic is pure and unit-tested; UI wiring is verified by a thin Playwright spec that depends on UAT seed data (skips gracefully if not present).

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings (baseline maintained)
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: passes when UAT has ≥2 seeded expenses; skips otherwise
- Human code review via PR (×1 — MEDIUM risk single-reviewer policy)

**Security testing:**

- [ ] Access control: bulk action and dialog submission both gated by the existing role check on `createPendingExpenseGroupAction` (admin or super-admin). Page-level guard already in place at `/dashboard/finance/expenses` (admin-only). No new auth surface introduced.
- [ ] Audit logging: new pending groups carry `submittedBy`/`submittedAt` exactly as REQ-026 does — same code path. Source `Expense` rows are not touched; no audit-trail forking.
- [ ] Input validation: form submission is unchanged — existing Zod `lineItemSchema` validates each pre-filled line item before the action runs.
- [ ] Error handling: if a selected expense has invalid data (e.g. amount = 0), the form's existing per-line validation surfaces it; submission is blocked with the same path-qualified errors REQ-026 already provides.

**Additional MEDIUM-risk testing:**

- [ ] Independent review: single human reviewer per Review Policy (Risk-Tiered) — MEDIUM baseline, no AI-involvement bump because the change is small and deterministic.
- [ ] Penetration testing: not warranted — no new endpoints, no new auth surface, no schema changes.

## Out of Scope

- New server action for the duplicate operation — reuses `createPendingExpenseGroupAction`.
- Back-link / sourceExpenseIds on the new group — explicit design decision: standalone copy.
- Source-expense reclassification or deletion — sources are read-only.
- Selection persistence across navigation — selection clears when the dialog opens (AC8).

## Rollback / Recovery

Single additive change, fully reversible by reverting the merge commit. No data migration; if the feature is rolled back after a user has already created a pending group via this flow, the resulting `PendingExpenseGroup` row is a valid record under REQ-026's existing schema and continues to work under the standard approve/transfer flow.
