# UAT briefing — REQ-119 Multiple roles per staff account

Read this whole page before you start. You do not need to know the system, the code or the business. You need a browser, this pack and about 90 minutes.

Document set (ISO/IEC/IEEE 29119-3): this briefing (context and test plan for UAT), `uat-test-procedure.md` (test case and procedure specification), `uat-execution-record.md` (execution log, incident log, completion report, sign-off).

## 1. What this release is about

Wawa Garden Bar is a restaurant and bar. Staff sign in to a back-office website (the "dashboard") to take and prepare orders, answer customers and run reports.

Until now every staff member had exactly one **role**, and the role decided what they could see and do. Real life is not that tidy: someone might answer customers at the till (**Customer Service Rep**) and also run the kitchen screen (**Kitchen**).

This release lets one staff account hold **several roles at once**. Access is the **sum** of the roles: if any one of your roles allows something, you can do it. It also adds two roles: **Kitchen** and **Manager**.

| Role                       | What the role is for          | Can do (in short)                                                     | Must not do                                                                        |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Customer Service Rep (csr) | Front of house, customer help | Orders, customers, rewards, support and incidents                     | Menu, inventory, settings, reports                                                 |
| Kitchen                    | Preparing orders              | See orders, move an order to its next status, use the Kitchen display | Anything else: menu, inventory, settings, cancel or delete orders, record payments |
| Manager                    | Runs the shift                | Everything a csr can, plus Reports and Incidents                      | Settings, menu, inventory                                                          |
| Admin                      | Back-office administrator     | Features that the account has been given permission for               | Create or edit Admin or Super Admin roles                                          |
| Super Admin                | Owner-level control           | Everything, including editing staff roles in **Settings → Admins**    | Change their own roles; remove the last Super Admin                                |

Customers (people who order food on the public site) are not staff and must never reach the dashboard.

## 2. Why it matters (risk)

This is a **HIGH risk** change because it touches who is allowed to see and do what. The two failures that matter most:

1. A person gets **more** access than they should (for example a kitchen-only account opening Settings, or a customer opening the dashboard).
2. A person gets **less** access than before and cannot do their job (for example an existing csr is suddenly locked out).

Your testing looks for both. A step that fails is a useful result, not a mistake of yours.

## 3. What you are testing, and what you are not

In scope: sign-in and navigation for staff with one or several roles; what each role can and cannot open; editing roles in Settings → Admins; the audit log of role changes; that customers cannot get in; that existing staff still work after the data migration.

Out of scope: ordering as a customer, payments, WhatsApp, menu content, performance, how the site looks on phones.

Known limits. These are expected and are **not defects**; do not raise them:

- If someone is already signed in when their roles are changed, they keep their old access until they sign out and in again (up to 7 days). Step UAT-11 tests the sign-in path.
- The "Change Role" option on the Customers page is greyed out for people with several roles; roles for these people are edited in Settings → Admins.
- Role changes made by script (the migration) are not shown in the UI audit log.

Automated tests already cover the code. Acceptance criterion AC9 (the public admins API and old browser sessions) has no screen to click, so UAT cannot test it; it is covered by automated tests only. This is recorded as not applicable to UAT.

## 4. Your role and the rules

- You are the **UAT tester** and the independent reviewer. Under the project's `dual_actor` approval mode you must be a **different person** from the operator who prepared this release. Write that down in the execution record.
- Follow the steps in order, exactly as written. Do not skip, improvise or "fix" anything.
- Record what actually happened for **every** step, even when it is what you expected.
- If the result is not what the step says, mark **FAIL**, take a screenshot, and log a defect (record, section D). Carry on with the next step unless the step is marked "stop if this fails".
- If you cannot do a step (account missing, page not loading), mark **BLOCKED** and say why.
- Never write passwords in this pack, in screenshots (crop them out), in chat or in tickets.
- Use only the UAT website and the test accounts listed below. Never use the live production site or real customer data.

