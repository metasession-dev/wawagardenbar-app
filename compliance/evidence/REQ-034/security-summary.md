# Security Summary — REQ-034

**Risk Level:** HIGH
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Date:** 2026-05-09

## Threat surfaces

### 1. Customer-menu data leakage

**Threat:** Kitchen-ingredient inventory rows accidentally exposed via the public menu API or admin order-creation surfaces.
**Mitigation:** Every customer-facing menu query gains a hard `kind: 'menu-item'` filter at the service layer. Touchpoints (5 sites) enumerated in `implementation-plan.md`. E2E test asserts the public menu endpoint returns 0 rows of `kind:'kitchen-ingredient'` even when the DB contains them.
**Residual risk:** A new menu query added in a future REQ may forget the filter. Mitigated by service-layer wrapper convention + lint rule (TODO).

### 2. Privilege escalation via role enum

**Threat:** A kitchen user gains access to admin-only surfaces by exploiting permission drift.
**Mitigation:** Default-deny allowlist enforced at TWO levels:

- Page guard via `requireRole(['admin', 'super-admin', 'kitchen'])` — kitchen users can only hit `/dashboard/kitchen/*`.
- Server-action guard on every kitchen action (`requireRole(['admin', 'super-admin', 'kitchen'])`); other actions require `requireRole(['csr', 'admin', 'super-admin'])` and reject kitchen.
  **Residual risk:** A new dashboard route added in a future REQ may grant kitchen by accident. E2E asserts kitchen user 403s on `/dashboard/orders`, `/dashboard/finance`, `/dashboard/settings`.

### 3. Inventory tampering via concurrent production race

**Threat:** Two production events fire simultaneously; both pass pre-flight; both deduct; second drives currentStock negative.
**Mitigation:** Optimistic `$inc` with `currentStock: {$gte: required}` guard. Mongo's update is atomic per-document; if 0-modified, the deduction has lost the race and the production aborts before completing. Reversal pass undoes any deductions that landed first.
**Residual risk:** Crash between deduction and reversal leaves drift; resolved via manual inventory adjustment audit (existing REQ-026 path).

### 4. Expense edit/delete weaponised to drain inventory

**Threat:** Bad actor edits or deletes an expense with a large quantity, intending the reversal to zero or negate kitchen stock and disrupt the kitchen.
**Mitigation:** Resolution #4 — block edit/delete if the reversal would drive `currentStock < 0`. UI shows a clear error pointing to manual Inventory adjustment. The reversal cannot proceed silently to negative stock.
**Residual risk:** Bad actor with admin role still has direct manual-adjustment access via inventory dashboard. That's an existing REQ-026 surface, audit-logged.

### 5. Yield-override fraud

**Threat:** Kitchen staff falsely overrides `actualYield` to a low number to siphon stock.
**Mitigation:** Production records are immutable post-creation; void within 24h is super-admin-only; void past 24h requires mandatory `reasonNote` persisted on every reversal `StockMovement`. Variance (`actualYield - expectedYield`) is logged; future analytics can flag chronic high-variance staff.
**Residual risk:** A staff member with kitchen role can record a single fraudulent batch. Mitigation is process (super-admin reviews production-history weekly) rather than code.

### 6. Cross-dimension unit conversion bug

**Threat:** A bug in the dimension-conversion table or validator allows a recipe to specify "200ml" against an inventory of "200kg goat meat", deducting an absurd quantity.
**Mitigation:** Server-side validation rejects cross-dimension at recipe save time. `dimension-conversion.ts` covers ONLY mass (kg↔g) and volume (litres↔ml); count/other/time enforce strict id-equality. Unit tests cover every conversion edge case.

### 7. Migration backfill data corruption

**Threat:** `backfill-inventory-kind.ts` accidentally writes `kind: 'kitchen-ingredient'` on existing menu-item rows.
**Mitigation:** Script is idempotent (skip if `kind` already set) and ALWAYS sets `'menu-item'` for any pre-existing row (the kitchen-ingredient kind is only created via new flow). Audit JSON written to CWD before mutation; rollback via reading the audit file. Dry-run first on UAT, then on prod.

## Authentication / authorisation matrix (post-D5 walk-back)

The three new roles (kitchen / bar / waiting) were walked back during
UAT — see defect D5 in `test-execution-summary.md`. The matrix now uses
the original three admin-side roles plus the per-feature permission
gating:

