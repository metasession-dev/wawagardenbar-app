---
title: 'Implementation plan — REQ-085'
requirement_id: 'REQ-085'
risk_class: 'HIGH'
change_type: 'fix'
authored_by: 'Cascade (Windsurf) via sdlc-implementer'
authored_at: '2026-06-25'
---

# Implementation plan — REQ-085

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

- **Goal:** Fix tab payment processing so it no longer resets order fulfillment status, and improve UI to clearly distinguish kitchen status from payment status.

### Acceptance criteria

| AC  | Description                                                                                                                                                                                                                                                    | SRS item it traces to                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| AC1 | Given a dine-in tab with orders in various statuses (pending, preparing, ready, completed), When an admin closes the tab with manual payment via the express close-tab dialog, Then all orders retain their original `status` — none are reset to `confirmed`. | REQ-TABMGT-006 (new — proposed)                                |
| AC2 | Given a dine-in tab with orders in various statuses, When the tab is paid via Monnify gateway (webhook-driven `markTabPaid`), Then all orders retain their original `status` — none are reset to `confirmed`.                                                  | REQ-TABMGT-006 (new — proposed)                                |
| AC3 | Given a tab with a completed order (`status: 'completed'`, `inventoryDeducted: true`), When the tab is closed and paid, Then the completed order does NOT reappear on the kitchen display and no second inventory deduction occurs.                            | REQ-KITCHEN-007 (new — proposed)                               |
| AC4 | Given an admin views an order detail page (`/dashboard/orders/[orderId]`), When the order has distinct kitchen and payment statuses, Then the header shows labeled badges: "Kitchen: \<status\>" and "Payment: \<status\>".                                    | REQ-ORDER-005 (new — proposed)                                 |
| AC5 | Given an admin views the order queue (`/dashboard/orders`), When an order has been paid, Then the order card shows both a kitchen status badge and a small "Payment: \<status\>" indicator.                                                                    | REQ-ORDER-005 (new — proposed)                                 |
| AC6 | Given kitchen staff view the kitchen display, When an order has been paid, Then a small payment status indicator (icon) is visible on the kitchen order card without disrupting kitchen workflow.                                                              | REQ-KITCHEN-008 (new — proposed)                               |
| AC7 | Given a customer views their orders page (`/orders`), When an order has distinct kitchen and payment statuses, Then badges are labeled "Kitchen: \<status\>" and "Payment: \<status\>" instead of bare values.                                                 | REQ-ORDER-005 (new — proposed)                                 |
| AC8 | Given the existing tab payment E2E tests (close-tab-tip-capture, partial-payments, reconciliation), When the fix is deployed, Then all existing tests continue to pass without regression.                                                                     | @srs-deferred: regression guard, not user-observable behaviour |

## SRS items proposed/touched

| AC            | SRS item                         | Status   | Notes                                                                                                                        |
| ------------- | -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| AC1, AC2      | REQ-TABMGT-006 (new — proposed)  | stub     | Tab payment preserves order fulfillment status — kitchen `status` field is owned by kitchen workflow, not payment processing |
| AC3           | REQ-KITCHEN-007 (new — proposed) | stub     | Completed orders do not reappear on kitchen display after tab payment — prevents double inventory deduction                  |
| AC4, AC5, AC7 | REQ-ORDER-005 (new — proposed)   | stub     | Labeled kitchen/payment status badges on order surfaces — distinguishes fulfillment status from payment status               |
| AC6           | REQ-KITCHEN-008 (new — proposed) | stub     | Payment status indicator on kitchen order card — non-disruptive icon for kitchen staff awareness                             |
| AC8           | @srs-deferred                    | deferred | Regression guard — not user-observable behaviour                                                                             |

**Operator action required:** Edit `docs/SRS.md` to add the four new SRS stubs (REQ-TABMGT-006, REQ-KITCHEN-007, REQ-ORDER-005, REQ-KITCHEN-008) with canonical Given/When/Then prose before plan APPROVAL.

## 2. Scope

- **In scope:**
  - `services/tab-service.ts` — Remove `status: 'confirmed'` from `markTabPaid` and `completeTabPaymentManually` `updateMany` calls
  - `components/features/admin/order-details-header.tsx` — Add labeled "Kitchen:" and "Payment:" badges
  - `components/features/admin/order-card.tsx` — Add payment status badge next to kitchen status badge
  - `components/features/kitchen/kitchen-order-card.tsx` — Add payment status indicator for kitchen staff
  - `app/(customer)/orders/page.tsx` — Add "Kitchen:" and "Payment:" labels to existing badges
- **Out of scope:**
  - Order status transition validation logic (the `validTransitions` map in `updateOrderStatusAction`)
  - Inventory deduction logic in `OrderService.completeOrder`
  - Monnify payment gateway integration
  - Kitchen display auto-refresh logic
  - Backfill of already-affected orders in production (operational artifact)