## 5. Environment

| Item               | Value                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| UAT website        | https://wawagardenbar-app-uat.up.railway.app/                                                                                                      |
| Staff sign-in page | `<UAT website>/admin/login`                                                                                                                        |
| Dashboard          | `<UAT website>/dashboard`                                                                                                                          |
| Release under test | REQ-119, GitHub issue #965, release PR #1012                                                                                                       |
| Build under test   | Fill in: the commit SHA shown on the portal release page, and the date and time UAT was deployed                                                   |
| Browser            | Current Chrome or Edge on a laptop or desktop                                                                                                      |
| Evidence storage   | Save screenshots in `compliance/evidence/REQ-119/uat/uat-evidence/` named `UAT-NN-short-description.png` (or attach them to the portal UAT record) |

UAT is a copy of the system with test data. It is safe to change things here. It is **not** production.

**Switching between accounts.** Roles are decided when you sign in. To change account: click your name or Sign out, then sign in as the next account. Easier and safer: use a separate Chrome profile or a private/incognito window for each account, and close it afterwards. Two accounts in the same normal window will overwrite each other's session.

## 6. Test accounts (operator prepares these before you start)

Passwords are given to you directly by the operator. They are not stored in this repository. Each account is a throwaway made for this UAT and is deleted afterwards.

| Account                                          | Roles it must have                                        | Used for                                  |
| ------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------- |
| `uat-super`                                      | Super Admin (an existing UAT Super Admin account is fine) | Editing roles, audit log                  |
| `uat-admin`                                      | Admin                                                     | Proving an Admin cannot edit roles        |
| `uat-csr`                                        | Customer Service Rep                                      | Baseline csr behaviour                    |
| `uat-csr-kitchen`                                | Customer Service Rep **and** Kitchen                      | The headline feature: several roles       |
| `uat-kitchen`                                    | Kitchen only                                              | Least-privilege role                      |
| `uat-manager`                                    | Manager                                                   | New role                                  |
| `uat-target`                                     | Customer Service Rep (only)                               | The account whose roles you will edit     |
| One test customer                                | none (customer)                                           | Proving customers cannot enter            |
| One account that existed **before** this release | whatever it already had                                   | Proving nothing was lost in the migration |

Operator preparation checklist (done and initialled before the tester starts; record in `uat-execution-record.md` section A):

1. Confirm the release is deployed to UAT and note the build SHA and time.
2. Run `npx tsx scripts/migrate-staff-roles.ts` against UAT as a dry run, read the output, then run it again with `--apply`. Keep the output file as evidence.
3. Sign in as `uat-super`, go to **Settings → Admins → Create Admin**, and create the accounts above, ticking exactly the roles listed. (The create form itself is part of the release; if it misbehaves, tell the tester and record it as a defect.)
4. Place one test order on the public UAT site so an order exists to work on. Write down its order number (it must not be a real customer order).
5. Hand the tester the passwords by a private channel.

## 7. Entry and exit criteria

Start only when every operator checklist item is done and the tester has read this briefing.

Stop and report immediately if you cannot sign in to UAT at all, or if the site shows an error page on every account.

UAT passes (recommendation: **Accept**) when every step is PASS, or any failed step has a defect that the operator and the tester both agree is minor and not about access control. Any FAIL that shows **too much access** or **lost access** means **Reject** until it is fixed. The tester recommends; the portal approval records the decision.

## 8. Words you will see

- **Role**: a label on a staff account that grants access.
- **Dashboard**: the staff back-office website.
- **Nav / navigation**: the menu down the left of the dashboard.
- **Forbidden / refused**: the "Access Forbidden" page, a redirect to another page, or an error message. All three count as being refused.
- **Audit log**: the list in **Audit Logs** of who changed what and when.
- **Migration**: a one-off script that gives every existing staff member a roles list matching their old single role.
