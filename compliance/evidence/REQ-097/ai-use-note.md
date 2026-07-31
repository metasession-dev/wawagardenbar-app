# REQ-097 — AI use note

## What the AI did

- Read issue [#613](https://github.com/metasession-dev/wawagardenbar-app/issues/613) (already contained a detailed root-cause investigation from the reporter) and verified every cited line number directly against the current code before drafting the plan.
- Discovered, while implementing, that the actual customer-facing web checkout (`payment-actions.ts::createOrder`) doesn't share the buggy reconciler at all — traced the real code path rather than assuming the issue's own "worth verifying" note was moot, confirmed it independently, and documented the finding in the plan/security-summary so it isn't mistaken for a missed fix site.
- Authored the implementation plan, SRS items REQ-ORDMGT-015/016 (new — genuine gap, no existing item covered portion-picker pricing), no-ADR rationale, and risk register entry R-018 via the `requirements-aligner`/`adr-author`/`risk-register-keeper` sub-skills.
- Fixed both bugs: `computeLineTotal` (shared line-total primitive) gained a flat `portionSurcharge` parameter; the reconciler and all three call sites (`express-actions.ts`, `order-edit-actions.ts`, `app/api/public/orders/route.ts`) wired the menu item's `portionOptions` through it; the picker/preview calc in `portion-picker-dialog.tsx` and `create-order/page.tsx` corrected to match.
- Delegated all e2e/visual-regression test work to the `e2e-test-engineer` skill per the framework's mandatory sub-skill contract; did not author `e2e/**/*.spec.ts` directly. The delegated work discovered that no seeded menu item ships with `portionOptions` configured, and built a precise Mongo-fixture pattern (matching this repo's established convention) to test the exact repro from the issue.
- Ran the full local test pack (unit + e2e) against a real dev server and MongoDB instance (not mocked). Ran the full `regression` e2e pack once; found 13 failures, verified via `git stash` + direct baseline re-run (`customer-auth.spec.ts`) that they reproduce identically without this REQ's changes and touch none of the files this REQ modifies — confirmed pre-existing and unrelated before concluding, rather than assuming.
- Discarded ~85 files' worth of unrelated compliance-evidence screenshot regeneration that the full regression run incidentally produced for other, already-released REQs, keeping the commit scoped to REQ-097 only.

## Honest framing of limitations

**The e2e fixture force-mutates a real seeded menu item's `portionOptions` for the duration of the test run**, since no fixture ships with portion options enabled. This is restored in `afterAll` and verified restored post-run, but it is a live-data mutation pattern (consistent with this repo's existing precedent in `admin-order-inventory-delta.sale-point.spec.ts`), not a fully isolated fixture.

**AC4 (order-edit) and AC5 (public checkout API) rely on the shared reconciler's unit tests, not dedicated per-call-site tests.** This REQ's fix is that all three consumers pipe through one reconciler; testing the reconciler directly proves the fix propagates correctly rather than needing three near-identical duplicate test files.

## What the operator validated

- Approved the HIGH-risk implementation plan explicitly before Phase 2 began, including the scope note that the real customer checkout was investigated and confirmed unaffected.
- Will validate at PR review and during portal UAT review.

## Reproducibility

Unit tests:

```bash
npx vitest run __tests__/lib/cart-line-math.test.ts \
  __tests__/lib/order-line-totals.test.ts \
  __tests__/actions/admin/express-actions-portion-pricing-req097.test.ts
```

E2E (requires a running dev server + local MongoDB):

```bash
BASE_URL=http://localhost:3000 npx playwright test --project=regression \
  e2e/critical/express-order-portion-pricing-req097.spec.ts
```
