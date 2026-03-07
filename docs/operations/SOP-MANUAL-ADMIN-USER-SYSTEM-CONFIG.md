# Standard Operating Procedure

**Document ID:** SOP-MANUAL-ADMIN-006
**Title:** Admin User Management and System Configuration
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Operations / IT
**Applies To:** Super-Admin (settingsAndConfiguration permission required)
**Classification:** Internal Use Only

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Prerequisites](#3-prerequisites)
4. [Procedure](#4-procedure)
   - [Part 1: Admin User Management](#part-1-admin-user-management)
   - [Part 2: API Key Management](#part-2-api-key-management)
   - [Part 3: Business Settings Configuration](#part-3-business-settings-configuration)
   - [Part 4: Data Requests](#part-4-data-requests)
5. [Quick Reference](#5-quick-reference)
6. [Common Scenarios](#6-common-scenarios)
7. [Troubleshooting](#7-troubleshooting)
8. [Important Reminders](#8-important-reminders)
9. [Related Procedures](#9-related-procedures)
10. [Revision History](#10-revision-history)
11. [Approval](#11-approval)

---

## 1. Purpose

This procedure establishes the standard process for managing administrator accounts, configuring API keys, adjusting business settings, and handling data requests within the Wawa Garden Bar administrative dashboard. It ensures that administrative access is granted consistently, securely, and in accordance with the principle of least privilege.

## 2. Scope

This SOP covers the following administrative functions:

- Creating, modifying, and deactivating admin user accounts
- Assigning roles and granular permissions to admin users
- Generating, monitoring, and revoking API keys
- Configuring business settings including service fees, business hours, delivery parameters, and category management
- Processing customer data requests

All activities described in this document are performed within the administrative dashboard at `/dashboard/settings` and its sub-pages.

## 3. Prerequisites

Before performing any procedure in this document, the following conditions must be met:

| Requirement | Detail |
|---|---|
| **Role** | Super-Admin |
| **Permission** | `settingsAndConfiguration` must be granted |
| **Access URL** | `/dashboard/settings` |
| **Authentication** | Active admin session via `/admin/login` |
| **Browser** | Current version of a supported modern browser |

---

## 4. Procedure

### Part 1: Admin User Management

#### 1.1 Creating a New Admin User

1. Log in to the admin dashboard at `/admin/login` using your username and password.
2. Navigate to **Settings** at `/dashboard/settings`.
3. Select **Admins** at `/dashboard/settings/admins`.
4. Click the **Create New Admin** button.
5. Enter the following required information:
   - **Username** -- Must be unique across all admin accounts.
   - **Password** -- Must meet the system's password complexity requirements.
   - **Display Name** -- The name shown in the dashboard and audit logs.
   - **Email Address** -- Used for account recovery and notifications.
6. Select the appropriate **role** (see Section 1.3).
7. Assign **permissions** (see Section 1.2).
8. Review all entered information for accuracy.
9. Click **Save** to create the account.
10. Confirm the new account appears in the admin list.

**Note:** The new admin's credentials should be communicated to the user through a secure channel. Never send credentials via unencrypted email or messaging platforms.

#### 1.2 Setting Permissions

Each admin account can be granted access to one or more of the following seven permission areas:

| Permission Area | Key | Description |
|---|---|---|
| Order Management | `orderManagement` | View, modify, and manage customer orders |
| Menu Management | `menuManagement` | Create, edit, and remove menu items and categories |
| Inventory Management | `inventoryManagement` | Track and adjust inventory levels |
| Rewards and Loyalty | `rewardsAndLoyalty` | Manage loyalty programs, points, and rewards |
| Reports and Analytics | `reportsAndAnalytics` | Access sales reports, analytics, and dashboards |
| Expenses Management | `expensesManagement` | Record and manage business expenses |
| Settings and Configuration | `settingsAndConfiguration` | Access system settings, admin management, and API keys |

To assign permissions:

1. During account creation or when editing an existing admin, locate the **Permissions** section.
2. Select the checkbox next to each permission area the admin requires.
3. Apply the principle of least privilege -- grant only the permissions necessary for the admin's role and responsibilities.
4. Click **Save** to apply the permission changes.

#### 1.3 Choosing Role: Admin vs Super-Admin

The system supports two distinct roles:

| Role | Access Level | Use Case |
|---|---|---|
| **Admin** | Limited permissions as assigned | Day-to-day staff who need access to specific functional areas only |
| **Super-Admin** | Full access to all system functions | Owners, managers, or IT personnel who require unrestricted access |

**Guidelines for role assignment:**

- Assign the **admin** role by default. Grant only the specific permissions required.
- Reserve the **super-admin** role for personnel who genuinely require full system access.
- Maintain at least two super-admin accounts to prevent lockout scenarios.
- Document the business justification for each super-admin assignment.

#### 1.4 Resetting Admin Passwords

1. Navigate to `/dashboard/settings/admins`.
2. Locate the admin account requiring a password reset.
3. Click on the admin account to open the account details.
4. Select the **Reset Password** option.
5. Enter and confirm the new password.
6. Click **Save** to apply the change.
7. Communicate the new password to the admin through a secure channel.
8. Instruct the admin to change their password upon next login.

#### 1.5 Deactivating Admin Accounts

Admin accounts should be deactivated when:

- An employee leaves the organization
- An admin no longer requires system access
- A security concern is identified with the account

**Procedure:**

1. Navigate to `/dashboard/settings/admins`.
2. Locate the admin account to be deactivated.
3. Click on the account to open the account details.
4. Select the **Deactivate** option.
5. Confirm the deactivation when prompted.
6. Verify the account status is reflected as inactive in the admin list.
7. Review and revoke any API keys associated with the deactivated account.

**Important:** Do not delete admin accounts. Deactivation preserves the audit trail associated with the account's historical actions.

---

### Part 2: API Key Management

#### 2.1 Creating API Keys

1. Navigate to `/dashboard/settings/api-keys`.
2. Click **New API Key**.
3. Enter a descriptive **name** for the key that identifies its intended use (e.g., "POS Integration - Branch 1").
4. Select a **role** to assign a predefined set of scopes:

| Role | Scopes Granted | Use Case |
|------|---------------|----------|
| **Customer** | menu:read, orders:read/write, payments:read/write, rewards:read, tabs:read (7 scopes) | Customer-facing apps, chatbots, ordering kiosks |
| **CSR** | All Customer scopes + customers:read, customers:write, tabs:write (10 scopes) | Customer service tools, CRM integrations |
| **Admin** | All CSR scopes + inventory:read, analytics:read (12 scopes) | Staff tools, POS integrations, display boards |
| **Super Admin** | All 14 scopes | Full system integrations, BI tools, management dashboards |
| **Custom** | Individually selected scopes | Advanced use cases requiring specific scope combinations |

5. Optionally set a **rate limit** (requests per minute, default: 60) and **expiration date**.
6. Click **Create Key**.
7. **Copy the API key immediately.** The full key value is displayed only once at the time of creation.
8. Store the key securely in an approved credential management system.

**Best practice:** Use the role that matches the integration's purpose. Only use Custom when a role grants more access than needed.

#### 2.2 Revoking API Keys

1. Navigate to `/dashboard/settings/api-keys`.
2. Locate the API key to be revoked.
3. Click the **Revoke** action for the key.
4. Confirm the revocation when prompted.
5. Verify the key status is updated to revoked.
6. Notify any teams or systems that were using the revoked key.
7. Update integrations with a replacement key if continued access is required.

**Warning:** Revoking an API key is immediate and irreversible. Any system or integration using the revoked key will lose access instantly.

#### 2.3 Monitoring API Key Usage

1. Navigate to `/dashboard/settings/api-keys`.
2. Review the usage statistics for each active key, including:
   - Last used date and time
   - Request volume
   - Error rates
3. Identify keys with no recent activity -- these may be candidates for revocation.
4. Investigate keys with unusually high request volumes or error rates.
5. Conduct this review on a weekly basis at minimum.

#### 2.4 API Key Scope Reference

The following 14 scopes are available when creating API keys:

| # | Scope | Description |
|---|---|---|
| 1 | `menu:read` | Read access to menu items and categories |
| 2 | `orders:read` | Read access to order data, statistics, and summaries |
| 3 | `orders:write` | Create and modify orders, update order status |
| 4 | `inventory:read` | Read access to inventory levels, alerts, and summaries |
| 5 | `inventory:write` | Adjust inventory quantities (additions and deductions) |
| 6 | `customers:read` | Read access to customer records and analytics |
| 7 | `customers:write` | Create and modify customer records |
| 8 | `payments:read` | Verify payment status |
| 9 | `payments:write` | Initialize and record payments |
| 10 | `tabs:read` | Read access to tabs and tab summaries |
| 11 | `tabs:write` | Create, close, and delete tabs |
| 12 | `rewards:read` | Read rewards data, validate and redeem reward codes |
| 13 | `settings:read` | Read access to system configuration |
| 14 | `analytics:read` | Access to sales summaries and analytics data |

**Role-to-scope mapping:**

| Role | Scopes Included |
|------|----------------|
| **Customer** (7 scopes) | menu:read, orders:read, orders:write, payments:read, payments:write, rewards:read, tabs:read |
| **CSR** (10 scopes) | All Customer scopes + customers:read, customers:write, tabs:write |
| **Admin** (12 scopes) | All CSR scopes + inventory:read, analytics:read |
| **Super Admin** (14 scopes) | All scopes |

**Best practice:** Use role-based keys for standard integrations. Only use Custom scope selection when a predefined role grants more access than needed. Avoid assigning write scopes unless the integration explicitly requires them.

---

### Part 3: Business Settings Configuration

#### 3.1 Service Fee Configuration

1. Navigate to `/dashboard/settings`.
2. Locate the **Service Fees** section.
3. Configure the following parameters:
   - **Fee percentage or flat amount** -- Set the service fee applied to orders.
   - **Fee applicability** -- Define whether the fee applies to all orders, dine-in only, delivery only, or specific order types.
4. Review the fee preview to confirm correct calculation.
5. Click **Save** to apply changes.
6. Verify the fee appears correctly on a test order.

#### 3.2 Business Hours Setup

1. Navigate to `/dashboard/settings`.
2. Locate the **Business Hours** section.
3. For each day of the week:
   - Set the **opening time**.
   - Set the **closing time**.
   - Mark the day as **closed** if applicable.
4. Configure special hours for holidays or events as needed.
5. Click **Save** to apply changes.
6. Confirm that the customer-facing ordering system reflects the updated hours.

#### 3.3 Delivery Settings

1. Navigate to `/dashboard/settings`.
2. Locate the **Delivery** section.
3. Configure the following parameters:

| Setting | Description |
|---|---|
| **Delivery Radius** | Maximum distance (in kilometers or miles) from the business location for delivery eligibility |
| **Delivery Fee** | Flat fee or distance-based fee charged for delivery orders |
| **Minimum Order Amount** | Minimum order value required for delivery eligibility |

4. Save the configuration.
5. Test the delivery settings by simulating an order from various distances to confirm correct behavior.

#### 3.4 Category Management

1. Navigate to `/dashboard/settings`.
2. Locate the **Category Management** section.
3. To **create a new category:**
   - Click **Add Category**.
   - Enter the category name.
   - Set the display order.
   - Click **Save**.
4. To **edit an existing category:**
   - Click on the category name.
   - Modify the name or display order.
   - Click **Save**.
5. To **remove a category:**
   - Ensure no active menu items are assigned to the category.
   - Select the category and click **Delete**.
   - Confirm the deletion.

---

### Part 4: Data Requests

#### 4.1 Processing Customer Data Deletion Requests (GDPR/Privacy)

1. Navigate to `/dashboard/settings/data-requests`.
2. Review the pending data request queue.
3. For each request:
   - Verify the identity of the requestor.
   - Review the type of request (deletion, export, or modification).
   - Assess whether legal or regulatory obligations require data retention.
4. For approved deletion requests:
   - Click **Process** on the request.
   - Confirm the scope of data to be deleted.
   - Execute the deletion.
   - Record the completion in the request log.
5. For requests that cannot be fulfilled:
   - Document the reason (e.g., legal hold, regulatory retention requirement).
   - Notify the requestor with an explanation.

#### 4.2 Reviewing the Data Request Queue

1. Navigate to `/dashboard/settings/data-requests`.
2. Review all pending requests, sorted by date received.
3. Prioritize requests approaching regulatory deadlines (e.g., 30-day GDPR response window).
4. Process each request following the steps in Section 4.1.
5. Conduct this review at least once per business day.

---

## 5. Quick Reference

### Admin Permission Matrix

| Permission | Admin (Default) | Super-Admin |
|---|---|---|
| `orderManagement` | As assigned | Always granted |
| `menuManagement` | As assigned | Always granted |
| `inventoryManagement` | As assigned | Always granted |
| `rewardsAndLoyalty` | As assigned | Always granted |
| `reportsAndAnalytics` | As assigned | Always granted |
| `expensesManagement` | As assigned | Always granted |
| `settingsAndConfiguration` | As assigned | Always granted |
| Create/manage admins | No | Yes |
| Manage API keys | No | Yes |
| Process data requests | No | Yes |
| Access audit logs | No | Yes |

### Key Navigation Paths

| Function | Path |
|---|---|
| Settings Overview | `/dashboard/settings` |
| Admin Management | `/dashboard/settings/admins` |
| API Key Management | `/dashboard/settings/api-keys` |
| Data Requests | `/dashboard/settings/data-requests` |
| Admin Login | `/admin/login` |

---

## 6. Common Scenarios

### Scenario 1: Onboarding a New Manager

1. Create a new admin account (Section 1.1).
2. Assign the **admin** role.
3. Grant permissions for `orderManagement`, `menuManagement`, `inventoryManagement`, `reportsAndAnalytics`, and `expensesManagement`.
4. Withhold `settingsAndConfiguration` and `rewardsAndLoyalty` unless explicitly required.
5. Communicate credentials securely and instruct password change on first login.

### Scenario 2: Setting Up a Third-Party Integration

1. Create an API key with a descriptive name (Section 2.1).
2. Assign only the scopes required by the integration (e.g., `orders:read` and `menu:read` for a display board).
3. Document the integration details and the key's purpose.
4. Schedule a review date to assess whether the key is still in use.

### Scenario 3: Employee Departure

1. Deactivate the admin account immediately (Section 1.5).
2. Revoke any API keys created by or associated with the departing employee (Section 2.2).
3. Review audit logs for any unusual activity prior to departure.
4. Update any shared credentials or system passwords the employee had access to.

### Scenario 4: Updating Delivery Area

1. Navigate to delivery settings (Section 3.3).
2. Adjust the delivery radius to the new coverage area.
3. Update delivery fees if the expanded area requires tiered pricing.
4. Verify minimum order amounts are appropriate for the new radius.
5. Test with sample addresses at the boundary of the new area.

---

## 7. Troubleshooting

| Issue | Possible Cause | Resolution |
|---|---|---|
| Cannot access Settings page | Insufficient permissions | Verify the account has `settingsAndConfiguration` permission and is a super-admin |
| New admin cannot log in | Account not saved or credentials incorrect | Verify the account exists in the admin list; reset the password if necessary |
| API key returns 403 errors | Missing required scopes | Review the key's assigned scopes and add the necessary scope |
| Business hours not updating on customer site | Cache or propagation delay | Clear the application cache; wait for propagation; verify settings were saved |
| Data request not processing | Request in invalid state or system error | Check the request status; review system logs for errors; retry the operation |
| Permission changes not taking effect | Admin session caching | Instruct the admin to log out and log back in to refresh their session |

---

## 8. Important Reminders

1. **All changes are audited.** Every action taken within the settings area is recorded in the audit log with the acting admin's identity, timestamp, and details of the change. Audit logs are accessible at `/dashboard/audit-logs`.

2. **Apply the principle of least privilege.** Grant admin users only the permissions they need to perform their specific duties. Do not assign the super-admin role unless full system access is genuinely required.

3. **Secure API keys.** Treat API keys as sensitive credentials. Store them in approved credential management systems. Never embed keys in client-side code, public repositories, or unencrypted communications.

4. **Review access regularly.** Conduct a quarterly review of all admin accounts and API keys. Deactivate or revoke any that are no longer needed.

5. **Respond to data requests promptly.** Regulatory frameworks such as GDPR require responses within defined timeframes. Review the data request queue daily.

6. **Document all changes.** When modifying business settings (fees, hours, delivery parameters), record the reason for the change and notify affected staff.

7. **Maintain super-admin redundancy.** Ensure at least two super-admin accounts are active at all times to prevent administrative lockout.

---

## 9. Related Procedures

| Document ID | Title |
|---|---|
| SOP-MANUAL-ADMIN-007 | Audit Log Review and Customer Data Management |
| SOP-MANUAL-ADMIN-001 | Order Management Procedures |
| SOP-MANUAL-ADMIN-002 | Menu and Inventory Management |
| SOP-MANUAL-ADMIN-003 | Rewards and Loyalty Program Administration |
| SOP-MANUAL-ADMIN-004 | Reports and Analytics Review |
| SOP-MANUAL-ADMIN-005 | Expense Management |

---

## 10. Revision History

| Version | Date | Author | Description of Changes |
|---|---|---|---|
| 1.0 | March 7, 2026 | Operations / IT | Initial release |

---

## 11. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Document Owner | ________________ | ________________ | ________________ |
| Operations Manager | ________________ | ________________ | ________________ |
| IT Manager | ________________ | ________________ | ________________ |
| Approved By | ________________ | ________________ | ________________ |

---

*This document is the property of Wawa Garden Bar. Unauthorized distribution is prohibited. This SOP must be reviewed and updated annually or when significant system changes occur.*
