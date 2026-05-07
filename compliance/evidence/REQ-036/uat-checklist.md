# UAT Checklist — REQ-036

**Requirement:** REQ-036 — Quick-action tip-method parity + tip display on order surfaces (add-on to REQ-035)
**GitHub Issue:** [#77](https://github.com/metasession-dev/wawagardenbar-app/issues/77)
**Parent Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**UAT environment:** `https://wawagardenbar-app-uat.up.railway.app`
**Risk Level:** MEDIUM
**Date:** 2026-05-07
**Develop SHA under test:** `adb96cc` (Quality Gates green)

---

## Prerequisites

- [ ] Develop CI Quality Gates green on `adb96cc` (or a later commit). Upload Evidence transient HTTP 429 acceptable; doesn't gate UAT.
- [ ] UAT redeployed from develop and reachable.
- [ ] Login as **admin** for tab + express flows; **super-admin** for Daily Financial Report.
- [ ] At least one **open tab** exists on UAT for the close-tab walkthrough. If none exists, create one in step 0.

Capture as you go:

- [ ] Browser screenshot for each AC where indicated.
- [ ] Note the META-COMPLY UAT release version (`vYYYY.MM.DD.N`).

---

## Step 0 — No backfill required

REQ-036 is fully additive; legacy partial-payment rows fall back to `paymentType` for tip attribution. Skip directly to capture surface verification.

---

## Step 1 — AC1: Process Tab Payment > Full Payment with tip method override

- [ ] Navigate to `/dashboard/orders/tabs`. Click **Customer Wants to Pay** on an open tab.
- [ ] Choose **Full Payment — Close Tab**.
- [ ] Choose **Card (POS)** as the bill payment type.
- [ ] In the Tip (optional) row, enter `300` for amount and pick `Cash` from the new method dropdown.
- [ ] Helper text reads "Tip recorded as cash regardless of bill payment method."
- [ ] Click **Pay & Close Tab**.

📷 _Screenshot:_ dialog showing card bill + cash tip method override.

📷 _Screenshot:_ post-close confirmation toast.

---

## Step 2 — AC2: Process Tab Payment > Partial Payment with tip method override

- [ ] On a different open tab, click **Customer Wants to Pay**, choose **Partial Payment**.
- [ ] Enter an amount strictly less than outstanding, a note, and pick **Bank Transfer** as the partial payment type.
- [ ] In the Tip row, enter `100` and override the dropdown to **Card / POS**.
- [ ] Click **Record Partial Payment**.

📷 _Screenshot:_ partial-payment row with transfer bill + card tip method.

---

## Step 3 — AC3: Customer-checkout TipInputStep dropdown

- [ ] Navigate to the customer-side menu (with admin "Creating Order as Admin" badge or a customer login). Add an item to the cart, proceed to checkout.
- [ ] Walk to step 4 (Tip).
- [ ] Pick a 10% preset OR enter a custom amount.
- [ ] Verify the **Tip Payment Method** dropdown appears below the custom-amount input. Required when tipAmount > 0.
- [ ] Pick **Cash** from the dropdown.
- [ ] Walk to step 5 (Payment) and complete the order via gateway.

📷 _Screenshot:_ Tip step showing the new method dropdown.

📷 _Screenshot:_ next step (Payment) showing the gateway choice — verify the tip is preserved across step transition.

---

## Step 4 — AC5: Admin order detail Payment Info card

- [ ] Open `/dashboard/orders` and click into the order created in Step 1 (or any tipped order from Step 3).
- [ ] On the right-side Payment Information card, verify a "Tip" row appears beneath Amount, showing the tip amount + the via-method label (e.g. `₦300 via cash`).

📷 _Screenshot:_ Payment Info card with the tip row.

---

## Step 5 — AC6: Customer checkout OrderSummary tip line

- [ ] Repeat Step 3 but stop at the Tip step.
- [ ] On the right-side OrderSummary, verify a **Tip** line appears between Tax and Total when `tipAmount > 0`.
- [ ] Verify the **Total** updates to include the tip in the running total.

📷 _Screenshot:_ OrderSummary showing the running tip line.

---

## Step 6 — AC7: Tab detail Partial Payments History

- [ ] Open the tab detail page for the tab from Step 2 (still open since you only made a partial payment).
- [ ] Scroll to the Partial Payments card.
- [ ] Verify the row shows the bill amount + payment type badge AND, on a sub-line, `+ ₦{tipAmount} tip (via {method})`.

📷 _Screenshot:_ Partial Payments History with per-row tip + method.

---

## Step 7 — AC8: Daily Financial Report Tips Received attribution

- [ ] Login as **super-admin** if not already.
- [ ] Navigate to `/dashboard/reports/daily`.
- [ ] Click **Today**.
- [ ] Wait for "Generating report..." to disappear.
- [ ] Scroll to the **Tips Received** section.
- [ ] Verify the cash bucket includes the ₦300 from Step 1 (card-bill + cash-tip case). The card bucket should NOT include this ₦300.
- [ ] Verify the card bucket includes the ₦100 tip from Step 2 (transfer bill + card tip).

📷 _Screenshot:_ Tips Received cards with the correct attribution.

---

## Step 8 — AC9: Regression on zero-tip flows

- [ ] Repeat Step 1 but leave the tip input empty.
- [ ] Verify the dialog submits cleanly.
- [ ] Open the order detail — verify NO tip row appears on Payment Info.
- [ ] Open the Daily Report — verify the bill amount lands in `paymentBreakdown` correctly and the Tips Received section's totals are unchanged from before this test.

---

## Sign-off

- [ ] All ACs above verified end-to-end.
- [ ] Screenshots saved and attached to the META-COMPLY UAT release.
- [ ] Tester noted any deviations / outstanding issues below.

**Tester:** ********\_\_\_********
**Date:** ********\_\_\_********
**META-COMPLY UAT release:** v****\_\_\_****

### Issues found during UAT

(Capture below; if any, file as `compliance/defect-log.md` entries linked to REQ-036.)
