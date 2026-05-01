# Release Ticket: REQ-031 — End-to-end multi-inventory deduction for menu items with customization options

**Status:** APPROVED - DEPLOYED
**Date:** 2026-04-27
**Approved:** 2026-04-27 — META-COMPLY UAT release v2026.04.27.2
**Merged:** 2026-04-27 11:30:46 UTC — merge commit `b8fffc2`
**Requirement ID:** REQ-031
**Risk Level:** HIGH (MEDIUM baseline — user-facing order path with money side-effects — with AI-involvement +1)
**Issue:** [#67](https://github.com/metasession-dev/wawagardenbar-app/issues/67)
**PR:** [#69](https://github.com/metasession-dev/wawagardenbar-app/pull/69) (merged)
**Predecessor:** REQ-030 / PR #66 (closed unmerged) — back-end + admin-config plumbing retained on `develop` as load-bearing pre-cursor (commits `39d75d6`, `e007f3c`, `c5d4327`, `830ab4c`, `4469b6b`)
**Companion:** [META-COMPLY #152](https://github.com/metasession-dev/META-COMPLY/issues/152) — SDLC Stage 1 patch (Surface Inventory + Given/When/Then ACs) authored from this REQ&apos;s root-cause retrospective

---

## Summary

A single menu item&apos;s customization options can now be selected at order time in every order-creation surface, with surcharges flowing into line totals and into the persisted order, and with REQ-030&apos;s linked-inventory deduction fully reachable end-to-end.

The driving case is Poundo + Soup (Ogbono / Egusi / Ugu): customer or staff places an order, selects a soup, the order persists with the customization, and on Complete both the Poundo and the chosen soup&apos;s inventory decrement with one stock-movement audit row each. Cancellation restores both symmetrically.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** Implementation plan, test scope, test plan, six pure-helper modules + tests, React picker shell, sub-dialog wrapper, three server-action wirings, four UI render surfaces, end-user PDF, all compliance artefacts
- **Human Reviewer of AI Code:** ostendo-io (pending) + second reviewer (TBD)
- **Components Regenerated:** None — every change is a targeted edit; the existing back-end (REQ-030 commits) is not regenerated
- **Prompt log:** `compliance/evidence/REQ-031/ai-prompts.md`

HIGH risk — requires a second human reviewer per the Review Policy (Risk-Tiered) before merge to main.

---

## Implementation Details

**Files Created (pure helpers + tests + components + docs):**

- `lib/cart-line-math.ts` — `computeLineTotal({basePrice, customizations, quantity, portionMultiplier})`
- `lib/customization-validation.ts` — `validateSelectedCustomizations` + `summariseSelected` + canonical `SelectedCustomization` type
- `lib/customization-picker-state.ts` — `derivePickerState` + `toggleOption` (radio/checkbox semantics)
- `lib/customization-builder-preview.ts` — `deriveCombinedPricePreview` + `combinedToSurcharge`
- `lib/cart-store-helpers.ts` — `computeCartItemMergeKey` + `addItemToCartItems` + `computeCartItemTotal` + `computeCartTotal`
- `lib/order-line-totals.ts` — `reconcileAndValidateOrderLines` (server-side validator + total recompute + tamper detection)
- `components/features/menu/customization-picker.tsx` — React shell over picker-state helpers
- `components/features/menu/customization-picker-dialog.tsx` — modal wrapper for admin order-creation surfaces
- `__tests__/lib/cart-line-math.test.ts` (13 tests)
- `__tests__/lib/customization-validation.test.ts` (13 tests)
- `__tests__/lib/customization-picker-state.test.ts` (11 tests)
- `__tests__/lib/customization-builder-preview.test.ts` (5 tests)
- `__tests__/lib/cart-store-helpers.test.ts` (12 tests)
- `__tests__/lib/order-line-totals.test.ts` (12 tests)
- `e2e/menu-customization-picker.spec.ts` — 3 Playwright tests
- `docs/customization-options-user-guide.html` + `.pdf` — end-user walkthrough (6 pages, gates AC10)

**Files Modified:**

- `components/features/menu/menu-item-detail-modal.tsx` — picker between Portion + Quantity, gates Add-to-Cart on `pickerState.isValid`, surcharge-aware total
- `components/features/cart/cart-item.tsx` — customizations summary + surcharge-aware per-each price + line total
- `components/features/checkout/order-summary.tsx` — customizations summary + surcharge-aware per-portion + line total
- `app/actions/payment/payment-actions.ts` (`createOrder`) — surcharge-aware subtotal + persist customizations on order line
- `stores/cart-store.ts` — extends helper CartItem with customizations field, delegates to helpers, persist v1→v2 (non-destructive marker)
- `app/dashboard/orders/express/create-order/page.tsx` — picker dialog on item-add, dedupe key includes customizations, surcharge-aware totals
- `app/actions/admin/express-actions.ts` — accepts customizations, calls reconciler, persists customizations
- `components/features/admin/edit-order-dialog.tsx` — sub-dialog picker on `handleAddItem`, dedupe key includes customizations
- `app/actions/admin/order-edit-actions.ts` — calls reconciler, persists customizations, fixed `getAvailableMenuItemsAction.select` field name (`customizationOptions` → `customizations`)
- `app/api/public/orders/route.ts` — calls reconciler with tamper detection (clientTotal vs server-recomputed)
- `components/features/admin/customization-options-builder.tsx` — accepts basePrice + itemName, live combined-price preview, optional combined-price input toggle
- `components/features/admin/menu-item-edit-form.tsx` — passes basePrice + itemName to builder
- `components/features/admin/order-card.tsx` — renders customizations under each line on /dashboard/orders
- `components/features/admin/order-items-table.tsx` — fixed `custom.value` → `custom.option`
- `components/features/kitchen/kitchen-order-card.tsx` — fixed `custom.value` → `custom.option`
- `app/dashboard/orders/tabs/[tabId]/page.tsx` — extends SerializedOrderItem with customizations, renders summary under each line
- `compliance/RTM.md` — REQ-031 row updated through DRAFT → IN PROGRESS → TESTED

**Dependencies Added/Changed:** None.

---

## Test Evidence

| Test Type        | Count                           | Passed         | Failed | Evidence                                |
| ---------------- | ------------------------------- | -------------- | ------ | --------------------------------------- |
| Unit (Vitest)    | 66 (new) + 386 (baseline) = 452 | 452            | 0      | `gates/vitest-summary.txt`              |
| TypeScript       | n/a                             | 0 errors       | 0      | `gates/tsc.txt`                         |
| SAST (Semgrep)   | n/a                             | 0 new findings | n/a    | `gates/semgrep.json`                    |
| Dependency audit | n/a                             | 0 new findings | n/a    | `gates/dependency-audit.json`           |
| E2E (Playwright) | 3                               | per CI         | per CI | `e2e/menu-customization-picker.spec.ts` |
| CI (full suite)  | All                             | All            | 0      | Confirmed green at `66dd3e2`            |

Detail: `compliance/evidence/REQ-031/test-execution-summary.md`. Security analysis: `compliance/evidence/REQ-031/security-summary.md`.

---

## Acceptance Criteria

- [x] AC1 — Required-group enforcement on Express Order
- [x] AC2 — End-to-end deduction journey (Poundo → Egusi inventory drops, two stock-movement rows)
- [x] AC3 — End-to-end restore on cancel
- [x] AC4 — Customer modal picker journey
- [x] AC5 — Edit-order picker journey
- [x] AC6 — Optional-group multi-select
- [x] AC7 — Server-side validation rejects bad pairs (3 surfaces)
- [x] AC8 — Legacy-safe for items with no customizations
- [x] AC9 — Missing linked inventory tolerated at fulfilment (REQ-030 inheritance)
- [x] AC10 — End-user docs PDF shipped at `docs/customization-options-user-guide.pdf`
- [x] AC11 — Regression: 386 pre-existing tests still green
- [x] AC12 — Surcharge billed correctly across all surfaces
- [x] AC13 — Surcharge scales with portionMultiplier
- [x] AC14 — Admin builder live combined-price preview
- [x] AC15 — Server-side total reconciliation (tamper rejection on public POST)

---

## Surface Inventory Recap (S1–S20 from implementation plan)

All in-scope surfaces wired:

- ✅ S2 customer modal picker
- ✅ S3 staff Express Order picker
- ✅ S4 admin Edit Order sub-dialog picker
- ✅ S5 cart sidebar customizations summary
- ✅ S6 checkout forwards customizations
- ✅ S7 public POST validation + tamper detection
- ✅ S8 express server-action validation
- ✅ S9 edit-order server-action validation
- ✅ S16 user-docs PDF

Out-of-scope (waived) surfaces:

- ⏸ S17 surcharge-in-line-totals — **was waived**, then pulled in mid-stage 1 once user confirmed venue uses non-zero surcharges
- ⏸ S18 pre-order linked-stock check — tracked as follow-up [#68](https://github.com/metasession-dev/wawagardenbar-app/issues/68)
- ⏸ S19 conditional groups — no current use case
- ⏸ S20 per-customer saved defaults — no current use case

---

## Post-Deploy Actions

- **None at the database level.** All schema changes are additive and optional. No migration scripts required.
- **Re-publish `docs/customization-options-user-guide.pdf`** to your doc host of choice or attach to this release ticket once approved.
- **Cart-store persist version bumped 1→2** as a marker only; legacy carts continue to work unchanged (verified by existing E2E cart tests).

---

## Rollback Plan

Revert the merge commit on `main`. The new schema fields are optional, so documents saved with customizations on order lines will still validate against the old schema (the field gets ignored on load). Cart-store would log a warning about a higher persist version; users would have to clear their browser storage. No data corruption.

---

## UAT Verification

Three rounds of UAT verification completed during Stage 2:

**Round 1 (commit `aecbf87`):** User flagged three display bugs across `/checkout`, tab page, and kitchen card. Fixed in `e2d80bd`.

**Round 2 (commit `9d9368e`):** User flagged orders dashboard list (`/dashboard/orders`) didn&apos;t render customizations. Fixed in `66dd3e2`.

**Round 3 (commit `66dd3e2`):** User confirmed: "Picker looks good. Other UAT tests have been verified."

**Pending Stage 4 final UAT smoke** (against UAT environment after compliance commit):

1. Health check: `GET /` → 200
2. Smoke: `/dashboard/menu/{id}/edit` loads, customization builder shows live combined-price preview
3. Customer journey: `/menu` → Poundo modal → Soup picker (radios) → Egusi → Add to Cart → checkout → order persists with customization
4. Staff Express Order journey: same picker via dialog
5. Edit Order: add a Poundo+Egusi line via the sub-dialog picker
6. Fulfilment: mark order Complete → both Poundo and Egusi inventories decrement, both show new Sale stock-movement rows
7. Cancellation: cancel a fulfilled order → both restored
8. Tamper test: curl public POST with mismatched total → 400 rejection
9. Regression: place an order without customizations → identical totals as pre-REQ behaviour

Results to be appended to `compliance/evidence/REQ-031/uat-verification.md`.

---

## Reviewers

- [ ] Human reviewer #1 (required for HIGH risk) — ostendo-io
- [ ] Second human reviewer (required for HIGH risk + AI-involvement +1)
- [ ] UAT sign-off — META-COMPLY release

---

## Audit Trail

| Date       | Action                                  | Actor       | Notes                                                                    |
| ---------- | --------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| 2026-04-25 | REQ-030 superseded                      | ostendo-io  | PR #66 closed unmerged; back-end retained on develop                     |
| 2026-04-25 | Issue #67 created                       | Claude Code | Full e2e scope, Surface Inventory format, AC1–AC11 in Given/When/Then    |
| 2026-04-25 | META-COMPLY #152 filed                  | Claude Code | SDLC patch driven by REQ-030 retrospective                               |
| 2026-04-25 | Stage 1 plan committed                  | Claude Code | `0189e99`                                                                |
| 2026-04-25 | Combined-price design call              | ostendo-io  | Surcharge-aware math + admin live preview added; AC12–AC15 added         |
| 2026-04-26 | TDD red+green chunks 1–3 (pure helpers) | Claude Code | Six helper modules, 66 tests                                             |
| 2026-04-26 | Customer journey vertical slice         | Claude Code | `aecbf87`                                                                |
| 2026-04-26 | First push: CI failed (cart migration)  | CI          | E2E cart tests broken by over-cautious clear-on-migrate                  |
| 2026-04-26 | Migration fix                           | Claude Code | `55fbced` — non-destructive marker                                       |
| 2026-04-26 | UAT round 1 — display bugs flagged      | ostendo-io  | Order Summary, tab page, kitchen card                                    |
| 2026-04-26 | Display bug fixes                       | Claude Code | `e2d80bd`                                                                |
| 2026-04-26 | Admin surfaces + server validation      | Claude Code | `9d9368e` then `cbadb07` (select hotfix)                                 |
| 2026-04-27 | UAT round 2 — orders list flagged       | ostendo-io  | `/dashboard/orders` order cards missing customizations                   |
| 2026-04-27 | Orders list fix                         | Claude Code | `66dd3e2`                                                                |
| 2026-04-27 | UAT round 3 confirmed picker UX         | ostendo-io  | "Picker looks good"                                                      |
| 2026-04-27 | Stage 3 evidence compiled               | Claude Code | gates, security-summary, test-execution-summary, ai-prompts, this ticket |
