---
title: 'Implementation plan — REQ-097'
requirement_id: 'REQ-097'
risk_class: 'HIGH'
change_type: 'fix'
authored_by: 'agent'
authored_at: '2026-07-30'
---

# Implementation plan — REQ-097

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | N/A callout below (no personal data).                      |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A callout below (no AI in scope).                        |

## 1. Goal + acceptance criteria

- **Goal:** Fix half/quarter portion pricing so the picker preview, the persisted order amount, and the menu editor's own reference calculation all agree — today the picker overcharges (adds the flat surcharge without applying the percentage discount) while the server silently drops the surcharge entirely from what's actually charged.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                                                                                                    | SRS item it traces to |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| AC1 | Given a menu item with Half Portion enabled (50%, surcharge configured), When a staff member opens the "Select Portion Size" dialog in Admin → Express: Create Order, Then the Half Portion price shown equals `round(basePrice × 0.5) + surcharge` — matching the menu editor's own preview, not `basePrice + surcharge`.                                                     | REQ-ORDMGT-015 (new)  |
| AC2 | Given the same setup, When the staff member picks Quarter Portion, Then the Quarter Portion price shown equals `round(basePrice × 0.25) + surcharge`.                                                                                                                                                                                                                          | REQ-ORDMGT-015 (new)  |
| AC3 | Given a Half/Quarter portion item with a surcharge configured, When a staff member completes an Express Create Order with that item and views the resulting order, Then the persisted line price equals `round(basePrice × multiplier) + surcharge` — the surcharge is present in what was actually charged, not silently dropped.                                             | REQ-ORDMGT-016 (new)  |
| AC4 | Given the same setup, When a staff member edits an existing order's items via the order-edit flow to add/change a Half/Quarter portion line, Then the persisted line price for that edit also includes the surcharge, computed identically to AC3.                                                                                                                             | REQ-ORDMGT-016 (new)  |
| AC5 | Given the same setup, When an order is submitted via the public checkout API (`POST /api/public/orders`) with a portioned line, Then the server-recomputed subtotal used for the tamper-check and the persisted line both include the surcharge, computed identically to AC3 — this closes the same reconciler gap for the third consumer of `reconcileAndValidateOrderLines`. | REQ-ORDMGT-016 (new)  |
| AC6 | Given a portion surcharge is configured and an admin also applies a manual price override on the same line, When the order is created, Then the surcharge is still added on top of the overridden base price (the override replaces the item's base price, not the portion-size adjustment fee) — documented explicitly since the issue doesn't state this interaction.        | REQ-ORDMGT-016 (new)  |

## SRS items proposed/touched

| AC       | SRS item                        | Status   | Notes                                                                                                                                                                                                                                                                                                   |
| -------- | ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1, AC2 | REQ-ORDMGT-015 (new — proposed) | authored | No existing SRS item covered the portion-picker's own price display anywhere (checked MENU, MENUMGT, ORDMGT areas) — genuine gap, not drift. Authored full Given/When/Then directly in `docs/SRS.md`, matching this project's existing convention of shipping complete SRS prose within the same cycle. |
| AC3–AC6  | REQ-ORDMGT-016 (new — proposed) | authored | Same gap for the server-persisted price across all three `reconcileAndValidateOrderLines` consumers; folded into one SRS item since it's one invariant (portion surcharge must be persisted) verified across three call sites plus the override-interaction edge case.                                  |

Note: `REQ-MENU-006` (existing, customer cart line-total math) documents the customization-surcharge-scales-with-portion formula but does not cover the flat portion-option surcharge at all — this is a pre-existing SRS gap on the customer-facing surface too, but that surface's code (`menu-item-detail-modal.tsx`) already computes it correctly and is not changing in this REQ, so the gap there is left as-is (documentation-only, no behavioural risk) rather than expanding this REQ's scope.

## 2. Scope

- **In scope:**
  - `components/features/admin/portion-picker-dialog.tsx` — picker preview price (Bug A).
  - `app/dashboard/orders/express/create-order/page.tsx` — `computeAdjustedPrice()` (Bug A).
  - `lib/order-line-totals.ts` — `MenuItemForReconcile` type extended with `portionOptions`; reconciler passes the resolved portion surcharge through to `computeLineTotal`.
  - `lib/cart-line-math.ts` — `computeLineTotal()` gains an optional flat `portionSurcharge` parameter (added post-multiplier, then scaled by quantity — it is not itself fractioned, since it's already the flat fee for choosing the smaller portion).
  - `app/actions/admin/express-actions.ts` — per-line persisted price/subtotal computation (Bug B, primary reported site).
  - `app/actions/admin/order-edit-actions.ts` — same fix; this file already fetches `portionOptions` in its Mongo projection (unused today) — wire it through instead of adding a new query.
  - `app/api/public/orders/route.ts` — same reconciler consumer; needs `portionOptions` added to its `menuMap` projection and its own inline per-line subtotal calc fixed in step with the other two.
  - `__tests__/lib/cart-line-math.test.ts`, `__tests__/lib/order-line-totals.test.ts` — new cases for a non-zero portion surcharge.
  - `__tests__/services/express-actions.test.ts` (or equivalent existing admin-flow unit test) — assert persisted price includes the surcharge.

- **Out of scope:**
  - `app/actions/payment/payment-actions.ts` (`createOrder`, the actual customer-facing web checkout used by `CustomerCheckoutForm`) — investigated during planning; this path does **not** use `reconcileAndValidateOrderLines` at all. It trusts the client-supplied `item.price` directly, and the client (`components/features/menu/menu-item-detail-modal.tsx`) already computes the surcharge-inclusive adjusted price correctly (`Math.round(item.price * multiplier) + surcharge`, confirmed at lines 66-80). So this path is unaffected by either bug today — out of scope, no change needed. Documented here so it isn't mistaken for a missed site.
  - Any change to the customization-surcharge-scales-with-portion behaviour (`Σ customization surcharge × portionMultiplier`) — that existing "Option B" design (REQ-031) is correct and untouched; only the flat portion-option surcharge is being added, as a separate additive term.
  - Menu-item editor (`menu-item-edit-form.tsx`) and customer item modal (`menu-item-detail-modal.tsx`) — both already compute this correctly; used as the reference implementations, not touched.

### Surface inventory

| Surface                                      | URL / file                                                               | Status                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Admin Express Create Order — portion picker  | `/dashboard/orders/express/create-order` — `portion-picker-dialog.tsx`   | In scope (AC1, AC2)                                                       |
| Admin Express Create Order — persisted order | `/dashboard/orders/express/create-order` → `express-actions.ts`          | In scope (AC3, AC6)                                                       |
| Admin Order Edit — persisted order           | `order-edit-actions.ts` (edit-items flow)                                | In scope (AC4)                                                            |
| Public checkout API                          | `POST /api/public/orders`                                                | In scope (AC5) — shares the same reconciler, fixed as a consequence       |
| Customer web checkout                        | `/checkout` → `CustomerCheckoutForm` → `payment-actions.ts::createOrder` | Already works — confirmed correct client-trust path, see Scope note above |
| Menu item editor preview                     | `menu-item-edit-form.tsx`                                                | Already works — reference implementation, unchanged                       |
| Customer menu item modal                     | `menu-item-detail-modal.tsx`                                             | Already works — reference implementation, unchanged                       |

## 3. Architecture decisions

- **No ADR needed** — this is a bug fix correcting an arithmetic omission in existing, already-architected code paths (a shared reconciler + duplicated per-action inline math that both pre-date this REQ). No new dependency, no new data store, no pattern change — the fix adds one additive term to an existing formula in four files that already share the same contract.

## 4. Threat model + security considerations

| Threat                                                                                               | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client-supplied `priceOverride`/`portionSize` used to under-report the portion surcharge server-side | Low        | Medium | The surcharge is resolved from `menuItem.portionOptions` looked up server-side by `menuItemId` — never taken from the client request. The client only supplies which portion size was picked (`'half'`/`'quarter'`), not the surcharge amount itself, so this was already the safe pattern the base-price fraction uses; the fix reuses it. |
| Tamper-check tolerance masking a future re-introduction of this gap                                  | Low        | Low    | AC5 adds a portioned-line case to `order-line-totals.test.ts` so the 1-naira tamper tolerance can't silently pass a case that omits the surcharge again.                                                                                                                                                                                    |

**Secrets / credentials:** N/A — no secrets or credentials touched.

**Dependencies introduced:** None.

### Risk register entries

- **R-018 — Silent under-charging on admin-created portioned orders** — Status: MITIGATED by this REQ. Opened and mitigated in the same cycle; canonical row at `compliance/risk-register.md`. The portion surcharge configured on a menu item (`halfPortionSurcharge`/`quarterPortionSurcharge`) was never persisted to any order created via Admin Express Create Order, Admin Order Edit, or the public checkout API — real revenue was lost on every such order with no error, no log, and no discrepancy visible anywhere except a manual reconciliation against the menu editor's own displayed price. Mitigated by wiring the surcharge through `MenuItemForReconcile`/`computeLineTotal` and the three call sites' per-line persistence math. Residual: the customer-facing web checkout path (`payment-actions.ts`) was independently verified as unaffected (see Scope note) — no residual risk there.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ only touches price-calculation logic for menu items and order lines; no personal data fields are read, written, or newly collected.

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change any AI/model behaviour; it is a deterministic arithmetic fix.

## 7. Rollback plan

- **Reversible via:** `git revert` of the merge commit — the change is additive arithmetic (a new optional parameter + one extra term in existing formulas), no schema/migration involved.
- **Data implications of rollback:** Orders created _while the fix is live_ will have correctly persisted the portion surcharge in their `subtotal`/`price` fields. Rolling back the code does not retroactively change already-persisted order documents — those orders keep the correct total even after a rollback; only newly-created orders after the rollback would regress to the old (under-charging) behaviour. No data migration needed either direction.
- **Notification path if rollback during a release:** Standard release-ticket rollback note; no customer-facing notification needed since this only affects admin-created orders and internal figures, not anything already communicated to a customer.

## 8. Verification

- **Unit + integration tests:**
  - `__tests__/lib/cart-line-math.test.ts` — new describe block: `computeLineTotal` with a non-zero `portionSurcharge`, verifying the surcharge is added post-multiplier and scales with quantity but not with the portion fraction.
  - `__tests__/lib/order-line-totals.test.ts` — new case: `MenuItemForReconcile` with `portionOptions` configured, `reconcileAndValidateOrderLines` recomputes `recomputedSubtotal` including the surcharge; a case confirming a `clientTotal` computed with the correct (surcharge-inclusive) number now passes the tamper-check where it previously would have failed.
  - Existing admin-actions unit test coverage (`__tests__/actions/admin/order-management-actions.test.ts` or sibling) extended/new test asserting `expressCreateOrderAction`'s persisted line `price`/`subtotal` for a half-portion item with a surcharge matches the editor's reference calculation.
- **E2E coverage:** HIGH risk + user-visible price display — delegated to `e2e-test-engineer` per the skill's Phase 2 step 3 gate. Target: Admin → Express: Create Order → open portion picker for an item with configured Half/Quarter surcharges → assert displayed prices match `round(base×fraction)+surcharge` → complete the order → assert the order detail view shows the same, correct total.
- **Manual smoke after deploy:** Spot-check one real menu item with portion surcharges configured in the live Express Create Order picker; confirm displayed and persisted totals agree with the menu editor.
- **Monitoring / alerting:** None added — this is a one-off arithmetic correction, not an ongoing operational surface.

## 9. Sign-off

- **Plan reviewer (eng):** Pending — HIGH risk plan-approval checkpoint (Phase 1 step 11).
- **Plan reviewer (security / DPO):** N/A — no personal-data or security-sensitive surface beyond the threat-model table above.
- **Plan approved by operator:** Pending.

## Upload path

This file lives at `compliance/plans/REQ-097/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
