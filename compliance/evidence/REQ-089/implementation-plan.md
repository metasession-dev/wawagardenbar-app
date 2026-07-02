---
title: 'Implementation plan — REQ-089'
requirement_id: 'REQ-089'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'agent'
authored_at: '2026-07-02'
---

# Implementation plan — REQ-089

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. Reference the per-REQ `test-plan.md` if it lives separately.                                           |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations (auth, data handling, dependencies, secrets).                                                                         |
| **GDPR Art. 25** Data protection by design and by default | Per-purpose data flows; minimisation; lawful basis; retention. **Required for any REQ that processes personal data; explicit "no personal data" callout if not.** |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | When the REQ touches AI / model behaviour: model provenance, prompt sources, oversight path. **Explicit "no AI in scope" callout if not.**                        |

## 1. Goal + acceptance criteria

> _Closes ISO 29119 §3.4 — test plan_

- **Goal:** Bring admin order management flows (Express Create Order and Edit Order Dialog) to feature parity with the customer-facing flow for portion size selection, manual price override, per-item special instructions, and stock validation on add — and remove price override from the customer-facing cart.

### Acceptance criteria

| AC  | Description                                                                                                                                                                                                                                                                                                                      | SRS item it traces to             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| AC1 | **Given** a menu item with `halfPortionEnabled` or `quarterPortionEnabled`, **When** staff open Express Create Order (`/dashboard/orders/express/create-order`) and click the item, **Then** a portion size selector (Full/Half/Quarter) appears with adjusted prices and the selected portion is persisted on the cart line.    | REQ-ORDMGT-008 (existing)         |
| AC2 | **Given** a menu item with `halfPortionEnabled` or `quarterPortionEnabled`, **When** staff open the Edit Order Dialog and add or edit an item, **Then** a portion size selector appears and the portion size can be changed, with the line price recalculated accordingly.                                                       | REQ-ORDMGT-003 (existing)         |
| AC3 | **Given** a menu item with `allowManualPriceOverride: true`, **When** staff add the item in Express Create Order, **Then** an "Override Price" button appears on the cart line, clicking it opens the `PriceOverrideDialog` with reason capture, and the overridden price + reason + auditor ID are persisted on the order line. | REQ-ORDMGT-004 (existing)         |
| AC4 | **Given** a menu item with `allowManualPriceOverride: true`, **When** staff edit an order line in the Edit Order Dialog, **Then** an "Override Price" button appears and the override is persisted with `priceOverridden: true`, `originalPrice`, `priceOverrideReason`, `priceOverriddenBy`, `priceOverriddenAt`.               | REQ-ORDMGT-004 (existing)         |
| AC5 | **Given** the customer-facing cart (`/cart` or cart sidebar), **When** any user (including admin) views a cart line, **Then** no price override button, no `PriceOverrideDialog`, and no `allowManualPriceOverride` forwarding is present — price override is staff-only via admin surfaces.                                     | REQ-ORDMGT-011 (new — stub added) |
| AC6 | **Given** staff are creating an order in Express Create Order, **When** they view a cart line, **Then** a special instructions textarea is available per line and the text is persisted to the order item's `specialInstructions` field.                                                                                         | REQ-ORDMGT-012 (new — stub added) |
| AC7 | **Given** staff are editing an order in the Edit Order Dialog, **When** they view an existing order item, **Then** a special instructions textarea is available and edits are persisted on save.                                                                                                                                 | REQ-ORDMGT-003 (existing)         |
| AC8 | **Given** staff submit an order via Express Create Order, **When** any item's requested quantity (adjusted by portion multiplier) exceeds the available `currentStock` from the paired Inventory row, **Then** the server rejects the order with a clear error naming the item and available stock.                              | REQ-MENU-004 (existing)           |
| AC9 | **Given** staff are adding items in Express Create Order, **When** an item is out-of-stock (`stockStatus === 'out-of-stock'`), **Then** the item card is disabled (greyed out, not clickable) and cannot be added to the cart.                                                                                                   | REQ-MENU-004 (existing)           |

