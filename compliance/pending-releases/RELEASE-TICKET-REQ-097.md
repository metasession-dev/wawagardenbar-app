# Release Ticket: REQ-097 — Fix half/quarter portion pricing in Admin order management

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-07-30
**Requirement ID:** REQ-097
**Risk Level:** HIGH
**Issue:** [#613](https://github.com/metasession-dev/wawagardenbar-app/issues/613)
**Implementation branch:** `feat/REQ-097-portion-pricing-fix`

## Summary

Two independent bugs, one root cause: the "Select Portion Size" dialog in Admin → Express: Create Order previously overcharged (added the flat portion surcharge without applying the percentage discount — Half Portion showed as MORE expensive than Full), while the price actually persisted to the order silently dropped the surcharge entirely. Both now compute `round(basePrice × fraction) + surcharge`, matching the menu editor's own reference calculation.

## AI contributors

| Tool        | Version  | Commits                                      | Date       |
| ----------- | -------- | -------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `f40767b` (plan), `681d98d` (implementation) | 2026-07-30 |

Prompt and review record: `compliance/evidence/REQ-097/ai-use-note.md`.

## Implementation details

- `lib/cart-line-math.ts` — `computeLineTotal()` gains an optional flat `portionSurcharge` parameter (added post-multiplier, then scaled by quantity — not itself fractioned).
- `lib/order-line-totals.ts` — `MenuItemForReconcile` extended with `portionOptions`; the shared reconciler resolves the flat surcharge for the selected portion size from the menu item.
- `app/actions/admin/express-actions.ts`, `app/actions/admin/order-edit-actions.ts`, `app/api/public/orders/route.ts` — all three consumers of the shared reconciler updated in lock-step so the fix can't drift back out of sync.
- `components/features/admin/portion-picker-dialog.tsx`, `app/dashboard/orders/express/create-order/page.tsx` — picker/preview price corrected to the same formula.
- `docs/SRS.md` — `REQ-ORDMGT-015`/`REQ-ORDMGT-016` (new — no existing item covered portion-picker pricing).
- `compliance/risk-register.md` — `R-018`.
- Tests: `__tests__/lib/cart-line-math.test.ts`, `__tests__/lib/order-line-totals.test.ts` (extended), `__tests__/actions/admin/express-actions-portion-pricing-req097.test.ts` (new); `e2e/critical/express-order-portion-pricing-req097.spec.ts` (new).

**Investigated and ruled out of scope:** the actual customer-facing web checkout (`payment-actions.ts::createOrder`) does not use the shared reconciler and already computes the correct surcharge-inclusive price client-side — confirmed unaffected by either bug.

## Verification

- Unit: 1,340 passed (full suite), 25 new for this REQ.
- E2E: 2/2 targeted, run locally against a real dev server + MongoDB. Full `regression` pack run once (547 tests): 13 pre-existing failures confirmed unrelated via `git stash` baseline re-run and zero file-reference overlap.
- TypeScript/ESLint: 0 errors.
- Full detail: `compliance/evidence/REQ-097/test-execution-summary.md`.
- **Release PR #623 E2E Regression Suite** (run 30537370010): 1 failure — `e2e/critical/express-order-report.spec.ts` "daily report reflects POS payment" (`cardDelta` received `0`, expected `>= 1500`). Investigated and confirmed pre-existing/unrelated: zero file overlap with this REQ's changes, passed in the local full-regression run before the PR opened, matches a flake class already documented in `e2e/helpers/db-assertions.ts` (daily-report aggregate-delta assertions), and reproduced as a clean pass on isolated re-run via `workflow_dispatch` (run 30538142167). No code change made. Documented on PR #623.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. The operator independently reviewed and approved the HIGH-risk implementation plan (including the scope note on the unaffected customer checkout path) before implementation began, and will review the PR + perform the portal UAT review before Production approval.
