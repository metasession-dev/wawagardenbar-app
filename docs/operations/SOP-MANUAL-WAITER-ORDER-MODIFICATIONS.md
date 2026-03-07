# SOP: Handling Order Modifications and Cancellations

**Document ID:** SOP-MANUAL-WAITER-003
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Front of House / Service Staff
**Applies To:** Waiters, Servers, Floor Staff

---

## Purpose

This Standard Operating Procedure (SOP) provides step-by-step instructions for waiters to modify existing orders, cancel orders, and handle customer complaints related to orders using the Wawa Garden Bar ordering system.

---

## Scope

This SOP covers:
- Modifying order items (adding, removing, changing quantities, updating special instructions)
- Cancelling orders (full cancellation)
- Handling customer complaints about orders (wrong items, quality issues, missing items)
- Understanding the difference between voiding and cancelling an order
- Escalation procedures for situations requiring manager approval

---

## Prerequisites

- Access to the Wawa Garden Bar admin dashboard
- Valid admin or staff login credentials
- Understanding of order statuses and lifecycle
- Familiarity with SOP-MANUAL-WAITER-001 (Tab and Order Management)

### Order Status Reference

Orders follow this lifecycle:

**pending** → **confirmed** → **preparing** → **ready** → **delivered** → **completed**

An order may also be set to **cancelled** at permitted stages.

---

## Procedure

### Part 1: Modifying an Order

**When Modifications Are Allowed:**
- Order status is **pending** or **confirmed**
- Order has NOT been paid (payment status is not "paid")
- Order is NOT cancelled or completed
- If the order is on a tab, the tab must NOT be in "settling" status

**When Modifications Are NOT Allowed:**
- Order status is **preparing**, **ready**, **delivered**, or **completed**
- Order has already been paid
- Order has been cancelled

#### Step 1: Locate the Order

1. Log in to the admin dashboard at `/admin/login`
2. Navigate to **Dashboard → Orders** (`/dashboard/orders`)
3. Find the order using one of these methods:
   - Search by order number (e.g., "WGB-A1B2C3")
   - Search by customer name, email, or phone number
   - Filter by status (select "Pending" or "Confirmed")
   - If the order is on a tab, navigate to the tab details page and locate the order there

#### Step 2: Open Order Details

1. Click on the order number or select **"View Details"** from the order card dropdown menu
2. You will be taken to the order details page at `/dashboard/orders/[orderId]`
3. Verify the order status is **pending** or **confirmed** before proceeding

#### Step 3: Open the Edit Order Dialog

1. Click the **"Edit Order"** button on the order details page
2. The "Edit Order Items" dialog will appear
3. The dialog displays:
   - A dropdown to add new menu items
   - The current list of items with quantity controls
   - A running subtotal at the bottom

#### Adding Items to an Existing Order

1. In the "Add Item" dropdown at the top of the dialog, select the menu item to add
2. The item will appear in the order items list with a quantity of 1
3. If the item already exists in the order, its quantity will be incremented by 1 instead
4. Adjust the quantity if the customer wants more than one
5. Note: Only currently available menu items will appear in the dropdown

#### Removing Items from an Order

1. Locate the item to remove in the order items list
2. Click the **trash icon** (red delete button) to the right of the item
3. The item will be removed immediately from the list
4. **Important:** The order must contain at least one item. You cannot save an empty order.

#### Changing Quantities

1. Locate the item in the order items list
2. Use the **minus (-)** and **plus (+)** buttons on either side of the quantity field to adjust
3. Alternatively, type the desired quantity directly into the number field
4. Minimum quantity is 1. To remove an item entirely, use the trash icon instead.
5. The item line total and order subtotal will update automatically

#### Updating Special Instructions

1. Special instructions at the item level can be updated in the edit dialog
2. For order-level special instructions, update them on the order details page directly

#### Step 4: Review and Save Changes

1. Review the updated item list and subtotal at the bottom of the dialog
2. Note the message: "Service fees, delivery fees, and taxes will be recalculated automatically based on the new subtotal."
3. Click **"Save Changes"** to confirm the modifications
4. The system will:
   - Validate all menu items are still available
   - Recalculate item subtotals, service fees, tax, and order total
   - Update the order in the database
   - If the order is on a tab, automatically recalculate the tab totals
   - Refresh the order details page
