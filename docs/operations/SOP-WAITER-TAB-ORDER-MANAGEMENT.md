# SOP: Waiter Tab and Order Management

**Document ID:** SOP-WAITER-001  
**Version:** 1.0  
**Effective Date:** March 4, 2026  
**Department:** Front of House / Service Staff  
**Applies To:** Waiters, Servers, Floor Staff

---

## Purpose

This Standard Operating Procedure (SOP) provides step-by-step instructions for waiters to create tabs, add orders to tabs, and manage customer orders efficiently using the Wawa Garden Bar ordering system.

---

## Scope

This SOP covers:
- Creating a new tab for dine-in customers
- Adding orders to existing tabs
- Minimum required information for successful order creation

---

## Prerequisites

- Access to the Wawa Garden Bar admin dashboard
- Valid admin or staff login credentials
- Basic understanding of the menu items and pricing

---

## Procedure

### Part 1: Creating a New Tab

**When to Use:** When a customer arrives and wants to start a tab (pay later) rather than pay immediately for each order.

#### Step 1: Access the Orders Dashboard
1. Log in to the admin dashboard at `/admin/login`
2. Navigate to **Dashboard → Orders** (`/dashboard/orders`)

#### Step 2: Initiate Tab Creation
1. Click the **"Create Tab/Open Order"** button in the top-right corner of the Orders page
2. A dialog box will appear

#### Step 3: Enter Minimum Required Information
**REQUIRED FIELD:**
- **Table Number** (e.g., "5", "12", "A3")
  - Enter the physical table number where the customer is seated
  - This is the ONLY required field to create a tab

**OPTIONAL FIELDS:**
- Customer Name (can be added later when first order is placed)
- Customer Email (can be added later)
- Customer Phone (can be added later)

#### Step 4: Create the Tab
1. Click **"Create Tab"** button
2. System will:
   - Check if the table already has an open tab
   - If table is free, create the new tab
   - If table has an existing tab, show an error message
3. You will be redirected to the Tab Details page

#### Step 5: Verify Tab Creation
**Success Indicators:**
- Tab Details page displays with status: **"Open"**
- Table number is shown
- Tab ID is generated (e.g., "TAB-12345")
- Current total shows ₦0.00
- "Opened by Staff" shows your admin name

---

### Part 2: Creating an Order and Adding to Tab

**When to Use:** When a customer on an existing tab wants to order food or drinks.

#### Step 1: Navigate to Menu
1. From the Tab Details page, click **"Add Order to Tab"** button
   - OR -
2. Navigate to **Menu** (`/menu`) from the main navigation

#### Step 2: Select Menu Items
1. Browse menu categories (Drinks, Food, etc.)
2. Click on items to add to cart
3. Configure any customizations:
   - Portion size (Full/Half)
   - Add-ons
   - Special instructions
4. Adjust quantities as needed
5. Click **"Add to Cart"** for each item

#### Step 3: Review Cart
1. Click the **Cart icon** in the top-right corner
2. Verify:
   - All items are correct
   - Quantities are accurate
   - Customizations are as requested
3. Make any necessary adjustments

#### Step 4: Proceed to Checkout
1. Click **"Checkout"** button from the cart
2. You will be taken to the checkout flow

#### Step 5: Enter Customer Information (First Order Only)

**MINIMUM REQUIRED INFORMATION:**
- **Customer Name** (e.g., "John Doe", "Sarah")
  - First name is sufficient
  - Full name is preferred for better record-keeping

**OPTIONAL BUT RECOMMENDED:**
- Customer Email (for order confirmations and receipts)
- Customer Phone Number (for order updates)

**Note:** If this is NOT the first order on the tab, customer information will already be saved and auto-filled.

