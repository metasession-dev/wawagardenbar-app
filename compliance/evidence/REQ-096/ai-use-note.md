# REQ-096 — AI use note

## What the AI did

- Read issue [#612](https://github.com/metasession-dev/wawagardenbar-app/issues/612) and the prior conversation's investigation (revenue-query mechanics, existing `deleteTab` pattern).
- Surfaced a genuine architectural question before drafting the plan — whether order deletion should be a hard delete (mirroring `deleteTab`) or a soft delete — and posed it to the operator via `AskUserQuestion` rather than guessing; the operator chose soft-delete.
- Authored the implementation plan, SRS stubs (REQ-ORDMGT-013/014, updated REQ-TABMGT-004), ADR-002, and risk-register entries R-013–R-017 via the `requirements-aligner`/`adr-author`/`risk-register-keeper` sub-skills.
- Implemented `OrderService.deleteOrder()`, extended `TabService.deleteTab()`, the two action-layer entry points, a new `DeleteOrderDialog` component, and extended `DeleteTabDialog` (radio → two independent checkboxes).
- Delegated all e2e/visual-regression test work to the `e2e-test-engineer` skill per the framework's mandatory sub-skill contract; did not author `e2e/**/*.spec.ts` directly.
- Ran the full local test pack (unit + e2e) against a real dev server and MongoDB instance (not mocked), which caught a real schema/enum mismatch (`models/audit-log-model.ts` missing `order.delete`) that the fully-mocked unit tests could not have caught, and fixed it.
- Ran the full `critical` e2e regression pack once; found 3 apparently-related failures, verified each in isolation (`--workers=1`) to confirm they were parallel-load contention artifacts, not regressions, before concluding.

## Honest framing of limitations

**Structural residual on R-015 (soft-delete surface coverage) is accepted, not solved.** There is no compile-time or query-builder-level guarantee that a _future_ order-listing query will remember to filter `isDeleted`. ADR-002 documents this explicitly as a known tradeoff rather than over-engineering a Mongoose default-scope plugin this REQ's scope doesn't need.

**Tab-level `partialPayments` reversal is explicitly out of scope**, not silently mishandled — the payment-revert choice is server-side refused when a tab has recorded partial payments, directing manual reconciliation instead.

**The actual monetary refund remains manual and out-of-band**, matching the pre-existing precedent in `app/actions/communication/communication-actions.ts`. This REQ only makes `paymentStatus` correctly reflect the reversal for reporting purposes; it does not integrate a payment-provider refund API (R-017, accepted as a pre-existing gap, not new).

## What the operator validated

- Chose the soft-delete design (vs. hard-delete, vs. hard-delete-restricted-to-inert-orders) via `AskUserQuestion` before the plan was drafted.
- Approved the HIGH-risk implementation plan explicitly before Phase 2 began.
- Will validate at PR review and during portal UAT review.

## Reproducibility

Unit tests:

```bash
npx vitest run __tests__/services/order-service.delete-order.test.ts \
  __tests__/services/tab-service.delete-payment-revert.test.ts \
  __tests__/services/financial-report-service.payment-revert-exclusion.test.ts \
  __tests__/actions/admin/order-management-actions.test.ts
```

E2E (requires a running dev server + local MongoDB; see `SDLC/test-isolation.md`):

```bash
BASE_URL=http://localhost:3000 npx playwright test --project=critical \
  e2e/critical/delete-order.spec.ts e2e/critical/delete-tab-payment-revert.spec.ts
```
