# Risk Register — WGB (wawagardenbar-app)

Accepted residual risks, each with date accepted, rationale, compensating control, and target close. Sits alongside `compliance/RTM.md` (requirements) — this tracks accepted risks. Closed risks move to "Closed" with their resolution.

---

## Open

### R-001 — Pre-onboarding baseline: REQ-038/039/040 + REQ-042/043/044/045 deployed before the DevAudit gated flow

**Accepted:** 2026-05-24 (at DevAudit re-onboarding); **scope expanded** 2026-05-25 to cover a second batch.
**Severity:** Medium aggregate
**Owner:** WGB maintainer

**The gap (batch 1, 2026-05-17):** REQ-038 (#84, MEDIUM), REQ-039 (#88, MEDIUM) and REQ-040 (#89, LOW) — a bundled set — were implemented and **merged to `main` (production) on 2026-05-17**, during the window when WGB's DevAudit integration had been removed. They have repo-side evidence (`compliance/evidence/REQ-038|039|040/`) and release tickets, but **no DevAudit release record, no four-eyes review, and no uploaded gate evidence**.

**The gap (batch 2, 2026-05-23):** REQ-042 (#113, MEDIUM — super-admin tab delete with optional inventory revert), REQ-043 (#114, LOW — delete-dialog radio UX), REQ-044 (#115, MEDIUM — `trackByLocation` inventory routing fix), and REQ-045 (#116, LOW — the release PR bundling the above) were **merged to `main` on 2026-05-23** via release PR #116 (`bba04c8`), still within the pre-re-onboarding window. They had neither repo-side evidence nor release tickets at deploy time — they were authored on the false assumption (stale assistant memory) that the SDLC had been retired permanently. RTM scaffolding has been **backfilled retroactively** on 2026-05-25 (rows added with `PRE-ONBOARDING BASELINE` markers; minimal evidence placeholders).

**Decision:** Grandfather both batches as a pre-onboarding baseline rather than fabricate a retroactive "gated" approval (which would be dishonest — the gate did not run before deploy). RTM rows for all seven REQs are marked `PRE-ONBOARDING BASELINE` referencing this entry.

**Compensating controls:**

1. Code is in `main` and observed in production (batch 1 since 2026-05-17, batch 2 since 2026-05-23) — no incidents attributed.
2. Batch 1 has repo-side evidence; batch 2 has retroactive RTM scaffolding + the PR descriptions themselves (which carry detailed change rationale, test plans, and UAT walk-throughs preserved on GitHub).
3. The DevAudit gated flow (CI gates → UAT four-eyes → prod four-eyes → released) is now active and applies to **every new requirement from REQ-046 onward**. No further work ships ungated. REQ-046 (PR #124, IG-1 cadence schema) is the first post-batch-2 gated REQ.

**Target close:** N/A (historical baseline). Bounded — applies only to REQ-038/039/040 and REQ-042/043/044/045.

---

### R-003 — IncidentRetryButton remediation regression when relocated into expansion container (REQ-077)

**Opened:** 2026-06-10 (REQ-077, plan APPROVAL)
**Severity:** Inherent medium × high → Residual low × high
**Owner:** WGB maintainer

**The risk:** REQ-077 wraps each `/dashboard/incidents` row in a new `<IncidentRow>` client component to deliver expand/collapse behaviour. The existing `<IncidentRetryButton>` — load-bearing for REQ-066 AC10 retry-now remediation of stuck inventory deductions — is reused inside the new expansion panel. If the relocation regresses the button's behaviour (event handlers don't fire, props don't propagate, or the action's idempotency guard breaks), admins cannot remediate stuck deductions until the next deploy cycle. Inherent likelihood medium (refactor surface), inherent impact high (loss of operational remediation path for a known failure class).

**Mitigations applied in this REQ:**

1. `<IncidentRetryButton>` is imported and rendered unchanged — same component, same `orderId` prop, no wrapping changes its rendering or event handlers.
2. Unit test in `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` pins the `inventoryDeducted` join logic so the conditional "Retry now visible vs ✓ Deducted" branch keeps firing.
3. E2E spec at `e2e/critical/incidents-expansion.spec.ts` (delegated to `e2e-test-engineer`) covers AC4: "Given an undeducted `inventory_deduction_failed` incident, When I expand the row, Then `<IncidentRetryButton>` is visible inside the expansion AND clicking it triggers the existing `retryInventoryDeductionAction` flow with no regression".
4. Critical-tier project (`retries: 0` per #352) gates the e2e on PR-to-main — a regression here fails the release gate.

**Residual:** low likelihood (controls demonstrably preserve behaviour; component is referentially identical), high impact (the operational remediation path stays load-bearing — if the controls did fail, the consequence is unchanged from inherent).

**Framework cross-references:**

- ISO 27001 A.8.25 — Secure development life cycle (regression risk on existing security control)
- SOC 2 CC8.1 — Change management

**Review due:** 2027-06-10 (default 365d for MITIGATED entries on a UI surface; OPEN until residual demonstrated effective by the post-merge regression run on `main`).

**Cross-links:** [REQ-077 implementation plan](plans/REQ-077/implementation-plan.md); REQ-066 (originating REQ for retry mechanism); REQ-INV-013 (SRS item for retry-now behaviour).

---

### R-004 — URL-hash-driven expansion state: fidelity + injection-surface defence (REQ-077)

**Opened:** 2026-06-10 (REQ-077, plan APPROVAL)
**Severity:** Inherent medium × medium → Residual low × low
**Owner:** WGB maintainer

**The risk:** REQ-077 introduces a URL hash mechanism (`#open=<id1>,<id2>`) so an admin sharing a URL preserves the set of expanded rows. Two failure classes share this surface:

1. **State fidelity:** if the hash is read or written incorrectly, expanded rows collapse on reload (breaking AC6) or unrelated rows expand. UX regression, not a security issue.
2. **Injection surface:** the hash is user-controlled input. If a hash segment is interpolated into the DOM via `dangerouslySetInnerHTML` or passed unsanitised into an `eval`/`new Function`-like sink, this is a stored-XSS class on a privileged page (`incidentsAccess` permission required, but staff own that permission). Inherent impact medium because the audience is admins.

**Mitigations applied in this REQ:**

1. Hash segments validated against `/^[a-f0-9]+$/` ObjectId regex inside `<IncidentRow>` parse path. Non-matching segments are silently discarded.
2. Validated hash IDs drive `useState(initial)` for expansion state ONLY — never `dangerouslySetInnerHTML`, never `eval`, never any DOM-string-injection sink.
3. On parse failure (no valid IDs found) the page defaults to all rows collapsed — graceful degradation, no errored UI.
4. E2E spec at `e2e/critical/incidents-expansion.spec.ts` AC6 covers a round-trip: navigate with `?kind=...#open=<id>` → reload → assert expanded state persisted for the named ID. AC6 negative path: `#open=<garbage>` → assert no-op + page renders.
5. Unit test in `__tests__/components/incident-row.hash-parse.test.tsx` pins the regex-validation contract.

**Residual:** low likelihood (regex-validated, controls demonstrably keep the surface clean), low impact (no DOM-injection sink in the parsed-hash path; failures degrade to "no rows expanded" rather than to a security or correctness regression).

**Framework cross-references:**

- ISO 27001 A.8.28 — Secure coding (regex-validated user-input on a privileged page)
- OWASP ASVS V4 §5 — Validation, sanitisation, and encoding (input validation at the boundary)

**Review due:** 2027-06-10 (default 365d for MITIGATED entries; OPEN until residual demonstrated effective by the post-merge regression run on `main`).

**Cross-links:** [REQ-077 implementation plan](plans/REQ-077/implementation-plan.md); REQ-INV-017 (SRS item for the URL-hash behaviour).

### R-005 — Category cascade hides valid sellable items or disrupts express order context (REQ-081)

**Opened:** 2026-06-15 (REQ-081, plan APPROVAL)
**Severity:** Inherent medium × medium → Residual low × medium
**Owner:** WGB maintainer
**Review due:** 2027-06-15

**The risk:** REQ-081 changes the way staff and admins discover menu items in the express order, menu management, and sellable inventory surfaces. If the cascade derives categories incorrectly, fails to handle legacy rows, or drops local state during back navigation, staff may be unable to find valid sellable items or may lose an in-progress express order/cart context. Inherent likelihood medium (shared UI/data-selection change across multiple admin surfaces); inherent impact medium (front-of-house order-entry friction and admin management mistakes, but no direct payment or data-loss path).

**Controls / mitigations:**

- Use `CategoryService.getCategories()` / configured registry data as the source of truth rather than hardcoded category lists.
- Keep server-side express search filtering explicit on both `mainCategory` and `category` while retaining `kind:'menu-item'` and availability filters.
- Keep selected order/cart/task items independent from category navigation state; changing main clears stale sub-category/item selection only.
- Add empty states for no enabled sub-categories and no available items so valid zero-result states are observable rather than silent failures.
- Add automated coverage for express cascade, back navigation, cross-main item selection, and at least one admin management surface.

**Residual risk after controls:** low likelihood x medium impact. Remaining risk is stale/incorrect category metadata in production; the UI will make empty states visible and the registry/settings flow remains the correction path.

**Cross-links:** [REQ-081 implementation plan](plans/REQ-081/implementation-plan.md); [#387](https://github.com/metasession-dev/wawagardenbar-app/issues/387); SRS REQ-ORDMGT-008 / REQ-MENUMGT-007 / REQ-INV-018.

---

### R-006 — Admin payment options leak into customer checkout after path separation (REQ-084)

**Opened:** 2026-06-22 (REQ-084, plan APPROVAL)
**Severity:** Inherent low × medium → Residual low × low
**Owner:** WGB maintainer
**Review due:** 2027-06-22

**The risk:** REQ-084 strips admin logic from the shared `CheckoutForm` and renames it to `CustomerCheckoutForm`. If the separation is incomplete — admin payment options (manual cash/transfer/card) remain renderable on `/checkout` — customers could see payment methods intended for staff use only. Inherent likelihood low (the refactor explicitly removes all `isAdmin` branching and `AdminPaymentOption` import); inherent impact medium (customers seeing admin-only UI is a UX + trust issue, not a direct security breach since Monnify gateway is the only functional payment path).

**Mitigations applied in this REQ:**

1. All `isAdmin` conditional branches removed from `customer-checkout-form.tsx`; `PaymentMethodStep` no longer accepts `isAdmin` prop.
2. `AdminPaymentOption` import removed from `PaymentMethodStep`; component always renders Monnify gateway options only.
3. AC3 + AC9 verify no admin payment options are visible on `/checkout` and no `isAdmin` branching exists in the customer component.

**Residual:** low likelihood (controls demonstrably remove the surface), low impact (worst case is a UX confusion, not a payment-security breach).

**Framework cross-references:**

- ISO 27001 A.8.25 — Secure development life cycle (separation of concerns in payment UI)
- SOC 2 CC8.1 — Change management

**Cross-links:** [REQ-084 implementation plan](plans/REQ-084/implementation-plan.md); [#406](https://github.com/metasession-dev/wawagardenbar-app/issues/406); SRS REQ-CHECKOUT-001 / REQ-CHECKOUT-010.

---

### R-007 — Price override logic remains accessible to non-admin users after removal from createOrder (REQ-084)

**Opened:** 2026-06-22 (REQ-084, plan APPROVAL)
**Severity:** Inherent low × high → Residual low × high
**Owner:** WGB maintainer
**Review due:** 2027-06-22

**The risk:** REQ-084 removes the admin price override validation block from `createOrder` server action in `payment-actions.ts`. The price override capability moves to `expressCreateOrderAction` which requires admin session. If the removal is incomplete or the customer-facing `createOrder` still accepts price override parameters, a non-admin user could submit modified item prices. Inherent likelihood low (the validation block is explicitly removed and `createOrder` no longer processes price override fields); inherent impact high (price manipulation on customer checkout is a financial integrity issue).

**Mitigations applied in this REQ:**

1. Price override validation block (including `hasOverrides` / `priceOverridden` logic) removed entirely from `createOrder` in `payment-actions.ts`.
2. Price override capability moves to `expressCreateOrderAction` which is gated by `requireAdminSession`.
3. AC8 verifies no `isAdmin` / `priceOverridden` / `hasOverrides` branching exists in `createOrder`.

**Residual:** low likelihood (the surface is removed, not just gated), high impact (if controls failed, price manipulation is a financial integrity issue — the impact is unchanged from inherent).

**Framework cross-references:**

- ISO 27001 A.8.25 — Secure development life cycle (removal of privileged functionality from customer-facing surface)
- SOC 2 CC8.1 — Change management
- SOC 2 CC6.1 — Logical access controls (price override restricted to admin session)

**Cross-links:** [REQ-084 implementation plan](plans/REQ-084/implementation-plan.md); [#406](https://github.com/metasession-dev/wawagardenbar-app/issues/406); SRS REQ-ORDMGT-004.

---

### R-008 — Tab payment resets order status causing kitchen display re-population and double inventory deduction (REQ-085)

**Opened:** 2026-06-25 (REQ-085); **Mitigated:** 2026-06-25 (REQ-085)
**Severity:** High (payments + inventory intersection)
**Owner:** WGB maintainer

**The risk:** `TabService.markTabPaid` and `TabService.completeTabPaymentManually` unconditionally set `status: 'confirmed'` on all tab orders during payment processing. This regresses completed/preparing/ready orders back to `confirmed`, causing them to reappear on the kitchen display. If kitchen staff re-process these orders to `completed`, a second inventory deduction can occur (partial deduction edge case), and duplicate `IncidentEvent` rows are created with "insufficient stock" errors.

**Mitigations applied in this REQ:**

1. Removed `status: 'confirmed'` from the `$set` in both `markTabPaid` and `completeTabPaymentManually` `updateMany` calls — tab payment now only updates payment-related fields (`paymentStatus`, `paidAt`, `paymentMethod`, `businessDate`).
2. Added labeled "Kitchen:" and "Payment:" badges to order surfaces so staff can distinguish fulfillment status from payment status.
3. Added payment status indicator on kitchen order card for kitchen staff awareness.

**Residual likelihood × impact:** low × high (the root cause is removed; residual risk is that already-affected orders in production need manual correction — operational artifact, not a code risk)

**Framework cross-references:** ISO27001.A.8.25 (secure SDLC — bug fix in payment path); SOC2.CC7.2 (system monitoring — prevents spurious inventory incidents)

**Review due:** 2027-06-25 (annual review — verify no regression introduced the field back)

**Cross-links:** [REQ-085 implementation plan](plans/REQ-085/implementation-plan.md); [#410](https://github.com/metasession-dev/wawagardenbar-app/issues/410); SRS REQ-TABMGT-006, REQ-KITCHEN-007.

---

## Closed

### R-002 — `xlsx` (SheetJS) high advisory — CLOSED (REQ-041, 2026-05-24)

**Original gap (accepted at onboarding 2026-05-24):** `xlsx` `^0.18.5` carried two high CVEs — CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS) — reachable via the expense-import parse path (`XLSX.read` on uploaded files in `app/actions/expenses/csv-import-actions.ts`). No fix exists on the npm registry (SheetJS publishes patched builds only via its CDN), so `npm audit fix` could not resolve it; `xlsx` was whitelisted in `sdlc-config.json` `accepted_dep_risks` to let onboarding proceed.

**Resolution (REQ-041, 2026-05-24):** Pinned `xlsx` to the patched SheetJS CDN build **0.20.3** (≥ 0.19.3 and ≥ 0.20.2, fixing both CVEs) in `package.json`; lockfile refreshed. `npm audit --audit-level=high` now exits 0 — `xlsx` is no longer flagged at any level (7 residual moderate advisories remain, below the `--audit-level=high` gate). `xlsx` removed from `accepted_dep_risks` and `ci.yml` regenerated, so the dependency-audit gate is now fully strict (hard-fails on any unaccepted high/critical). Evidence: `compliance/evidence/REQ-041/`.

### R-009 — Per-item deduction contract change breaks callers if return type assumption leaks (REQ-087)

**Accepted:** 2026-06-28
**Severity:** low × high
**Owner:** WGB maintainer

**The gap:** `deductStockForOrder` changed from `Promise<void>` (throws on failure) to `Promise<IDeductionResult>` (returns structured result object). Any future caller that assumes the old throw-on-failure contract would silently ignore failures instead of catching the throw.

**Mitigations landed in this REQ:**

1. Only two callers exist: `completeOrder` (order-service.ts) and `reconcileMissedDeductions` (inventory-service.ts). Both updated to consume `IDeductionResult`.
2. 7 new unit tests verify both callers handle the result object correctly (partial failure, skip-on-retry, all-succeed).
3. TypeScript compiler enforces the new return type — any missed caller would fail `tsc --noEmit`.

**Residual likelihood × impact:** low × high (TypeScript type system prevents silent contract violations; residual risk is a future caller using `any` typing to bypass the compiler check)

**Framework cross-references:** ISO27001.A.8.25 (secure SDLC — contract change in financial data path); SOC2.CC3.2 (risk identification)

**Review due:** 2027-06-28 (annual review — verify no new callers bypass type checking)

**Cross-links:** [REQ-087 implementation plan](evidence/REQ-087/implementation-plan.md); [#411](https://github.com/metasession-dev/wawagardenbar-app/issues/411); SRS REQ-INV-012, REQ-INV-013.

---

### R-010 — Existing orders without `inventoryDeductionDetails` field cause null-reference errors (REQ-087)

**Accepted:** 2026-06-28
**Severity:** low × medium
**Owner:** WGB maintainer

**The gap:** Existing orders in production do not have the `inventoryDeductionDetails` subdocument array. Code that accesses this field without a null/empty check could throw a null-reference error.

**Mitigations landed in this REQ:**

1. Mongoose schema defines `inventoryDeductionDetails` with `default: []` — existing documents get an empty array on access.
2. `reconcileMissedDeductions` iterates only items in the array; empty array = treat all items as pending (existing behaviour preserved).
3. Unit test `AC2 — skip-on-retry` verifies backward-compatible behaviour with empty `inventoryDeductionDetails`.

**Residual likelihood × impact:** low × medium (Mongoose default handles the gap; residual risk is direct MongoDB queries bypassing Mongoose schema defaults)

**Framework cross-references:** ISO27001.A.8.25 (secure SDLC — schema backward compatibility); SOC2.CC3.2 (risk identification)

**Review due:** 2027-06-28 (annual review — verify no direct MongoDB queries assume field presence)

**Cross-links:** [REQ-087 implementation plan](evidence/REQ-087/implementation-plan.md); [#411](https://github.com/metasession-dev/wawagardenbar-app/issues/411); SRS REQ-INV-012.

---

### R-011 — Price override bypass via customer flow after removal from cart UI (REQ-089)

**Status:** MITIGATED
**Opened:** 2026-07-02 (REQ-089)
**Owner:** WGB maintainer

**The gap:** Price override is being removed from the customer-facing cart UI. The cart store methods (`overrideItemPrice`/`resetItemPrice`) remain for admin surfaces. A determined user could potentially call these methods via browser dev tools, bypassing the UI removal.

**Mitigations applied in this REQ:**

1. Customer-facing `cart-item.tsx` no longer renders the override button or `PriceOverrideDialog` — no UI path to trigger the methods.
2. `menu-item-detail-modal.tsx` no longer forwards `allowManualPriceOverride` to cart lines — the flag is not present in customer cart data.
3. Server-side `reconcileAndValidateOrderLines` recomputes prices from the menu — client-supplied prices are ignored unless an explicit admin override path is used in the server action.
4. `expressCreateOrderAction` and `updateOrderItemsAction` require admin session — price override fields are only accepted when the session role is admin/super-admin.

**Residual likelihood × impact:** low × high (UI removal + server-side validation makes bypass unlikely; if bypassed, financial impact is high)

**Framework cross-references:** ISO27001.A.8.25 (secure SDLC — price override removal from customer surface); SOC2.CC3.2 (risk identification); SOC2.CC7.1 (system monitoring — server-side price recompute is the monitoring control)

**Review due:** 2027-07-02 (annual review — verify no new customer components call override methods)

**Cross-links:** [REQ-089 implementation plan](plans/REQ-089/implementation-plan.md); [#452](https://github.com/metasession-dev/wawagardenbar-app/issues/452); SRS REQ-ORDMGT-011.

---

### R-012 — Financial-history attribution and migration integrity (REQ-094)

**Status:** OPEN
**Opened:** 2026-07-18
**Owner:** WGB maintainer
**Review due:** Before REQ-094 plan approval and again at production review.

**The risk:** Profitability and category reports currently derive some historical category information from the current menu item and use inconsistent date conventions. A menu reclassification or server-timezone difference can therefore alter the apparent history of financial activity. A migration that writes current category data without provenance would make that misstatement harder to detect.

**Required controls before implementation proceeds:**

1. Persist immutable main-category and category snapshots for new order items at sale time.
2. Use one WAT business-date contract across profitability, Daily, per-main-category, and snapshot flows.
3. Make the legacy fallback visible to reviewers; it must not be described as sale-time history.
4. Make the migration dry-runnable, idempotent, counted, and non-destructive, with an explicit rollback/read-path strategy.
5. Prove the contract with boundary, reclassification, category-filter, migration, and authorisation tests.

**Residual risk:** Pending plan approval and evidence from the controls above. No migration may run against production before independent review.

**Framework cross-references:** ISO 27001 A.8.25; SOC 2 CC3.2; SOC 2 CC8.1; ISO 29119 §3.4.

**Cross-links:** [REQ-094 implementation plan](plans/REQ-094/implementation-plan.md); [#439](https://github.com/metasession-dev/wawagardenbar-app/issues/439); [#514](https://github.com/metasession-dev/wawagardenbar-app/issues/514); SRS REQ-REPORT-002, REQ-REPORT-003, REQ-INV-003, REQ-INV-007.
