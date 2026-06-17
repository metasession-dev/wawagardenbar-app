---
title: 'Implementation plan — REQ-081'
requirement_id: 'REQ-081'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'OpenAI Codex'
authored_at: '2026-06-15'
---

# Implementation plan — REQ-081

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan contains                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria and verification strategy; detailed command plan in `compliance/evidence/REQ-081/test-plan.md`. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model, dependency/secrets posture, risk-register linkage, and rollback path.                                 |
| **GDPR Art. 25** Data protection by design and by default | Explicit no-new-personal-data analysis.                                                                             |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | Explicit no-AI-runtime analysis plus AI-assisted-development evidence references.                                   |

## 1. Goal + acceptance criteria

- **Goal:** Staff and admins select menu-backed items through a compact Main Menu Category -> Sub Category -> Item cascade across express order creation, menu management, and sellable inventory management, while preserving in-progress work, keeping contextual search available on each surface, and using the configured category registry.

- **Acceptance criteria:**

| AC   | Description                                                                                                                                                                                                                                                                    | SRS item it traces to                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| AC1  | **Given** a staff member opens `/dashboard/orders/express/create-order`, **When** the initial item-picker renders, **Then** enabled Main Menu Categories are shown first and sub-categories/items are hidden until a main category is selected.                                | REQ-ORDMGT-008                                                |
| AC2  | **Given** a main category is selected in express order creation, **When** the next picker step renders, **Then** only sub-categories belonging to that main category are available.                                                                                            | REQ-ORDMGT-008                                                |
| AC3  | **Given** a main category and sub-category are selected in express order creation, **When** the item grid renders or search is used, **Then** only available sellable menu items matching both selections are shown and contextual search remains enabled.                     | REQ-ORDMGT-008                                                |
| AC4  | **Given** staff has added items to an express cart, **When** they navigate back from items to sub-categories and from sub-categories to main categories, **Then** the cart/order context remains intact and they can add items from another main category to the same order.   | REQ-ORDMGT-008                                                |
| AC5  | **Given** a quick/express action needs menu-item selection, **When** it uses the express menu search path, **Then** it follows the same main -> sub -> item cascade and source-of-truth category data.                                                                         | REQ-ORDMGT-008                                                |
| AC6  | **Given** a super-admin opens `/dashboard/menu`, **When** the menu list filters render, **Then** main categories are displayed before sub-categories, search remains enabled, and the table filters by selected main plus sub-category and search text.                        | REQ-MENUMGT-007                                               |
| AC7  | **Given** the menu create/edit form has a sub-category selected, **When** the main category changes to one where that sub-category is invalid, **Then** the stale sub-category value is cleared before save without clearing unrelated form fields.                            | REQ-MENUMGT-007; REQ-MENUMGT-002; REQ-MENUMGT-003             |
| AC8  | **Given** an admin opens `/dashboard/inventory` on the sellable inventory tab, **When** inventory filters render, **Then** menu-backed inventory filtering starts with main categories, keeps search enabled, and only shows sub-categories after a main category is selected. | REQ-INV-018                                                   |
| AC9  | **Given** a selected main category has no enabled sub-categories or a selected sub-category has no available items, **When** the user reaches that state, **Then** the UI shows a clear empty state without duplicating category lists or adding clutter.                      | REQ-ORDMGT-008; REQ-MENUMGT-007; REQ-INV-018                  |
| AC10 | **Given** existing permissions and category registry settings, **When** the cascade is used, **Then** permissions remain unchanged and category options come from the configured registry/source of truth rather than hardcoded lists.                                         | REQ-MENUMGT-005; REQ-ORDMGT-008; REQ-MENUMGT-007; REQ-INV-018 |

Issue #387 also requires automated tests for cascade, backward navigation, cross-main express item selection, and at least one admin management surface; that is tracked under Section 8 and `test-plan.md` rather than as a user-observable acceptance criterion.

## 2. Scope

- **In scope:**
  - Express create-order item picker and search action: `app/dashboard/orders/express/create-order/page.tsx`, `app/actions/admin/express-actions.ts`.
  - Shared compact admin category cascade UI/helper for main-category -> sub-category selection.
  - Menu management list filtering, contextual search, and create/edit invalid-sub-category clearing: `components/features/admin/menu-items-client.tsx`, `menu-item-form.tsx`, `menu-item-edit-form.tsx`.
  - Sellable inventory list filtering and contextual search: `components/features/admin/inventory-items-client.tsx`.
  - SRS/RTM/risk/evidence artifacts for REQ-081.
- **Out of scope:**
  - Creating, editing, renaming, or deleting main/sub-category registry entries; already covered by REQ-075.
  - Permission model changes or new admin permissions.
  - Inventory deduction, stock calculations, reporting calculations, payments, tabs, or order lifecycle changes.
  - Kitchen ingredient COGS category taxonomy; it is not the sellable menu-category cascade.
  - Full visual redesign beyond the picker/filter interaction needed for #387.

### Surface inventory (MEDIUM/HIGH risk — required)

