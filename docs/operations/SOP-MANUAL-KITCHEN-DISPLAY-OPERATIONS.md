# SOP: Kitchen Display System Operations

**Document ID:** SOP-MANUAL-KITCHEN-001
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Kitchen / Back of House
**Applies To:** Kitchen Staff, Chefs, Line Cooks, Kitchen Manager

---

## Purpose

This Standard Operating Procedure (SOP) provides step-by-step instructions for kitchen staff to operate the Wawa Garden Bar Kitchen Display System (KDS). The KDS is the primary interface through which kitchen staff receive, track, and manage incoming orders in real time during service.

---

## Scope

This SOP covers:
- Accessing and starting the Kitchen Display System
- Reading and interpreting order cards on the display
- Processing orders through each status stage (pending, confirmed, preparing, ready)
- Communicating with front of house staff regarding order status
- Handling common operational scenarios and troubleshooting display issues
- End-of-shift procedures

---

## Prerequisites

- Valid staff login credentials with kitchen access privileges
- A dedicated KDS device (tablet, monitor, or terminal) positioned in the kitchen
- Stable network connection (the KDS relies on real-time Socket.IO updates)
- The KDS device browser configured for full-screen or kiosk mode for optimal visibility
- Familiarity with the menu, including item names, portions, and common modifications

---

## Procedure

### Part 1: Starting a Shift

#### Step 1: Log In to the System
1. Open the browser on the KDS device
2. Navigate to the admin login page at `/admin/login`
3. Enter your staff credentials (username and password)
4. Click **"Log In"**

#### Step 2: Access the Kitchen Display
1. Navigate to **Dashboard --> Kitchen** (`/dashboard/kitchen`)
2. The KDS will load with a dark-themed interface optimized for kitchen visibility

#### Step 3: Verify the Display Is Working
1. Confirm the active order count is visible at the top of the screen
2. Verify that the display is receiving real-time updates:
   - If orders are already in the system, they should appear on screen
   - If no orders are present, the display should show zero active orders
3. Confirm the back button to the orders page (`/dashboard/orders`) is accessible
4. If the display appears blank or unresponsive, refer to the **Troubleshooting** section below

#### Step 4: Coordinate with Outgoing Shift (If Applicable)
1. Review any orders still in progress from the previous shift
2. Note any 86'd items (out-of-stock items) that carry over
3. Confirm handover of any special instructions or priority orders

---

### Part 2: Reading the Kitchen Display

#### Understanding Order Cards
Each order appears as an individual card on the KDS. Every order card contains:
- **Order Number** -- a unique identifier (e.g., "ORD-12345")
- **Order Type** -- dine-in (with table number), pickup, or delivery
- **Table Number** -- displayed for dine-in orders; used to coordinate with front of house
- **Items Ordered** -- each menu item with its quantity
- **Special Instructions** -- dietary requirements, allergen notes, preparation preferences
- **Order Status** -- the current stage in the order workflow
- **Time Received** -- when the order was placed

#### Order Priority and Sequencing
1. Orders are processed on a **First In, First Out (FIFO)** basis
2. The oldest pending order should be acknowledged and started first
3. Exceptions to FIFO:
   - Rush orders flagged by management
   - Orders with items that have significantly shorter preparation times
   - Allergen-sensitive orders that require dedicated preparation areas
4. When multiple orders arrive simultaneously, acknowledge all of them promptly, then begin preparation in the order they were received

#### Identifying Order Type
- **Dine-in:** Displays a table number (e.g., "Table 5"). These orders are served to seated customers.
- **Pickup:** Marked as pickup orders. These are prepared for customer collection at the counter.
- **Delivery:** Marked as delivery orders. These must be packaged appropriately for transport.

#### Reading Special Instructions and Allergen Notes
1. **Always** read the special instructions field on every order card before starting preparation
2. Common special instructions include:
   - Dietary modifications (e.g., "No onions", "Extra spicy", "Gluten-free")
   - Allergen warnings (e.g., "NUT ALLERGY", "Dairy-free")
   - Preparation preferences (e.g., "Well done", "Sauce on the side")
3. **Allergen alerts require immediate attention.** If an allergen note is present:
   - Ensure dedicated utensils and preparation surfaces are used
   - Communicate the allergen requirement verbally to all staff on the line
   - Verify ingredients before preparation begins

---

### Part 3: Processing Orders

Orders progress through the following statuses: **pending --> confirmed --> preparing --> ready --> delivered --> completed**

Kitchen staff are responsible for transitioning orders through the first four stages.

