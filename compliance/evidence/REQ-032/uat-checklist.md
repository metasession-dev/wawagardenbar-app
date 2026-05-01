# UAT Checklist — REQ-032

**Requirement:** REQ-032 — Create pending expense group from existing expenses (multi-select, standalone copy)
**GitHub Issue:** [#70](https://github.com/metasession-dev/wawagardenbar-app/issues/70)
**UAT environment:** `https://wawagardenbar-app-uat.up.railway.app`
**Risk Level:** MEDIUM
**Date:** 2026-05-01

---

## Prerequisites

Before starting:

- [ ] Develop CI run for the REQ-032 commits (`b247a06` + `19c1d32`) has completed successfully.
- [ ] UAT has been redeployed from develop and is reachable.
- [ ] Login as **admin** or **super-admin** (`ade@wawagardenbar.com`).
- [ ] At least **2 existing recorded expenses** are visible in the date range you select on `/dashboard/finance/expenses`. If not, add a couple of throwaway test expenses first via the Add Expense dialog (and remember to delete them at the end of the run).

Capture as you go:

- [ ] Browser screenshot for each AC where indicated below.
- [ ] Note the new pending group's `_id` from the URL of `/dashboard/finance/expenses/pending` after submission, in case rollback is needed.

---

## Walkthrough

### 1. Open the Expenses page

- [ ] Navigate to `/dashboard/finance/expenses`.
- [ ] Confirm the table renders with at least 2 expense rows in the current date range.

**Expected:** "Expense Records" heading visible, summary cards populated, ≥2 rows in the table.

---

### 2. AC1 — Row selection checkboxes appear

- [ ] Confirm a **leading checkbox column** is now present at the left of the expenses table.
- [ ] Confirm a **header checkbox** is present in the table header (acts as "select all visible").

**Expected:** One checkbox per row + one in the header. Hover/keyboard focus shows a visible focus ring (basic a11y).

📷 _Screenshot:_ expenses table with checkbox column visible.

---

### 3. AC2 — Bulk-action bar appears with selection count

- [ ] Click the checkbox on **one** expense row.
- [ ] Confirm the bulk-action bar appears above the table reading **"1 expense selected"** with two buttons: **Clear selection** and **Create pending group from selected (1)**.
- [ ] Click the checkbox on **a second** expense row.
- [ ] Confirm the bar now reads **"2 expenses selected"** and the button reads **"Create pending group from selected (2)"**.

**Expected:** Count and button label update in real time as you toggle rows. Plural/singular wording is correct ("1 expense" vs "2 expenses").

📷 _Screenshot:_ bulk-action bar with 2 selected.

---

### 4. AC3 — Dialog opens pre-populated with line items

- [ ] With 2 rows selected, click **Create pending group from selected (2)**.
- [ ] The **Add Expense** dialog opens.
- [ ] Confirm the dialog has **2 line items** stacked, not 1.
- [ ] For each line item, verify the following fields are pre-filled from the source expense:
  - Expense type (Direct cost / Operating expense)
  - Category
  - Description
  - Quantity (or `1` if the source had no quantity)
  - Unit (or `each` if the source had no unit)
  - Unit cost (= amount ÷ quantity, rounded to 2 dp)
  - Total cost (= source amount, **exactly** — write down both values to compare)

**Expected:** Both line items fully populated. **Total cost on each line equals the source expense's amount exactly** (e.g. ₦25,000 source → ₦25,000.00 total cost). Group total at the bottom of the dialog = sum of the two source amounts.

📷 _Screenshot:_ dialog open with 2 pre-filled lines and group total visible.

---

### 5. AC4 — Group date defaults to today and is editable

- [ ] In the same open dialog, confirm the **Date** field shows **today's date** (2026-05-01 or the current UAT date).
- [ ] Click the date and pick a different date (e.g. yesterday) using the calendar.
- [ ] Confirm the field updates to the new date.
- [ ] Pick today again before submitting.

**Expected:** Date is editable; default is today.

---

### 6. AC8 — Selection clears after dialog opens

- [ ] **Without submitting yet**, press **Esc** to close the dialog (or click the X / outside).
- [ ] Confirm you're back on the Expenses page.
- [ ] Confirm the **bulk-action bar is gone** and **none of the row checkboxes are still ticked**.

**Expected:** Closing the dialog leaves no stale selection state.

📷 _Screenshot:_ expenses table after dialog close — no bulk bar, no ticks.

---

### 7. AC5 — Submission creates a pending group

- [ ] Re-select the same 2 rows and click **Create pending group from selected (2)** again.
- [ ] In the dialog, optionally edit a description or quantity to verify edits persist.
- [ ] Click **Submit** (the primary button at the bottom).
- [ ] Confirm a success toast appears: **"Expense submitted — Added to pending expenses for approval."**
- [ ] Confirm the dialog closes and the page is back to the Expenses list.

**Expected:** Submission succeeds, no errors.

---

### 8. Verify the new pending group on the Pending Expenses page

- [ ] Click **Pending Expenses** (top-right action bar) or navigate to `/dashboard/finance/expenses/pending`.
- [ ] Locate the most recent group at the top of the list.
- [ ] Expand the group and confirm:
  - [ ] **2 line items** are present.
  - [ ] Each line item carries the **same description, category, quantity, unit, total** as you saw in the pre-filled dialog.
  - [ ] The group **total amount** = sum of the 2 source amounts.
  - [ ] The group **status** is `pending`.
  - [ ] **Submitted by** shows your user.
  - [ ] **Submitted at** is just now (within seconds).

**Expected:** All numbers match. No discrepancy between source-expense amounts and the new pending group's totals.

📷 _Screenshot:_ expanded pending group with both line items.

---

### 9. AC5 — Source expenses are unchanged (regression)

- [ ] Navigate back to `/dashboard/finance/expenses`.
- [ ] Locate the same 2 source expenses you used.
- [ ] Confirm:
  - [ ] Both rows are still present.
  - [ ] Their **amounts**, **categories**, **descriptions**, **quantities** are identical to before.
  - [ ] No "linked to pending group" badge or visual change appears (the duplicate is standalone).

**Expected:** Source rows are read-only — REQ-032 must not modify them.

---

### 10. AC9 — Regression: existing Add Expense flow still works

- [ ] On the Expenses page, click **+ Add Expense** (top-right) **without** selecting any rows.
- [ ] Confirm the dialog opens with **1 blank line item** (legacy behaviour).
- [ ] Fill in a quick test row and submit.
- [ ] Confirm it appears in `/dashboard/finance/expenses/pending` as a new 1-line group.
- [ ] Delete or leave the test group as you prefer.

**Expected:** Pre-existing Add Expense flow unchanged.

---

## Edge cases (optional but recommended)

### E1 — Single-row selection

- [ ] Select **only 1** expense row → click **Create pending group from selected (1)**.
- [ ] Confirm dialog opens with 1 pre-filled line.
- [ ] Confirm submission works as a 1-line pending group.

### E2 — Add another line in the dialog

- [ ] Open dialog pre-populated with 1 line (from selected expense).
- [ ] Click **Add line** within the dialog → fill in a second line manually → submit.
- [ ] Confirm the new pending group has **2** line items (1 from prefill + 1 manually added).

### E3 — Remove a pre-filled line in the dialog

- [ ] Open dialog pre-populated with 2 lines.
- [ ] Click the trash icon on one line to remove it.
- [ ] Submit.
- [ ] Confirm the pending group has only **1** line item.

### E4 — Cancel and reselect

- [ ] Select 2 rows → open dialog → close (Esc).
- [ ] Re-select 3 different rows → open dialog.
- [ ] Confirm the dialog now shows **3** lines (the 2 from the previous attempt are not retained).

### E5 — Keyboard a11y

- [ ] Tab to the first row checkbox → press Space → confirm row selects.
- [ ] Tab to the bulk-action button → press Enter → confirm dialog opens.

### E6 — Filtered list (REQ-029 search)

- [ ] Type a search term that narrows the list to fewer rows.
- [ ] Click the **header checkbox**.
- [ ] Confirm only the **filtered (visible)** rows are selected, not the full underlying list.

---

## Sign-off

- [ ] All 10 walkthrough steps pass.
- [ ] All 4–6 edge cases attempted (mark which are skipped + why).
- [ ] No console errors observed in browser DevTools during the run.
- [ ] No regressions noticed elsewhere in the Expenses / Pending Expenses surfaces.
- [ ] Screenshots captured and attached to the META-COMPLY release record.

**Verifier:**
**Date verified:**
**UAT git SHA on develop:**
**META-COMPLY UAT release version:**

If any step fails: capture a screenshot + the exact step number + a short description, then comment on issue [#70](https://github.com/metasession-dev/wawagardenbar-app/issues/70). Do **not** approve the META-COMPLY UAT release until the issue is resolved or formally accepted as a deferred follow-up.

---

## Rollback

If a critical defect is found and a hotfix is not viable:

1. Revert the merge of `b247a06` + `19c1d32` on develop (single revert commit).
2. Trigger a redeploy from develop.
3. The new feature disappears; existing pending groups created via this flow remain valid records under REQ-026's existing schema and continue to function.
