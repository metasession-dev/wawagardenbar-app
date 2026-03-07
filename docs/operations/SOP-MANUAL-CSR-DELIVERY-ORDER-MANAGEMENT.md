# SOP: Customer Service Representative - Delivery Order Management

**Document ID:** SOP-MANUAL-CSR-001
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Customer Service
**Applies To:** Customer Service Representatives, Delivery Coordinators, Floor Managers

---

## Purpose

This Standard Operating Procedure (SOP) provides step-by-step instructions for Customer Service Representatives (CSRs) to review, track, and resolve issues related to delivery orders using the Wawa Garden Bar ordering system.

---

## Scope

This SOP covers:
- Reviewing incoming delivery orders
- Monitoring delivery order progress
- Tracking delivery status and estimated times
- Communicating with customers about their delivery
- Resolving delivery issues (delays, wrong items, missing items, address problems)
- Escalation procedures
- Handling refunds and redelivery decisions

---

## Prerequisites

- Access to the Wawa Garden Bar admin dashboard at `/admin/login`
- Valid admin credentials with `orderManagement` permission
- Familiarity with order statuses and delivery workflow
- Access to customer communication channels (phone, SMS, WhatsApp, email)
- Understanding of delivery fee structure and service area

---

## Key Reference

### Delivery Order Status Flow

```
pending --> confirmed --> preparing --> ready --> out-for-delivery --> delivered --> completed
                                                                                       |
                                                                          (or cancelled at any eligible stage)
```

### Delivery Fee Structure

| Condition | Fee |
|-----------|-----|
| Order subtotal below free delivery threshold (default: ₦2,000) | Base fee (default: ₦1,000) |
| Order subtotal at or above free delivery threshold | Reduced fee (default: ₦500) |

### Estimated Delivery Time Calculation

- Base: 5 minutes per item
- Queue time: +2 minutes per active order ahead
- Delivery addition: +30 minutes (driver + transit)
- Minimum: 15 minutes total

### Delivery Service Area

- Maximum delivery radius: configurable (default: 10 km)
- Minimum order amount: configurable (default: ₦1,000)

---

## Procedure

### Part 1: Reviewing Incoming Delivery Orders

#### Step 1: Access the Orders Dashboard
1. Log in to the admin dashboard at `/admin/login`
2. Navigate to **Dashboard --> Orders** (`/dashboard/orders`)

#### Step 2: Filter for Delivery Orders
1. Use the status filter tabs to view **Pending** orders
2. Identify delivery orders by the "Delivery" order type indicator
3. Review the order queue for any new delivery orders requiring attention

#### Step 3: Review Order Details
1. Click on the delivery order to open the order detail page (`/dashboard/orders/[orderId]`)
2. Verify the following information in the **Customer Information Card**:
   - Customer name (check for guest vs. registered badge)
   - Phone number (primary contact for delivery)
   - Email address
   - **Delivery address**: street, city, state, postal code, country
   - **Delivery instructions**: any special notes (e.g., "Call when you arrive", "Leave at gate")
3. Review the **Order Items** section:
   - Confirm all items are available
   - Note any special instructions per item
   - Verify quantities and portion sizes
4. Check the **Payment Information**:
   - Payment status (paid, pending, failed)
   - Payment method used
5. Note the **Estimated Wait Time** displayed on the order

#### Step 4: Confirm the Order
1. If payment is verified and all items are available, update the order status from **Pending** to **Confirmed**
2. Add a note if needed (e.g., "Delivery address verified")
3. The system will automatically:
   - Send a confirmation notification to the customer (SMS/Email/WhatsApp)
   - Forward the order to the kitchen display
   - Begin the estimated delivery time countdown

---

### Part 2: Monitoring Delivery Order Progress

#### Step 1: Track Order Through Kitchen
1. Monitor the order as it moves through kitchen stages:
   - **Confirmed**: Order received by kitchen
   - **Preparing**: Kitchen has started cooking
   - **Ready**: Food is prepared and packaged for delivery