#### Acknowledging New Orders (Pending --> Confirmed)
1. When a new order appears on the KDS, it arrives with a **"Pending"** status
2. Review the order card: items, quantities, special instructions, and table number
3. Tap or click the order to update its status to **"Confirmed"**
4. This signals to front of house that the kitchen has received and acknowledged the order
5. **Target time:** Acknowledge all new orders within **2 minutes** of arrival

#### Starting Preparation (Confirmed --> Preparing)
1. When you begin actively working on an order, update its status to **"Preparing"**
2. This informs front of house that the order is being made
3. Organize your workflow:
   - Group items that share preparation methods or stations
   - Start longer-preparation items first
   - Coordinate with other stations if the order spans multiple areas (e.g., grill and cold station)

#### Marking Orders Ready (Preparing --> Ready)
1. When all items in an order are fully prepared, plated, and quality-checked, update the status to **"Ready"**
2. This triggers a notification to front of house that the order is available for pickup from the pass
3. Place the completed order at the pass/collection point
4. Ensure the order ticket or table number is clearly visible with the plated food
5. **Do not mark an order as ready until ALL items in that order are complete**

#### Handling Rush Orders
1. Rush orders may be flagged by the Kitchen Manager or front of house
2. When a rush order is identified:
   - Prioritize it over standard FIFO sequencing
   - Communicate the rush to all relevant stations verbally
   - Update the order status promptly at each stage
3. If a rush order conflicts with orders already in preparation, notify the Kitchen Manager for prioritization decisions

---

### Part 4: Communication with Front of House

#### Notifying When Orders Are Ready
1. Update the order status to **"Ready"** on the KDS -- this is the primary notification method
2. Additionally, call out the table number or order number verbally at the pass (e.g., "Table 7, order up!")
3. Ensure the plated order is placed at the designated pass area

#### Handling 86'd Items (Out of Stock During Service)
1. When an item runs out during service:
   - Immediately notify the Kitchen Manager
   - The Kitchen Manager or designated staff will update the menu system to mark the item unavailable
   - Communicate the 86'd item verbally to all kitchen stations
2. If an incoming order contains an 86'd item:
   - Do NOT confirm the order
   - Notify front of house immediately so they can contact the customer for a substitution
   - Once the substitution is confirmed and the order is updated, proceed with normal processing

#### Delay Notifications
1. If an order will take significantly longer than the standard preparation time:
   - Notify the Kitchen Manager with an estimated completion time
   - The Kitchen Manager will communicate the delay to front of house
2. Common causes of delays:
   - Complex or large orders
   - Equipment issues
   - Ingredient preparation requirements
   - High volume of simultaneous orders
3. Never leave front of house uninformed about delays -- proactive communication prevents customer complaints

---

### Part 5: End of Shift

#### Step 1: Verify All Orders Are Completed
1. Check the KDS for any orders still in **"Pending"**, **"Confirmed"**, or **"Preparing"** status
2. All orders assigned during your shift must be either:
   - Completed and marked as **"Ready"** or beyond
   - Handed over to the incoming shift with a verbal briefing

#### Step 2: Hand Over to Incoming Shift (If Applicable)
1. Brief the incoming kitchen staff on:
   - Any orders still in progress
   - Any 86'd items
   - Any equipment issues encountered during the shift
   - Any recurring special instructions or allergen-sensitive customers still dining

#### Step 3: Log Out
1. Navigate back to the dashboard using the back button on the KDS
2. Log out of the system by clicking your profile or the logout option
3. Do NOT leave the KDS logged in unattended between shifts

---

## Quick Reference Checklist

### Shift Start
- [ ] Logged in with valid credentials
- [ ] Navigated to `/dashboard/kitchen`
- [ ] KDS display verified (dark theme, active order count visible)
- [ ] Real-time updates confirmed (Socket.IO connection active)
- [ ] Handover from outgoing shift completed (if applicable)
- [ ] 86'd items from prior shift noted

### During Service
- [ ] New orders acknowledged within 2 minutes (Pending --> Confirmed)
- [ ] Status updated when preparation begins (Confirmed --> Preparing)
- [ ] Special instructions and allergen notes read before preparation
- [ ] All items in an order completed before marking Ready
- [ ] Orders marked Ready and placed at the pass
- [ ] Table number or order number called out at the pass
- [ ] 86'd items communicated immediately
- [ ] Delays communicated to Kitchen Manager

### Shift End
- [ ] All orders completed or handed over
- [ ] Incoming shift briefed on outstanding items
- [ ] Logged out of the KDS

---

## Common Scenarios

