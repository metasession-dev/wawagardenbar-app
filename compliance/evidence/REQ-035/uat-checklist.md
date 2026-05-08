# UAT Checklist — REQ-035

**Requirement:** REQ-035 — Tip recording at express checkout + tips breakdown in Daily Financial Report
**GitHub Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**UAT environment:** `https://wawagardenbar-app-uat.up.railway.app`
**Risk Level:** HIGH
**Date:** 2026-05-07
**Develop SHA under test:** `72b862c` (CI green: Quality Gates + Register Release + Upload Evidence)

---

## Prerequisites

- [ ] Develop CI on `72b862c` (or a later commit) is green: Quality Gates + Register Release + Upload Evidence.
- [ ] UAT redeployed from develop and reachable.
- [ ] Login as **admin** (express + close-tab) and **super-admin** (Daily Financial Report).
- [ ] At least one **open tab** exists on UAT for the close-tab walkthrough (Step 4). If none exists, create one in step 0.

Capture as you go:

- [ ] Browser screenshot for each AC where indicated below.
- [ ] Note the META-COMPLY UAT release version (`vYYYY.MM.DD.N`).

---

## Step 0 — Optional: backfill `tipPaymentMethod` on legacy orders

> **Why optional?** The daily-report aggregator falls back to `paymentMethod` for orders missing `tipPaymentMethod`, so reporting works without backfill. The script only matters if you want existing rows to carry the new field unambiguously.

- [ ] **Dry-run first** (no writes):

  ```bash
  npx tsx scripts/backfill-tip-payment-method.ts --dry-run
  ```

  Capture stdout. Note the count of "candidates", per-method preview, and any "skipped" entries (orders without a paymentMethod fallback).

- [ ] **Live run** (writes + audit file):

  ```bash
  npx tsx scripts/backfill-tip-payment-method.ts
  ```

  Confirm:
  - The audit file `_tip-pm-backfill-{timestamp}.json` is written in CWD.
  - stdout reports `updated N orders`.
  - Save the audit JSON alongside UAT screenshots — it is the rollback receipt for AC9.

- [ ] **Re-run live** to confirm idempotency (AC9 invariant):

  ```bash
  npx tsx scripts/backfill-tip-payment-method.ts
  ```

  Expected: `updated 0 orders`, `candidates with tipAmount > 0 and no tipPaymentMethod: 0`.

📷 _Screenshot:_ terminal showing dry-run + live-run + idempotent re-run.

---

## Step 1 — AC1: Express create-order tip capture (cash tip on a card-paid order)

- [ ] Navigate to `/dashboard/orders/express/create-order`.
- [ ] Add a low-priced item to the cart (₦500–₦2000 to keep tip-to-bill ratio realistic for screenshot legibility).
- [ ] Click **Checkout**.
- [ ] Choose **Pay Now**.
- [ ] Click **POS** as the bill payment method.
- [ ] In the **Tip (optional)** row that appears beneath the payment method selector:
  - [ ] Enter `500` in the tip amount input.
  - [ ] Click the tip-method dropdown — it should default to **POS / Card** (mirrors the bill).
  - [ ] **Override** to **Cash**.
  - [ ] Verify the helper text reads "Tip recorded as cash regardless of bill payment method." (AC4).
- [ ] Submit. The order completes and you land on `/dashboard/orders`.

📷 _Screenshot:_ payment step with tip input + method override visible BEFORE submit.

📷 _Screenshot:_ post-submit toast / order confirmation.

**Expected:** Order persists `tipAmount = 500`, `tipPaymentMethod = 'cash'`, `paymentMethod = 'card'`. Verify in MongoDB:

```
db.orders.findOne({ _id: ObjectId("<from URL>") }, { tipAmount: 1, tipPaymentMethod: 1, paymentMethod: 1 })
```

---

## Step 2 — AC10: Express create-order without tip (regression)

- [ ] Navigate to `/dashboard/orders/express/create-order`.
- [ ] Add an item; checkout; Pay Now; choose Cash.
- [ ] **Leave tip input empty.** Submit.

📷 _Screenshot:_ payment step showing tip input empty.

**Expected:** Order persists `tipAmount = 0`, `tipPaymentMethod` is unset.

---

## Step 3 — AC3: Server rejects invalid tip combinations

This requires either a manual API call or relies on the service-level vitest tests already proving these paths. Either:

- [ ] Confirm the vitest run on `72b862c` shows `__tests__/services/order-service.tip.test.ts` 5/5 green (already verified — see `gates/vitest-summary.txt`), **OR**
- [ ] Send a hand-crafted request to `expressCreateOrderAction` via browser devtools with `tipAmount: 500, tipPaymentMethod: undefined`. Expect a `success: false` response.

**Expected (either path):** server-side validation rejects:

- `tipAmount > 0` without `tipPaymentMethod`.
- Negative `tipAmount`.
- `tipPaymentMethod` outside `cash | card | transfer`.

---

## Step 4 — AC2: Close-tab full payment with tip on the closing row