2. Check the **Order Timeline** on the order detail page to see timestamps for each status change

#### Step 2: Monitor Preparation Time
1. Compare actual preparation time against the estimated wait time
2. If preparation is taking significantly longer than estimated:
   - Add a note to the order explaining the delay
   - Proactively contact the customer (see Part 4: Customer Communication)

#### Step 3: Dispatch for Delivery
1. When the order status changes to **Ready**:
   - Verify the order is properly packaged
   - Confirm delivery address one final time
   - Update status to **Out for Delivery** when the driver departs
2. Add a dispatch note with relevant details (e.g., driver name, departure time)
3. The system will notify the customer that their order is on the way

#### Step 4: Confirm Delivery
1. When the driver confirms delivery to the customer:
   - Update order status to **Delivered**
   - Record the actual delivery time
2. The system tracks `actualDeliveryTime` against `estimatedDeliveryTime`
3. After confirmation from the customer or a reasonable period, update status to **Completed**

---

### Part 3: Tracking Orders and Managing the Delivery Queue

#### Step 1: Use the Orders Dashboard Filters
1. Navigate to **Dashboard --> Orders** (`/dashboard/orders`)
2. Use the filter tabs to view orders by status:
   - **Active**: All orders currently in progress
   - **Pending**: New orders awaiting confirmation
   - **Confirmed**: Confirmed but not yet being prepared
   - **Preparing**: Currently in the kitchen
   - **Ready**: Prepared and awaiting pickup by driver
   - **Out for Delivery**: Currently being delivered (use search or advanced filters)
3. Use the **Search** field to find specific orders by order number or customer name

#### Step 2: Prioritize Delivery Orders
1. Review all active delivery orders
2. Prioritize based on:
   - Order time (FIFO -- first in, first out)
   - Payment status (paid orders take priority over pending payment)
   - Customer communication (orders with reported issues)
   - Estimated delivery time proximity

#### Step 3: Monitor Delivery Metrics
1. Track the following for each active delivery:
   - Time since order was placed
   - Time since order was marked "Ready"
   - Time since driver departed (if "Out for Delivery")
2. Flag any orders exceeding expected delivery windows:
   - More than 45 minutes in "Preparing" status
   - More than 15 minutes in "Ready" status (waiting for driver)
   - More than 40 minutes in "Out for Delivery" status

---

### Part 4: Customer Communication

#### Step 1: Proactive Updates
Contact the customer proactively in these situations:

| Situation | Action | Channel |
|-----------|--------|---------|
| Order delayed in kitchen (>15 min over estimate) | Inform customer of new estimated time | Phone or WhatsApp |
| Item unavailable after order confirmed | Offer substitution or partial refund | Phone |
| Driver delayed (>20 min over estimate) | Apologize and provide updated ETA | Phone or WhatsApp |
| Order ready but no driver available | Inform customer of delay, provide ETA | Phone or WhatsApp |

#### Step 2: Responding to Customer Inquiries
When a customer contacts you about their delivery:

1. Ask for their **order number** (format: WGB-XXXXXX)
2. Look up the order in the dashboard
3. Provide current status and estimated delivery time
4. If there is an issue, follow the resolution procedures in Part 5

#### Step 3: Communication Channels
The system supports automated notifications via:
- **Email**: Status update emails sent automatically at each status change
- **SMS**: Via Africa's Talking API (if enabled)
- **WhatsApp**: Via WhatsApp Business Cloud API (if enabled)

For manual communication:
- Use the customer's phone number (click-to-call from the order detail page)
- Use the customer's email (click-to-email from the order detail page)

#### Step 4: Adding Notes to Orders
1. On the order detail page, use the **Add Note** section
2. Document all customer communications with:
   - Date and time
   - Summary of conversation
   - Any commitments made (e.g., "Promised 15-minute delivery update")
   - Outcome or next steps

---

### Part 5: Resolving Delivery Issues

#### Issue 1: Wrong Address or Incomplete Address