### Scenario 1: Multiple Simultaneous Orders
1. Several orders arrive on the KDS at the same time
2. Acknowledge (confirm) all orders promptly so front of house knows the kitchen has received them
3. Assess preparation times and group items by station
4. Begin with the oldest order first (FIFO), unless a rush is indicated
5. Coordinate across stations to work orders in parallel where possible

### Scenario 2: Large Party Order
1. A single order with a high number of items arrives (e.g., 8+ items for one table)
2. Confirm the order immediately
3. Communicate the large order to all relevant stations verbally
4. Stagger preparation so all items finish at approximately the same time
5. Do NOT mark the order as Ready until every item is plated and quality-checked
6. Notify front of house if additional time is needed

### Scenario 3: Allergen Alert
1. An order arrives with an allergen note (e.g., "NUT ALLERGY - no peanut oil")
2. Confirm the order and read the allergen instruction aloud to the line
3. Designate clean utensils, cutting boards, and preparation surfaces
4. Verify all ingredients for allergen safety before cooking
5. If there is any doubt about ingredient safety, escalate to the Kitchen Manager before proceeding
6. Mark the plated dish clearly at the pass so front of house is aware

### Scenario 4: Equipment Failure (KDS Device Issue)
1. If the KDS device stops displaying orders or freezes:
   - Attempt to refresh the browser
   - If the issue persists, check the network connection
   - Switch to a backup device if available
2. Notify the Kitchen Manager immediately
3. Front of house can relay orders verbally or via printed tickets as a temporary measure
4. Refer to the **Troubleshooting** section for additional steps
5. Do NOT continue service without a method of receiving orders

---

## Troubleshooting

### Display Not Updating (Orders Appear Stale)
**Possible Cause:** Socket.IO connection lost
**Solution:**
1. Refresh the browser page on the KDS device
2. Check that the device is connected to the network (Wi-Fi or Ethernet)
3. If refreshing does not resolve the issue, log out and log back in
4. If the problem persists, restart the KDS device browser
5. Contact technical support if none of the above steps restore real-time updates

### Orders Not Appearing on the KDS
**Possible Cause:** Network disconnection or server issue
**Solution:**
1. Verify the device has an active network connection
2. Refresh the KDS page at `/dashboard/kitchen`
3. Check with front of house whether orders are being placed successfully on their end
4. If orders are being placed but not appearing, the server or Socket.IO service may be down -- contact technical support
5. Use the back button to navigate to `/dashboard/orders` and verify orders exist in the system

### Connection Issues (Page Will Not Load)
**Possible Cause:** Network outage or server downtime
**Solution:**
1. Check the device's network connection (Wi-Fi icon, Ethernet cable)
2. Try loading another page (e.g., `/dashboard/orders`) to confirm general connectivity
3. If no pages load, the network is down -- notify the Kitchen Manager
4. If other pages load but `/dashboard/kitchen` does not, the KDS route may have an issue -- contact technical support
5. Implement manual order relay (verbal or printed tickets) until the system is restored

### Order Status Not Saving When Tapped
**Possible Cause:** Session expired or connectivity interruption
**Solution:**
1. Refresh the page
2. Attempt the status update again
3. If the session has expired, log in again at `/admin/login` and return to `/dashboard/kitchen`
4. Check network connectivity if the issue recurs

---

## Important Reminders

1. **FIFO Is the Default:** Always process orders in the sequence they are received unless management directs otherwise.
2. **Acknowledge Promptly:** Confirm all new orders within 2 minutes so front of house knows the kitchen is aware.
3. **Read Every Special Instruction:** Never skip the special instructions field. Allergen errors can have serious health consequences.
4. **All Items Before Ready:** Do not mark an order as Ready until every item in that order is fully prepared, plated, and checked.
5. **Communicate Proactively:** Notify front of house about delays, 86'd items, and any issues before they escalate.
6. **Keep the KDS Running:** The display must remain active and connected throughout the entire shift. Report technical issues immediately.
7. **Dark Theme for Visibility:** The KDS uses a dark theme by design to reduce glare and improve readability in kitchen lighting conditions. Do not change display settings.
8. **Log Out at Shift End:** Always log out when your shift is over. Do not leave the KDS logged in unattended.

---

## Related Procedures

- **SOP-MANUAL-WAITER-001:** Waiter Tab and Order Management
- **SOP-MANUAL-WAITER-003:** Handling Order Modifications and Cancellations

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 7, 2026 | System Administrator | Initial release |

---

## Approval

**Prepared by:** Operations Team
**Reviewed by:** Kitchen Manager
**Approved by:** General Manager

---

**For questions or clarification, contact:**
- Kitchen Manager
- Technical Support: support@wawagardenbar.com
