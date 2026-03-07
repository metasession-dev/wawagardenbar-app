# Standard Operating Procedure

**Document ID:** SOP-MANUAL-ADMIN-008
**Title:** Customer Management
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Operations / Customer Service
**Applies To:** CSR, Admin, Super-Admin
**Classification:** Internal Use Only

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Prerequisites](#3-prerequisites)
4. [Procedure](#4-procedure)
   - [Part 1: Searching and Viewing Customer Records](#part-1-searching-and-viewing-customer-records)
   - [Part 2: Customer Profile Details](#part-2-customer-profile-details)
   - [Part 3: Updating Customer Information](#part-3-updating-customer-information)
   - [Part 4: Customer Segments and Analytics](#part-4-customer-segments-and-analytics)
   - [Part 5: Handling Customer Inquiries](#part-5-handling-customer-inquiries)
5. [Quick Reference](#5-quick-reference)
6. [Common Scenarios](#6-common-scenarios)
7. [Troubleshooting](#7-troubleshooting)
8. [Related Procedures](#8-related-procedures)
9. [Revision History](#9-revision-history)
10. [Approval](#10-approval)

---

## 1. Purpose

This procedure defines the standard process for managing customer records through the Wawa Garden Bar administrative dashboard. It provides step-by-step instructions for searching, viewing, and updating customer information, understanding customer segments and analytics, and using customer data to resolve inquiries and support day-to-day customer service operations.

## 2. Scope

This SOP covers the following areas:

- Searching for and viewing customer records via the dashboard
- Reviewing customer profile details including order history, loyalty points, addresses, preferences, and spending summaries
- Updating customer information such as names, phone numbers, and preferences
- Understanding customer segments (New, Returning, VIP) and reviewing spending analytics
- Using customer data to handle inquiries, resolve order issues, and verify loyalty balances

All activities described in this document are performed within the administrative dashboard at `/dashboard/customers` and related customer profile pages.

## 3. Prerequisites

Before performing any procedure in this document, the following conditions must be met:

| Requirement | Detail |
|---|---|
| **Role** | CSR, Admin, or Super-Admin |
| **Authentication** | Active admin session via `/admin/login` |
| **Access** | Access to customer management functions at `/dashboard/customers` |
| **Browser** | Current version of a supported modern browser |
| **Knowledge** | Familiarity with customer data fields, loyalty program structure, and order management basics |

**Key System Locations:**

| Function | Path |
|---|---|
| Customer List | `/dashboard/customers` |
| Customer Profile | `/dashboard/customers/[id]` |
| Admin Login | `/admin/login` |

---

## 4. Procedure

### Part 1: Searching and Viewing Customer Records

#### 1.1 Accessing the Customer List

1. Log in to the admin dashboard at `/admin/login` using your username and password.
2. Navigate to **Customers** at `/dashboard/customers`.
3. The customer list displays all registered and guest customers in the system.
4. The list includes summary columns such as customer name, email, phone number, total orders, and customer segment.

#### 1.2 Using the Search Bar

1. On the customer list page, locate the **search bar** at the top of the page.
2. Enter one or more of the following search criteria:
   - Customer name (full or partial)
   - Email address
   - Phone number
3. Press **Enter** or click **Search** to execute the query.
4. The customer list will update to display only matching records.
5. To clear the search and return to the full customer list, clear the search field and press **Enter** or click **Clear**.

#### 1.3 Filtering the Customer List

1. On the customer list page, locate the **filter controls**.
2. Apply filters as needed:
   - **Customer Segment** -- Filter by New, Returning, or VIP customers.
   - **Registration Type** -- Filter by registered accounts or guest customers.
   - **Activity Period** -- Filter by customers who have placed orders within a specific time period.
3. Click **Apply Filters** to update the displayed results.
4. To remove all filters and return to the full list, click **Reset Filters**.

#### 1.4 Viewing a Customer Profile

1. From the customer list, click on the customer's name or row to open their profile.
2. The system navigates to `/dashboard/customers/[id]`, where `[id]` is the customer's unique identifier.
3. The customer profile page displays the full customer record (see Part 2 for details).

---

### Part 2: Customer Profile Details

#### 2.1 Profile Overview

When viewing a customer profile at `/dashboard/customers/[id]`, the following information is available:

| Section | Details |
|---|---|
| **Personal Information** | Customer name, email address, phone number, account creation date |
| **Order History** | Complete list of past orders with dates, items, totals, and order status |
| **Loyalty Points** | Current loyalty point balance and point transaction history |
| **Addresses** | Saved delivery addresses associated with the customer |
| **Preferences** | Dietary preferences, communication preferences, and other customer-specified settings |
| **Spending Summary** | Total spending, average order value, total number of orders, and most frequently ordered items |

#### 2.2 Reviewing Order History

1. On the customer profile page, navigate to the **Order History** section.
2. Review the following data points:
   - **Total orders placed** -- The overall count of orders for this customer.
   - **Order list** -- Each order displayed with its date, order number, items, total amount, and current status.
   - **Order status** -- The current state of each order (e.g., Completed, Cancelled, Refunded).
3. Click on an individual order to view its full details, including itemized line items, applied discounts, and payment information.

#### 2.3 Reviewing Loyalty Points

1. On the customer profile page, navigate to the **Loyalty Points** section.
2. Review the following:
   - **Current balance** -- The number of loyalty points the customer currently holds.
   - **Points history** -- A log of point transactions showing points earned (from orders) and points redeemed (for rewards).
   - **Points earned per order** -- Visible within each order history entry.
3. Use this information to answer customer questions about their loyalty balance or to verify point discrepancies.

#### 2.4 Reviewing Addresses

1. On the customer profile page, navigate to the **Addresses** section.
2. Review all saved delivery addresses, including:
   - Street address
   - City
   - Postal code
   - Any delivery instructions
3. Note the default or most recently used address for reference during order-related inquiries.

#### 2.5 Reviewing Preferences

1. On the customer profile page, navigate to the **Preferences** section.
2. Review the customer's recorded preferences, which may include:
   - Dietary restrictions or preferences (e.g., vegetarian, gluten-free, nut allergy)
   - Communication preferences (e.g., email notifications, SMS notifications)
   - Preferred payment methods
3. Use this information to provide personalized service and ensure dietary requirements are communicated to the kitchen when relevant.

#### 2.6 Reviewing the Spending Summary

1. On the customer profile page, navigate to the **Spending Summary** section.
2. Review the following metrics:
   - **Total spending** -- Cumulative amount the customer has spent.
   - **Average order value** -- Mean transaction value across all orders.
   - **Total number of orders** -- Lifetime order count.
   - **Most frequently ordered items** -- The items the customer orders most often.
3. Use this information to assess customer value, identify purchasing trends, and support upselling or personalized recommendations.

---

### Part 3: Updating Customer Information

#### 3.1 Editing Customer Name

1. Open the customer profile at `/dashboard/customers/[id]`.
2. Locate the **Personal Information** section.
3. Click **Edit** next to the customer's name.
4. Enter the corrected or updated name.
5. Click **Save** to apply the change.
6. Verify that the updated name is displayed correctly on the profile.

#### 3.2 Editing Phone Number

1. Open the customer profile at `/dashboard/customers/[id]`.
2. Locate the **Personal Information** section.
3. Click **Edit** next to the phone number field.
4. Enter the corrected or updated phone number.
5. Click **Save** to apply the change.
6. Verify that the updated phone number is displayed correctly on the profile.

#### 3.3 Updating Dietary Preferences

1. Open the customer profile at `/dashboard/customers/[id]`.
2. Navigate to the **Preferences** section.
3. Click **Edit** to modify the customer's preferences.
4. Update the dietary preferences as requested by the customer (e.g., add "vegetarian", remove "gluten-free").
5. Click **Save** to apply the changes.
6. Confirm the updated preferences with the customer if they are present or on the phone.

#### 3.4 Updating Communication Preferences

1. Open the customer profile at `/dashboard/customers/[id]`.
2. Navigate to the **Preferences** section.
3. Click **Edit** to modify communication preferences.
4. Update the settings as requested (e.g., enable or disable email notifications, SMS notifications).
5. Click **Save** to apply the changes.

#### 3.5 Important Notes on Editing

- All edits to customer records are tracked in the audit log and can be reviewed at `/dashboard/audit-logs`.
- Email addresses cannot be changed through the dashboard to protect account integrity. If a customer requests an email change, escalate to a Super-Admin.
- Always confirm changes with the customer before saving, especially for dietary preferences that affect food preparation.

---

### Part 4: Customer Segments and Analytics

#### 4.1 Understanding Customer Segments

Customers are automatically categorized into segments based on their activity and engagement:

| Segment | Criteria | Characteristics |
|---|---|---|
| **New** | Recently created account with minimal order history | First-time or very recent customers; opportunity for engagement and retention efforts |
| **Returning** | Multiple orders over time with consistent activity | Regular customers with established ordering patterns; maintain satisfaction and consistency |
| **VIP** | High order frequency, high total spending, or long-term loyalty | The most valuable customers; prioritize service quality and personalized attention |

#### 4.2 Using Segments for Customer Service

1. On the customer list at `/dashboard/customers`, the customer segment is displayed for each record.
2. Use the segment filter to view customers by category (see Part 1, Section 1.3).
3. Apply segment awareness to customer interactions:
   - **New customers** -- Focus on welcoming, ensuring a positive first experience, and encouraging repeat orders.
   - **Returning customers** -- Acknowledge their loyalty, reference their ordering patterns, and offer relevant suggestions.
   - **VIP customers** -- Provide priority service, escalate concerns promptly, and consider personalized offers or recognition.

#### 4.3 Reviewing Spending Patterns

1. Open a customer profile at `/dashboard/customers/[id]`.
2. Review the **Spending Summary** section (see Part 2, Section 2.6).
3. Analyze the following patterns:
   - **Spending trends** -- Is the customer's spending increasing, decreasing, or stable over time?
   - **Order frequency** -- How often does the customer place orders?
   - **Preferred items** -- What does the customer order most frequently?
   - **Average order value** -- How does this customer's average compare to overall averages?
4. Use these insights to:
   - Identify at-risk customers (e.g., previously active customers with declining order frequency).
   - Recognize high-value customers for retention efforts.
   - Support marketing and promotion decisions.

#### 4.4 Identifying At-Risk Customers

1. Filter the customer list by the **Returning** or **VIP** segment.
2. Sort by most recent order date.
3. Identify customers who have not placed an order within an unusually long period relative to their normal ordering frequency.
4. Flag these customers for follow-up or re-engagement outreach as appropriate.

---

### Part 5: Handling Customer Inquiries

#### 5.1 General Approach

When a customer contacts the business with a question or concern, use the dashboard to access their records and provide accurate, informed responses:

1. Ask the customer for identifying information (name, email, or phone number).
2. Search for the customer at `/dashboard/customers` using the search bar (see Part 1, Section 1.2).
3. Open the customer's profile to access their full record.
4. Use the relevant sections of the profile to address the inquiry.

#### 5.2 Checking Loyalty Point Balances

1. Open the customer's profile.
2. Navigate to the **Loyalty Points** section.
3. Confirm the current point balance with the customer.
4. If the customer disputes the balance, review the **points history** to trace all point transactions (earnings and redemptions).
5. Cross-reference with the **Order History** to verify that points were correctly awarded for completed orders.
6. If a discrepancy is identified, refer to SOP-MANUAL-ADMIN-005 (Rewards and Loyalty) for resolution procedures.

#### 5.3 Verifying Order History

1. Open the customer's profile.
2. Navigate to the **Order History** section.
3. Locate the order in question by date, order number, or approximate timeframe.
4. Click on the order to view full details including:
   - Items ordered and quantities
   - Prices and any discounts applied
   - Order status and timestamps
   - Payment information
5. Share relevant details with the customer as needed to resolve their inquiry.

#### 5.4 Resolving Order Disputes

1. Open the customer's profile and locate the disputed order in the **Order History**.
2. Review the order details thoroughly:
   - Confirm the items and quantities ordered.
   - Verify the prices charged, including any fees or discounts.
   - Check the order status and delivery details.
3. Cross-reference with audit logs at `/dashboard/audit-logs` if the order was modified or cancelled by an admin.
4. Based on the findings:
   - If the charge is correct, explain the breakdown to the customer clearly.
   - If an error is identified, follow the order management procedures in SOP-MANUAL-ADMIN-001 to issue a correction or refund.
5. Document the resolution in the order notes or through the appropriate channel.

#### 5.5 Addressing Dietary Preference Questions

1. Open the customer's profile.
2. Navigate to the **Preferences** section.
3. Confirm the customer's recorded dietary preferences.
4. If the customer wants to update their preferences, follow the procedure in Part 3, Section 3.3.
5. Communicate any relevant dietary information to the kitchen team when it pertains to an active or upcoming order.

---

## 5. Quick Reference

### Key Navigation Paths

| Function | Path |
|---|---|
| Customer List | `/dashboard/customers` |
| Customer Profile | `/dashboard/customers/[id]` |
| Admin Login | `/admin/login` |
| Audit Logs | `/dashboard/audit-logs` |
| Rewards and Loyalty | `/dashboard/rewards` |

### Common Customer Profile Actions

| Action | Location on Profile | Steps |
|---|---|---|
| View order history | Order History section | Click on any order for full details |
| Check loyalty balance | Loyalty Points section | Current balance displayed at top of section |
| Update name or phone | Personal Information section | Click Edit, modify, click Save |
| Update dietary preferences | Preferences section | Click Edit, modify, click Save |
| View saved addresses | Addresses section | All addresses listed with delivery instructions |
| Review spending summary | Spending Summary section | Total spending, average order value, and top items displayed |

### Customer Segment Summary

| Segment | Service Priority | Key Action |
|---|---|---|
| **New** | Standard | Welcome and encourage repeat business |
| **Returning** | Standard-High | Acknowledge loyalty and maintain consistency |
| **VIP** | High | Prioritize service and personalize interactions |

---

## 6. Common Scenarios

### Scenario 1: Customer Calls Asking About Their Loyalty Points Balance

**Situation:** A customer phones in to ask how many loyalty points they have and whether they have enough to redeem a reward.

**Response:**

1. Ask the customer for their name, email, or phone number.
2. Navigate to `/dashboard/customers` and search for the customer.
3. Open the customer's profile.
4. Navigate to the **Loyalty Points** section.
5. Confirm the current point balance with the customer.
6. If the customer asks about available rewards, refer to the rewards program details in SOP-MANUAL-ADMIN-005 to advise on redemption options and thresholds.
7. If the customer believes their balance is incorrect, review the points history to trace all transactions and resolve the discrepancy.

### Scenario 2: Customer Wants to Update Their Dietary Preferences

**Situation:** A customer contacts the business to add a new dietary restriction (e.g., nut allergy) to their profile.

**Response:**

1. Search for and open the customer's profile at `/dashboard/customers`.
2. Navigate to the **Preferences** section.
3. Click **Edit** to modify the preferences.
4. Add the requested dietary restriction (e.g., "nut allergy").
5. Click **Save** to apply the change.
6. Confirm the update with the customer by reading back the full list of recorded preferences.
7. If the customer has an active or upcoming order, immediately communicate the dietary restriction to the kitchen team.

### Scenario 3: Investigating a Disputed Order Charge

**Situation:** A customer contacts the business claiming they were charged incorrectly for an order.

**Response:**

1. Search for and open the customer's profile at `/dashboard/customers`.
2. Navigate to the **Order History** section.
3. Locate the order in question by date or order number.
4. Click on the order to view its full details, including item prices, quantities, fees, discounts, and total.
5. Compare the charged amount against the itemized breakdown.
6. If the charge is correct, walk the customer through the breakdown to clarify (e.g., service fees, delivery charges, or taxes that may not have been obvious).
7. If an error is found (e.g., duplicate charge, incorrect item price, missing discount):
   - Document the discrepancy.
   - Follow the refund or correction procedure in SOP-MANUAL-ADMIN-001 (Order Management).
   - Confirm the resolution with the customer.
8. If the order was modified by an admin, check `/dashboard/audit-logs` to review the modification history and determine the cause.

### Scenario 4: Identifying VIP Customers for Special Treatment

**Situation:** Management has requested a list of VIP customers for a special promotion or event invitation.

**Response:**

1. Navigate to `/dashboard/customers`.
2. Use the segment filter to select **VIP** customers.
3. Review the filtered list, noting total spending, order frequency, and account tenure.
4. For each VIP customer, open their profile to review their spending summary and preferred items for personalization.
5. Compile the relevant customer information as requested by management.
6. Ensure that any outreach respects the customer's recorded communication preferences (see Part 2, Section 2.5).

---

## 7. Troubleshooting

| Issue | Possible Cause | Resolution |
|---|---|---|
| Customer record not found in search | Incorrect search criteria or customer is a guest without an account | Try searching by alternative fields (email, phone, partial name); check guest customer records |
| Customer profile page not loading | Network connectivity issue or session timeout | Refresh the page; verify your session is active; re-login if necessary |
| Unable to edit customer information | Insufficient permissions for your role | Verify that your role (CSR, Admin, or Super-Admin) has edit access; escalate to a Super-Admin if needed |
| Loyalty points balance appears incorrect | Points not yet awarded for a recent order, or system delay | Verify the order status is Completed (points are awarded on completion); check the points history for the expected transaction; if missing, escalate to a Super-Admin |
| Order history not displaying all orders | Filter or pagination limiting results | Check for active filters; scroll or paginate to view additional orders; clear any applied date range filters |
| Saved preferences not reflecting after edit | Save action not completed or browser cache | Confirm the Save action was clicked; refresh the page; try clearing the browser cache |
| Cannot change customer email address | Email changes are restricted in the dashboard | Email changes require Super-Admin intervention; escalate the request accordingly |
| Customer segment appears incorrect | Segment is system-calculated based on activity thresholds | Segments update automatically based on order history and spending; no manual override is available; verify the customer's order data is complete |

---

## 8. Related Procedures

| Document ID | Title |
|---|---|
| SOP-MANUAL-ADMIN-007 | Audit Log Review and Customer Data Management |
| SOP-MANUAL-ADMIN-005 | Rewards and Loyalty Program Administration |
| SOP-MANUAL-ADMIN-001 | Order Management Procedures |
| SOP-AGENTIC-CUSTOMER-MANAGEMENT | Customer Management (API Counterpart) |

---

## 9. Revision History

| Version | Date | Author | Description of Changes |
|---|---|---|---|
| 1.0 | March 7, 2026 | Operations / Customer Service | Initial release |

---

## 10. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Document Owner | ________________ | ________________ | ________________ |
| Operations Manager | ________________ | ________________ | ________________ |
| Customer Service Lead | ________________ | ________________ | ________________ |
| Approved By | ________________ | ________________ | ________________ |

---

*This document is the property of Wawa Garden Bar. Unauthorized distribution is prohibited. This SOP must be reviewed and updated annually or when significant system or process changes occur.*
