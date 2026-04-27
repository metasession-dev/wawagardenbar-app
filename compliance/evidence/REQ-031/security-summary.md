# Security Summary — REQ-031

**Requirement:** REQ-031 — End-to-end multi-inventory deduction for menu items with customization options
**GitHub Issue:** [#67](https://github.com/metasession-dev/wawagardenbar-app/issues/67)
**Risk Level:** HIGH
**Date:** 2026-04-27

## Universal Gates

| Gate                        | Result                                                                                                 | Notes                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript (`tsc --noEmit`) | **0 errors**                                                                                           | `gates/tsc.txt`                                                                                                                                  |
| Vitest unit suite           | **452/452 passed** (386 baseline + 66 new)                                                             | `gates/vitest-summary.txt`                                                                                                                       |
| Semgrep SAST                | **0 new findings**                                                                                     | 1 WARNING in pre-existing `lib/cors.ts` (REQ-029 baseline, already accepted), 2 INFO in pre-existing services. Full output: `gates/semgrep.json` |
| Dependency audit            | **0 new findings**                                                                                     | 1 HIGH (`xlsx`, pre-existing, allowlisted), 6 moderate pre-existing. Full output: `gates/dependency-audit.json`                                  |
| Playwright E2E              | Smoke spec authored at `e2e/menu-customization-picker.spec.ts`; full suite verification deferred to CI |
| CI pipeline (develop)       | Confirmed green at commit `66dd3e2` (CI run `24958480050` and earlier runs)                            |

## Threat Model & Mitigations

### T1 — Tampered client posts forged customization (group, option) pair

A malicious client could craft an order request with `customizations: [{ name: "Soup", option: "Caviar", price: -10000 }]` to receive a discount or to bypass linked-inventory deduction.

**Mitigations:**

- Server-side `validateSelectedCustomizations` rejects any `(groupName, optionName)` pair that doesn't exist on the menu item being ordered. Path-qualified error returned (`items[i]: unknown option "Caviar" in group "Soup"`).
- Single source of truth: `lib/customization-validation.ts` is consumed by all three order-creating actions:
  - `app/actions/admin/express-actions.ts` (`expressCreateOrderAction`)
  - `app/actions/admin/order-edit-actions.ts` (`updateOrderItemsAction`)
  - `app/api/public/orders/route.ts` (`POST /api/public/orders`)
- 13 unit tests covering valid pairs, unknown groups, unknown options, mid-list offender path-index, no-leak of unrelated names. (`__tests__/lib/customization-validation.test.ts`)

### T2 — Tampered client posts forged total to underpay

A malicious client could submit `total: 1000` for a 2,500-naira order.

**Mitigations:**

- `reconcileAndValidateOrderLines` recomputes the subtotal server-side from menu data (the menu is the source of truth, never the client request).
- Public POST: rejects 400 if client-supplied `subtotal` differs from server-recomputed by more than 1-naira tolerance. Error contains both values for ops investigation.
- Server-side actions (express, edit-order) ignore client subtotal entirely and persist the recomputed value.
- 4 unit tests covering exact match, within tolerance, beyond tolerance, undefined-clientTotal pass-through. (`__tests__/lib/order-line-totals.test.ts`)

### T3 — Race / staleness in cart-side merge

A customer's cart has stale items whose menu prices have changed. Old: silent merge of legacy lines into new schema → could lose soup choices.

**Mitigations:**

- Cart-store `persist` version bumped 1 → 2 as a marker.
- Migration is non-destructive: legacy items without a `customizations` field hash to the same merge key as before (empty trailing segment). Behaviour identical for orders without customizations (AC8 legacy-safe).
- Server total recompute (T2 mitigation) ensures the customer can never overpay or underpay due to stale cart prices — server uses live menu data.

### T4 — Required-group bypass

A malicious client could submit an order without picking a Required customization group, even though the picker disables Add-to-Cart.

**Mitigations:**

- This REQ deliberately does **not** enforce required-group selection server-side. Picker UI is the gate (AC1, `derivePickerState`).
- The omission matches REQ-030's "silent skip at fulfilment" policy and is documented in `lib/order-line-totals.ts` and the implementation plan (D7).
- Risk accepted: a tampered client could submit an order without Soup, but this only causes a kitchen confusion (no soup served), not financial loss or stock corruption.

### T5 — Sub-naira rounding drift creating cascading discrepancies

Floating-point arithmetic on prices (e.g. `0.5 × 2333 = 1166.5`) could drift across surfaces.

**Mitigations:**

- `computeLineTotal` uses `Math.round` (round-half-up) at the final boundary. Sub-naira values never persist.
- 2 unit tests confirm `(1166.5)` rounds to `1167`, and `(0.1 × 2500)` doesn't introduce floating-point noise. (`__tests__/lib/cart-line-math.test.ts`)
- Tamper-detection tolerance set to 1 naira to absorb legitimate rounding while blocking 1000-naira fraud.

## Access Control

- Server actions still require admin/super-admin session (unchanged from pre-REQ-031).
- Public POST endpoint already requires API key with `orders:write` scope (unchanged).
- No new auth surface introduced.

## Audit Logging

- Order creation continues to record `createdBy` and `createdByRole`.
- Stock-movement rows continue to record `performedBy` (or `System` for fulfilment-driven deductions).
- Customizations on the persisted order line are visible end-to-end: order detail page, tab page, kitchen card, stock-movement history.

## Input Validation Surface Summary

| Boundary                                      | Validation                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Customer modal (`menu-item-detail-modal.tsx`) | Add-to-Cart disabled while `derivePickerState.isValid` is false (required-group gate)                         |
| Express Order page                            | Picker `Confirm` disabled while invalid; same `derivePickerState` logic                                       |
| Edit Order dialog                             | Same, via shared `CustomizationPickerDialog`                                                                  |
| Public POST                                   | Server-side reject on bad pair OR tampered total; both 400                                                    |
| Express server action                         | Server-side reject on bad pair                                                                                |
| Edit-order server action                      | Server-side reject on bad pair                                                                                |
| Cart-store merge key                          | Includes sorted customizations hash; no client tamper can collapse two distinct soup selections into one line |

## Performance Impact

- Validation is `O(groups × options)` against menu data already loaded by the action — sub-millisecond.
- Reconciler is `O(lines)` linear scan. Negligible.
- No new DB queries beyond the menu-item lookup that the actions already perform.

## Pre-existing Findings Carried Forward

These are baseline, accepted by previous REQs:

- `lib/cors.ts` — Semgrep WARNING (CORS misconfiguration). Pre-existing since at least REQ-029. No change in this REQ.
- `xlsx` package — npm audit HIGH. Pre-existing, allowlisted; not used in any REQ-031 code path.

## Sign-off

- AI tool: Claude Code (Claude Opus 4.7, 1M context)
- Primary reviewer: ostendo-io (pending)
- Second reviewer: TBD (HIGH risk + AI involvement +1 → 2 human reviewers required per Review Policy)
