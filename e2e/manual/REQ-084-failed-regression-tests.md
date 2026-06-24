# Manual Test Scripts — REQ-084 Regression Failures

These scripts reproduce the 6 critical tests that failed in the full E2E regression run on `feat/REQ-084-checkout-separation` (run `28038466224`). Each script is a human-readable, step-by-step version of the corresponding Playwright spec.

All 6 failures share the same symptom: the **Pay ₦X,XXX** button (or the checkout flow that produces it) is not visible, suggesting the checkout-separation UI changes have moved or removed the payment submission button.

---

## Preconditions (common)

1. The dev server is running on `http://localhost:3000`.
2. MongoDB is running and the E2E seed scripts have been applied:
   ```bash
   npx tsx scripts/seed-e2e-admins.ts
   npx tsx scripts/seed-food-menu.ts
   npx tsx scripts/seed-drinks-menu.ts
   npx tsx scripts/seed-inventory.ts
   npx tsx scripts/seed-e2e-fixtures.ts
   ```
3. Environment variables are set:
   ```bash
   export MONGODB_URI=mongodb://localhost:27017
   export MONGODB_DB_NAME=wawagardenbar_test
   export ENABLE_E2E_PIN_INTERCEPT=true
   export NEXT_PUBLIC_API_URL=http://localhost:3000/api
   export NEXT_PUBLIC_APP_URL=http://localhost:3000
   export SESSION_PASSWORD=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
   ```
4. You are logged in as an admin (or use the saved `.auth/admin.json` state).

---

## Test 1 — Daily Report: Tab + Partial Payment (REQ-013)

**Spec:** `e2e/critical/daily-report-payments.spec.ts:103` — `create tab and add order`

**Goal:** Create a tab, add an order via the customer menu, attach it to the tab, and verify the order is added to the tab.

**Steps:**

1. Go to `/dashboard/orders`.
2. Click the **Open a New Tab** card.
3. In the dialog, enter a unique table number (e.g., `101`).
4. Click **Create Tab**.
5. Verify the browser redirects to `/dashboard/orders/tabs/<id>`.
6. Navigate to `/menu?tableNumber=101`.
7. Wait for the auth session to load (the menu page checks `isLoggedIn`).
8. Click the first in-stock menu item (not marked **Out of Stock**).
9. In the item detail modal, click **Add to Cart**.
10. Verify the cart sidebar opens and **Proceed to Checkout** is visible.
11. Click **Proceed to Checkout**.
12. Verify the browser redirects to `/checkout`.
13. Fill in customer details if empty:
    - Name: `E2E Test`
    - Email: `e2e@test.com`
    - Phone: `08099887766`
14. Click the first **Next** button.
15. On the order-type step, click **Next** again.
16. On the tab-options step, select the **Existing Tab** radio button (`#existing-tab`).
17. Click the submit button.

**Expected:** A success message containing `Order Added to Tab` is visible within 15 seconds.

**Actual failure in CI:** The test fails while waiting for the payment/confirmation flow; the `Pay ₦` button is not visible in related checkout flows.

---

## Test 2 — Dashboard Revenue: Express Order Paid with Cash

**Spec:** `e2e/critical/dashboard-revenue.spec.ts:159` — `create express order paid with cash`

**Goal:** Create an express standalone order, pay with cash, and verify the redirect back to the orders page.

**Steps:**

1. Capture the current daily report baseline by going to `/dashboard/reports/daily` and clicking **Today**.
2. Go to `/dashboard/orders/express/create-order`.
3. Wait for the category cascade to reveal the first menu card.
4. Click the first menu card.
5. Click the **Checkout** button.
6. Click the **Pay Now** button.
7. Verify **Cash** is the default payment method.
8. Verify the **Pay ₦X,XXX** button is visible and shows a positive amount.
9. Click the **Pay ₦X,XXX** button.

**Expected:** The browser redirects to `/dashboard/orders` within 15 seconds.

**Actual failure in CI:** `getByRole('button', { name: /Pay ₦/i })` is not visible within 5 seconds.

---

## Test 3 — Daily Report: Payment Method Cards Render

**Spec:** `e2e/critical/dashboard-revenue.spec.ts:219` — `payment method section renders with correct labels`

**Goal:** Verify that the daily report shows a **Revenue by Payment Method** section with the correct heading.

**Steps:**

1. Go to `/dashboard/reports/daily`.
2. Click **Today** to generate today's report.
3. Wait for the **Generating report...** spinner to disappear.
4. Look for the text **Revenue by Payment Method**.
5. Verify there is a heading with the exact text **Revenue by Payment Method**.

**Expected:** The heading is visible.

**Actual failure in CI:** The test fails because the preceding cash express-order test did not create a payment, so the report may not render the payment method section, or the heading is not found. Depends on Test 2 passing.

---

## Test 4 — Express Order Report: Cash Payment

