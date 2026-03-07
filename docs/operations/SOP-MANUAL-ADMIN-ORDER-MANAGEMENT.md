# SOP-MANUAL-ADMIN-001: Order Queue Management

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| **Document ID**    | SOP-MANUAL-ADMIN-001                              |
| **Title**          | Order Queue Management                     |
| **Version**        | 1.0                                        |
| **Effective Date** | March 7, 2026                              |
| **Department**     | Operations / Management                    |
| **Applies To**     | Admin, Super-Admin                         |
| **Status**         | Active                                     |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Prerequisites](#2-prerequisites)
3. [Procedure](#3-procedure)
   - [Part 1: Monitoring the Order Queue](#part-1-monitoring-the-order-queue)
   - [Part 2: Processing Orders](#part-2-processing-orders)
   - [Part 3: Managing Order Issues](#part-3-managing-order-issues)
   - [Part 4: Tab Oversight](#part-4-tab-oversight)
   - [Part 5: Using Quick Actions](#part-5-using-quick-actions)
   - [Part 6: Order Analytics (Super-Admin)](#part-6-order-analytics-super-admin)
4. [Quick Reference](#4-quick-reference)
5. [Common Scenarios](#5-common-scenarios)
6. [Troubleshooting](#6-troubleshooting)
7. [Related Procedures](#7-related-procedures)
8. [Revision History and Approval](#8-revision-history-and-approval)

---

## 1. Purpose and Scope

### 1.1 Purpose

This Standard Operating Procedure defines the steps and responsibilities for managing the order queue within the Wawa Garden Bar admin dashboard. It ensures that all incoming orders are monitored, processed, and fulfilled in a timely and consistent manner, that issues are handled according to established protocols, and that all administrative actions are properly recorded in the audit trail.

### 1.2 Scope

This SOP applies to:

- All staff members with the **Admin** role (with `orderManagement` permission granted by default).
- All staff members with the **Super-Admin** role (full system access).

This SOP covers the following activities:

- Monitoring and filtering the order queue at `/dashboard/orders`.
- Processing orders through their lifecycle: `pending`, `confirmed`, `preparing`, `ready`, `delivered`, `completed`.
- Managing order issues including delays, cancellations, and price overrides.
- Overseeing tab management at `/dashboard/orders/tabs`.
- Using quick actions to create manual orders and tabs.
- Reviewing order analytics (Super-Admin only) at `/dashboard/orders/analytics`.

This SOP does not cover:

- Kitchen Display System operations (see related SOP for kitchen staff at `/dashboard/kitchen`).
- Customer-facing order placement.
- Payment gateway configuration or refund processing at the provider level.

---

## 2. Prerequisites

### 2.1 Access Requirements

| Requirement            | Detail                                                        |
|------------------------|---------------------------------------------------------------|
| Valid admin account     | Must have an active account with `admin` or `super-admin` role |
| `orderManagement` permission | Granted by default to the Admin role                    |
| Network access         | Active connection to the application server                   |
| Supported browser      | Modern browser with JavaScript and WebSocket support enabled  |

### 2.2 Authentication

1. Navigate to the application login page.
2. Authenticate with valid admin credentials.
3. Verify that the session is active (session is managed via iron-session).
4. Confirm access to the dashboard by navigating to `/dashboard/orders`.

### 2.3 Real-Time Connection

The order queue relies on **Socket.IO** for real-time updates. After logging in:

- Verify that the real-time connection indicator is active.
- If the connection drops, the page will continue to function but will not receive live updates until the connection is re-established.
- Use the **Refresh** button in the Order Queue header to manually reload data if the real-time connection is interrupted.

---

## 3. Procedure

### Part 1: Monitoring the Order Queue

#### 3.1.1 Accessing the Orders Dashboard

1. Log in with admin or super-admin credentials.
2. Navigate to `/dashboard/orders`.
3. The page displays the following sections from top to bottom:
   - **Navigation cards** -- Tabs Display, Kitchen Display, and Analytics (Super-Admin only).
   - **Quick Actions** -- Open a Order, Open a New Tab, Add to Existing Tab, Inventory Summary.
   - **Order Statistics cards** -- Total Orders, Pending, Preparing, Completed.
   - **Order Queue** -- The primary list of all orders with filtering and search.

#### 3.1.2 Understanding Order Statuses and Visual Indicators

Each order card displays a colored status dot and a status badge. The mapping is as follows:

| Status        | Dot Color | Badge Style   | Meaning                                       |
|---------------|-----------|---------------|-----------------------------------------------|
| `pending`     | Yellow    | Secondary     | New order awaiting admin acknowledgment        |
| `confirmed`   | Cyan      | Default       | Order acknowledged, not yet sent to kitchen    |
| `preparing`   | Blue      | Default       | Kitchen is actively preparing the order        |
| `ready`       | Green     | Default       | Order is ready for pickup or delivery          |
| `completed`   | Gray      | Outline       | Order has been fulfilled and closed            |
| `cancelled`   | Red       | Destructive   | Order has been cancelled                       |

Additional visual indicators:

- **Yellow border on statistics card**: Appears when pending orders exceed 5, signaling a backlog.
- **Table number**: Shown on dine-in orders (e.g., "Table 4").
- **Tab link**: Displayed when the order is attached to an open tab, with a receipt icon and "On Tab" label linking to the tab detail page.
- **Pickup countdown**: For pickup orders, displays the scheduled pickup time and a live countdown (e.g., "15 min left" in green, or "5 min overdue" in red).

#### 3.1.3 Filtering and Searching Orders

**Status tabs** across the top of the Order Queue provide quick filtering:

| Tab        | Shows                                                      |
|------------|-------------------------------------------------------------|
| All        | Every order in the system                                   |
| Active     | Orders with status `pending`, `confirmed`, `preparing`, or `ready` |
| Pending    | Only `pending` orders                                       |
| Confirmed  | Only `confirmed` orders                                     |
| Preparing  | Only `preparing` orders                                     |
| Ready      | Only `ready` orders                                         |
| Completed  | Only `completed` orders                                     |

Each tab displays a count of matching orders in parentheses.

**Search bar**: Located above the filter controls. Searches across:

- Order number
- Customer name
- Customer email
- Customer phone number

**Advanced filters** (via the OrderFilters component):

- **Status**: Multi-select from all order statuses.
- **Order type**: Filter by `dine-in`, `pickup`, `delivery`, or `pay-now`.
- **Payment status**: Filter by `pending`, `paid`, `failed`, `cancelled`, or `refunded`.
- **Date range**: Select a start and/or end date to narrow results.

**Batch selection**: Each order card includes a checkbox. Select multiple orders to perform batch actions (batch status update or batch cancellation) via the toolbar that appears at the bottom of the queue.

**Export**: Use the Export button (top-right of the Order Queue header) to export the currently filtered order list.

---

### Part 2: Processing Orders

#### 3.2.1 Reviewing Order Details

From the Order Queue, click on the **order number** link to open the order detail page at `/dashboard/orders/{orderId}`. The detail page displays:

- Order number and current status.
- Customer information (name, email, phone).
- Order type and associated details:
  - **Dine-in**: Table number, QR code scan status.
  - **Pickup**: Preferred pickup time, actual pickup time.
  - **Delivery**: Full delivery address, delivery instructions, estimated/actual delivery time.
- Itemized list showing: item name, quantity, portion size (full/half/quarter), customizations, special instructions, and subtotal.
- Financial summary: subtotal, tax, delivery fee, discount, tip, and total (displayed in NGN / naira).
- Payment status and payment reference.
- Status history timeline with timestamps and notes.
- Preparation tracking: preparation start time, estimated completion time.
- Inventory deduction status.

The **Actions sidebar** on the detail page provides contextual action buttons (see Section 3.2.2 through 3.2.4).

#### 3.2.2 Confirming Pending Orders

When a new order arrives with `pending` status:

1. Review the order details to verify items, customer information, and any special instructions.
2. On the order card in the queue, click **"Start Preparing"** to advance the order directly to `preparing` status.
   - Alternatively, open the order detail page and click **"Start Preparing"** in the Actions sidebar.
3. The system will:
   - Update the order status to `preparing`.
   - Record the `preparationStartedAt` timestamp.
   - Add an entry to the status history.
   - Create an audit log entry with the admin's user ID, email, and role.
   - Emit a Socket.IO event to notify connected clients (including the Kitchen Display and the customer's order tracker).

**Valid status transitions from `pending`**:

| Target Status  | Action                  |
|----------------|-------------------------|
| `preparing`    | Start Preparing button  |
| `cancelled`    | Cancel Order button     |

**Valid status transitions from `confirmed`**:

| Target Status  | Action                  |
|----------------|-------------------------|
| `preparing`    | Start Preparing button  |
| `cancelled`    | Cancel Order button     |

#### 3.2.3 Monitoring Preparation Progress

Once an order is in `preparing` status:

1. Monitor the order in the Order Queue under the "Preparing" tab.
2. Coordinate with kitchen staff via the Kitchen Display at `/dashboard/kitchen`.
3. When the kitchen reports the order is ready, click **"Mark Ready"** on the order card or in the Actions sidebar.
4. The system will update the status to `ready` and emit real-time notifications.

**Valid status transitions from `preparing`**:

| Target Status  | Action               |
|----------------|-----------------------|
| `ready`        | Mark Ready button     |
| `cancelled`    | Cancel Order button   |

#### 3.2.4 Marking Orders as Delivered / Completed

When an order with `ready` status has been handed to the customer:

1. Click **"Complete"** on the order card, or click **"Complete Order"** in the Actions sidebar on the detail page.
2. The system will:
   - Update the status to `completed`.
   - Trigger inventory deduction for all items in the order (if not already deducted).
   - Add a status history entry.
   - Create an audit log entry.
   - Emit a Socket.IO event.

**Valid status transitions from `ready`**:

| Target Status  | Action                |
|----------------|-----------------------|
| `completed`    | Complete Order button |
| `cancelled`    | Cancel Order button   |

**Note**: `completed` and `cancelled` are terminal states. No further transitions are possible once an order reaches either state.

---

### Part 3: Managing Order Issues

#### 3.3.1 Handling Delayed Orders

1. Monitor the **Pending** statistics card. If the count exceeds 5, the card border turns yellow as a visual alert.
2. Check the "Active" tab for orders that have been in `pending` or `preparing` status for an extended period.
3. Review the order creation timestamp shown at the bottom of each order card (displayed as relative time, e.g., "15 minutes ago").
4. For pickup orders, check the pickup countdown timer. Overdue pickups are displayed in red text.
5. Take corrective action:
   - Add a note to the order via the **"Add Note"** button in the Actions sidebar, documenting the delay and reason.
   - Contact the customer using the **"Contact Customer"** dropdown (email or phone) in the Actions sidebar.
   - Escalate to the kitchen (see Section 3.3.3).

#### 3.3.2 Processing Manual Price Overrides (with Audit Trail)

When a price override is required (e.g., manager discount, error correction):

1. Open the order detail page.
2. Click **"Edit Order Items"** in the Actions sidebar (available only for unpaid, non-cancelled, non-completed orders).
3. Modify the item price as needed in the Edit Order dialog.
4. The system records the following override fields on each affected item:
   - `priceOverridden`: set to `true`.
   - `originalPrice`: the original item price before override.
   - `priceOverrideReason`: the reason for the override.
   - `priceOverriddenBy`: the admin's user ID.
   - `priceOverriddenAt`: the timestamp of the override.
5. An audit log entry is created capturing the admin's identity, the action, and the details of the change.

**Important**: All price overrides are permanently recorded and cannot be retroactively removed from the audit trail.

#### 3.3.3 Escalating to Kitchen

1. From the Orders Dashboard, click the **Kitchen Display** card to navigate to `/dashboard/kitchen`.
2. The Kitchen Display shows orders in a grid layout with `kitchen-order-card` components, prioritized by status and creation time.
3. Communicate urgency by:
   - Adding a note to the order (the note is visible in the status history).
   - Setting kitchen priority if available (`normal` or `urgent`).
4. Return to `/dashboard/orders` to continue monitoring.

#### 3.3.4 Cancelling Orders

1. On the order card dropdown or in the Actions sidebar, click **"Cancel Order"**.
2. A cancellation dialog will prompt for a **reason** (required).
3. Enter the cancellation reason and confirm.
4. The system will:
   - Verify the order is not already `completed` or `cancelled`.
   - Verify the order has not been paid (paid orders cannot be cancelled; a refund must be processed instead).
   - Verify the order is not part of a tab in `settling` status.
   - Set the order status to `cancelled`.
   - Restore inventory if it was previously deducted.
   - Recalculate tab totals if the order was part of a tab.
   - Create an audit log entry with the cancellation reason.
   - Emit a Socket.IO cancellation event.

---

### Part 4: Tab Oversight

#### 3.4.1 Viewing Open Tabs

1. From the Orders Dashboard, click the **Tabs Display** card, or navigate directly to `/dashboard/orders/tabs`.
2. The Tabs Management page displays all open tabs with the following details:
   - Tab number
   - Table number
   - Tab status (e.g., `open`, `settling`)
   - Number of associated orders
   - Financial summary: subtotal, service fee, tax, delivery fee, discount total, tip amount, and total (in NGN)
   - Opened-at timestamp
   - Payment status

3. Use the `DashboardTabsListClient` component's filtering controls to search and filter tabs.

#### 3.4.2 Monitoring Tab Totals

Each tab card shows a running total in naira. The totals are recalculated automatically when:

- A new order is added to the tab.
- An order on the tab is cancelled (the tab total is reduced accordingly).
- An order's items or prices are modified.

To view detailed tab information, click on a tab to navigate to `/dashboard/orders/tabs/{tabId}`.

#### 3.4.3 Overseeing Tab Settlements

1. When a customer is ready to pay, the tab enters `settling` status.
2. During settlement:
   - Orders on the tab **cannot** be cancelled.
   - Payment is processed through the tab checkout at `/dashboard/orders/tabs/{tabId}/checkout`.
3. Once payment is confirmed, the tab is closed and all associated orders are updated accordingly.
4. If settlement needs to be aborted, the tab can be reopened to allow further modifications.

---

### Part 5: Using Quick Actions

The **Quick Actions** section on the Orders Dashboard provides four shortcuts:

#### 3.5.1 Creating Manual Orders ("Open a Order")

1. Click **"Open a Order"** in the Quick Actions section.
2. This navigates to `/menu`, where you can browse the menu and build an order on behalf of a customer.
3. Select items, specify portion sizes (full, half, or quarter), add customizations, and enter special instructions.
4. Complete the order. The system records:
   - `createdBy`: the admin's user ID.
   - `createdByRole`: `admin` or `super-admin`.
5. The order appears in the Order Queue immediately via real-time update.

#### 3.5.2 Creating Tabs from Admin Side ("Open a New Tab")

1. Click **"Open a New Tab"** in the Quick Actions section.
2. A `CreateTabDialog` opens.
3. Enter the **table number** for the new tab.
   - A tab cannot be created for a table that already has an active tab.
4. Confirm to create the tab.
5. The new tab appears on the Tabs Management page.

#### 3.5.3 Adding to an Existing Tab

1. Click **"Add to Existing Tab"** in the Quick Actions section.
2. This navigates to `/dashboard/orders/tabs` where you can select an open tab.
3. From the tab detail page, add new orders to the selected tab.

#### 3.5.4 Inventory Summary

1. Click **"Inventory Summary"** in the Quick Actions section.
2. This navigates to `/dashboard/orders/inventory-summary` for reviewing and adjusting daily inventory counts.

---

### Part 6: Order Analytics (Super-Admin)

**Access restriction**: This section is available only to users with the `super-admin` role. The system enforces this via `requireSuperAdmin()` middleware.

#### 3.6.1 Accessing Analytics

1. From the Orders Dashboard, the **Analytics** card (with green top border) is visible only to super-admin users.
2. Click the card to navigate to `/dashboard/orders/analytics`.
3. The analytics page provides comprehensive insights and performance metrics via the `OrderAnalytics` component.

#### 3.6.2 Reviewing Order Patterns

The analytics dashboard provides:

- **Summary cards**: Key performance indicators across four metric categories.
- **Sales performance**: Revenue totals and trends.
- **Order volume trends**: Patterns by time of day, day of week, and seasonal variations.
- **Order type distribution**: Breakdown across dine-in, pickup, delivery, and pay-now.
- **Completion rates**: Ratio of completed vs. cancelled orders.

Use the **"Back to Orders"** button to return to the main orders dashboard.

---

## 4. Quick Reference

### Order Status Lifecycle

```
pending --> confirmed --> preparing --> ready --> delivered --> completed
   |            |            |           |
   v            v            v           v
cancelled   cancelled    cancelled   cancelled
```

### Valid Status Transitions (System-Enforced)

| Current Status | Allowed Transitions       |
|----------------|---------------------------|
| `pending`      | `preparing`, `cancelled`  |
| `confirmed`    | `preparing`, `cancelled`  |
| `preparing`    | `ready`, `cancelled`      |
| `ready`        | `completed`, `cancelled`  |
| `completed`    | (none -- terminal state)  |
| `cancelled`    | (none -- terminal state)  |

### Order Types

| Type       | Key Details                                           |
|------------|-------------------------------------------------------|
| `dine-in`  | Table number required; QR code scan tracked           |
| `pickup`   | Preferred pickup time; live countdown on order card    |
| `delivery` | Full address; delivery instructions; delivery fee     |
| `pay-now`  | Immediate payment at point of order                   |

### Portion Sizes

| Size      | Multiplier |
|-----------|------------|
| `full`    | 1x         |
| `half`    | 1/2x       |
| `quarter` | 1/4x       |

### Payment Methods

`card`, `transfer`, `ussd`, `phone`, `cash`

### Payment Statuses

`pending`, `paid`, `failed`, `cancelled`, `refunded`

### Key Dashboard Routes

| Route                                    | Purpose                        | Access            |
|------------------------------------------|--------------------------------|-------------------|
| `/dashboard/orders`                      | Main order queue               | Admin, Super-Admin |
| `/dashboard/orders/{orderId}`            | Order detail and actions       | Admin, Super-Admin |
| `/dashboard/orders/tabs`                 | Tab management                 | Admin, Super-Admin |
| `/dashboard/orders/tabs/{tabId}`         | Tab detail                     | Admin, Super-Admin |
| `/dashboard/orders/tabs/{tabId}/checkout`| Tab checkout                   | Admin, Super-Admin |
| `/dashboard/orders/analytics`            | Order analytics                | Super-Admin only   |
| `/dashboard/orders/inventory-summary`    | Daily inventory summary        | Admin, Super-Admin |
| `/dashboard/orders/inventory-updates`    | Inventory update log           | Admin, Super-Admin |
| `/dashboard/kitchen`                     | Kitchen Display System         | Admin, Super-Admin, Kitchen Staff |

---

## 5. Common Scenarios

### Scenario 1: New Dine-In Order Arrives

1. A notification appears in the Order Queue (real-time via Socket.IO).
2. The Pending count on the statistics card increments.
3. Locate the order in the queue under the "Pending" tab.
4. Verify the table number and order items.
5. Click **"Start Preparing"** to send to kitchen.
6. Monitor under the "Preparing" tab.
7. When the kitchen marks the order ready, click **"Complete"** after serving.

### Scenario 2: Pickup Order with Approaching Deadline

1. A pickup order shows a countdown in green (e.g., "10 min left").
2. If the countdown turns red (overdue), check the "Preparing" tab for the order's status.
3. If still preparing, navigate to `/dashboard/kitchen` and verify progress.
4. Add a note to the order documenting the delay.
5. Use **"Contact Customer"** to notify the customer if a significant delay is expected.

### Scenario 3: Customer Requests Order Cancellation

1. Locate the order in the queue.
2. Verify the order has **not** been paid. If paid, inform the customer that a refund must be processed instead.
3. Verify the order is not on a tab that is currently settling.
4. Click **"Cancel Order"** and enter the reason (e.g., "Customer requested cancellation").
5. The system restores inventory and updates tab totals if applicable.

### Scenario 4: Opening a Tab for a Walk-In Table

1. On the Orders Dashboard, click **"Open a New Tab"** in Quick Actions.
2. Enter the table number in the dialog.
3. If the table already has an active tab, the system will reject the request.
4. Once the tab is created, navigate to the menu to add orders to the tab.

### Scenario 5: Batch Processing End-of-Day Orders

1. In the Order Queue, use the status filter to show only `ready` orders.
2. Select all orders using the checkboxes.
3. Use the batch actions toolbar to mark all selected orders as `completed`.
4. An audit log entry is created for the batch operation, recording all affected order IDs.

### Scenario 6: Processing Payment for an Order

1. Open the order detail page.
2. In the Actions sidebar, click **"Process Payment"** (available only for unpaid, non-cancelled orders).
3. The `AdminPayOrderDialog` opens.
4. Enter the payment details (method: card, transfer, USSD, phone, or cash).
5. Confirm payment. The order's payment status updates to `paid`.

---

## 6. Troubleshooting

### 6.1 Order Queue Not Updating in Real-Time

**Symptom**: New orders are not appearing automatically.

**Resolution**:
1. Check the browser console for WebSocket connection errors.
2. Click the **Refresh** button in the Order Queue header to force a manual reload.
3. Verify that the Socket.IO server is running and accessible.
4. Clear the browser cache and reload the page.
5. If the issue persists, log out and log back in to re-establish the session.

### 6.2 Cannot Transition Order Status

**Symptom**: Clicking a status transition button results in an error message such as "Cannot transition from [status] to [status]".

**Resolution**:
1. The system enforces a strict state machine. Refer to the Valid Status Transitions table in Section 4.
2. Verify the current order status matches your expectation by refreshing the page.
3. If the order was updated by another admin or via the kitchen display, the local view may be stale.

### 6.3 Cannot Cancel a Paid Order

**Symptom**: Error message "Cannot cancel paid orders. Please process a refund instead."

**Resolution**:
1. Paid orders cannot be directly cancelled.
2. Process a refund through the payment management system first.
3. After the refund is processed, the payment status will update to `refunded`.

### 6.4 Cannot Cancel Order on a Settling Tab

**Symptom**: The Cancel Order button is disabled, with a message "Cannot cancel orders from tabs in settling status".

**Resolution**:
1. The tab is currently undergoing payment settlement.
2. Wait for the settlement to complete, or reopen the tab to allow modifications.
3. Once the tab is no longer in `settling` status, the cancellation option becomes available.

### 6.5 Statistics Cards Showing Unexpected Counts

**Symptom**: The order count on statistics cards does not match the filtered queue.

**Resolution**:
1. Statistics cards show counts across all orders (not limited to the current filter).
2. The Pending card counts both `pending` and `confirmed` orders.
3. Click the **Refresh** button to reload current data.

### 6.6 Inventory Not Deducted After Completion

**Symptom**: Order shows `completed` but inventory was not deducted.

**Resolution**:
1. The system attempts inventory deduction upon order completion. If it fails, the order status still updates to `completed`.
2. Check the order detail page for the `inventoryDeducted` field.
3. If `false`, manually trigger inventory deduction or notify the inventory manager.
4. Review server logs for inventory deduction errors.

---

## 7. Related Procedures

| Document ID     | Title                              | Description                                    |
|-----------------|------------------------------------|------------------------------------------------|
| (Planned)       | Kitchen Display Operations         | SOP for kitchen staff using `/dashboard/kitchen` |
| (Planned)       | Tab Settlement and Payment         | Detailed procedures for tab checkout flows      |
| (Planned)       | Inventory Management               | SOP for stock tracking and adjustments          |
| (Planned)       | Refund Processing                  | SOP for handling refunds on paid orders         |
| (Planned)       | Admin User Management              | SOP for managing admin accounts and permissions |
| (Planned)       | Audit Log Review                   | SOP for reviewing and exporting audit trails    |

---

## 8. Revision History and Approval

### Revision History

| Version | Date           | Author          | Description                  |
|---------|----------------|-----------------|------------------------------|
| 1.0     | March 7, 2026  | Operations Team | Initial release              |

### Approval

| Role            | Name | Signature | Date |
|-----------------|------|-----------|------|
| Operations Lead |      |           |      |
| Super-Admin     |      |           |      |
| General Manager |      |           |      |

---

*This document is controlled. Unauthorized copies are uncontrolled. Verify the current version before use.*