**Symptoms**: Driver cannot locate delivery address, address seems incorrect

**Resolution**:
1. Contact the customer immediately by phone
2. Verify the correct delivery address
3. Update the delivery instructions in the order notes
4. Communicate the corrected address to the driver
5. If the address is outside the delivery radius:
   - Inform the customer that the address is outside the service area
   - Offer alternatives: pickup from the venue, or cancel with full refund
6. Document the address correction in the order notes

#### Issue 2: Delivery Delay

**Symptoms**: Order exceeding estimated delivery time

**Resolution**:
1. Identify the cause of the delay:
   - **Kitchen delay**: Check order timeline for preparation bottleneck
   - **Driver delay**: Check when the order was dispatched
   - **Traffic/weather**: Note external factors
2. Contact the customer with an updated ETA
3. If delay exceeds 30 minutes beyond original estimate:
   - Apologize sincerely
   - Offer a discount on the current order or a credit for the next order
   - Document the compensation offered in order notes
4. If delay exceeds 60 minutes:
   - Escalate to Floor Manager
   - Consider offering a partial refund on delivery fee

#### Issue 3: Wrong Items Delivered

**Symptoms**: Customer reports receiving incorrect items

**Resolution**:
1. Verify what the customer received versus what was ordered
2. Check the order detail page for the correct item list
3. Determine the error source:
   - **Kitchen error**: Wrong items prepared
   - **Packaging error**: Correct items, wrong bag
   - **Driver error**: Orders mixed up between customers
4. Resolution options (in order of preference):
   - **Redeliver correct items**: Prepare the correct items and send a new delivery
   - **Partial refund**: Refund the cost of incorrect items
   - **Full refund**: If the entire order is wrong
   - **Credit**: Offer store credit for the next order
5. Allow the customer to keep the incorrect items
6. Document the incident in order notes with root cause

#### Issue 4: Missing Items

**Symptoms**: Customer reports items missing from their delivery

**Resolution**:
1. Compare the customer's report against the order items list
2. Verify with the kitchen whether all items were packed
3. Resolution options:
   - **Redeliver missing items**: If items can be prepared and delivered promptly
   - **Refund missing items**: Refund the cost of specific missing items
   - **Credit**: Offer credit for the missing item value
4. Document which items were missing and the resolution applied

#### Issue 5: Food Quality Issue

**Symptoms**: Customer reports cold food, spilled items, or quality concerns

**Resolution**:
1. Apologize to the customer
2. Assess the severity:
   - **Minor** (e.g., slightly cold): Offer a discount or credit for next order
   - **Major** (e.g., spilled, inedible): Offer full replacement or full refund
3. If redelivery is offered:
   - Create a new order with the same items
   - Mark it as priority in the kitchen
   - Waive the delivery fee on the replacement
4. Document the quality issue for kitchen feedback

#### Issue 6: Customer Not Available at Delivery

**Symptoms**: Driver arrives but customer is unreachable

**Resolution**:
1. Driver should attempt to contact customer by phone (minimum 2 attempts)
2. CSR should also attempt to contact customer
3. If customer responds within 10 minutes:
   - Driver waits or returns based on proximity
4. If customer is unreachable after 10 minutes:
   - Driver returns with the order
   - Add note to order: "Delivery attempted - customer unavailable"
   - Keep the order in "Out for Delivery" status
   - Attempt contact again after 15 minutes
5. If customer remains unreachable after 30 minutes:
   - Update status to "Delivered" with note "Undeliverable - customer unreachable"
   - No refund issued unless customer contacts within 24 hours

#### Issue 7: Customer Wants to Cancel a Delivery Order

**Symptoms**: Customer requests cancellation after placing order

**Resolution**:
1. Check the current order status:
   - **Pending or Confirmed**: Cancel the order. Inventory will be automatically restored. Process full refund.
   - **Preparing**: Contact the kitchen to stop preparation if possible. If food is already being made, inform customer that a partial refund may apply (delivery fee refunded, food cost retained).
   - **Ready or Out for Delivery**: Order cannot be cancelled. Inform customer the order is already prepared/dispatched.