5. A success toast notification will confirm the update

#### Step 5: Verify the Modification

**Success Indicators:**
- Toast notification: "Order updated successfully"
- Order details page reflects the new items, quantities, and totals
- If on a tab, the tab total has been updated accordingly

---

### Part 2: Cancelling an Order

#### When Cancellation Is Allowed

- Order status is **pending**, **confirmed**, **preparing**, or **ready**
- Order has NOT been paid (payment status is not "paid")
- Order is not already cancelled or completed
- If on a tab, the tab is NOT in "settling" status

#### When Cancellation Is NOT Allowed

- Order has been **completed** -- cannot be reversed
- Order has already been **cancelled**
- Order has been **paid** -- a refund must be processed instead (escalate to manager)
- Order is on a tab that is currently in **settling** status

**Important:** Only users with **admin** or **super-admin** roles can cancel orders.

#### Step 1: Locate the Order

1. Navigate to **Dashboard → Orders** (`/dashboard/orders`)
2. Find the order to cancel using search or filters
3. Click on the order to open the order details page

#### Step 2: Initiate Cancellation

1. On the order details page, click the **"Cancel Order"** button or select **"Cancel"** from the status dropdown
2. A cancellation confirmation dialog will appear

#### Step 3: Provide a Cancellation Reason

1. Enter a clear and specific reason for the cancellation
   - **Required:** A reason must be provided
   - Examples: "Customer changed their mind", "Item out of stock", "Duplicate order", "Customer left before order was served"
2. The reason will be recorded in the order's status history and audit log

#### Step 4: Confirm the Cancellation

1. Click **"Confirm Cancellation"** (or equivalent confirmation button)
2. The system will:
   - Set the order status to **cancelled**
   - Add a cancellation entry to the order's status history with the reason and timestamp
   - Restore inventory if stock had already been deducted for this order
   - Recalculate the tab totals if the order is part of a tab (cancelled orders are excluded from tab total calculations)
   - Create an audit log entry recording who cancelled the order, when, and why
   - Emit a real-time notification to the kitchen display

#### Step 5: Verify the Cancellation

**Success Indicators:**
- Toast notification: "Order cancelled successfully"
- Order status badge shows **"Cancelled"** (red)
- If on a tab, the tab total no longer includes the cancelled order amount
- Kitchen display no longer shows the cancelled order as active

#### Impact on Tab Totals

When an order on a tab is cancelled:
- The tab's subtotal, service fee, tax, and total are recalculated automatically
- Cancelled orders are **excluded** from the tab total calculation
- The tab remains open and other orders on the tab are unaffected
- The cancelled order still appears in the tab's order history but is marked as cancelled

#### Inventory Restoration

When an order is cancelled:
- If inventory had been deducted (the `inventoryDeducted` flag is true), stock quantities are automatically restored
- Each item's ingredients are returned to inventory based on the order quantities
- If inventory restoration fails for any reason, the cancellation still proceeds (inventory can be corrected manually)

---

### Part 3: Handling Customer Complaints About Orders

#### Scenario A: Wrong Item Received

1. Apologise to the customer immediately
2. Confirm which item was incorrect and what they originally ordered
3. Check the order details in the system to verify what was placed
4. If the order is still in **pending** or **confirmed** status:
   - Modify the order using the Edit Order dialog (see Part 1)
5. If the order is in **preparing**, **ready**, or **delivered** status:
   - Do NOT modify the existing order
   - Create a **new order** with the correct item(s) and add it to the customer's tab
   - Mark the new order with a note: "Replacement for incorrect item on order [order number]"
   - Escalate to the Floor Manager to determine whether the incorrect item should be charged
6. Notify the kitchen immediately about the correction

#### Scenario B: Quality Issues

1. Listen to the customer's concern and apologise
2. Remove the unsatisfactory item from the table
3. Escalate to the Floor Manager immediately
4. The Floor Manager will decide one of the following:
   - **Remake the item:** Create a new order for the replacement item, add to tab, mark as "Replacement - quality issue"
   - **Remove the charge:** If the order is still modifiable, remove the item. If not, the manager will arrange a discount or void at tab settlement.
   - **Offer an alternative:** Assist the customer in choosing a different menu item and place a new order
