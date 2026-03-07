# Standard Operating Procedure

**Document ID:** SOP-ADMIN-007
**Title:** Audit Log Review and Customer Data Management
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Operations / Compliance
**Applies To:** Super-Admin
**Classification:** Internal Use Only

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Prerequisites](#3-prerequisites)
4. [Procedure](#4-procedure)
   - [Part 1: Audit Log Review](#part-1-audit-log-review)
   - [Part 2: Customer Management](#part-2-customer-management)
   - [Part 3: Data Privacy Compliance](#part-3-data-privacy-compliance)
   - [Part 4: Incident Investigation](#part-4-incident-investigation)
5. [Quick Reference](#5-quick-reference)
6. [Common Scenarios](#6-common-scenarios)
7. [Troubleshooting](#7-troubleshooting)
8. [Related Procedures](#8-related-procedures)
9. [Revision History](#9-revision-history)
10. [Approval](#10-approval)

---

## 1. Purpose

This procedure defines the standard process for reviewing audit logs, managing customer data, ensuring compliance with data privacy regulations, and conducting incident investigations within the Wawa Garden Bar administrative dashboard. It establishes consistent practices for monitoring system activity, maintaining customer records, and responding to data privacy obligations.

## 2. Scope

This SOP covers the following areas:

- Reviewing and analyzing audit log entries for all admin actions
- Managing customer records, including viewing, searching, and segmenting customers
- Processing data privacy requests including data deletion and data export
- Conducting investigations using audit logs to trace actions and document findings
- Maintaining compliance with applicable data privacy regulations (e.g., GDPR)

All activities described in this document are performed within the administrative dashboard, primarily at `/dashboard/audit-logs`, `/dashboard/customers`, and `/dashboard/settings/data-requests`.

## 3. Prerequisites

Before performing any procedure in this document, the following conditions must be met:

| Requirement | Detail |
|---|---|
| **Role** | Super-Admin |
| **Authentication** | Active admin session via `/admin/login` |
| **Access** | Unrestricted access to audit logs, customer management, and data request functions |
| **Browser** | Current version of a supported modern browser |
| **Knowledge** | Familiarity with the system's data model, admin roles, and privacy policies |

**Key System Locations:**

| Function | Path |
|---|---|
| Audit Logs | `/dashboard/audit-logs` |
| Customer Management | `/dashboard/customers` |
| Data Requests | `/dashboard/settings/data-requests` |
| Privacy Policy (Public) | `/privacy` |
| Data Deletion (Public) | `/data-deletion` |

---

## 4. Procedure

### Part 1: Audit Log Review

#### 1.1 Accessing Audit Logs

1. Log in to the admin dashboard at `/admin/login` using your username and password.
2. Navigate to **Audit Logs** at `/dashboard/audit-logs`.
3. The audit log displays a chronological record of all admin actions performed within the system.

#### 1.2 Understanding Log Entries

Each audit log entry contains the following information:

| Field | Description |
|---|---|
| **Who** | The admin username and role of the user who performed the action |
| **What** | The specific action taken (e.g., "Updated menu item", "Created admin account") |
| **When** | The date and time the action was performed (with timezone) |
| **Details** | Additional context including affected records, previous values, and new values where applicable |

All of the following admin actions are tracked in the audit log:

- Login and logout events
- Order changes (status updates, modifications, cancellations)
- Menu edits (item creation, modification, deletion)
- Price changes (before and after values)
- Inventory adjustments (quantity changes, reasons)
- Settings modifications (business hours, fees, delivery parameters)
- Admin account changes (creation, permission changes, deactivation)
- API key operations (creation, revocation)
- Data request processing (deletion, export)

#### 1.3 Filtering by Action Type, User, and Date Range

1. On the audit log page, locate the **filter controls**.
2. Apply filters as needed:
   - **Action Type** -- Select one or more action categories to narrow results (e.g., "Login/Logout", "Menu Changes", "Order Changes").
   - **User** -- Select a specific admin username to view only that user's actions.
   - **Date Range** -- Set a start and end date to limit results to a specific time period.
3. Click **Apply Filters** to update the log display.
4. To clear all filters and return to the full log, click **Reset Filters**.

#### 1.4 Investigating Suspicious Activity

When unusual activity is identified in the audit logs, follow these steps:

1. Note the specific log entries that appear suspicious (e.g., actions outside business hours, bulk deletions, unauthorized settings changes).
2. Filter the log by the **user** associated with the suspicious entries.
3. Review the user's complete activity for the relevant time period.
4. Cross-reference with expected behavior patterns:
   - Was the user scheduled to work at the time of the actions?
   - Do the actions fall within the user's assigned permissions?
   - Is the volume or type of activity consistent with normal operations?
5. Document all findings (see Part 4: Incident Investigation).
6. If unauthorized access is confirmed, immediately deactivate the compromised account (refer to SOP-ADMIN-006, Section 1.5).

#### 1.5 Regular Review Schedule

Audit logs must be reviewed according to the following schedule:

| Review Type | Frequency | Focus |
|---|---|---|
| **Daily Review** | Every business day | Login/logout activity, failed login attempts, order cancellations, and any actions flagged by automated alerts |
| **Weekly Review** | Every Monday | Settings changes, admin account modifications, API key operations, and overall activity patterns for the prior week |
| **Monthly Review** | First business day of each month | Comprehensive review of all action types, user activity summaries, and compliance checks |
| **Ad Hoc Review** | As needed | Triggered by reported incidents, customer complaints, or system anomalies |

**Daily review procedure:**

1. Navigate to `/dashboard/audit-logs`.
2. Set the date range to the previous 24 hours.
3. Review all login/logout events for anomalies.
4. Check for failed login attempts.
5. Review order cancellations and modifications for unusual patterns.
6. Document any findings requiring follow-up.

**Weekly review procedure:**

1. Set the date range to the previous 7 days.
2. Filter by settings-related actions and review all changes.
3. Filter by admin account actions and verify all are authorized.
4. Review API key operations.
5. Check for patterns of unusual activity across all users.
6. Prepare a brief summary for management if significant findings exist.

---

### Part 2: Customer Management

#### 2.1 Viewing Customer Records

1. Navigate to `/dashboard/customers`.
2. The customer list displays all registered and guest customers.
3. Click on a customer record to view their full profile, which includes:
   - **Name** -- Customer's full name
   - **Email** -- Contact email address
   - **Phone** -- Contact phone number
   - **Order History** -- Complete list of past orders with dates, items, and totals
   - **Loyalty Points** -- Current loyalty point balance and history
   - **Addresses** -- Saved delivery addresses

#### 2.2 Searching Customers

1. On the customer management page, locate the **search bar**.
2. Enter one or more of the following search criteria:
   - Customer name (full or partial)
   - Email address
   - Phone number
3. Press **Enter** or click **Search** to execute the query.
4. Review the results and click on the desired customer to view their full record.

#### 2.3 Reviewing Customer Order History and Spending

1. Open the customer record (Section 2.1).
2. Navigate to the **Order History** section.
3. Review the following data points:
   - **Total orders placed** -- Overall count of orders.
   - **Total spending** -- Cumulative amount spent.
   - **Average order value** -- Mean transaction value.
   - **Recent orders** -- The most recent orders with dates, items, and order status.
   - **Preferred items** -- Most frequently ordered items.
4. Use this information to assess customer value, identify trends, and support customer service inquiries.

#### 2.4 Understanding Customer Segments

Customers are categorized into the following segments based on their activity and engagement:

| Segment | Criteria | Characteristics |
|---|---|---|
| **New** | Recently created account with minimal order history | First-time or very recent customers; opportunity for engagement and retention |
| **Returning** | Multiple orders over time with consistent activity | Regular customers with established ordering patterns |
| **VIP** | High order frequency, high total spending, or long-term loyalty | The most valuable customers; prioritize service quality and personalized attention |

Use customer segments to:

- Tailor loyalty rewards and promotions.
- Prioritize customer service responses.
- Identify at-risk customers (e.g., previously active customers with declining order frequency).

---

### Part 3: Data Privacy Compliance

#### 3.1 Processing Data Deletion Requests

Customers may submit data deletion requests through the public-facing page at `/data-deletion`. These requests appear in the admin dashboard at `/dashboard/settings/data-requests`.

**Procedure:**

1. Navigate to `/dashboard/settings/data-requests`.
2. Review each pending deletion request.
3. Verify the requestor's identity:
   - Confirm the request matches a customer record in the system.
   - If identity cannot be verified, contact the requestor for additional verification before proceeding.
4. Assess the request against data retention obligations:
   - Check for any legal holds that prevent deletion.
   - Confirm whether tax or financial record retention requirements apply to the customer's transaction history.
   - Document the assessment.
5. For approved requests:
   - Click **Process** on the request.
   - Select the data categories to be deleted.
   - Confirm and execute the deletion.
   - The system will record the deletion in the audit log.
6. For denied or partially fulfilled requests:
   - Document the specific reason for denial or partial fulfillment.
   - Notify the requestor with a clear explanation.
7. Ensure all requests are processed within the applicable regulatory timeframe (e.g., 30 days under GDPR).

#### 3.2 Customer Data Export

When a customer requests a copy of their data:

1. Navigate to `/dashboard/customers`.
2. Locate and open the customer's record.
3. Initiate a **data export** for the customer.
4. The export will include:
   - Personal information (name, email, phone)
   - Order history
   - Loyalty point records
   - Saved addresses
5. Review the export for completeness and accuracy.
6. Deliver the export to the customer through a secure channel.
7. Record the export action in the data request log.

#### 3.3 Guest-to-Registered User Conversion

Guest customers can be converted to registered users when they create an account:

1. Navigate to `/dashboard/customers`.
2. Identify the guest customer record.
3. When a guest creates an account, the system will:
   - Link the guest order history to the new registered account.
   - Transfer any associated data to the registered profile.
   - Retain the original guest order records under the new account.
4. Verify that the conversion is complete by reviewing the registered account's order history.
5. No manual intervention is typically required; this process is system-managed. Monitor for any conversion errors.

#### 3.4 Data Retention Policies

The following data retention guidelines apply:

| Data Category | Retention Period | Notes |
|---|---|---|
| Customer personal information | Until deletion requested or account inactive per policy | Subject to regulatory requirements |
| Order history | As required by tax/financial regulations | Minimum retention may be mandated by law |
| Audit logs | Indefinite | Required for compliance and security |
| Guest customer data | Until conversion or per retention policy | Encourage guest-to-registered conversion |
| API key records | Indefinite (including revoked keys) | Required for security audit trail |

**Key principles:**

- Retain data only as long as necessary for the stated purpose or legal requirement.
- Review data retention practices annually.
- Document the legal basis for any data retained beyond the standard retention period.
- The public privacy policy at `/privacy` must accurately reflect current retention practices.

---

### Part 4: Incident Investigation

#### 4.1 Using Audit Logs to Trace Actions

When an incident or concern is reported, use the following process to investigate:

1. **Define the scope.** Identify the time period, affected systems, and suspected actions.
2. Navigate to `/dashboard/audit-logs`.
3. Apply filters to narrow the log entries:
   - Set the **date range** to cover the incident period.
   - Filter by the **suspected user** if known.
   - Filter by **action type** relevant to the incident (e.g., "Price Changes" for pricing discrepancies).
4. Review each relevant log entry and note:
   - The exact action performed.
   - The admin who performed it.
   - The timestamp.
   - The before and after values (where recorded).
5. Construct a timeline of events based on the log entries.
6. Cross-reference with other data sources (e.g., customer complaints, order records, system logs) to corroborate findings.

#### 4.2 Documenting Findings

All investigation findings must be documented. The documentation should include:

1. **Incident summary** -- A brief description of the incident or concern that triggered the investigation.
2. **Investigation scope** -- The time period, systems, and users examined.
3. **Timeline of events** -- A chronological account of relevant actions, based on audit log entries.
4. **Evidence** -- Screenshots or exports of relevant audit log entries.
5. **Root cause** -- The identified cause of the incident (if determined).
6. **Impact assessment** -- The scope and severity of the incident's impact (e.g., number of affected orders, financial impact, data exposure).
7. **Recommendations** -- Suggested corrective actions, process changes, or security improvements.
8. **Status** -- Current status of the investigation (open, pending review, closed).

Store all investigation documentation in the designated secure location as determined by management.

#### 4.3 Escalation Procedures

Escalate an incident based on severity:

| Severity | Criteria | Escalation |
|---|---|---|
| **Low** | Minor process deviation, no data exposure, no financial impact | Document and address in next regular review |
| **Medium** | Unauthorized access to non-sensitive areas, minor data handling error, small financial discrepancy | Report to Operations Manager within 24 hours |
| **High** | Unauthorized access to sensitive data, customer data exposure, significant financial impact | Report to Operations Manager and IT Manager immediately |
| **Critical** | Confirmed data breach, compromised admin account, regulatory violation | Report to all stakeholders immediately; initiate breach response protocol; consider regulatory notification obligations |

**For High and Critical incidents:**

1. Immediately deactivate any compromised admin accounts.
2. Revoke any potentially compromised API keys.
3. Preserve all audit log evidence (do not modify or delete).
4. Notify management and legal/compliance as required.
5. Document all actions taken during the response.

---

## 5. Quick Reference

### Audit Log Action Types

| Action Category | Examples | Priority for Review |
|---|---|---|
| **Authentication** | Admin login, admin logout, failed login attempt | High -- review daily |
| **Order Management** | Order status change, order modification, order cancellation, refund issued | Medium -- review daily |
| **Menu Changes** | Item created, item updated, item deleted, price changed | Medium -- review weekly |
| **Inventory** | Stock adjusted, item restocked, low stock alert acknowledged | Low -- review weekly |
| **Settings** | Business hours changed, service fee updated, delivery radius modified | High -- review immediately upon occurrence |
| **Admin Management** | Admin created, admin deactivated, permissions changed, password reset | High -- review immediately upon occurrence |
| **API Keys** | Key created, key revoked | High -- review immediately upon occurrence |
| **Data Requests** | Deletion request received, deletion processed, export generated | High -- review daily |
| **Loyalty/Rewards** | Points issued, points redeemed, reward created, reward modified | Low -- review weekly |
| **Expenses** | Expense created, expense modified, expense deleted | Medium -- review weekly |

### Key Navigation Paths

| Function | Path |
|---|---|
| Audit Logs | `/dashboard/audit-logs` |
| Customer Management | `/dashboard/customers` |
| Data Requests | `/dashboard/settings/data-requests` |
| Privacy Policy (Public) | `/privacy` |
| Data Deletion (Public) | `/data-deletion` |
| Admin Login | `/admin/login` |

---

## 6. Common Scenarios

### Scenario 1: Unusual Login Pattern Detected

**Situation:** During the daily audit log review, you notice multiple login events for an admin account at unusual hours (e.g., 3:00 AM on a weekday).

**Response:**

1. Filter audit logs by the specific admin user for the past 7 days.
2. Review all actions performed during the unusual login sessions.
3. Determine whether the actions are consistent with legitimate work (e.g., scheduled maintenance, emergency response).
4. Contact the admin to verify whether they performed the actions.
5. If the admin confirms the activity, document the finding and close.
6. If the admin denies the activity:
   - Immediately deactivate the account.
   - Reset the account password.
   - Review all actions performed during the suspicious sessions.
   - Escalate as a High severity incident.
   - Investigate potential credential compromise.

### Scenario 2: Unauthorized Access Attempt

**Situation:** The audit log shows repeated failed login attempts for one or more admin accounts.

**Response:**

1. Identify the target account(s) and the source of the attempts.
2. Determine the frequency and pattern of the failed attempts.
3. If the attempts are concentrated on a single account:
   - Notify the account owner.
   - Consider temporarily deactivating the account as a precaution.
   - Reset the password.
4. If the attempts span multiple accounts:
   - Escalate as a High severity incident.
   - Review all admin accounts for unauthorized access.
   - Consider implementing additional security measures.
5. Document the incident and monitor for continued attempts.

### Scenario 3: Data Deletion Request Received

**Situation:** A customer submits a data deletion request through the `/data-deletion` page.

**Response:**

1. Navigate to `/dashboard/settings/data-requests`.
2. Locate the new request in the queue.
3. Verify the requestor's identity against customer records at `/dashboard/customers`.
4. Review the customer's order history for any records subject to mandatory retention (e.g., tax compliance).
5. If the request can be fully fulfilled:
   - Process the deletion.
   - Confirm completion in the data request log.
   - The system records the action in the audit log.
6. If partial retention is required:
   - Delete all data not subject to retention requirements.
   - Document the retained data and the legal basis for retention.
   - Notify the customer of the partial fulfillment and the reason.
7. Ensure the entire process is completed within the regulatory timeframe.

### Scenario 4: Price Change Discrepancy

**Situation:** A customer reports being charged a different price than what is displayed on the menu.

**Response:**

1. Navigate to `/dashboard/audit-logs`.
2. Filter by **Menu Changes** action type.
3. Set the date range to cover the period around the customer's order.
4. Identify any price change entries for the item in question.
5. Review the before and after values, the admin who made the change, and the timestamp.
6. Cross-reference with the customer's order timestamp to determine which price should have applied.
7. Resolve the customer's concern based on the findings.
8. If the price change was unauthorized, escalate per Section 4.3.

---

## 7. Troubleshooting

| Issue | Possible Cause | Resolution |
|---|---|---|
| Audit logs not loading | Network connectivity issue or session timeout | Refresh the page; verify your session is active; re-login if necessary |
| Filters not returning expected results | Incorrect filter criteria or date range | Verify filter selections; expand the date range; clear and reapply filters |
| Customer record not found | Incorrect search criteria or guest customer without account | Try searching by alternative fields (email, phone); check guest customer records |
| Data deletion request not appearing | Request still processing or submission error | Verify on the public `/data-deletion` page that the request was submitted; check system status |
| Audit log entries missing details | Action type does not capture extended details | Some actions record only the action and actor; cross-reference with related system records for additional details |
| Unable to export customer data | System error or insufficient permissions | Verify super-admin access; check for system errors in the audit log; contact technical support if the issue persists |
| Guest customer conversion not linking history | System matching error | Manually verify the guest and registered records; contact technical support for manual linkage if needed |

---

## 8. Related Procedures

| Document ID | Title |
|---|---|
| SOP-ADMIN-006 | Admin User Management and System Configuration |
| SOP-ADMIN-001 | Order Management Procedures |
| SOP-ADMIN-002 | Menu and Inventory Management |
| SOP-ADMIN-003 | Rewards and Loyalty Program Administration |
| SOP-ADMIN-004 | Reports and Analytics Review |
| SOP-ADMIN-005 | Expense Management |

---

## 9. Revision History

| Version | Date | Author | Description of Changes |
|---|---|---|---|
| 1.0 | March 7, 2026 | Operations / Compliance | Initial release |

---

## 10. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Document Owner | ________________ | ________________ | ________________ |
| Operations Manager | ________________ | ________________ | ________________ |
| Compliance Officer | ________________ | ________________ | ________________ |
| Approved By | ________________ | ________________ | ________________ |

---

*This document is the property of Wawa Garden Bar. Unauthorized distribution is prohibited. This SOP must be reviewed and updated annually or when significant system or regulatory changes occur.*