#### Step 6: Select Order Type
1. Choose **"Dine-in"** as the order type
2. Enter the **Table Number** (should match the tab's table number)

#### Step 7: Add Special Instructions (Optional)
- Enter any dietary requirements
- Note any allergies
- Add preparation preferences
- Example: "No onions", "Extra spicy", "Gluten-free"

#### Step 8: Select Tab Option
**CRITICAL STEP:**
1. On the "Tab Options" step, select **"Add to Existing Tab"**
2. The system will automatically detect the open tab for this customer
3. Verify the correct tab is selected (check table number and current total)

**Important Notes:**
- If customer has an existing open tab, they MUST add to it or close it first
- Cannot open a new tab while one is already open
- Cannot pay separately if tab is open

#### Step 9: Review Order Summary
1. Verify all details:
   - Items and quantities
   - Customer information
   - Table number
   - Tab selection
   - Total amount
2. Make corrections if needed by clicking "Back"

#### Step 10: Submit Order
1. Click **"Place Order"** button
2. System will:
   - Create the order
   - Add order to the selected tab
   - Update tab total
   - Send order to kitchen
3. Success message will appear

#### Step 11: Confirm Order Added to Tab
**Success Indicators:**
- Order confirmation page displays
- Order number is generated (e.g., "ORD-67890")
- Order status shows "Pending" or "Confirmed"
- Tab total is updated to include new order
- Kitchen receives the order notification

---

## Quick Reference Checklist

### Creating a Tab
- [ ] Table number entered
- [ ] No existing tab on that table
- [ ] Tab created successfully
- [ ] Tab status is "Open"

### Adding Order to Tab
- [ ] Menu items selected and added to cart
- [ ] Cart reviewed for accuracy
- [ ] Customer name provided (first order only)
- [ ] Order type: Dine-in
- [ ] Table number matches tab
- [ ] Special instructions added (if any)
- [ ] "Add to Existing Tab" selected
- [ ] Correct tab verified
- [ ] Order placed successfully
- [ ] Tab total updated

---

## Common Scenarios

### Scenario 1: New Customer Arrives
1. Create tab with table number only
2. Take their first order
3. Enter customer name during checkout
4. Add order to the newly created tab

### Scenario 2: Existing Tab - Additional Order
1. Customer requests more items
2. Add items to cart
3. Proceed to checkout
4. Customer info auto-fills
5. Select "Add to Existing Tab"
6. Place order

### Scenario 3: Walk-in Customer (No Name Provided)
1. Create tab with table number
2. Use "Walk-in Customer" as customer name
3. Add order to tab
4. Update customer name later if they provide it

### Scenario 4: Multiple Items, One Order
1. Add all items to cart before checkout
2. Review entire order in cart
3. Proceed to checkout once
4. Place single order with all items

---

## Troubleshooting

### Error: "Table already has an open tab"
**Solution:** 
- Check if customer already has a tab open
- If yes, add order to existing tab instead
- If no, verify table number is correct

### Error: "Cannot create order without customer name"
**Solution:**
- Ensure customer name field is filled in checkout
- Minimum: First name required
- Use "Walk-in Customer" if name not provided

### Customer Wants to Pay Immediately (Not Use Tab)
**Solution:**
- Do NOT create a tab
- Process order as regular dine-in with immediate payment
- Select "Pay Now" option in checkout instead of "Add to Tab"

### Order Not Appearing on Tab
**Solution:**
- Verify "Add to Existing Tab" was selected in checkout
- Check order confirmation shows correct tab number
- Refresh tab details page
- Contact technical support if issue persists

---

## Important Reminders

1. **One Tab Per Table:** Each table can only have ONE open tab at a time
2. **Customer Restriction:** Customers with open tabs cannot open new tabs or pay separately
3. **Minimum Info:** Only table number is required to create a tab
4. **Customer Name:** Required for first order on tab (can use "Walk-in Customer")
5. **Tab Closure:** Tabs must be closed and paid before customer leaves
6. **Order Accuracy:** Always review cart before placing order
7. **Special Instructions:** Communicate dietary needs and preferences clearly

---

## Related Procedures

- SOP-WAITER-002: Closing Tabs and Processing Payments
- SOP-WAITER-003: Handling Order Modifications and Cancellations
- SOP-KITCHEN-001: Order Preparation and Status Updates

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 4, 2026 | System Administrator | Initial release |

---

## Approval

**Prepared by:** Operations Team  
**Reviewed by:** Front of House Manager  
**Approved by:** General Manager  

---

**For questions or clarification, contact:**
- Front of House Manager
- Technical Support: support@wawagardenbar.com
