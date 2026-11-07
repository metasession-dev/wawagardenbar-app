# UAT test procedure — REQ-119 Multiple roles per staff account

Read `uat-briefing.md` first. Record every result in `uat-execution-record.md` (section C), using the step IDs below.

Conventions: "sign in" means open `<UAT website>/admin/login`, enter the account's username and password, press the sign-in button. Use a fresh private window per account. "Nav" is the left-hand menu. "Refused" means the Access Forbidden page, a redirect away from the page you asked for, or an error message. Take a screenshot wherever the step says **Evidence**. If wording on screen differs slightly from the expected text but the meaning is the same, mark PASS and note the wording.

Trace: AC = acceptance criterion in `compliance/plans/REQ-119/implementation-plan.md`; SRS = `docs/SRS.md`; Auto = the automated test that covers the same behaviour (`test-plan.md`).

| Step   | Title                                    | AC      | SRS                | Auto          |
| ------ | ---------------------------------------- | ------- | ------------------ | ------------- |
| UAT-01 | Several roles: navigation                | 1, 2, 8 | REQ-AUTHA-004, 005 | US-03.1       |
| UAT-02 | Several roles: advance an order          | 2       | REQ-AUTHA-004      | US-03.1       |
| UAT-03 | Several roles: still no admin areas      | 2, 8    | REQ-AUTHA-005      | US-03.1       |
| UAT-04 | Kitchen-only: landing page and nav       | 8       | REQ-AUTHA-005      | US-03.6       |
| UAT-05 | Kitchen-only: advance an order           | 2, 8    | REQ-AUTHA-005      | US-03.6       |
| UAT-06 | Kitchen-only: refused elsewhere          | 2, 8    | REQ-AUTHA-004, 005 | US-03.6       |
| UAT-07 | Manager: csr items plus reports          | 7, 8    | REQ-AUTHA-005      | US-03.7       |
| UAT-08 | Manager: refused on admin areas          | 7, 8    | REQ-AUTHA-005      | US-03.7       |
| UAT-09 | Single-role csr unchanged                | 2       | REQ-AUTHA-004      | US-03.12      |
| UAT-10 | Role checkboxes (Super Admin)            | 3       | REQ-AUTHA-006      | US-03.2       |
| UAT-11 | Add a role, then remove it               | 3, 5    | REQ-AUTHA-006      | US-03.4, 03.8 |
| UAT-12 | Role change is audited                   | 5       | REQ-AUTHA-006      | US-03.4       |
| UAT-13 | At least one role required               | 3       | REQ-AUTHA-006      | US-03.9       |
| UAT-14 | Admin cannot manage roles                | 3       | REQ-AUTHA-006      | US-03.2       |
| UAT-15 | Cannot change your own roles             | 3       | REQ-AUTHA-006      | US-03.11      |
| UAT-16 | Customer cannot enter dashboard          | 6       | REQ-AUTHA-004      | US-03.5b      |
| UAT-17 | Existing staff unchanged after migration | 4       | REQ-AUTHA-007      | US-03.3       |

AC9 (public admins API, old sessions) is not testable from a screen: N/A for UAT, automated only.

---

## Group 1 — Several roles on one account

### UAT-01 Several roles: navigation

- **Objective:** an account with Customer Service Rep **and** Kitchen sees the menu items of both roles.
- **Account:** `uat-csr-kitchen`.
- **Precondition:** signed out.
- **Steps:**
  1. Sign in as `uat-csr-kitchen`.
  2. Look at the nav on the left.
- **Expected:** you reach the dashboard. The nav contains **Orders**, **Kitchen display**, **Customers** and **Rewards**. The nav does **not** contain **Menu**, **Inventory** or **Settings**.
- **Evidence:** screenshot of the whole dashboard with the nav visible, `UAT-01-csr-kitchen-nav.png`.
- **Stop if this fails:** yes, the rest of Group 1 depends on it.

### UAT-02 Several roles: advance an order

- **Objective:** the kitchen role works for this account (an order can be moved on).
- **Account:** `uat-csr-kitchen`. **Precondition:** the test order from operator checklist item 4 exists.
- **Steps:**
  1. Open **Orders**. Find the test order by the order number the operator gave you.
  2. Open it. Note its current status.
  3. Use the control on the order to move it to the next status (for example Confirmed → Preparing).