**Spec:** `e2e/critical/express-order-report.spec.ts:129` — `create express order paid with cash`

**Goal:** Create an express standalone order paid with cash and verify the daily report reflects the cash payment.

**Steps:**

1. Capture the daily report baseline by going to `/dashboard/reports/daily` and clicking **Today**.
2. Go to `/dashboard/orders/express/create-order`.
3. Wait for the first menu card to appear.
4. Read the item price displayed on the card (e.g., `₦1,500`).
5. Click the menu card.
6. Click **Checkout**.
7. Click **Pay Now**.
8. Verify the **Cash** button is visible.
9. Verify the **Pay ₦X,XXX** button is visible and shows the same amount as the item price.
10. Click **Pay ₦X,XXX**.

**Expected:** Redirect to `/dashboard/orders` within 15 seconds. Later, the daily report's **Cash** column increases by at least the order amount.

**Actual failure in CI:** The **Pay ₦** button is not visible within 5 seconds.

---

## Test 5 — Express Order Tip Capture (REQ-035)

**Spec:** `e2e/critical/express-tip-capture.spec.ts:66` — `₦500 cash tip on a card-paid express order`

**Goal:** Create an express order, pay the bill with POS/card, but record a cash tip.

**Steps:**

1. Go to `/dashboard/orders/express/create-order`.
2. Wait for the first menu card to appear.
3. Click the first menu card.
4. Click **Checkout**.
5. Click **Pay Now**.
6. Select **POS** as the bill payment method.
7. Locate the **Tip Amount** input (`#tip-amount`).
8. Enter `500`.
9. Open the tip-method dropdown (the first combobox after the tip input).
10. Select **Cash** from the dropdown.
11. Verify the **Pay ₦X,XXX** button is visible.
12. Click **Pay ₦X,XXX**.

**Expected:** Redirect to `/dashboard/orders` within 15 seconds. The created order has `paymentMethod: card` and `tipPaymentMethod: cash` in the database.

**Actual failure in CI:** The **Pay ₦** button is not visible within 5 seconds.

---

## Test 6 — Orders Page: Reconciliation Checkbox (REQ-014)

**Spec:** `e2e/critical/reconciliation.spec.ts:143` — `standalone orders show reconciliation checkbox`

**Goal:** Create a standalone express order and verify the orders page shows a reconciliation checkbox for it.

**Steps:**

1. Go to `/dashboard/orders/express/create-order`.
2. Wait for the first menu card to appear.
3. Click the first menu card.
4. Verify the **Checkout** button is visible and click it.
5. Click **Pay Now**.
6. Select **Cash** as the payment method.
7. Verify the **Pay ₦X,XXX** button is visible.
8. Click **Pay ₦X,XXX**.
9. Wait for redirect to `/dashboard/orders`.
10. Locate the first order card (`[data-testid="order-card"]`).
11. Skip any cards that contain an **On Tab** link.
12. In the remaining standalone card, look for a checkbox with `aria-label` containing `reconciled`.

**Expected:** The reconciliation checkbox is visible.

**Actual failure in CI:** The **Pay ₦** button is not visible within 5 seconds, so the order is never created and the checkbox cannot be found.

---

## Common Failure Pattern

| Test | Expected UI element                 | Failure                                                             |
| ---- | ----------------------------------- | ------------------------------------------------------------------- |
| 1    | `Order Added to Tab` confirmation   | Checkout/tab-attach flow fails                                      |
| 2    | `Pay ₦` button                      | Button not visible                                                  |
| 3    | `Revenue by Payment Method` heading | Report does not render payment method section (dependent on Test 2) |
| 4    | `Pay ₦` button                      | Button not visible                                                  |
| 5    | `Pay ₦` button                      | Button not visible                                                  |
| 6    | `Pay ₦` button                      | Button not visible                                                  |

## Suggested Developer Action

1. Open `/dashboard/orders/express/create-order` in the browser.
2. Add an item to the cart and proceed through checkout.
3. Inspect the DOM at the payment step for the presence of a button with accessible text matching `/Pay ₦/i`.
4. If the button text or role changed during checkout-separation work, update the test locators **or** restore the previous button label so the existing tests pass.
5. If the button is intentionally removed, verify the new payment flow matches the REQ-084 design and update the critical tests accordingly.

## How to run the automated versions locally

```bash
# Single spec
npx playwright test e2e/critical/express-order-report.spec.ts --project=regression

# All 6 related specs
npx playwright test e2e/critical/daily-report-payments.spec.ts \
  e2e/critical/dashboard-revenue.spec.ts \
  e2e/critical/express-order-report.spec.ts \
  e2e/critical/express-tip-capture.spec.ts \
  e2e/critical/reconciliation.spec.ts \
  --project=regression
```

Run with the common environment variables listed above and `ENABLE_E2E_PIN_INTERCEPT=true` if customer login is involved.
