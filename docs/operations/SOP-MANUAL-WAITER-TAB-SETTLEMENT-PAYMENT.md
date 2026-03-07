# SOP: Tab Settlement and Payment Processing

**Document ID:** SOP-MANUAL-WAITER-002
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Front of House / Service Staff
**Applies To:** Waiters, Servers, Floor Staff, Cashiers

---

## Purpose

This Standard Operating Procedure (SOP) provides step-by-step instructions for settling tabs and processing customer payments using the Wawa Garden Bar ordering system. It covers all supported payment methods (Card, Bank Transfer, and Cash), tab closure, and handling common payment scenarios.

---

## Scope

This SOP covers:
- Reviewing a tab before initiating settlement
- Changing a tab status from "open" to "settling"
- Processing payments via Card (Monnify), Bank Transfer, or Cash
- Closing a tab after successful payment
- Handling split payments (if supported)
- Resolving common payment issues and disputes

---

## Prerequisites

- Access to the Wawa Garden Bar admin dashboard
- Valid admin or staff login credentials
- Familiarity with tab and order statuses
- Understanding of accepted payment methods and current pricing

---

## Procedure

### Part 1: Reviewing a Tab Before Settlement

**When to Use:** When a customer requests the bill or indicates they are ready to pay.

#### Step 1: Access the Tabs Dashboard
1. Log in to the admin dashboard at `/admin/login`
2. Navigate to **Dashboard --> Orders --> Tabs** (`/dashboard/orders/tabs`)

#### Step 2: Locate the Customer's Tab
1. Find the tab by searching for the **table number**, **customer name**, or **Tab ID**
2. Click on the tab to open the **Tab Details** page

#### Step 3: Verify All Orders Are Delivered or Completed
1. Review every order listed on the tab
2. Confirm each order has a status of **"Delivered"** or **"Completed"**
   - Order lifecycle: pending --> confirmed --> preparing --> ready --> delivered --> completed
3. If any orders are still in **"Pending"**, **"Confirmed"**, **"Preparing"**, or **"Ready"** status:
   - Inform the customer that outstanding orders are still being processed
   - Wait until all orders reach at least **"Delivered"** status before proceeding
   - Coordinate with kitchen staff if needed to expedite

#### Step 4: Check the Tab Total
1. Review the **tab total** displayed on the Tab Details page
2. Verify that the **service fee** has been automatically calculated and included
3. Confirm the total in **NGN (₦)** matches the sum of all orders plus the service fee
4. If the customer requests an itemised breakdown, walk them through each order on the tab

---

### Part 2: Initiating Tab Settlement

**When to Use:** Once all orders are delivered/completed and the customer confirms they are ready to pay.

#### Step 1: Change Tab Status to "Settling"
1. On the Tab Details page, click the **"Settle Tab"** button
2. The tab status will change from **"Open"** to **"Settling"**
3. This locks the tab, preventing any new orders from being added

#### Step 2: Confirm the Total with the Customer
1. Present the final total (including service fee) to the customer
2. Clearly state the amount in Naira (e.g., "Your total is ₦12,500.00")
3. Ask the customer for their preferred payment method:
   - Card Payment
   - Bank Transfer
   - Cash

**Important Notes:**
- Once the tab is in "Settling" status, no further orders can be added
- If the customer wants to add more items, you must return the tab to "Open" status first

---

### Part 3: Processing Payment

#### Option A: Card Payment (Monnify Integration)

**When to Use:** When the customer chooses to pay by card.

##### Step 1: Initiate Card Payment
1. Select **"Card Payment"** as the payment method
2. The system will initiate a payment request through the **Monnify** payment gateway

##### Step 2: Customer Completes Payment
1. The customer will be presented with the Monnify payment interface
2. The customer enters their card details or completes the transaction via their bank's authentication
3. Wait for the payment to be processed

##### Step 3: Confirm Payment Success
1. The system will display a **payment confirmation** once the transaction is successful
2. Verify that:
   - The amount paid matches the tab total
   - A transaction reference is generated
   - The payment status shows **"Successful"**
3. If payment fails, see the **Troubleshooting** section below

---

#### Option B: Bank Transfer

**When to Use:** When the customer prefers to pay via direct bank transfer.

##### Step 1: Initiate Bank Transfer Payment
1. Select **"Bank Transfer"** as the payment method
2. The system will generate or display the bank account details for the transfer