5. Document the complaint by adding a note to the original order using the "Add Note" feature

#### Scenario C: Missing Items

1. Check the order details in the system to confirm all items were included in the order
2. If the item was **not included** in the order (ordering error):
   - Add the missing item as a new order on the tab
   - Apologise for the oversight
3. If the item **was included** but not delivered:
   - Check with the kitchen on the status of the missing item
   - If the item is still being prepared, inform the customer of the expected wait time
   - If the item was lost or forgotten, escalate to kitchen staff for immediate re-preparation
4. Add a note to the order documenting the issue

#### Escalation Procedures

Escalate to the Floor Manager when:
- The customer requests a refund or discount
- The order has already been paid and needs adjustment
- Multiple items on the same order are incorrect
- The customer is dissatisfied after the initial resolution attempt
- A quality or food safety concern is raised
- The complaint involves an allergic reaction or dietary restriction violation (escalate immediately)

Escalate to the General Manager when:
- The Floor Manager is unavailable
- The customer demands to speak with senior management
- The situation involves potential health or safety issues
- A refund exceeding the order total is requested (e.g., compensation)

---

### Part 4: Void vs Cancel

In the Wawa Garden Bar system, the terms are used as follows:

| Action | Description | When to Use |
|--------|-------------|-------------|
| **Cancel** | Sets the order status to "cancelled". The order remains in the system with full history. Inventory is restored if it was deducted. Tab totals are recalculated. | Customer changed their mind, duplicate order, item unavailable, or order placed in error. |
| **Void** | Not a separate action in the system. Voiding is handled through the cancellation flow. | Use the cancellation procedure for all void scenarios. |

**Key points:**
- There is no separate "void" status in the system. All removals use the **cancellation** workflow.
- Cancelled orders are permanently recorded with their full history, reason, and audit trail.
- Cancelled orders cannot be "uncancelled." If the customer changes their mind again, create a new order.
- For paid orders that need to be reversed, a **refund** must be processed -- this is a separate procedure requiring manager authorisation.

---

## Quick Reference Checklist

### Modifying an Order
- [ ] Order status is pending or confirmed (not preparing, ready, delivered, completed, or cancelled)
- [ ] Order is not paid
- [ ] If on a tab, the tab is not in settling status
- [ ] Opened the Edit Order dialog from the order details page
- [ ] Added, removed, or adjusted item quantities as needed
- [ ] Order has at least one item remaining
- [ ] Reviewed the updated subtotal
- [ ] Clicked "Save Changes"
- [ ] Confirmed the success notification appeared
- [ ] Verified tab total updated (if applicable)

### Cancelling an Order
- [ ] You have admin or super-admin role access
- [ ] Order is not completed, already cancelled, or paid
- [ ] If on a tab, the tab is not in settling status
- [ ] Cancellation reason is prepared (required)
- [ ] Clicked "Cancel Order" on the order details page
- [ ] Entered the cancellation reason
- [ ] Confirmed the cancellation
- [ ] Verified the order status changed to "Cancelled"
- [ ] Verified tab total recalculated (if applicable)
- [ ] Notified the kitchen if the order was already in preparation

### Handling a Complaint
- [ ] Apologised to the customer
- [ ] Verified the order details in the system
- [ ] Determined the appropriate resolution (modify, replace, escalate)
- [ ] Documented the issue with a note on the order
- [ ] Escalated to Floor Manager if needed
- [ ] Followed up with the customer to confirm satisfaction

---

## Common Scenarios

### Scenario 1: Customer Wants to Add a Drink to a Pending Order
1. Open the order details page
2. Click "Edit Order"
3. Select the drink from the "Add Item" dropdown
4. Click "Save Changes"
5. Inform the customer of the updated total

### Scenario 2: Customer Wants to Remove an Item Before Kitchen Starts
1. Verify the order status is **pending** or **confirmed**
2. Open the Edit Order dialog
3. Click the trash icon next to the unwanted item
4. Click "Save Changes"
5. If on a tab, verify the tab total has decreased

### Scenario 3: Customer Wants to Cancel Their Entire Order
1. Open the order details page
2. Click "Cancel Order"
3. Enter the reason: "Customer requested full cancellation"
4. Confirm the cancellation
5. If on a tab with no remaining orders, discuss tab closure with the customer

