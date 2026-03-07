# SOP-ADMIN-005: Rewards and Loyalty Program Management

| Field            | Detail                                              |
|------------------|-----------------------------------------------------|
| **Document ID**  | SOP-ADMIN-005                                       |
| **Title**        | Rewards and Loyalty Program Management               |
| **Version**      | 1.0                                                 |
| **Effective Date** | March 7, 2026                                     |
| **Department**   | Operations / Marketing                              |
| **Applies To**   | Super-Admin (rewardsAndLoyalty permission required)  |
| **Classification** | Internal Use Only                                 |

---

## Table of Contents

1. [Purpose, Scope, and Prerequisites](#1-purpose-scope-and-prerequisites)
2. [Procedure](#2-procedure)
   - [Part 1: Understanding the Rewards System](#part-1-understanding-the-rewards-system)
   - [Part 2: Configuring Reward Rules](#part-2-configuring-reward-rules)
   - [Part 3: Managing Reward Templates](#part-3-managing-reward-templates)
   - [Part 4: Manual Reward Issuance](#part-4-manual-reward-issuance)
   - [Part 5: Monitoring the Program](#part-5-monitoring-the-program)
   - [Part 6: Handling Reward Disputes](#part-6-handling-reward-disputes)
3. [Quick Reference, Common Scenarios, and Troubleshooting](#3-quick-reference-common-scenarios-and-troubleshooting)
4. [Related Procedures](#4-related-procedures)
5. [Revision History and Approval](#5-revision-history-and-approval)

---

## 1. Purpose, Scope, and Prerequisites

### 1.1 Purpose

This Standard Operating Procedure defines the processes for configuring, operating, and maintaining the Wawa Garden Bar rewards and loyalty program. The loyalty program is designed to incentivise repeat visits, increase customer engagement, and reward loyal patrons through a points-based system. This document ensures that all administrators managing the program do so consistently and in accordance with established business rules.

### 1.2 Scope

This procedure covers the following activities:

- Configuration of reward earning rules and point values.
- Creation and management of reward templates.
- Manual issuance of rewards to customers.
- Monitoring of program performance, including issued rewards and redemption rates.
- Resolution of customer disputes related to points and rewards.

All monetary values referenced in this procedure are denominated in Nigerian Naira (NGN, symbol: ₦). The standard conversion rate for the loyalty program is **100 points = ₦1**.

### 1.3 Prerequisites

| Prerequisite | Detail |
|---|---|
| **Role** | Super-Admin account with the `rewardsAndLoyalty` permission enabled. |
| **System Access** | Authenticated session in the Wawa Garden Bar dashboard application. |
| **Prior Knowledge** | Familiarity with the customer database, order processing workflow, and the points conversion rate (100 points = ₦1). |

---

## 2. Procedure

### Part 1: Understanding the Rewards System

#### 1.1 Points Earning Rules

The rewards system operates on a points-based model. Customers earn points through defined actions, which are configured as **reward rules** in the system. Points accumulate in the customer's loyalty account and can be redeemed for rewards at checkout.

Key principles:

- Points are earned automatically when a qualifying action is completed (e.g., an order is fulfilled), provided a reward rule exists for that action.
- Points may also be earned through promotional or engagement-based triggers (e.g., following the establishment on Instagram).
- Points are credited to the customer's account upon completion of the triggering action, not at the time of initiation.

#### 1.2 Points Conversion Rate

The standard conversion rate is:

> **100 points = ₦1**

This means a customer must accumulate 10,000 points to earn ₦100 in redeemable value. The conversion rate is a system-wide setting and should not be modified without authorisation from management.

#### 1.3 Reward Types

Rewards available in the system may include, but are not limited to:

| Reward Type | Description |
|---|---|
| Discount | A percentage or fixed-amount discount applied at checkout. |
| Free Item | A complimentary menu item redeemed using accumulated points. |
| Voucher | A monetary credit added to the customer's account for future use. |
| Custom Reward | A bespoke reward defined by management for special promotions. |

Reward types are configured through **reward templates** (see Part 3).

---

### Part 2: Configuring Reward Rules

Reward rules define how customers earn points. All rule configuration is performed at `/dashboard/rewards/rules`.

#### 2.1 Creating a New Earning Rule

1. Navigate to **Reward Rules** at `/dashboard/rewards/rules`.
2. Select the option to create a new rule.
3. Complete the following fields:

| Field | Description | Example |
|---|---|---|
| **Rule Name** | A descriptive name for the rule. | "Points on Order Completion" |
| **Trigger** | The action that causes points to be awarded. | Order completion |
| **Points Value** | The number of points awarded when the trigger occurs. | 500 points |
| **Conditions** | Any additional conditions that must be met. | Minimum order value of ₦5,000 |
| **Status** | Whether the rule is active or inactive. | Active |

4. Review the rule configuration for accuracy.
5. Save the rule.

#### 2.2 Setting Point Values

When determining point values for a new rule, consider the following:

- **Business impact:** Higher point values accelerate customer progression toward rewards and increase redemption liability.
- **Conversion rate context:** At 100 points = ₦1, awarding 1,000 points is equivalent to ₦10 in future redeemable value.
- **Competitive positioning:** Point values should be attractive enough to motivate customer participation without creating unsustainable redemption obligations.
- **Approval:** Any rule awarding more than 5,000 points per trigger should be reviewed and approved by management before activation.

#### 2.3 Defining Conditions and Triggers

Supported triggers may include:

| Trigger | Description |
|---|---|
| Order Completion | Points awarded when a customer's order is completed and paid. |
| Instagram Follow | Points awarded when a customer follows the establishment's Instagram account (verified manually or via integration). |
| Birthday | Points awarded on a customer's birthday (requires date of birth on file). |
| Referral | Points awarded when a customer refers a new patron who completes an order. |
| Minimum Spend | Points awarded when a customer's order exceeds a specified value. |

Conditions can be combined with triggers to create targeted rules. For example, a rule might award bonus points for orders exceeding ₦10,000 placed on a specific day of the week.

---

### Part 3: Managing Reward Templates

Reward templates define the structure and value of rewards that customers can redeem. Templates are managed at `/dashboard/rewards/templates`.

#### 3.1 Creating a New Template

1. Navigate to **Reward Templates** at `/dashboard/rewards/templates`.
2. Select the option to create a new template.
3. Complete the following fields:

| Field | Description | Example |
|---|---|---|
| **Template Name** | A descriptive name for the reward. | "10% Discount Voucher" |
| **Reward Type** | The type of reward (discount, free item, voucher, custom). | Discount |
| **Value** | The reward value (percentage, fixed amount, or item). | 10% |
| **Points Required** | The number of points a customer must redeem. | 50,000 points |
| **Expiry Period** | Duration after issuance before the reward expires. | 30 days |
| **Terms** | Any terms or conditions for the reward. | "Cannot be combined with other offers." |

4. Review the template for accuracy.
5. Save the template.

#### 3.2 Editing Existing Templates

1. Navigate to **Reward Templates** at `/dashboard/rewards/templates`.
2. Locate the template to be edited from the list.
3. Select the template to open it for editing.
4. Modify the required fields.
5. Review the changes. Note that changes to a template do not retroactively affect rewards that have already been issued from that template.
6. Save the updated template.

**Important:** Deactivating or deleting a template does not revoke rewards already issued. Previously issued rewards remain valid until their expiry date unless individually revoked.

---

### Part 4: Manual Reward Issuance

While most rewards are earned automatically through reward rules, there are situations where manual issuance is required.

#### 4.1 When to Manually Issue Rewards

Manual reward issuance is appropriate in the following circumstances:

- **Service recovery:** Compensating a customer for a poor experience (e.g., long wait time, incorrect order).
- **Promotional activity:** Awarding bonus points or rewards as part of a marketing campaign not covered by automated rules.
- **System error correction:** Replacing points or rewards that were not credited due to a technical issue.
- **Management discretion:** Special recognition of a loyal or high-value customer at the direction of management.

Manual issuance should not be used as a substitute for properly configured reward rules. If a recurring need for manual issuance is identified, a new automated rule should be created.

#### 4.2 Process for Issuing Rewards Manually

1. Navigate to **Issued Rewards** at `/dashboard/rewards/issued`.
2. Select the option to issue a new reward manually.
3. Search for and select the customer's account.
4. Select the reward template to issue, or specify a custom points amount.
5. Enter the reason for manual issuance in the notes or comments field.
6. Review the details and confirm issuance.
7. Notify the customer that the reward or points have been added to their account.

#### 4.3 Documentation Requirements

All manual reward issuances must be documented with:

- The customer's name and account identifier.
- The reward or points amount issued.
- The reason for manual issuance.
- The name of the staff member who authorised and performed the issuance.
- The date and time of issuance.

This information must be recorded in the system notes at the time of issuance. Manual issuances are subject to periodic audit by management.

---

### Part 5: Monitoring the Program

Regular monitoring ensures the loyalty program remains effective, financially sustainable, and free of irregularities.

#### 5.1 Reviewing Issued Rewards

1. Navigate to **Issued Rewards** at `/dashboard/rewards/issued`.
2. Review the list of recently issued rewards, noting:
   - Volume of rewards issued (daily, weekly, monthly).
   - Breakdown by reward type.
   - Proportion of automatic vs. manual issuances.
3. Flag any unusual patterns, such as a spike in manual issuances or an unusually high volume of a specific reward type.

#### 5.2 Tracking Redemption Rates

1. Navigate to the **Rewards Overview** at `/dashboard/rewards`.
2. Review redemption data to understand:
   - What percentage of issued rewards are being redeemed.
   - The average time between issuance and redemption.
   - The total monetary value of redeemed rewards.
3. Low redemption rates may indicate that rewards are not attractive or that customers are not aware of their balances. Consider promotional communication or rule adjustments.
4. Very high redemption rates combined with high issuance volumes may indicate a financial sustainability concern. Escalate to management for review.

#### 5.3 Identifying Popular Rewards

1. Review issuance and redemption data to identify which reward templates are most frequently issued and redeemed.
2. Use this data to inform decisions about:
   - Which templates to promote or feature.
   - Which templates to retire due to low engagement.
   - Whether new templates should be created to fill gaps.

---

### Part 6: Handling Reward Disputes

Customer disputes related to the loyalty program must be handled promptly and professionally.

#### 6.1 Customer Claims Missing Points

**Situation:** A customer believes they should have received points for a qualifying action but their account does not reflect the expected balance.

**Resolution:**

1. Ask the customer for details: the date and nature of the qualifying action (e.g., order number, date of visit).
2. Navigate to the customer's account in the system and review their points history.
3. Cross-reference with order records or other relevant data to verify whether the qualifying action occurred.
4. If the action occurred and points were not credited:
   - Identify the cause (e.g., rule was inactive, system error, order was not linked to the customer's account).
   - Manually issue the appropriate number of points (see Part 4).
   - Document the correction and the root cause.
5. If the action did not occur or does not qualify:
   - Explain the reward rules to the customer clearly and respectfully.
   - Provide a summary of the qualifying conditions.
6. If the root cause indicates a systemic issue, escalate to the technical team for investigation.

#### 6.2 Expired Reward Complaints

**Situation:** A customer attempts to redeem a reward that has expired and requests an exception.

**Resolution:**

1. Verify the reward details in the system, including the issuance date and expiry date.
2. Confirm that the reward has indeed expired.
3. Evaluate the circumstances:
   - **If the reward expired very recently (within 7 days):** At the manager's discretion, a replacement reward with a new expiry date may be issued. Use the manual issuance process (Part 4) and document the reason as "expired reward reinstatement."
   - **If the reward expired more than 7 days ago:** Politely inform the customer that the reward has expired and cannot be reinstated. Offer to explain how they can earn new rewards.
   - **If there are extenuating circumstances** (e.g., the customer was abroad, a system issue prevented redemption): Escalate to the manager for a case-by-case decision.
4. Regardless of the outcome, document the interaction and resolution in the customer's account notes.

---

## 3. Quick Reference, Common Scenarios, and Troubleshooting

### Quick Reference

| Task | Location |
|---|---|
| View rewards overview | `/dashboard/rewards` |
| Manage reward rules | `/dashboard/rewards/rules` |
| View issued rewards | `/dashboard/rewards/issued` |
| Manage reward templates | `/dashboard/rewards/templates` |
| Points conversion rate | 100 points = ₦1 |

### Common Scenarios

#### Scenario 1: Creating a Promotional Points Campaign

**Situation:** Management wants to offer double points on all orders during a weekend promotion.

**Steps:**
1. Navigate to `/dashboard/rewards/rules`.
2. Create a new rule with the trigger "Order Completion."
3. Set the points value to double the standard earning rate.
4. Add a condition limiting the rule to the promotion dates.
5. Set the rule to "Active."
6. After the promotion period ends, deactivate the rule to prevent further double-point awards.

#### Scenario 2: Customer Wants to Check Their Points Balance

**Situation:** A customer asks how many points they have.

**Steps:**
1. Search for the customer's account in the system.
2. Navigate to their loyalty/points history.
3. Inform the customer of their current balance and the equivalent value in NGN (divide points by 100).

#### Scenario 3: Points Redeemed at Checkout but Order Cancelled

**Situation:** A customer redeemed points at checkout, but the order was subsequently cancelled.

**Steps:**
1. Verify the order cancellation in the system.
2. Check whether the redeemed points were automatically refunded to the customer's account.
3. If points were not refunded automatically, manually issue the equivalent points using the process in Part 4.
4. Document the correction and reference the cancelled order number.

### Troubleshooting

| Issue | Possible Cause | Resolution |
|---|---|---|
| Points not awarded after order completion | Reward rule is inactive or has unmet conditions. | Check rule status and conditions at `/dashboard/rewards/rules`. Activate or adjust the rule as needed. |
| Customer cannot redeem points at checkout | Insufficient points balance or reward has expired. | Verify the customer's balance and the reward's expiry status. |
| Duplicate points awarded for same action | Multiple active rules with overlapping triggers. | Review all active rules and deactivate or consolidate duplicates. |
| Reward template not appearing for redemption | Template is inactive or has been deleted. | Check the template status at `/dashboard/rewards/templates`. |
| Manual issuance not reflecting on customer account | System delay or session error. | Refresh the page and verify. If the issue persists, log out and log back in, then re-check. Escalate to the technical team if unresolved. |

---

## 4. Related Procedures

| Document ID | Title |
|---|---|
| SOP-ADMIN-001 | Menu and Inventory Management |
| SOP-ADMIN-002 | Staff and Role Management |
| SOP-ADMIN-003 | Order Processing and Table Management |
| SOP-ADMIN-004 | Daily Close-Out and Financial Reporting |

---

## 5. Revision History and Approval

### Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | March 7, 2026 | Operations / Marketing | Initial release. |

### Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Document Author | ________________ | ________________ | ________________ |
| Operations Manager | ________________ | ________________ | ________________ |
| Marketing Lead | ________________ | ________________ | ________________ |

---

*This document is the property of Wawa Garden Bar. Unauthorised distribution is prohibited. This SOP must be reviewed at least annually or whenever significant changes are made to the rewards and loyalty program configuration or policies.*
