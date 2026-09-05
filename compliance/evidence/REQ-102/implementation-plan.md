---
title: 'Implementation plan — REQ-102'
requirement_id: 'REQ-102'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer / claude-sonnet-5'
authored_at: '2026-09-04'
---

# Implementation plan — REQ-102

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | N/A callout below — no personal data touched.              |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A callout below — no AI in scope.                        |

**Risk classification rationale:** HIGH. Signal is `Test_Policy.md` §Risk-Based Testing's "core revenue capabilities" — this REQ changes the price actually charged to customers/staff at order time (`lib/order-line-totals.ts`'s `effectivePrice` resolution, currently the single source of truth for all three order-creating paths), not just a reporting display (REQ-100/REQ-101 were MEDIUM because they only affected an internal report's numbers, never what a customer paid). A bug in the time-window precedence logic here has a direct, real financial impact (over/undercharging at the point of sale) the moment it ships. Secondary signal: price mutations are already RBAC-gated to `super-admin` only (`price-management-actions.ts`); this REQ extends that gated write path and a new bulk-edit surface, so an authorization or field-validation slip broadens what one compromised/careless super-admin session can silently change across the entire menu in one page.

## 1. Goal + acceptance criteria

- **Goal:** Give every menu item three prices — default, show, and happy hour — each editable through the existing Price Management convention; let staff configure two independent daily time windows (show-price window, happy-hour window) in Settings that automatically select which price is charged (happy hour > show > default); and add a single "Edit All" page for bulk-reviewing/editing cost price, all three selling prices, name, main category, category, and availability across every menu item, filterable by main/sub category.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                                                                                          | SRS item it traces to                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Given a super-admin opens `/dashboard/menu/[id]/edit`, When they view the Price Management section, Then they can enter and save a new default price, show price, and happy hour price (each required, min 0) alongside the existing cost-per-unit field, and each saved change appears as a new row in the price history viewer labelled with which fields changed. | REQ-MENUMGT-008 (new)                                                                                                                                                             |
| AC2 | Given a super-admin opens `/dashboard/settings`, When they view the new "Show Price Window" and "Happy Hour Window" sections, Then they can independently enable/disable each window and set its daily start/end time, and saving persists both without affecting the existing Business Hours section.                                                               | REQ-SETTINGS-001 (existing — updated)                                                                                                                                             |
| AC3 | Given the happy-hour window is enabled and the current server time is inside it (regardless of whether the show-price window is also active), When a customer or staff member places an order (public checkout, express/POS, or order edit) for an item, Then the charged line price is that item's `happyHourPrice`.                                                | REQ-ORDER-006 (new)                                                                                                                                                               |
| AC4 | Given only the show-price window is active (happy hour inactive), When an order is placed, Then the charged line price is the item's `showPrice`. Given neither window is active, Then the charged line price is the item's `price` (default) — unchanged from current behaviour.                                                                                    | REQ-ORDER-006 (new)                                                                                                                                                               |
| AC5 | Given a staff member has set a manual price override on a line (existing REQ-089 feature, `allowManualPriceOverride` items only), When the order is placed regardless of window state, Then the override price is charged — the time-window resolution never overrides an explicit manual override.                                                                  | REQ-ORDER-006 (new)                                                                                                                                                               |
| AC6 | Given a customer views the public menu while the happy-hour or show-price window is active, When the menu page/detail modal renders an item's price, Then the displayed price matches whichever price would actually be charged right now (server-resolved, not computed client-side).                                                                               | REQ-MENU-008 (new)                                                                                                                                                                |
| AC7 | Given a super-admin clicks "Edit All" at the top of `/dashboard/menu`, When the new page loads, Then it shows every menu item in a table with editable cost price, default price, show price, happy hour price, name, main category, category, and an availability toggle, and two filter selects (main category, category) that narrow the visible rows.            | REQ-MENUMGT-009 (new)                                                                                                                                                             |
| AC8 | Given a super-admin edits a row's price fields on the Edit All page and saves, When the save completes, Then the change is persisted the same way as the single-item Price Management form (a new price-history snapshot row is written) and the table reflects the saved values without a full page reload.                                                         | REQ-MENUMGT-009 (new)                                                                                                                                                             |
| AC9 | Given an existing menu item created before this REQ shipped (no `showPrice`/`happyHourPrice` in the database), When the data migration runs, Then the item ends up with `showPrice` and `happyHourPrice` both equal to its current `price`, and all existing order-placing/display code paths continue to work unchanged for items where no window is ever enabled.  | @srs-deferred: migration/backfill mechanics, not a new user-observable behaviour — covered implicitly by REQ-ORDER-006 and REQ-MENU-008 continuing to hold for pre-existing items |

## SRS items proposed/touched

| AC      | SRS item                    | Status          | Notes                                                                                                                                                               |
| ------- | --------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1     | REQ-MENUMGT-008 (new)       | added           | No existing SRS item covered Price Management at all (pre-existing gap, unrelated to this REQ) — new item covers the full triple-price + audited-history behaviour. |
| AC2     | REQ-SETTINGS-001 (existing) | stale — updated | Existing bullet only covered fee/delivery/business-hours; added a new Given/When/Then bullet for the two new windows.                                               |
| AC3-AC5 | REQ-ORDER-006 (new)         | added           | No existing SRS item covered order-time price resolution/precedence — new item spans all three order-creating paths.                                                |
| AC6     | REQ-MENU-008 (new)          | added           | No existing SRS item covered price display reflecting anything beyond the static default price.                                                                     |
| AC7-AC8 | REQ-MENUMGT-009 (new)       | added           | New bulk-edit surface; no existing item covers multi-item tabular editing.                                                                                          |
| AC9     | `@srs-deferred`             | deferred        | Migration/backfill mechanics are an implementation detail, not new user-observable behaviour.                                                                       |

## 2. Scope

- **In scope:**
  - `models/menu-item-model.ts` / `interfaces/menu-item.interface.ts` — add `showPrice`, `happyHourPrice` required numeric fields.
  - `models/menu-item-price-history-model.ts` / `interfaces/menu-item-price-history.interface.ts` — extend the existing full-snapshot history row (already carries `price` + `costPerUnit` together per row) with `showPrice`, `happyHourPrice` on the same row.
  - `services/price-history-service.ts` (`PriceHistoryService.updatePrice`) — generalise to accept and snapshot all four numeric fields in one history row; also updates `MenuItem` and syncs `InventoryModel.costPerUnit` as it already does.
  - `app/actions/admin/price-management-actions.ts` (`updateMenuItemPriceAction`) — accept `showPrice`/`happyHourPrice`, validate `>= 0`, forward to the generalised service call.
  - `components/features/admin/price-update-form.tsx` — add `showPrice`/`happyHourPrice` inputs next to the existing price/cost inputs, same change-detection/preview convention.
  - `components/features/admin/price-history-viewer.tsx` — render the two new columns/fields per history row.
  - `models/settings-model.ts` / `interfaces` — add `showPriceWindow: { enabled, start, end }` and `happyHourWindow: { enabled, start, end }` next to `businessHours`, same `"HH:mm"` string convention, single daily window each (no per-weekday).
  - `components/features/admin/settings-form.tsx` — add "Show Price Window" and "Happy Hour Window" sections mirroring the existing Business Hours UI (`Switch` + two `<Input type="time">`), extend the zod `settingsSchema`.
  - `app/api/settings/route.ts` (`GET`/`PUT`) — include the two new window objects in the serialized response and the persisted update (this is the actual settings submit path — `settings-form.tsx` calls `fetch('/api/settings', { method: 'PUT' })` directly, not a server action).
  - `services/settings-service.ts` — add `isShowPriceActive()` and `isHappyHourActive()` mirroring `isWithinBusinessHours()` (same `hhmmToMinutes` helper, same same-day-only comparison, no per-weekday lookup); add `resolveActivePriceField(): 'happyHourPrice' | 'showPrice' | 'price'` encoding the precedence.
  - `lib/order-line-totals.ts` (`reconcileAndValidateOrderLines`, `MenuItemForReconcile`) — add `showPrice`/`happyHourPrice` to the type; resolve `basePrice` via `resolveActivePriceField()` before the existing `priceOverride` branch (override still wins, per AC5).
  - Three call sites that build the `MenuItemForReconcile` map: `app/actions/admin/express-actions.ts` (~line 311), `app/actions/admin/order-edit-actions.ts` (~line 99), `app/api/public/orders/route.ts` (~line 364) — pass `showPrice`/`happyHourPrice` through from the fetched `MenuItem` doc.
  - `app/api/public/menu/route.ts` / `app/api/public/menu/[itemId]/route.ts` — include `showPrice`/`happyHourPrice` and a server-computed `displayPrice` in the response.
  - `components/features/menu/menu-item.tsx`, `components/features/menu/menu-item-detail-modal.tsx` — render `displayPrice` instead of `item.price`.
  - New page `app/dashboard/menu/edit-all/page.tsx` + client component `components/features/admin/menu-edit-all-table.tsx` + a bulk-persist server action — the "Edit All" bulk table.
  - `app/dashboard/menu/page.tsx` (~line 202) — add the "Edit All" link next to "Add Item".
  - One-off migration script under `scripts/` backfilling `showPrice`/`happyHourPrice` on existing `MenuItem` documents.

- **Out of scope:** portion-size surcharge logic (`portionOptions`, unrelated flat-surcharge feature, untouched); the existing manual price-override feature's precedence relative to window prices beyond AC5 (override still simply wins, no new override UI); per-weekday window configuration (explicitly decided against — single daily window per window type); retroactive backfill of historical order documents with these new fields; the Price Overrides analytics/reporting tab (`price-override-analytics-service.ts` — separate, unaffected feature).

### Surface inventory (HIGH risk — required)

| Surface                           | URL / file                                                                        | Status                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Menu item edit — Price Management | `/dashboard/menu/[id]/edit` — `components/features/admin/price-update-form.tsx`   | In scope                                                                             |
| Price history viewer              | same page — `components/features/admin/price-history-viewer.tsx`                  | In scope                                                                             |
| Settings — new time windows       | `/dashboard/settings` — `components/features/admin/settings-form.tsx`             | In scope                                                                             |
| Public checkout order creation    | `app/api/public/orders/route.ts`                                                  | In scope                                                                             |
| Express/POS order creation        | `/dashboard/orders/express/create-order` — `app/actions/admin/express-actions.ts` | In scope                                                                             |
| Admin order edit                  | `app/actions/admin/order-edit-actions.ts`                                         | In scope                                                                             |
| Public menu display               | `/menu` — `components/features/menu/menu-item.tsx`, `menu-item-detail-modal.tsx`  | In scope                                                                             |
| Menu dashboard — "Edit All" link  | `/dashboard/menu` — `app/dashboard/menu/page.tsx`                                 | In scope                                                                             |
| New bulk edit page                | `/dashboard/menu/edit-all` (new)                                                  | In scope                                                                             |
| Manual price override             | `lib/order-line-totals.ts` `priceOverride` branch                                 | Already works — unaffected; AC5 pins that override still wins over window resolution |
| Price Overrides analytics tab     | `components/features/reports/price-overrides-section.tsx`                         | Out of scope (waived) — separate feature, not price-field-related                    |

## 3. Architecture decisions

- **ADR-004 — Centralize time-window price precedence in a single resolver function** — Drafted and accepted by `adr-author`. File at `docs/ADR/ADR-004-time-window-price-precedence.md`. Verdict signal: risk classification HIGH (per the decision tree's "Risk classification HIGH or CRITICAL ⇒ ADR" rule) plus a genuine cross-cutting decision — the happy-hour/show/default precedence rule is consumed by three structurally different call sites (order reconciler, public menu API, bulk-edit page) and centralizing it in `SettingsService.resolveActivePriceField()` is the load-bearing architectural choice this REQ makes.

## 4. E2E test coverage

- **Spec(s):**
  - `e2e/admin/price-management-triple-price.spec.ts` (AC1)
  - `e2e/settings/pricing-windows.spec.ts` (AC2)
  - `e2e/customer/menu-price-window-display.spec.ts` (AC6)
  - `e2e/admin/menu-edit-all.spec.ts` (AC7, AC8)
- **ACs covered:** AC1, AC2, AC6, AC7, AC8.
- **`@e2e-deferred: AC3-AC5 and AC9`** — AC3-AC5 (order-time price precedence resolution) and AC9 (migration backfill) have no UI surface; both are covered by unit tests only (`__tests__/lib/order-line-totals.price-windows.test.ts`, `__tests__/services/settings-service.price-windows.test.ts`).

## 5. Threat model + security considerations

| Threat                                                                                                                                                                                     | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time-window precedence bug charges the wrong price (e.g. default price used when happy hour should apply)                                                                                  | Medium     | High   | `resolveActivePriceField()` centralises precedence in one tested function; unit tests cover all four window-state combinations (neither/show-only/happy-only/both).                                                                               |
| New required schema fields (`showPrice`, `happyHourPrice`) missing on legacy documents cause order creation to fail at read time                                                           | Medium     | High   | Migration script backfills both fields (`= price`) before the schema-required constraint is relied upon by any read path; AC9 pins this.                                                                                                          |
| Bulk "Edit All" page lets a compromised/careless super-admin session silently change price/availability across the entire menu in one action, with less friction than the single-item flow | Low        | High   | Same RBAC gate (`super-admin` only) as the existing single-item price action reused verbatim for the bulk action; every price change (bulk or single) still writes an audited price-history snapshot row — no bulk path bypasses the audit trail. |
| Manual price override silently loses precedence to the new window resolution                                                                                                               | Low        | High   | AC5 + a dedicated unit test assert override always wins regardless of window state; `basePrice` resolution happens strictly before the existing override branch, which is otherwise untouched.                                                    |

**Secrets / credentials:** N/A — none handled.

**Dependencies introduced:** None.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md` (drafted by `risk-register-keeper`; operator to confirm residual ratings before plan APPROVAL):

- **R-024 — Time-window price precedence bug charges the wrong price** — Status: OPEN. Centralized in `resolveActivePriceField()` per ADR-004; residual low × high.
- **R-025 — Missing `showPrice`/`happyHourPrice` on legacy documents breaks order creation** — Status: OPEN. Mitigated by the migration backfill script; residual low × high.
- **R-026 — Bulk "Edit All" page broadens blast radius of a compromised/careless super-admin session** — Status: OPEN. Mitigated by reusing the existing super-admin RBAC gate + audited price-history convention; residual low × high.
- **R-027 — Manual price override loses precedence to time-window price resolution** — Status: OPEN. Mitigated by AC5 + a dedicated regression test; residual low × high.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ only adds pricing fields (`showPrice`, `happyHourPrice`) and scheduling settings (window start/end times) to existing menu-item and settings documents. No customer or staff personal data is read, stored, or displayed.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour. All price-resolution logic (window checks, precedence) is deterministic.

## 8. Rollback plan

- **Reversible via:** `git revert` of the fix commit(s) for the order-resolution/display changes. The schema changes (`showPrice`/`happyHourPrice` required fields) are additive and backward-compatible after the migration runs — a revert of the application code leaves the extra fields present but unused, which is harmless.
- **Data implications of rollback:** The migration-backfilled `showPrice`/`happyHourPrice` values remain in the database after a code rollback; they are simply unread by the reverted code. No destructive migration is needed to roll back.
- **Notification path if rollback during a release:** Standard `#deploys` notification per existing incident playbook. Given the HIGH risk / financial-impact classification, a rollback must be called out explicitly as "pricing logic reverted" so front-of-house staff know to expect default-price-only behaviour again until re-deployed.

## 9. Verification

- **Unit + integration tests:** New Vitest cases for `SettingsService.isShowPriceActive()`, `isHappyHourActive()`, `resolveActivePriceField()` (all four window-state combinations); `reconcileAndValidateOrderLines()` covering happy-hour-wins-over-show, show-only, neither, and override-wins-over-both; `PriceHistoryService`'s generalised snapshot write.
- **E2E coverage:** see §4 — delegated to `e2e-test-engineer` in Phase 2 for Price Management form, Settings windows, public menu display, and the new Edit All page.
- **Manual smoke after deploy:** enable the happy-hour window for a few minutes spanning deploy time; place a test order via POS and via public checkout; confirm charged price and displayed menu price both reflect `happyHourPrice`; open `/dashboard/menu/edit-all`, filter by a main category, edit and save a row, confirm the change round-trips.
- **Monitoring / alerting:** None added — no new failure mode beyond existing order-creation error handling, which already surfaces reconciliation errors to the caller.

## 10. Sign-off

- **Plan reviewer (eng):** REPLACE — operator to confirm before merge
- **Plan reviewer (security / DPO):** N/A — no GDPR content; threat model above is non-trivial but security review folds into the required HIGH-risk plan approval checkpoint below
- **Plan approved by operator:** REPLACE — HIGH risk, checkpoint required before Phase 2 begins (Phase 1 step 11)

## Upload path

`compliance/plans/REQ-102/implementation-plan.md`, uploaded on next push to `develop`.