## 2. Scope

- **In scope:**
  - `app/dashboard/orders/express/create-order/page.tsx` — add portion selector, price override UI, special instructions, stock validation
  - `components/features/admin/edit-order-dialog.tsx` — add portion selector, price override UI, special instructions textarea
  - `app/actions/admin/express-actions.ts` — accept price override fields, stock validation on submit
  - `app/actions/admin/order-edit-actions.ts` — accept price override fields, update `.select()` to include `portionOptions` + `allowManualPriceOverride`
  - `lib/order-line-totals.ts` — extend reconciler to accept optional price override per line
  - `components/features/cart/cart-item.tsx` — remove price override UI (button, dialog, handlers)
  - `components/features/menu/menu-item-detail-modal.tsx` — remove `allowManualPriceOverride` from `addItem` call
  - `stores/cart-store.ts` — keep `overrideItemPrice`/`resetItemPrice` methods (used by admin surfaces) but ensure customer components don't call them

- **Out of scope:**
  - Item image display in admin flows (separate enhancement)
  - Nutritional/allergen info display in admin flows
  - Search/filter improvements to the Edit Order Dialog's item dropdown
  - Customer-facing flow changes beyond price override removal

### Surface inventory

| Surface                        | URL / file                                            | Status                                                            |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Express Create Order           | `/dashboard/orders/express/create-order` — `page.tsx` | In scope                                                          |
| Edit Order Dialog              | `components/features/admin/edit-order-dialog.tsx`     | In scope                                                          |
| Customer cart (price override) | `components/features/cart/cart-item.tsx`              | In scope (removal)                                                |
| Customer menu modal            | `components/features/menu/menu-item-detail-modal.tsx` | In scope (removal of `allowManualPriceOverride` forwarding)       |
| Express order server action    | `app/actions/admin/express-actions.ts`                | In scope                                                          |
| Order edit server action       | `app/actions/admin/order-edit-actions.ts`             | In scope                                                          |
| Order line reconciler          | `lib/order-line-totals.ts`                            | In scope                                                          |
| Order details view             | `components/features/admin/order-items-table.tsx`     | Already works — displays portion badges + price override details  |
| Cart store                     | `stores/cart-store.ts`                                | In scope (ensure customer components don't call override methods) |

## SRS items proposed/touched

| AC  | SRS item                  | Status                | Notes                                                                       |
| --- | ------------------------- | --------------------- | --------------------------------------------------------------------------- |
| AC1 | REQ-ORDMGT-008 (existing) | stale — update needed | Covers express item selection but not portion size selection                |
| AC2 | REQ-ORDMGT-003 (existing) | stale — update needed | Covers edit order items but not portion size selection                      |
| AC3 | REQ-ORDMGT-004 (existing) | stale — update needed | Covers price override but references `payment-actions.ts`, not express flow |
| AC4 | REQ-ORDMGT-004 (existing) | stale — update needed | Needs to cover Edit Order Dialog surface                                    |
| AC5 | REQ-ORDMGT-011 (new)      | stub added            | Remove price override from customer cart                                    |
| AC6 | REQ-ORDMGT-012 (new)      | stub added            | Special instructions in Express Create Order                                |
| AC7 | REQ-ORDMGT-003 (existing) | stale — update needed | Covers edit order items but not special instructions editing                |
| AC8 | REQ-MENU-004 (existing)   | stale — update needed | Covers customer flow stock gating, not express order flow                   |
| AC9 | REQ-MENU-004 (existing)   | stale — update needed | Needs to cover express order surface                                        |

## 3. Architecture decisions

> _Populated by the `adr-author` skill at Stage 1 plan APPROVAL._

**No ADR needed** — The change extends existing patterns (portion selector, price override dialog) from the customer flow to admin surfaces and removes price override from customer components. No new third-party dependency, no new database/cache/queue, no new external service, no pattern change spanning >3 files in a novel way. The reconciler extension (`lib/order-line-totals.ts`) is a backward-compatible parameter addition, not a structural change.

## 4. Threat model + security considerations

> _Closes ISO 27001 A.8.25 — secure development life cycle_

| Threat                                                                          | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Customer bypasses price override removal by calling cart store methods directly | Low        | High   | Cart store methods (`overrideItemPrice`/`resetItemPrice`) are only callable from client components; customer components no longer render the UI to trigger them. Server-side `reconcileAndValidateOrderLines` recomputes prices from menu — client-supplied prices are ignored unless an explicit admin override path is used. |
| Non-admin user submits price override via express action                        | Low        | High   | `expressCreateOrderAction` and `updateOrderItemsAction` already require admin session (`requireAdminSession` / session check). Price override fields will only be accepted when the session role is admin/super-admin.                                                                                                         |
| Price override used to set negative or zero prices                              | Medium     | Medium | `PriceOverrideDialog` validates `newPrice >= 0` via Zod schema. Server-side action will also validate `priceOverride >= 0`.                                                                                                                                                                                                    |
| Stock validation bypassed by direct API call                                    | Low        | Medium | Server-side stock check in `expressCreateOrderAction` runs regardless of client-side validation. Client-side gating is UX, server is source of truth.                                                                                                                                                                          |

**Secrets / credentials:** None handled by this REQ.

**Dependencies introduced:** None.

### Risk register entries

This REQ opens / touches the following entries in `compliance/risk-register.md`:

- **R-011 — Price override bypass via customer flow after removal from cart UI** — Status: MITIGATED. Controls landing in this PR: customer UI removes override button + dialog; `allowManualPriceOverride` not forwarded to customer cart; server-side reconciler recomputes prices from menu; admin session required for override fields.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ does not process personal data. It modifies order management UI surfaces and server-side order line calculations. No new personal data fields are collected. Special instructions are existing free-text fields already covered by the order data model.

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour. It is a UI feature parity change for admin order management.

## 7. Rollback plan

- **Reversible via:** `git revert` of the feature branch merge commit.
- **Data implications of rollback:** Orders created with price overrides will retain `priceOverridden: true` and override metadata — older code ignores these fields (they default to `false`). No data corruption.
- **Notification path if rollback during a release:** Notify via the issue comment + sticky update.

## 8. Verification

- **Unit + integration tests:**
  - `__tests__/lib/order-line-totals.test.ts` — add cases for price override lines bypassing menu-price recompute
  - `__tests__/actions/admin/express-actions.test.ts` — add cases for stock validation rejection and price override acceptance
  - `__tests__/actions/admin/order-edit-actions.test.ts` — add cases for price override persistence
  - `__tests__/components/cart-item.test.tsx` — verify price override UI is not rendered for customer flow

- **E2E coverage:**
  - Express Create Order: portion selection, price override, special instructions, out-of-stock blocking
  - Edit Order Dialog: portion change, price override, special instructions edit
  - Customer cart: verify no price override button visible

- **Manual smoke after deploy:**
  - Open Express Create Order, select an item with portion options, verify half/quarter pricing
  - Override price on an eligible item, verify reason capture and persisted override
  - Add special instructions to a cart line, verify persisted on order
  - Verify customer cart has no override button

- **Monitoring / alerting:** None added — relies on existing order management monitoring.

## 9. Sign-off

- **Plan reviewer (eng):** REPLACE — name + date
- **Plan reviewer (security / DPO):** N/A — no personal data or security surface changes beyond removing a customer-facing button
- **Plan approved by operator:** REPLACE — name + date

## Upload path

This file lives at `compliance/plans/REQ-089/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`. The portal's framework-coverage matrix flips ISO 29119 §3.4, ISO 27001 A.8.25, GDPR Art. 25, and EU AI Act Art. 11 to COVERED for this REQ once the upload lands.

Verify the upload at `https://devaudit.metasession.co/projects/wgb/releases/REQ-089` — the "Evidence by requirement" list should show this plan tagged with `category=planning`.
