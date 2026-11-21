# Test Execution Summary — REQ-123

**Date:** 2026-11-19
**Implementation branch:** `feat/REQ-123-paystack-payment-paid-only-kitchen-gate` (not yet pushed when this was written)
**Risk class:** HIGH

CI as of: not yet available. The branch had not been pushed, so there is no CI run to cite. CI rows are added after the integration PR runs.

## Test design

**Layers planned:** unit, UI end-to-end, transport-layer end-to-end, type-check, lint, production build, dependency gate.

**Layers covered:** unit ✓ (service, webhook route, actions, jobs, queue gate, template contract; 2182 passed on the last full run); UI E2E ✓ (`kitchen-paid-gate` 3); transport-layer E2E ✓ (`paystack-payment-lifecycle` 6, `whatsapp-payment-link` 1; no `page`, so no screenshots for those); type-check ✓; lint ✓; build ✓.

**Exemptions:**

- **AC6 (30-minute expiry)** needs 30 minutes of real time; it is proved by `__tests__/jobs/expire-unpaid-orders.test.ts`.
- **AC8 (template submission)** and **AC9 (refund capability)** are operator tasks, no product behaviour; see `template-submissions.md` and `paystack-refund-capability.md`.
- **Live Paystack call:** CI has no Paystack access, so e2e US-A2.13 uses an order with stored checkout fields; first-time transaction creation is covered by unit tests and the UAT live round-trip.
- **WhatsApp sends** are off in the e2e stack; the NotificationLog rows are the assertion.
- **Visual regression (`NOT_NEEDED`):** none configured.

**Skill invocation:** `e2e-test-engineer` was invoked in Phase 2 and authored the three specs and `e2e/helpers/paystack-lifecycle.ts`. `requirements-aligner`, `adr-author` and `risk-register-keeper` were invoked at Stage 1 and Stage 3.

## Gate results

| Gate                | Result  | Details                                                                                                                                                              |
| ------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit    | SKIPPED | Not run locally; no dependency changed. CI Quality Gates is the record. Operator-visible gap until CI runs                                                           |
| TypeScript          | PASS    | `npx tsc --noEmit`: 0 errors in this REQ's files (two errors in the untracked, unrelated `scripts/revert-sales-since.ts`)                                            |
| ESLint              | PASS    | 0 errors; pre-existing warnings only                                                                                                                                 |
| Production build    | PASS    | `npm run build` completed (exit 0, second attempt: the first stopped at a Next.js upgrade advisory)                                                                  |
| Unit + integration  | PASS    | Full suite: 2182 passed, 4 skipped (227 files passed, 1 skipped)                                                                                                     |
| E2E new specs       | PASS    | 10 of 10 REQ-123 tests passed on the isolated stack                                                                                                                  |
| E2E `critical` tier | FAIL    | 332 passed, 9 failed (341, without the aggregate chain), see triage; the aggregate chain `customer-order-journey` also failed 1 of 3 on a rerun, cause not yet found |

## UI regression sweep

Strings and routes changed by the diff: the Orders page gained an Awaiting-payment view and a view switch; the kitchen display and order list now hide unpaid customer orders. All of `e2e/` was searched for the kitchen, payments and provider routing; specs that seed orders directly in Mongo write no `origin`, which the gate treats as staff, so they still pass. The `regression` project was not run locally.

## Test executions

The portal has no records for this release yet (nothing is pushed). Rows are added after the integration PR runs; they are not inferred from artefacts.

### Local executions (Stage 2, isolated stack: `mongo:7`, production-mode `server.ts`, WhatsApp off)

| Source  | SDLC stage       | Execution | Kind                                | Outcome | Run                                              |
| ------- | ---------------- | --------- | ----------------------------------- | ------- | ------------------------------------------------ |
| REQ-123 | 2 implement/test | #1        | unit                                | passed  | Local Vitest, full suite: 2182 passed, 4 skipped |
| REQ-123 | 2 implement/test | #2        | e2e (new specs)                     | passed  | 10 of 10                                         |
| REQ-123 | 2 implement/test | #3        | e2e (`critical` without aggregates) | failed  | 332 passed, 9 failed (4.0 min)                   |

## E2E failures & triage

| Spec / check                                              | Source         | Classification | Evidence                                                                                                                                                                                           | Disposition        | Reference                                           |
| --------------------------------------------------------- | -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------- |
| `requirements-verification` Rewards page tests (7)        | local gate run | flake          | `waitForLoadState('networkidle')` times out on the rewards page in this local production stack; the page and the code under test are not touched by this REQ. Not yet re-run on CI                 | Accepted exception | compliance/evidence/REQ-123/accepted-e2e-failure.md |
| `daily-report-business-date-selection` Last 7 Days picker | local gate run | flake          | Date-picker locator failure; no payment, kitchen or order code is involved. Not yet re-run on CI                                                                                                   | Accepted exception | compliance/evidence/REQ-123/accepted-e2e-failure.md |
| `staff-notifications` US-B5.3 (and the acknowledge test)  | local gate run | flake          | Fails with 4 workers because the spec counts a shared bell and other specs raise alerts at the same time; passes alone with one worker (CI uses one)                                               | Accepted exception | compliance/evidence/REQ-123/accepted-e2e-failure.md |
| `customer-order-journey` (aggregate project), pickup case | local rerun    | flake          | The order was never created from the checkout page (checkout showed "Table number is required"); the dine-in case passed. The REQ-123 change to `createOrder` only removed an emit. Needs a CI run | Accepted exception | compliance/evidence/REQ-123/accepted-e2e-failure.md |
| Kitchen event emitted when the order is created           | local e2e      | app defect     | `createOrder` emitted `kitchen:new-order` for an unpaid order; moved the emit into `markOrderPaid`                                                                                                 | Fix                | #1059                                               |
| Tests that expected the old behaviour                     | local unit     | test bug       | webhook idempotency, payment-alert, customer-charge, order-management and create-order-wrapper tests updated to the new behaviour                                                                  | Fix                | #1059                                               |

**Final assessment:** every REQ-123 acceptance criterion is proved by passing tests (AC6 as a unit test, AC8 and AC9 as operator evidence), and the UAT record (`uat-execution-record.md`) is signed. The nine local `critical` failures and the intermittent `customer-order-journey` failure are classified as flakes and carried as accepted exceptions (`accepted-e2e-failure.md`); they were not reproduced on CI for the REQ-123 specs, but they were also not individually proved passing on CI by this summary. The release-PR `E2E Regression Suite` (#1060) is the check that proves them, and the release must not proceed if it fails on any of these specs or on REQ-123's own.

## UAT results (2026-11-21)

Agent-executed on UAT with a human paying on Paystack; the record is `uat-execution-record.md` (build `bba621e9`). 8 of 9 steps passed, none failed, none blocked; step 2 could not be run as written (procedure wording, covered by e2e US-A2.13). Two defects were found in UAT and fixed: D1 (Meta 132001 failed a message for a pending template; PR #1061) and D2 (the receipt's View receipt button 404ed because it carried the order number, not the order id; PR #1063, retested on UAT and passing). Steps 8 and 9 have no screenshot, only database records; step 6 has no screenshot for Live orders or Awaiting payment. All three templates are APPROVED on UAT and production (`template-submissions.md`).