### Scenario 4: Kitchen Has Already Started Preparing, but Customer Wants Changes
1. Check the order status -- if it is **preparing**, the Edit Order function is not available
2. Inform the customer that their order is already being prepared and cannot be modified
3. Offer alternatives:
   - Place a new additional order for any extra items they want
   - If they no longer want an item, escalate to the Floor Manager to determine next steps
4. Do NOT cancel a preparing order without Floor Manager approval

### Scenario 5: Customer Disputes the Amount on Their Tab
1. Navigate to the tab details page
2. Review all orders on the tab, including any cancelled orders
3. Verify each order's items and totals
4. If a discrepancy is found, use the Edit Order function on the affected order (if still modifiable) or escalate to the Floor Manager
5. Document the dispute with a note on the relevant order(s)

### Scenario 6: Duplicate Order Was Placed by Mistake
1. Identify the duplicate order
2. Cancel the duplicate: reason "Duplicate order - placed in error"
3. Verify the tab total reflects only the intended order
4. Inform the customer that the duplicate has been removed

---

## Troubleshooting

### Error: "Cannot edit paid orders"
**Solution:**
- The order has already been paid and cannot be modified
- If changes are needed, escalate to the Floor Manager to process a refund or credit

### Error: "Cannot edit cancelled or completed orders"
**Solution:**
- Cancelled and completed orders are final and cannot be modified
- If the customer needs the same items, create a new order instead

### Error: "Cannot cancel completed order"
**Solution:**
- Completed orders cannot be cancelled through the system
- Escalate to the Floor Manager for refund processing if needed

### Error: "Cannot cancel paid orders. Please process a refund instead."
**Solution:**
- Paid orders require a refund workflow, not cancellation
- Escalate to the Floor Manager or General Manager for refund authorisation

### Error: "Cannot cancel orders from tabs that are currently settling"
**Solution:**
- The tab is in the process of being settled (payment in progress)
- Wait for the settlement to complete, or ask the manager to reopen the tab before cancelling

### Error: "[Menu item name] is currently unavailable"
**Solution:**
- The item you are trying to add to the order has been marked as unavailable
- Inform the customer and suggest an alternative item
- If you believe the item should be available, check with the kitchen or manager

### Error: "Order must have at least one item"
**Solution:**
- You cannot save an order with zero items
- If the customer wants to remove all items, cancel the order entirely instead of removing each item

### Edit Order Button Not Visible or Disabled
**Solution:**
- Verify your role has permission (admin or super-admin)
- Check the order status -- editing is only available for pending/confirmed orders
- Ensure the order has not been paid
- Refresh the page and try again

---

## Important Reminders

1. **Audit Trail:** Every modification and cancellation is logged in the system audit trail. Your admin credentials are recorded alongside the action, timestamp, and details. Always provide accurate reasons for cancellations.
2. **Manager Approval:** Cancellation of orders in **preparing** or **ready** status should only be done with Floor Manager approval. The system allows it, but policy requires authorisation.
3. **Paid Orders:** Never attempt to cancel a paid order. The system will block it. Refunds require a separate procedure and manager authorisation.
4. **Tab Recalculation:** When modifying or cancelling an order on a tab, the tab totals are recalculated automatically. Always verify the tab total after making changes.
5. **Kitchen Communication:** If an order has been sent to the kitchen (status is confirmed or later), verbally notify the kitchen of any modifications or cancellations in addition to the system update.
6. **Inventory Impact:** Cancelled orders automatically restore deducted inventory. Do not manually adjust inventory for cancelled orders unless instructed by the system administrator.
7. **Customer Communication:** Always confirm changes with the customer before saving. Read back the updated order to avoid further errors.
8. **No Undo for Cancellations:** Once an order is cancelled, it cannot be reinstated. A new order must be created if the customer changes their mind.
9. **Real-Time Updates:** Order modifications and cancellations trigger real-time updates to the kitchen display via Socket.io. Kitchen staff will see changes immediately.
10. **Settling Tabs:** You cannot cancel orders on a tab that is in "settling" status. If cancellation is needed, the tab settlement must be paused or completed first.

---

## Related Procedures

- SOP-MANUAL-WAITER-001: Waiter Tab and Order Management
- SOP-MANUAL-WAITER-002: Closing Tabs and Processing Payments
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