### Surface inventory

| Surface                            | URL / file                                            | Status                                              |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Admin order details header         | `components/features/admin/order-details-header.tsx`  | In scope                                            |
| Admin order queue card             | `components/features/admin/order-card.tsx`            | In scope                                            |
| Kitchen display order card         | `components/features/kitchen/kitchen-order-card.tsx`  | In scope                                            |
| Customer orders page               | `app/(customer)/orders/page.tsx`                      | In scope                                            |
| Tab service — manual payment       | `services/tab-service.ts::completeTabPaymentManually` | In scope                                            |
| Tab service — gateway payment      | `services/tab-service.ts::markTabPaid`                | In scope                                            |
| Order service — complete order     | `services/order-service.ts::completeOrder`            | Already works — inventory deduction logic unchanged |
| Kitchen display auto-refresh       | `components/features/kitchen/kitchen-order-grid.tsx`  | Already works — query filter unchanged              |
| Order status transition validation | `app/actions/admin/order-management-actions.ts`       | Already works — `validTransitions` map unchanged    |

## 3. Architecture decisions

- **No ADR needed** — Bug fix removing `status: 'confirmed'` from two `updateMany` calls in `services/tab-service.ts` + UI badge label additions across 4 components. No structural change, no new pattern, no dependency choice. The HIGH risk classification reflects the blast radius of the bug (payments + inventory), not the architectural significance of the fix.

## 4. Threat model + security considerations

| Threat                                       | Likelihood | Impact | Mitigation                                                                                                                        |
| -------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Unauthorized tab payment closure             | Low        | High   | Existing admin/super-admin session check in `completeTabPaymentManually` — unchanged by this fix                                  |
| Double inventory deduction via status reset  | Medium     | High   | **This fix removes the root cause** — `status: 'confirmed'` removal prevents completed orders from reappearing on kitchen display |
| Payment status spoofing via direct DB access | Low        | High   | Out of scope — DB access is restricted to application layer; no new DB-facing endpoints introduced                                |

**Secrets / credentials:** No secrets handled by this REQ. Payment gateway credentials are in existing env vars, unchanged.

**Dependencies introduced:** None — no new npm packages.

### Risk register entries

This REQ opens / touches the following entries in `compliance/risk-register.md`:

- **R-008 — Tab payment resets order status causing kitchen display re-population and double inventory deduction** — Status: MITIGATED. Controls landing in this PR (removal of `status: 'confirmed'` from `updateMany` + UI labels) close the residual.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ is a bug fix in payment processing logic and UI badge labeling. It does not introduce new data collection, processing, or storage. Customer email and phone are already stored on tab/order documents by existing code and are not modified by this fix.

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour. The fix removes a harmful field overwrite and adds UI labels. No model inference, prompt engineering, or AI decisioning is involved.

## 7. Rollback plan

- **Reversible via:** `git revert` of the fix commit. The change is a removal of `status: 'confirmed'` from two `updateMany` calls — reverting re-adds the field.
- **Data implications of rollback:** Reverting re-introduces the bug — tab payment would again reset order status to `confirmed`. No data migration is needed in either direction.
- **Notification path if rollback during a release:** Notify kitchen staff via Slack #ops channel; they would need to resume manual workaround (ignoring re-appeared orders).

## 8. Verification

- **Unit + integration tests:** New unit test `__tests__/services/tab-service.payment-status-preservation.test.ts` verifying both `markTabPaid` and `completeTabPaymentManually` do NOT include `status` in the `updateMany` `$set`. Regression guard tests verify payment fields are still correctly updated.
- **E2E coverage:** New E2E spec (delegated to `e2e-test-engineer`) verifying completed orders stay completed after tab payment. Existing E2E specs (close-tab-tip-capture, partial-payments, reconciliation) must continue passing.
- **Manual smoke after deploy:** Open a tab, add orders, advance some to completed via kitchen display, close tab with payment — verify completed orders do not reappear on kitchen display.
- **Monitoring / alerting:** Existing `IncidentEvent` monitoring will show a reduction in "insufficient stock at defaultSalesLocation" incidents caused by double deduction.

## 9. Sign-off

- **Plan reviewer (eng):** REPLACE — name + date
- **Plan reviewer (security / DPO):** N/A — no personal data or new security surfaces
- **Plan approved by operator:** REPLACE — name + date

## Upload path

This file lives at `compliance/plans/REQ-085/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`. The portal's framework-coverage matrix flips ISO 29119 §3.4, ISO 27001 A.8.25, GDPR Art. 25, and EU AI Act Art. 11 to COVERED for this REQ once the upload lands.

Verify the upload at `https://devaudit.metasession.co/projects/wgb/releases/REQ-085` — the "Evidence by requirement" list should show this plan tagged with `category=planning`.