2. To cancel an eligible order:
   - Open the order detail page
   - Click the cancellation option
   - Add a cancellation reason note
   - The system will restore inventory and update the order status
3. Process refund according to the cancellation stage

#### Issue 8: Payment Issue on Delivery Order

**Symptoms**: Payment failed, pending, or disputed

**Resolution**:
1. Check payment status on the order detail page
2. If payment is **Pending**:
   - Contact customer to verify payment was initiated
   - Check payment gateway (Monnify) for transaction status
   - If payment confirmed in gateway but not reflected: use manual payment recording
3. If payment **Failed**:
   - Do not dispatch the order until payment is resolved
   - Contact customer to retry payment or use alternative method
   - If customer cannot pay: cancel the order
4. Document all payment-related actions in order notes

---

### Part 6: End-of-Shift Delivery Review

#### Step 1: Review All Delivery Orders
1. Filter orders for the current day
2. Verify all delivery orders have reached a terminal status:
   - **Completed**: Successfully delivered
   - **Cancelled**: Properly cancelled with refund processed
3. Flag any orders still in active status (Preparing, Ready, Out for Delivery)

#### Step 2: Document Issues
1. Record any unresolved delivery issues for handover to next shift
2. Note any recurring problems (e.g., specific address difficulties, driver delays)
3. Add handover notes for the incoming CSR

#### Step 3: Report Summary
1. Note total delivery orders handled during shift
2. Record number of issues resolved and escalated
3. Highlight any compensation or refunds issued
4. Report any trends or systemic issues to management

---

## Quick Reference Checklist

### New Delivery Order Review
- [ ] Customer name and contact details verified
- [ ] Delivery address is complete (street, city, state)
- [ ] Delivery instructions noted (if any)
- [ ] All order items are available
- [ ] Payment status is confirmed (paid)
- [ ] Order confirmed and sent to kitchen
- [ ] Customer notification sent

### Delivery Tracking
- [ ] Order progressing through kitchen stages
- [ ] Preparation time within expected range
- [ ] Order packaged when status reaches "Ready"
- [ ] Driver dispatched and status updated to "Out for Delivery"
- [ ] Customer notified of dispatch
- [ ] Delivery confirmed and status updated to "Delivered"
- [ ] Order marked as "Completed"

### Issue Resolution
- [ ] Customer contacted and issue understood
- [ ] Order details verified against customer report
- [ ] Root cause identified
- [ ] Resolution offered and agreed with customer
- [ ] Resolution applied (refund, redelivery, credit)
- [ ] All actions documented in order notes
- [ ] Escalated to manager if required

---

## Common Scenarios

### Scenario 1: Smooth Delivery Order
1. New delivery order appears as "Pending" with payment confirmed
2. Review customer details and delivery address
3. Confirm the order (status: Confirmed)
4. Monitor through Preparing and Ready stages
5. Update to "Out for Delivery" when driver departs
6. Update to "Delivered" when driver confirms
7. Mark as "Completed"

### Scenario 2: Customer Calls to Check Order Status
1. Ask for order number (WGB-XXXXXX)
2. Look up order in dashboard
3. Provide current status: "Your order is currently being prepared. Estimated delivery in approximately 25 minutes."
4. If delayed, apologize and provide updated estimate
5. Add note: "Customer called for status update - informed of [status]"

### Scenario 3: Item Unavailable After Order Confirmed
1. Kitchen reports an item is out of stock
2. Contact customer immediately by phone
3. Offer alternatives:
   - Substitute with a similar item
   - Remove the item and refund the difference
   - Cancel the entire order if the item was the main order
4. Update the order accordingly
5. Add note documenting the conversation and outcome

### Scenario 4: Multiple Delivery Issues in One Order
1. Assess all issues reported by the customer
2. Address each issue individually
3. If multiple items are wrong or missing, consider a full replacement order
4. Apply the most generous resolution that covers all issues
5. Escalate to Floor Manager if total compensation exceeds ₦5,000
6. Document all issues and resolutions in order notes