##### Step 2: Provide Transfer Details to Customer
1. Share the following with the customer:
   - **Bank Name**
   - **Account Number**
   - **Account Name**
   - **Exact Amount** (in ₦)
2. Ask the customer to include the **Tab ID** as the payment reference (if their bank supports it)

##### Step 3: Customer Completes Transfer
1. The customer initiates the transfer from their banking app or USSD
2. Wait for the transfer to be confirmed by the system
3. Monnify may automatically verify the transfer, or you may need to confirm receipt manually

##### Step 4: Confirm Payment Received
1. Verify the payment notification or confirmation in the system
2. Confirm the amount received matches the tab total
3. If the transfer is delayed, inform the customer and monitor the payment status

---

#### Option C: Cash Payment

**When to Use:** When the customer pays with physical cash.

##### Step 1: Collect Cash from Customer
1. Accept the cash payment from the customer
2. Count the cash carefully in front of the customer

##### Step 2: Verify the Amount
1. Confirm the amount received matches or exceeds the tab total
2. If the customer pays more than the total, calculate and provide the correct change

##### Step 3: Record Cash Payment
1. Select **"Cash"** as the payment method in the system
2. Enter the **amount received** from the customer
3. The system will record the cash payment against the tab

##### Step 4: Provide Change (If Applicable)
1. Calculate change: Amount Received - Tab Total = Change Due
2. Count out the change and hand it to the customer
3. Confirm the customer is satisfied with the amount returned

---

### Part 4: Closing the Tab

**When to Use:** After payment has been successfully processed regardless of payment method.

#### Step 1: Mark the Tab as Closed
1. Once payment is confirmed, click the **"Close Tab"** button on the Tab Details page
2. The tab status will change from **"Settling"** to **"Closed"**
3. The system will record:
   - Payment method used
   - Amount paid
   - Timestamp of closure
   - Staff member who closed the tab

#### Step 2: Print or Send Receipt (If Applicable)
1. If the customer requests a receipt:
   - Click the **"Print Receipt"** or **"Send Receipt"** option
   - For printed receipts, ensure the printer is connected and loaded with paper
   - For digital receipts, confirm the customer's email address and send
2. The receipt will include:
   - Tab ID
   - Itemised list of all orders
   - Service fee
   - Total amount paid
   - Payment method
   - Date and time

#### Step 3: Verify Tab Closure
**Success Indicators:**
- Tab status displays **"Closed"**
- Tab total shows as fully paid
- No outstanding balance remains
- The table is now free for a new tab

---

### Part 5: Handling Split Payments

**When to Use:** When multiple customers at the same table want to pay separately.

#### If Split Payment Is Supported:
1. On the payment screen, select the **"Split Payment"** option
2. Divide the tab total among the paying customers:
   - **Equal Split:** Divide the total evenly by the number of customers
   - **Custom Split:** Assign specific amounts or specific orders to each customer
3. Process each customer's payment individually using their preferred payment method (Card, Bank Transfer, or Cash)
4. Verify that the sum of all split payments equals the tab total
5. Once all portions are paid, close the tab as described in Part 4

#### If Split Payment Is Not Supported:
1. Inform the customer that the system requires a single payment for the tab
2. Suggest one customer pays the full amount, and they settle among themselves
3. Alternatively, process the full payment via one method and note any internal arrangements in the special instructions

---

## Quick Reference Checklist

### Before Settlement
- [ ] All orders on the tab are in "Delivered" or "Completed" status
- [ ] Tab total verified (including service fee)
- [ ] Itemised breakdown reviewed with customer (if requested)

### Initiating Settlement
- [ ] Tab status changed to "Settling"
- [ ] Final total communicated to customer in ₦
- [ ] Customer's preferred payment method confirmed

### Processing Payment
- [ ] Correct payment method selected in the system
- [ ] Payment amount matches tab total
- [ ] Payment confirmed as successful
- [ ] Transaction reference recorded (Card/Bank Transfer)
- [ ] Correct change given (Cash)

### Closing the Tab
- [ ] Tab status changed to "Closed"
- [ ] Receipt printed or sent (if requested)
- [ ] No outstanding balance on tab
- [ ] Table is free for new customers

---

## Common Scenarios

