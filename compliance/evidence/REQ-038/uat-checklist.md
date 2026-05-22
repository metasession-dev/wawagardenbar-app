# UAT Checklist — REQ-038

**What's being tested:** Restocking sellable drinks (bottles, cans, etc.) from an expense, and locking the unit of measure so it can't be entered wrong.

**Issue:** [#84](https://github.com/metasession-dev/wawagardenbar-app/issues/84)
**Date:** 2026-05-17
**UAT site:** https://wawagardenbar-uat.up.railway.app/
**Tester:** ********\*\*********\_\_********\*\*********
**Time started:** **\*\***\_\_**\*\*** **Time finished:** **\*\***\_\_**\*\***

---

## Before you start — read this once

1. **Open a Word document** called `REQ-038-UAT-Evidence-<your-name>-2026-05-18.docx`. You'll paste screenshots into it as you go. Use the section headings in this checklist as headings in the Word doc.
2. **You will need a screenshot tool.** On Windows: press `Windows key + Shift + S`. On Mac: press `Cmd + Shift + 4`. After capturing, paste into Word with `Ctrl + V` (or `Cmd + V` on Mac).
3. **Log in as a super-admin user** at https://wawagardenbar-uat.up.railway.app/ using the credentials given to you. If you can't log in, stop and ask the developer.
4. **Tick each box below** as you finish that step. If something doesn't match what's described, **don't tick it** — write what you saw underneath it in the Word doc and continue.
5. **Two items you'll need in the menu before you start** (ask the developer to seed these if they aren't already there):
   - **Item A** — a drink sold in **bottles** (e.g. "Corona 330ml")
   - **Item B** — a drink sold in **cans** (e.g. "Coca-Cola 330ml")
     Both must have **"Track inventory"** enabled.

---

## Part 1 — Set the Purchase unit on a menu item (Item A — Bottles)

> What this proves: The new "Purchase unit" dropdown saves correctly and survives a page reload.

**Step 1.1** — In the left sidebar, click **Menu**.

**Step 1.2** — In the list, click the row for **Item A** (your bottled drink).

**Step 1.3** — Click the **Edit** button (top-right of the page).

**Step 1.4** — Scroll down until you see a field labelled **"Unit Type"**. **Directly below it** there should be a new dropdown labelled **"Purchase unit"**.

- [ ] **CHECK:** The "Purchase unit" dropdown exists.
- [ ] **EVIDENCE:** Screenshot the whole form section showing the new dropdown. Paste into Word under heading **"1.4 — Purchase unit dropdown exists (Item A)"**.

**Step 1.5** — Click the "Purchase unit" dropdown. A list of units should appear (Bottles, Cans, Kegs, etc., plus "Any").

- [ ] **CHECK:** The list includes at least **Bottles**, **Cans**, and **Any**.
- [ ] **EVIDENCE:** Screenshot the open dropdown. Paste into Word under **"1.5 — Available units"**.

**Step 1.6** — Click **Bottles**. The dropdown should close and show "Bottles" as the selected value.

**Step 1.7** — Scroll to the bottom and click the **Save** button (or **Update**).

- [ ] **CHECK:** You see a success message (e.g. "Menu item updated") and the page reloads or returns you to the menu list.
- [ ] **EVIDENCE:** Screenshot the success message. Paste into Word under **"1.7 — Save confirmation"**.

**Step 1.8** — Click **Item A** again in the list, then click **Edit**.

- [ ] **CHECK:** The "Purchase unit" dropdown still shows **Bottles** (the value persisted).
- [ ] **EVIDENCE:** Screenshot the form showing Bottles still selected. Paste into Word under **"1.8 — Bottles persisted after reload"**.

---

## Part 2 — Repeat for Item B (Cans) — proves the dropdown is generic

> What this proves: The dropdown isn't hard-coded to one unit type.

**Step 2.1** — In the sidebar, click **Menu** → click **Item B** → click **Edit**.

**Step 2.2** — Set the **Purchase unit** dropdown to **Cans** → click **Save**.

**Step 2.3** — Reopen the same item.

- [ ] **CHECK:** "Purchase unit" still shows **Cans**.
- [ ] **EVIDENCE:** Screenshot. Paste into Word under **"2.3 — Cans persisted on Item B"**.

---

## Part 3 — Add a brand-new unit and confirm it appears in the dropdown

> What this proves: When the bar adds a new unit type (e.g. Kegs), it shows up automatically.