| Surface                       | URL / file                                                                                      | Status                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Express create order          | `/dashboard/orders/express/create-order` — `app/dashboard/orders/express/create-order/page.tsx` | In scope                                                                |
| Express menu server actions   | `app/actions/admin/express-actions.ts`                                                          | In scope                                                                |
| Menu management list          | `/dashboard/menu` — `components/features/admin/menu-items-client.tsx`                           | In scope                                                                |
| Menu create form              | `/dashboard/menu/new` — `components/features/admin/menu-item-form.tsx`                          | In scope for stale sub-category clearing; cascade already present       |
| Menu edit form                | `/dashboard/menu/[itemId]/edit` — `components/features/admin/menu-item-edit-form.tsx`           | In scope for stale sub-category clearing; cascade already present       |
| Sellable inventory management | `/dashboard/inventory` — `components/features/admin/inventory-items-client.tsx`                 | In scope for sellable/menu-backed rows                                  |
| Kitchen ingredient inventory  | `/dashboard/inventory` kitchen tabs and kitchen dialogs                                         | Out of scope (waived) — separate COGS taxonomy, not menu item selection |
| Public customer menu          | `/menu` — `components/features/menu/category-navigation.tsx`                                    | Already works — main/sub navigation exists and is not part of #387      |
| Category registry settings    | `/dashboard/settings` — `services/category-service.ts`, `services/main-category-service.ts`     | Already works — registry remains the source of truth                    |

## 3. Architecture decisions

- **No ADR needed** — this is a UI/server-action refinement using existing category-registry, dashboard, and server-action patterns. No new dependency, external service, database schema, queue, cache, or cross-cutting architectural pattern is introduced.

## 4. Threat model + security considerations

| Threat                                                                       | Likelihood | Impact | Mitigation                                                                                                                                                    |
| ---------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthorised access to admin order/menu/inventory surfaces                   | Low        | High   | Existing dashboard auth/RBAC gates remain unchanged; REQ-081 does not add routes or permissions.                                                              |
| Tampering with category query params or client state to retrieve wrong items | Medium     | Medium | Server-side express action keeps explicit `kind:'menu-item'`, `isAvailable`, `mainCategory`, and `category` filters; client-side filters do not grant access. |
| Operational denial of service via hidden valid items after category mismatch | Medium     | Medium | R-005 tracks this; mitigations include CategoryService source of truth, empty states, invalid-selection clearing, and automated express/admin coverage.       |
| Information disclosure through broader menu item search                      | Low        | Medium | Search remains admin-authenticated and constrained to available sellable items; no customer/personal data is added to results.                                |
| Regression in inventory/kitchen taxonomy                                     | Low        | Medium | Kitchen ingredient COGS categories remain out of scope; sellable inventory filtering keys off linked menu item categories only.                               |

**Secrets / credentials:** None. This REQ handles no secrets and does not change credential storage or scope.

**Dependencies introduced:** None planned.

### Risk register entries

This REQ opens the following entry in [`compliance/risk-register.md`](../../risk-register.md):

- **R-005 — Category cascade hides valid sellable items or disrupts express order context** — Status: OPEN. Mitigations: CategoryService source-of-truth, explicit server filtering, preserved cart/task state, empty states, and automated cascade/back-navigation tests.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ changes category/item selection and filtering for existing admin surfaces. It does not collect, expose, retain, or transfer additional personal data. Express cart/order context already contains order-line data; REQ-081 does not add customer fields or change order persistence.

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour in the application. AI assistance is limited to software-development support and is documented in `compliance/evidence/REQ-081/ai-use-note.md` and `ai-prompts.md`.

## 7. Rollback plan

- **Reversible via:** Git revert of the REQ-081 PR.
- **Data implications of rollback:** None expected. No schema migration, new collection, or persisted category model change is introduced.
- **Notification path if rollback during a release:** Notify the operator on issue #387 / release PR, pause UAT or production promotion, and rerun the prior express/menu/inventory smoke path after revert.

## 8. Verification

How the team will know the REQ is correct in production:

- **Unit + integration tests:** Add/adjust tests for express action `mainCategory` + `category` filtering and for any pure cascade helpers/state-reset behaviour.
- **E2E coverage:** Delegate spec work to `e2e-test-engineer` before editing E2E files. Cover express create-order initial main-category step, sub-category step, item filtering, back navigation, cross-main cart preservation, and at least one admin management surface (`/dashboard/menu` or `/dashboard/inventory`).
- **Manual smoke after deploy:** On UAT, verify express order can add items from two different main categories in one cart and search within the selected category path; verify menu management and sellable inventory filters/search narrow main -> sub without clutter; verify empty states.
- **Monitoring / alerting:** No new alert added. Use CI Quality Gates and UAT evidence; operational regression would surface as staff inability to find/add items.

Detailed command/check mapping lives in `compliance/evidence/REQ-081/test-plan.md`.

## 9. Sign-off

- **Plan reviewer (eng):** Pending human review on PR for #387.
- **Plan reviewer (security / DPO):** N/A — no personal-data, dependency, credential, or permission change; threat model recorded above.
- **Plan approved by operator:** Pending #387 SDLC checkpoint / PR review.

## Upload path

This file lives at `compliance/plans/REQ-081/implementation-plan.md` and is mirrored to `compliance/evidence/REQ-081/implementation-plan.md` for the evidence pack. It is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