- [ ] Open `/dashboard/orders/tabs`. Click **Customer Wants to Pay** on an open tab (or create one first).
- [ ] In the dialog, choose **Full Payment — Close Tab**.
- [ ] Choose **Cash** as the payment type.
- [ ] Enter a receipt number (any valid ≥3-char string).
- [ ] In the **Tip (optional)** row, enter `200`.
- [ ] Click **Pay & Close Tab**.

📷 _Screenshot:_ dialog showing full-payment radio + cash + tip input populated.

📷 _Screenshot:_ post-close confirmation toast.

**Expected:** Tab is closed. The tab document now has:

- `partialPayments: [{ amount: <total>, paymentType: 'cash', tipAmount: 200, ... }]` (the closing payment as a partial-payment row, REQ-035 design).
- `tipAmount: 200` (recomputed by `pre('save')` hook to equal the sum of partial-payment tips).

Verify in MongoDB:

```
db.tabs.findOne({ _id: ObjectId("<tab id>") }, { tipAmount: 1, partialPayments: 1 })
```

---

## Step 5 — AC2 + AC11: Close-tab partial payment with own tip

- [ ] On a different open tab (or the next one), click **Customer Wants to Pay**.
- [ ] Choose **Partial Payment**.
- [ ] Enter an amount strictly less than the outstanding balance.
- [ ] Enter a note (mandatory).
- [ ] Choose **Card (POS)** as the partial payment type.
- [ ] In the **Tip (optional)** row, enter `100`.
- [ ] Click **Record Partial Payment**.
- [ ] Re-open the dialog (the tab is still open). Click **Customer Wants to Pay** again, choose **Full Payment — Close Tab**, type **Cash**, ref number, tip `50`. Submit.

**Expected:** Tab now has two partial-payment rows:

- Row 1: `{ amount: <partial>, paymentType: 'card', tipAmount: 100 }`
- Row 2: `{ amount: <closing>, paymentType: 'cash', tipAmount: 50 }`

Tab-level `tipAmount = 150`.

📷 _Screenshot:_ Tab detail page (or DB extract) showing both partial-payment rows + the derived tab-level tipAmount.

---

## Step 6 — AC7: Daily Financial Report shows Tips Received section

- [ ] Login as **super-admin** if not already.
- [ ] Navigate to `/dashboard/reports/daily`.
- [ ] Click **Today**.
- [ ] Wait for "Generating report..." to disappear.
- [ ] Scroll to the **Revenue by Payment Method** card grid.
- [ ] Immediately **beneath** it, verify the new **Tips Received** section is rendered.
  - Section heading reads `Tips Received` followed by the total (e.g. `₦850 total`).
  - Card grid shows per-method cards: **Cash tips**, **POS / Card tips**, **Transfer tips** (others appear only if non-zero).
  - Each card shows the per-method amount + a percentage of total tips.
  - Percentages should sum to ~100% (rounding allowance).

📷 _Screenshot:_ full Revenue + Tips section visible together.

**Expected per the steps above:**

- Cash tips ≥ ₦750 (₦500 from Step 1's override + ₦200 from Step 4 + ₦50 from Step 5).
- Card / POS tips ≥ ₦100 (Step 5's partial).

---

## Step 7 — AC6: Revenue figures unaffected by tips

- [ ] On the same Daily Report, note the **Total Revenue** card at the top of the page.
- [ ] Note the **Revenue by Payment Method** total (sum across method cards).
- [ ] Confirm Total Revenue **excludes** all tip amounts captured above.
- [ ] Run the same date through MongoDB: `db.orders.find({ businessDate: <today UTC> }).count()` and sum `total`. The aggregate should equal the Daily Report's Total Revenue. Tips, if any, should NOT be inside `Order.total` for express orders (they are stored on `tipAmount` separately).

📷 _Screenshot:_ both Revenue and Tips Received sections + a DB query result confirming AC6 invariant.

---

## Step 8 — AC8: Exports include the Tips block

- [ ] On the Daily Report page (with non-zero tips visible from Step 6), click **Export PDF**.
- [ ] Open the downloaded PDF. Scroll past Expenses Breakdown.
- [ ] Verify the **Tips Received by Method** table is present with the expected rows + a Total Tips row at the bottom.

- [ ] Click **Export Excel**. Open the workbook.
- [ ] Verify a **Tips** sheet exists alongside Summary / Revenue / Costs / Expenses sheets.

- [ ] Click **Export CSV**. Open the file.
- [ ] Verify the trailing rows include `Tips Received by Method` + per-method rows + `Total Tips,...,100.0%`.

📷 _Screenshot:_ each of PDF / Excel / CSV showing the tips block.

---

## Step 9 — AC9: Backfill idempotency on production-shape data

(Done in Step 0 already.) Sign-off:

- [ ] Backfill audit JSON saved.
- [ ] Idempotent re-run reports `0 orders updated`.

---

## Sign-off

- [ ] All ACs above verified end-to-end.
- [ ] Screenshots saved and attached to the META-COMPLY UAT release.
- [ ] Tester noted any deviations / outstanding issues below.

**Tester:** ********\_\_\_********
**Date:** ********\_\_\_********
**META-COMPLY UAT release:** v****\_\_\_****

### Issues found during UAT

(Capture below; if any, file as `compliance/defect-log.md` entries linked to REQ-035.)