### Scenario 1: Customer Disputes the Total
1. Open the Tab Details page and review the itemised list of orders
2. Walk through each order with the customer
3. Verify the service fee calculation
4. If an error is found, correct the order(s) before proceeding with settlement
5. If the total is accurate, explain each charge clearly and politely
6. Escalate to the Floor Manager if the dispute cannot be resolved

### Scenario 2: Payment Fails (Card or Bank Transfer)
1. Inform the customer that the payment did not go through
2. Ask the customer to verify their card details or account balance
3. Suggest trying again or switching to an alternative payment method
4. If the issue persists, offer Cash as a fallback option
5. Do NOT close the tab until payment is successfully confirmed
6. The tab remains in "Settling" status until payment is resolved

### Scenario 3: Customer Wants a Receipt
1. After closing the tab, navigate to the Tab Details page
2. Click **"Print Receipt"** for a physical copy or **"Send Receipt"** for a digital copy
3. If sending digitally, confirm the customer's email address
4. Verify the receipt includes all orders, service fee, and payment details

### Scenario 4: Partial Payment or Shortfall
1. If the customer cannot pay the full amount:
   - Do NOT close the tab
   - Record the partial payment amount received
   - Note the outstanding balance
   - Escalate to the Floor Manager immediately
2. The tab should remain in "Settling" status until the full amount is collected
3. Document the situation including customer details and amount outstanding

### Scenario 5: Customer Leaves Without Paying
1. Immediately alert the Floor Manager
2. Keep the tab in "Settling" status
3. Record the customer's details (name, table number, any available contact information)
4. Follow the venue's internal policy for unpaid tabs
5. Do NOT close the tab without manager approval

---

## Troubleshooting

### Error: Card Payment Declined
**Solution:**
- Ask the customer to check their card or try a different card
- Verify that the payment amount is correct
- Suggest an alternative payment method (Bank Transfer or Cash)
- If the Monnify gateway is unresponsive, contact technical support

### Error: Bank Transfer Not Confirmed
**Solution:**
- Ask the customer to show proof of transfer (screenshot or bank notification)
- Check the system for pending payment notifications
- Allow up to a few minutes for the transfer to be confirmed
- If the transfer is not reflected after a reasonable time, contact technical support
- Do NOT close the tab until payment is verified

### Error: Tab Cannot Be Moved to "Settling"
**Solution:**
- Check if there are orders still in "Pending", "Confirmed", "Preparing", or "Ready" status
- Ensure all orders are at least "Delivered" before settling
- Refresh the page and try again
- Contact technical support if the issue persists

### Error: Tab Cannot Be Closed
**Solution:**
- Verify that a payment has been recorded against the tab
- Ensure the payment amount matches the tab total
- Check that the tab is in "Settling" status (not "Open")
- Contact technical support if the system does not allow closure

### System or Network Issue During Payment
**Solution:**
- Do NOT assume payment was successful without confirmation
- Ask the customer to wait while the system recovers
- Check the Monnify dashboard or bank records for the transaction status
- If the system is down, record the payment details manually and update the system when it is restored
- Contact technical support immediately

---

## Important Reminders

1. **Verify Before Settling:** Always ensure all orders are delivered or completed before initiating settlement
2. **Service Fee:** The service fee is automatically calculated -- do not manually adjust it unless authorised by a manager
3. **No New Orders While Settling:** Once a tab is in "Settling" status, no new orders can be added
4. **Payment Confirmation Required:** Never close a tab without confirmed payment
5. **Cash Handling:** Always count cash in front of the customer and provide accurate change
6. **Receipts:** Always offer a receipt to the customer, whether printed or digital
7. **Escalate Disputes:** If a customer disputes the total and you cannot resolve it, escalate to the Floor Manager immediately
8. **Tab Status Flow:** Open --> Settling --> Closed -- never skip a step
9. **Currency:** All amounts are in Nigerian Naira (₦ / NGN)
10. **Security:** Never share Monnify gateway credentials or internal payment details with customers

---

## Related Procedures

- SOP-MANUAL-WAITER-001: Waiter Tab and Order Management
- SOP-MANUAL-WAITER-003: Handling Order Modifications and Cancellations
- SOP-MANUAL-KITCHEN-001: Order Preparation and Status Updates

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 7, 2026 | System Administrator | Initial release |

---

## Approval

**Prepared by:** Operations Team
**Reviewed by:** Front of House Manager
**Approved by:** General Manager

---

**For questions or clarification, contact:**
- Front of House Manager
- Technical Support: support@wawagardenbar.com