**Step 3.1** — In the sidebar, click **Settings** → look for a section called **Units of Measurement**. (If you can't find it, ask the developer to point you there.)

**Step 3.2** — Click **Add new unit** (button name may be slightly different) and create a unit called **"TestKegs-<your initials>"** (e.g. "TestKegs-JS"). Save it.

- [ ] **EVIDENCE:** Screenshot the new unit row in the list. Paste under **"3.2 — New unit created"**.

**Step 3.3** — Go back to **Menu** → click **Item A** → click **Edit** → open the **Purchase unit** dropdown.

- [ ] **CHECK:** Your new unit **"TestKegs-<initials>"** appears in the list (you do **not** need to pick it — just confirm it's listed).
- [ ] **EVIDENCE:** Screenshot the open dropdown showing the new unit. Paste under **"3.3 — New unit appears in dropdown"**.

**Step 3.4** — Close the form **without saving** (so Item A stays on Bottles).

---

## Part 4 — Expense form: kitchen dropdown + sellable checkbox layout

> What this proves: The expense form has two separate "add to inventory" controls — one always-visible dropdown for kitchen ingredients, plus a checkbox below it that reveals a sellable-only dropdown. The two are mutually exclusive (picking one disables the other).

**Step 4.1** — In the sidebar, click **Finance** → **Expenses** (URL: `/dashboard/finance/expenses`).

**Step 4.2** — Click the **"+ Add Expense"** button (top-right) to open the Add Expense dialog.

**Step 4.3** — In the dialog, leave Date as today. Under **Line Items**, in the existing line: pick Type **Direct Cost (COGS)**, pick any Category, type Description "UAT inventory link test", set Qty 1. **Stop before clicking Save Expense** — you are inspecting the form layout.

**Step 4.4** — Look at the line item. **Below** the Description / Qty / Unit / Unit Cost / Total row you should see **two controls**:

- A **dropdown** labelled **"Add to kitchen inventory (optional)"**, defaulting to **"No inventory link"**.
- Below it, a **checkbox** labelled **"Update inventory count (sellable item)"**, unticked by default.

- [ ] **CHECK:** Both controls are visible (one dropdown + one checkbox, in that order).
- [ ] **EVIDENCE:** Screenshot the line item showing both controls. Paste under **"4.4 — Kitchen dropdown + sellable checkbox visible"**.

**Step 4.5** — Click the **"Add to kitchen inventory (optional)"** dropdown and pick any kitchen ingredient from the list.

- [ ] **CHECK:** Your pick is shown in the dropdown, AND the **"Update inventory count (sellable item)"** checkbox below either becomes disabled / greyed-out or cannot be ticked.
- [ ] **EVIDENCE:** Screenshot the line item with a kitchen ingredient selected. Paste under **"4.5 — Kitchen picked → sellable checkbox disabled"**.

**Step 4.6** — Set the kitchen dropdown back to **"No inventory link"**.

**Step 4.7** — Tick the **"Update inventory count (sellable item)"** checkbox.

- [ ] **CHECK:** A new dropdown labelled **"Sellable item to restock"** appears below the checkbox, AND the kitchen dropdown above becomes disabled / greyed-out.
- [ ] **EVIDENCE:** Screenshot the line item with the sellable checkbox ticked. Paste under **"4.7 — Sellable ticked → kitchen dropdown disabled + sellable dropdown appears"**.

---

## Part 5 — Unit lock when picking a sellable with a Purchase unit set

> What this proves: When you pick a sellable item that has "Purchase unit = Bottles" set, the expense Unit field is forced to Bottles. You can't accidentally enter Cans.

**Step 5.1** — With "Update inventory count (sellable)" still ticked, open the **"Sellable item to restock"** dropdown.

**Step 5.2** — Pick **Item A** (your Bottles drink).

**Step 5.3** — Look at the **Unit** field on the same line.

- [ ] **CHECK:** The Unit field is now **locked to "Bottles"** (greyed out, disabled, or read-only). You should also see a tooltip or helper text explaining why.
- [ ] **EVIDENCE:** Screenshot the line item with the locked Unit field. Paste under **"5.3 — Unit locked to Bottles when Item A is picked"**.

**Step 5.4** — Try clicking the Unit field and typing **"Cans"** or selecting Cans from a dropdown.

- [ ] **CHECK:** You **cannot** change it — the field is locked.
- [ ] **EVIDENCE:** Screenshot showing you couldn't change it. Paste under **"5.4 — Cannot override the locked unit"**.

**Step 5.5** — Change the dropdown selection from Item A to **Item B** (your Cans drink).

- [ ] **CHECK:** The Unit field now automatically updates to **"Cans"**.
- [ ] **EVIDENCE:** Screenshot the Unit field showing Cans. Paste under **"5.5 — Unit auto-locks to Cans for Item B"**.

---

## Part 6 — Full restock flow (end-to-end with quantity 24)

> What this proves: When the expense is approved and transferred, the inventory count for Item A goes up by the right amount.

**Step 6.1** — First, **note the current stock** of Item A. Open a **second browser tab** → in the sidebar, click **Inventory** → find Item A → write down the **current stock** number here: **\*\*\*\***\_\_\_\_**\*\*\*\***

- [ ] **EVIDENCE:** Screenshot the inventory list showing Item A's current stock. Paste under **"6.1 — Item A stock BEFORE expense"**.

**Step 6.2** — Switch back to the expense tab. Make sure:

- "Update inventory count (sellable)" is **ticked**
- "Sellable item to restock" is **Item A**
- **Quantity** is **24**
- Unit shows **Bottles** (locked)
- Amount is **£100**

**Step 6.3** — Click **Submit** (or **Save**) on the expense.

- [ ] **EVIDENCE:** Screenshot the saved/pending expense row. Paste under **"6.3 — Expense submitted"**.

**Step 6.4** — Approve the expense (you should be super-admin) → then **Confirm transfer** (enter any reference like "UAT-2026-05-18-REQ-038").

- [ ] **EVIDENCE:** Screenshot the transferred expense status. Paste under **"6.4 — Expense transferred"**.

**Step 6.5** — Switch to your second browser tab → refresh **Inventory** → find Item A again.

- [ ] **CHECK:** Item A's **current stock has increased by exactly 24** (from the value you wrote down in Step 6.1).
- [ ] **EVIDENCE:** Screenshot the inventory list showing the new stock value. Paste under **"6.5 — Item A stock AFTER expense (+24)"**.

---

## Part 7 — Edit-and-revise (proves reversal works)

> What this proves: If you correct the quantity on an already-transferred expense, the inventory count adjusts correctly.

**Step 7.1** — Go back to the transferred expense from Part 6 → click **Edit** → change the **Quantity** from 24 to **30** → save.

**Step 7.2** — Refresh Inventory. Item A's stock should now be the original (Step 6.1) + 30 (not 24 + 30 = 54 — that would be a bug).

- [ ] **CHECK:** Stock = Step 6.1 original + 30.
- [ ] **EVIDENCE:** Screenshot inventory after edit. Paste under **"7.2 — Stock after edit (+30, not 24+30)"**.

**Step 7.3** — Delete the expense → refresh Inventory.

- [ ] **CHECK:** Stock returns to the **original Step 6.1 value** (the +30 is reversed).
- [ ] **EVIDENCE:** Screenshot inventory after delete. Paste under **"7.3 — Stock returns to original after delete"**.

---

## Part 8 — Customer menu hasn't broken

> What this proves: The customer-facing menu still works normally — nothing about restock leaks to customers.

**Step 8.1** — Open a **private/incognito browser window** → go to the public menu (ask developer for the exact URL — usually https://wawagardenbar-uat.up.railway.app/ or `/menu`).

**Step 8.2** — Find Item A on the menu.

- [ ] **CHECK:** Item A appears normally with its price. There is **no** mention of "Purchase unit", "restock", or "inventory count".
- [ ] **EVIDENCE:** Screenshot the customer menu showing Item A. Paste under **"8.2 — Customer menu unchanged"**.

---

## Part 9 — Sign-off

Once every checkbox above is ticked, fill in the sign-off table below in your Word doc and email it to the developer.

| Item                                                                   | Result      |
| ---------------------------------------------------------------------- | ----------- |
| All Part 1 boxes ticked (Purchase unit saves on Item A)                | PASS / FAIL |
| All Part 2 boxes ticked (works on Item B too)                          | PASS / FAIL |
| All Part 3 boxes ticked (new unit appears in dropdown)                 | PASS / FAIL |
| All Part 4 boxes ticked (kitchen dropdown + sellable checkbox + mutex) | PASS / FAIL |
| All Part 5 boxes ticked (unit lock works for Bottles and Cans)         | PASS / FAIL |
| All Part 6 boxes ticked (full restock +24 lands on inventory)          | PASS / FAIL |
| All Part 7 boxes ticked (edit + delete reversal works)                 | PASS / FAIL |
| All Part 8 boxes ticked (customer menu unchanged)                      | PASS / FAIL |

**Tester name:** ********\*\*********\_\_********\*\*********
**Date:** **\*\***\_\_**\*\***
**Signature:** ********\*\*********\_\_********\*\*********

**Overall result (circle one):** **PASS** / **FAIL**

If FAIL: write below which Part failed and what you saw instead.

---

---

---

---

## What to do when finished

1. Save the Word doc.
2. Email it to the developer with subject **"REQ-038 UAT evidence — <your name> — 2026-05-18"**.
3. Stop. The developer will record the UAT result on their side.
