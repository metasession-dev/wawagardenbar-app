# UAT Checklist — REQ-033

**Requirement:** REQ-033 — App-wide Unit-of-Measurement (UoM) registry
**GitHub Issue:** [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**UAT environment:** `https://wawagardenbar-app-uat.up.railway.app`
**Risk Level:** MEDIUM-HIGH
**Date:** 2026-05-01

---

## Prerequisites

- [ ] Develop CI for the REQ-033 commits (`6271eb2` + this gap-fix commit) is green
- [ ] UAT redeployed from develop and reachable
- [ ] Login as **super-admin** (`ade@wawagardenbar.com` or equivalent)

Capture as you go:

- [ ] Browser screenshot for each AC where indicated below
- [ ] Note the META-COMPLY UAT release version (`vYYYY.MM.DD.N`)

---

## Walkthrough

### 1. AC1 — Settings exposes a Units of Measurement section (super-admin only)

- [ ] Navigate to `/dashboard/settings`
- [ ] Scroll to find a **Units of Measurement** card sandwiched between **Expense Categories** and **Menu Categories**
- [ ] Confirm the seeded units render as inline rows with id / label / category / Active toggle / Remove button:
  - `portions`, `pieces`, `each`, `units`, `bottles` (count category)
  - `kg`, `g` (mass)
  - `litres`, `ml` (volume)

📷 _Screenshot:_ settings page with Units of Measurement section visible.

**Expected:** 9 rows seeded; super-admin sees Save changes + Add unit buttons.

---

### 2. AC2 — Add a new unit through the UI

- [ ] Click **Add unit**
- [ ] In the new empty row at the bottom, fill:
  - ID: `tablespoons` (lowercase, no spaces — regex enforced client-side)
  - Label: `Tablespoons`
  - Category: `volume`
  - Active: ✓
- [ ] Click **Save changes**
- [ ] Confirm a success toast: **"Units of measurement updated — Saved 10 units."**

📷 _Screenshot:_ save toast + the new row visible.

**Expected:** registry persists; reload the page and the new row is still there.

---

### 3. Edit an existing unit's label (regression check)

- [ ] On the `kg` row, change the label from `Kilograms (kg)` to `Kilos`
- [ ] Save → toast confirms
- [ ] Reload → label change persists

**Expected:** edits persist via `changeHistory`; old value retrievable from the audit array.

---

### 4. Soft-delete the test unit

- [ ] On the `tablespoons` row added in step 2, untick **Active** (badge flips to "Inactive")
- [ ] Save → toast confirms
- [ ] Reload → row remains but Inactive badge persists

**Expected:** the unit is soft-deleted (still resolvable for legacy records, hidden from new dropdowns).

---

### 5. AC3 — Expense form unit field is a Select sourced from the registry

- [ ] Navigate to `/dashboard/finance/expenses`
- [ ] Click **+ Add Expense**
- [ ] In the dialog, find the **Unit** field on the line item
- [ ] Click it — a dropdown opens
- [ ] Confirm the registry's active units appear (you should see `Kilos` from step 3 — confirming the registry is the source)
- [ ] Confirm `Tablespoons` is **NOT** in the dropdown (soft-deleted in step 4 → hidden from new dropdowns)
- [ ] Pick `Kilos` and continue filling: type=Direct Cost, category=any, description="UAT test", quantity=1, unitCost=100
- [ ] Click **Submit**
- [ ] Confirm the pending expense appears in `/dashboard/finance/expenses/pending`

📷 _Screenshot:_ expense form with Select dropdown open, showing registry-sourced options.

**Expected:** Select dropdown source is the registry. Soft-deleted unit is filtered out.

---

### 6. AC4 — Menu-item form unit field is a Select sourced from the registry

- [ ] Navigate to `/dashboard/menu` and click **Add Menu Item** (or edit any item)
- [ ] Toggle **Track Inventory** on (if it's a new item)
- [ ] Find the **Unit** / **Unit Type** field
- [ ] Click it — same registry-sourced dropdown opens
- [ ] Confirm the same units appear (including your `Kilos` rename); confirm `Tablespoons` is absent

📷 _Screenshot:_ menu-item form with Select dropdown open.

**Expected:** identical source as the Expense form's dropdown.

---

### 7. AC5 — Backfill script normalises legacy values (manual run on UAT DB)

> Run on the same UAT DB the app is deployed against. Requires `MONGODB_WAWAGARDENBAR_APP_URI` and `MONGODB_DB_NAME` in `.env.local` for the local terminal session.

- [ ] **Dry-run first**: `npx tsx scripts/backfill-unit-values.ts --dry-run`
- [ ] Capture stdout — note the count of "would migrate", "already canonical", "unrecognised"
- [ ] Review any unrecognised values; if a real free-text value is reported (e.g. `"piece"` or `"month"`), decide whether to:
  - Update the source row manually through the Edit Expense / Edit Inventory dialog (now uses the Select), or
  - Add a new alias to `LEGACY_UNIT_ALIASES` and re-run the script
- [ ] **Live run**: `npx tsx scripts/backfill-unit-values.ts`
- [ ] Confirm the audit file `_uom-backfill-{timestamp}.json` is written in CWD
- [ ] Confirm stdout summarises `expenses: N migrated, M already canonical, X unrecognised` and the same for `inventories`

📷 _Screenshot:_ terminal showing dry-run + live-run stdout.

**Expected:** zero unrecognised values after live-run completes (any legitimate ones reconciled in the previous step).

---

### 8. AC8 — Soft-delete + legacy reference (the round-trip test)

The unit you soft-deleted in step 4 (`tablespoons`) is referenced by no real record (you never assigned it). To verify the soft-delete behaviour against an existing record:

- [ ] Open `/dashboard/finance/expenses/pending` and edit the test expense from step 5 (the one with `Kilos`)
- [ ] In the form's unit dropdown, verify `Kilos` is selectable
- [ ] Now navigate back to `/dashboard/settings` and **re-toggle `kg` → Inactive**, save
- [ ] Re-open the pending expense → the form's Unit field should still **display** "Kilos" (legacy resolution via `formatUnit`) but the dropdown should not list `Kilos` for new selection

📷 _Screenshot:_ form showing Kilos as the current value but absent from the dropdown.

**Expected:** legacy record continues to display the label; new selections require an active unit.

After this test, remember to **re-toggle `kg` back to Active** so the rest of UAT and production data continues to behave naturally.

---

## Edge cases (optional but recommended)

### E1 — Duplicate id rejection

- [ ] Try to add a new row with id `kg` (same as existing) → save → expect form-level error "Duplicate id"

### E2 — Invalid id slug

- [ ] Try id `Kg ` (trailing space) → expect client-side regex error "Lowercase letters, digits, and hyphens only — no spaces"

### E3 — Empty registry

- [ ] Try to remove all 9 rows then save → expect server-side error "Units of measurement registry cannot be empty"
- [ ] Re-add the seeded values (or click cancel)

### E4 — Audit history visibility

- [ ] Inspect the `SystemSettings` document in MongoDB Atlas (or via a mongosh shell):
  ```
  db.systemsettings.findOne({key: 'units-of-measurement'})
  ```
- [ ] Confirm `changeHistory[]` array contains entries from each save in this checklist with `changedBy`, `changedAt`, `value` snapshots

### E5 — Legacy free-text reconciliation (only if step 7 found unrecognised values)

- [ ] For each unrecognised entry, fix via the relevant Edit form (Edit Expense / Edit Inventory)
- [ ] Re-run the backfill in dry-run mode → confirm 0 unrecognised

---

## Sign-off

- [ ] All 8 walkthrough steps pass
- [ ] All edge cases attempted (mark which are skipped + why)
- [ ] No console errors in browser DevTools during the run
- [ ] No regression observed in any existing flow that uses unit fields
- [ ] Backfill ran on UAT DB; audit file captured; no unrecognised values remain
- [ ] Screenshots captured and attached to the META-COMPLY UAT release record

**Verifier:**
**Date verified:**
**UAT git SHA on develop:**
**META-COMPLY UAT release version:**

If any step fails: capture a screenshot + the exact step number + a short description, then comment on issue [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73). Do **not** approve the META-COMPLY UAT release until the issue is resolved or formally accepted as a deferred follow-up.

---

## Rollback

If a critical defect is found:

1. Revert the merge of `6271eb2` (and the gap-fix commit) on develop.
2. Trigger a redeploy.
3. Run the backfill audit file in **reverse**: read `_uom-backfill-{timestamp}.json` and apply the original values back to the rows that were normalised.
4. The Settings form / `getUnitsOfMeasurement` service continue to work even after revert (no schema removal); the seed defaults take over.

Soft-deleted units stay soft-deleted post-revert (the registry value persists in `SystemSettingsModel`); manually re-activate via the Settings form if needed.