| Surface                         | Customer     | CSR          | Admin    | Super-admin |
| ------------------------------- | ------------ | ------------ | -------- | ----------- |
| `/dashboard/orders/*`           | ✗            | ✓            | ✓ (perm) | ✓           |
| `/dashboard/customers/*`        | ✗            | ✓            | ✗        | ✓           |
| `/dashboard/inventory/*`        | ✗            | ✗            | ✓ (perm) | ✓           |
| `/dashboard/finance/*`          | ✗            | ✗            | ✓ (perm) | ✓           |
| `/dashboard/settings/*`         | ✗            | ✗            | ✓ (perm) | ✓           |
| `/dashboard/kitchen/recipes`    | ✗            | ✓ (perm)     | ✓ (perm) | ✓           |
| `/dashboard/kitchen/production` | ✗            | ✓ (perm)     | ✓ (perm) | ✓           |
| Public menu API                 | ✓ (filtered) | ✓ (filtered) | ✓        | ✓           |

`(perm)` = gated by the corresponding `IAdminPermissions` flag toggled
in Settings → Admins → Permissions. `/dashboard/kitchen/*` is gated by
the new `kitchenManagement` permission (default false on csr + admin;
unconditionally true on super-admin). Any role with the permission
granted can author recipes and run production batches. Voiding a
production stays super-admin-only via a hard role check at the service
layer.

## SAST / dependency

- Semgrep: 0 new high/critical findings expected. Baseline preserved (`gates/semgrep.json`).
- Dependency audit: 0 unaccepted high/critical. mongoose 8.23.1 baseline (REQ-035 fix) preserved.
- No new third-party packages anticipated.

## Audit trail

- Every Inventory change (kind, currentStock, cost) emits a `StockMovement` row.
- Every Production execution emits N+1 `StockMovement` rows (N ingredient deductions + 1 MenuItem yield addition).
- Every Production void emits N+1 reversal `StockMovement` rows tagged with the same `productionId`.
- Every Expense link save / edit / delete emits a `StockMovement` row tagged with `expenseId`.
- All `StockMovement` rows carry `performedBy` (user id), `performedAt` (UTC timestamp), and an optional `reasonNote`.

## UAT Verification — 2026-05-13

**UAT URL:** https://wawagardenbar-app-uat.up.railway.app
**Deployed commit:** `9b19c43` (develop post-CVE-fix)
**Mongo URI source:** Railway CLI `railway environment uat → service wawagardenbar-app → variables` (then resolved to `MONGO_PUBLIC_URL` for local network reach).

### Smoke

- ✅ Homepage `/` returns HTTP 200.
- ✅ Public menu API (`/api/public/menu`) returns the expected 401 Unauthorized when called without an API key — auth gate intact.

### Migration (D-block defect resolution)

**Defect surfaced during UAT smoke:** Inventory dashboard's Sellable + Kitchen tabs both showed `(0)` while the unconditional `countDocuments()` stats card showed `Total Items: 111`. Diagnosis: the 111 pre-existing UAT Inventory documents had no `kind` field, so the `InventoryModel.find({ kind: ... })` queries on the tab content returned no rows. (Mongo treats `{ kind: 'menu-item' }` as field-must-exist; the Mongoose schema default only applies to new documents.)

Migration plan in `test-plan.md` already anticipated this — the backfill was expected to run on UAT before code deploys. Ran it now:

| Step                     | Inventory candidates | MenuItem candidates | Outcome                                                   |
| ------------------------ | -------------------- | ------------------- | --------------------------------------------------------- |
| Dry-run #1               | 111                  | 108                 | No writes; matches `countDocuments()` from the dashboard. |
| Live backfill            | 111 → updated        | 108 → updated       | All rows tagged `kind:'menu-item'`.                       |
| Dry-run #2 (idempotency) | 0                    | 0                   | Confirms idempotent.                                      |

Logs: `compliance/evidence/REQ-034/gates/uat-backfill-{dryrun,live}.txt`.

After the backfill, the user refreshed the Inventory dashboard and confirmed the Sellable tab populated correctly (Kitchen tab remains 0 as expected — no kitchen-ingredient rows exist yet).

This is recorded as **Defect D3** (a deploy-sequence procedural defect, not a code bug — the code worked exactly as specified; the deploy ordering missed the migration step that test-plan.md called out). See `test-execution-summary.md` for the consolidated defect log.

### Feature verification (in progress)

Handed back to the user — interactive walkthrough per `uat-checklist.md` covering:

- Role allowlist E2E (kitchen / bar / waiting accounts created in Settings → Admins, each role's access boundary verified)
- Recipe builder validation paths (duplicate / cross-dimension / count-strict-match rejections; deactivation toggle)
- Production execution + pre-flight blocking + super-admin-only Void within and past 24h
- Expense → Inventory link save / edit / delete + block-on-negative on edit
- Daily Financial Report regression