- **Expected:** the status changes to the next one and the page shows it without an error. Note both statuses.
- **Evidence:** screenshot after the change, `UAT-02-order-advanced.png`.

### UAT-03 Several roles: still no admin areas

- **Objective:** several roles add access but do not grant roles that were not ticked.
- **Account:** `uat-csr-kitchen`.
- **Steps:** in the address bar, replace the page path with each of these in turn: `/dashboard/settings`, `/dashboard/menu`, `/dashboard/inventory`.
- **Expected:** each is refused. You do not see the Settings, Menu or Inventory pages.
- **Evidence:** screenshot of one refusal, `UAT-03-refused.png`. Note how each was refused.

## Group 2 — Kitchen-only and Manager (new roles)

### UAT-04 Kitchen-only: landing page and nav

- **Account:** `uat-kitchen`. **Precondition:** signed out.
- **Steps:** sign in as `uat-kitchen`. Do not click anything yet. Look at the page and the nav.
- **Expected:** you land on the **Kitchen display** (the kitchen's order screen), not an error and not a blank page. The nav shows **Orders** and **Kitchen display** only. Nothing else (no Customers, Menu, Inventory, Rewards, Reports, Settings). Record anything extra as a FAIL.
- **Evidence:** `UAT-04-kitchen-landing.png`.
- **Stop if this fails:** no.

### UAT-05 Kitchen-only: advance an order

- **Account:** `uat-kitchen`. **Precondition:** an order that can still be advanced (ask the operator to place another test order if UAT-02 finished the order).
- **Steps:** open **Orders**, open the test order, move it to the next status.
- **Expected:** the status changes without an error.
- **Evidence:** `UAT-05-kitchen-advance.png`.

### UAT-06 Kitchen-only: refused elsewhere

- **Account:** `uat-kitchen`.
- **Steps:**
  1. Type each of these addresses in turn: `/dashboard/settings`, `/dashboard/menu`, `/dashboard/inventory`, `/dashboard/customers`, `/dashboard/reports`.
  2. Open the test order again and look for Cancel, Delete or Record payment controls.
- **Expected:** every address is refused. On the order, either there is no Cancel, Delete or Record payment control, or, if one is shown, pressing it produces an error and changes nothing. If the order is cancelled, deleted or marked paid, that is a serious FAIL.
- **Evidence:** `UAT-06-kitchen-refused.png`; note which controls you saw.

### UAT-07 Manager: csr items plus reports

- **Account:** `uat-manager`.
- **Steps:** sign in. Look at the nav. Open **Reports**, then open the daily report.
- **Expected:** the nav shows the csr items (Orders, Customers, Rewards, Incidents) **plus Reports**. The daily report page opens and shows its figures or an empty state, without an access error.
- **Evidence:** `UAT-07-manager-nav.png`, `UAT-07-manager-report.png`.

### UAT-08 Manager: refused on admin areas

- **Account:** `uat-manager`.
- **Steps:** type `/dashboard/settings`, `/dashboard/menu`, `/dashboard/inventory` in turn.
- **Expected:** each is refused.
- **Evidence:** `UAT-08-manager-refused.png`.

### UAT-09 Single-role csr unchanged

- **Objective:** an ordinary one-role account behaves as before this release.
- **Account:** `uat-csr`.
- **Steps:** sign in. Look at the nav. Open **Orders** and **Customers**. Try `/dashboard/reports` and `/dashboard/settings`.
- **Expected:** Orders and Customers open. Reports and Settings are refused. The nav has **no** Kitchen display item.
- **Evidence:** `UAT-09-csr-nav.png`.

## Group 3 — Managing roles (Super Admin)

### UAT-10 Role checkboxes

- **Account:** `uat-super`.
- **Steps:** sign in. Go to **Settings → Manage Admins** (`/dashboard/settings/admins`). On the row for `uat-target` open the actions menu (three dots) and choose **Edit Roles**.
- **Expected:** a dialog titled "Edit roles: uat-target" shows **five** checkboxes: Customer Service Rep, Kitchen, Manager, Admin, Super Admin. All five are clickable (none greyed out). Only Customer Service Rep is ticked.
- **Evidence:** `UAT-10-edit-roles.png`.

### UAT-11 Add a role, then remove it

- **Account:** `uat-super` (to change roles), then `uat-target` (to check).
- **Steps:**
  1. In the dialog from UAT-10 tick **Kitchen** (keep Customer Service Rep ticked) and save.
  2. Look at the message and at the `uat-target` row.
  3. In a **new private window** sign in as `uat-target`. Check the nav, then sign out and close that window.
  4. Back as `uat-super`: edit roles for `uat-target` again, untick **Kitchen**, save.
  5. In a new private window sign in as `uat-target` again. Check the nav. Then type `/dashboard/kitchen-display`.
- **Expected:**
  - Step 1–2: a "Roles updated" message appears; the row shows both Customer Service Rep and Kitchen.
  - Step 3: the nav includes **Kitchen display**.
  - Step 5: the nav has **no** Kitchen display, and `/dashboard/kitchen-display` is refused.
- **Evidence:** `UAT-11-added.png`, `UAT-11-nav-with-kitchen.png`, `UAT-11-nav-without-kitchen.png`.
- **Note:** do not test with a window that was already signed in as `uat-target` during the change (known limit, briefing section 3).

### UAT-12 Role change is audited

- **Account:** `uat-super`.
- **Steps:** open **Audit Logs**. Find the entries for the two role changes you made in UAT-11.
- **Expected:** two rows with action `admin.roles-updated` (one per change, no duplicates). Each shows who made the change (`uat-super`), who it was for (`uat-target`), the roles before and after (first: before Customer Service Rep, after Customer Service Rep and Kitchen; second: the reverse), and the time.
- **Evidence:** `UAT-12-audit-rows.png`.

### UAT-13 At least one role required

- **Account:** `uat-super`.
- **Steps:** open **Edit Roles** for `uat-target`. Untick every checkbox so none is ticked. Press save.
- **Expected:** nothing is saved. A message "Select at least one role." appears and the dialog stays open. Cancel the dialog; confirm the row still shows Customer Service Rep.
- **Evidence:** `UAT-13-no-role.png`.

### UAT-14 Admin cannot manage roles

- **Account:** `uat-admin`.
- **Steps:** sign in. Type `/dashboard/settings/admins`.
- **Expected:** refused. `uat-admin` cannot see or edit any staff roles.
- **Evidence:** `UAT-14-admin-refused.png`.

### UAT-15 Cannot change your own roles

- **Account:** `uat-super`.
- **Steps:** on **Manage Admins**, find the row of `uat-super` itself. Open **Edit Roles**, change any checkbox, save.
- **Expected:** the change is rejected with a message such as "Cannot change your own roles", and the roles do not change. (If the Edit Roles option is not offered on your own row, that is also PASS: note it.)
- **Evidence:** `UAT-15-self-edit.png`.

## Group 4 — Customers and existing staff

### UAT-16 Customer cannot enter the dashboard

- **Account:** the test customer (signed in on the public site, in a private window).
- **Steps:** sign in as the customer on the public UAT site using the way the operator gave you. Then type `/dashboard` and `/dashboard/orders`.
- **Expected:** both are refused or redirected away. No staff menu is ever shown.
- **Evidence:** `UAT-16-customer-refused.png`.

### UAT-17 Existing staff unchanged after migration

- **Account:** the account that existed before this release (operator tells you who, and what access it had before).
- **Steps:** sign in. Compare the nav and one or two pages with what the operator said it could do before.
- **Expected:** exactly the same access as before; nothing is missing and nothing extra appears. The operator also shows you the saved output of the migration dry run and the apply run (attached in section A of the record).
- **Evidence:** `UAT-17-existing-staff.png`.
- **Stop if this fails:** yes, report to the operator at once: this means real staff could be locked out.

---

## After the last step

Complete sections D (defects), E (summary and recommendation) and F (sign-off) of `uat-execution-record.md`. The operator then deletes the throwaway `uat-*` accounts and records the deletion in section A.