### Scenario 5: Repeat Customer with Recurring Delivery Problem
1. Check customer's order history for past issues
2. Acknowledge the pattern: "I can see this has happened before and I apologize"
3. Provide an enhanced resolution (e.g., complimentary item, delivery fee waiver on next order)
4. Escalate to management for root cause analysis
5. Document in order notes: "Recurring issue - escalated to management"

---

## Escalation Matrix

| Severity | Criteria | Escalate To | Response Time |
|----------|----------|-------------|---------------|
| Low | Minor delay (<15 min), simple inquiry | Handle directly | Immediate |
| Medium | Delay >30 min, single missing item, payment query | Shift Lead | Within 15 minutes |
| High | Wrong order, multiple missing items, customer threatening to leave review | Floor Manager | Within 10 minutes |
| Critical | Food safety concern, allergic reaction, order lost, customer abusive | General Manager | Immediately |

---

## Troubleshooting

### Order Not Appearing in Dashboard
**Solution:**
- Refresh the page
- Check if filters are hiding the order (clear all filters)
- Verify the order was successfully placed (check payment gateway)
- If order exists in payment system but not in dashboard, contact technical support

### Cannot Update Order Status
**Solution:**
- Verify you have `orderManagement` permission
- Check that the status transition is valid (e.g., cannot skip from "Preparing" to "Delivered")
- Refresh the page and try again
- If the issue persists, contact technical support

### Customer Not Receiving Notifications
**Solution:**
- Verify customer phone number and email are correct in the order
- Check if SMS/WhatsApp services are enabled (environment configuration)
- Manually inform the customer by phone
- Report the notification failure to technical support

### Delivery Address Outside Service Area
**Solution:**
- Check current delivery radius setting (default: 10 km)
- Inform customer the address is outside the delivery area
- Offer pickup as an alternative
- If the customer is a regular, escalate to management for a possible exception

---

## Important Reminders

1. **Customer First**: Always prioritize the customer experience. A delivery issue handled well can create a loyal customer.
2. **Document Everything**: Add notes to every order where you take action or communicate with the customer. This creates an audit trail.
3. **Proactive Communication**: Contact the customer before they contact you if there is a delay or issue.
4. **Payment Before Dispatch**: Never dispatch a delivery order with a pending or failed payment unless authorized by management.
5. **Address Verification**: Always verify the delivery address is complete before confirming the order.
6. **Delivery Instructions Matter**: Read and relay delivery instructions to the driver. Missing instructions cause failed deliveries.
7. **Compensation Authority**: CSRs may offer up to ₦2,000 in credits or discounts without manager approval. Amounts above ₦2,000 require Floor Manager authorization. Refunds always require manager approval.
8. **Food Safety**: If a customer reports a food safety issue (foreign object, allergic reaction, food poisoning symptoms), escalate immediately to the General Manager. Do not attempt to resolve food safety issues independently.
9. **Shift Handover**: Never leave active delivery orders without proper handover documentation.
10. **Driver Communication**: Maintain contact with drivers during active deliveries. If a driver becomes unreachable for more than 15 minutes during a delivery, escalate immediately.

---

## Related Procedures

- SOP-MANUAL-WAITER-001: Tab and Order Creation
- SOP-MANUAL-WAITER-002: Tab Settlement and Payment Processing
- SOP-MANUAL-WAITER-003: Handling Order Modifications and Cancellations
- SOP-MANUAL-ADMIN-001: Order Queue Management
- SOP-MANUAL-ADMIN-004: Daily Close-Out and Financial Reporting

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 7, 2026 | Operations Team | Initial release |

---

## Approval

**Prepared by:** Customer Service Team
**Reviewed by:** Customer Service Manager
**Approved by:** General Manager

---

**For questions or clarification, contact:**
- Customer Service Manager
- Floor Manager (on-shift)
- Technical Support: support@wawagardenbar.com
