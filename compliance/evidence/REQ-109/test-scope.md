# Test scope — REQ-109

Extracted from `compliance/plans/REQ-109/implementation-plan.md` §1. Risk class: **HIGH**.

| AC  | Description                                                                                                                                                                    | SRS item                         | Verification method                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------- |
| AC1 | Given a `csr`, `admin`, or `super-admin` user is logged in, When they open `/dashboard/orders`, Then "Quick Actions" and its three cards are not present anywhere on the page. | REQ-ORDMGT-010                   | E2E (Playwright)                    |
| AC2 | Given a `csr` user is logged in, When they open `/dashboard/orders`, Then "Admin Order Management" and its four cards are visible, same as for `admin`/`super-admin`.          | REQ-ORDMGT-010                   | E2E (Playwright)                    |
| AC3 | Given a `csr` user, When they use "Create a new Tab" (Express flow), Then the tab is created successfully.                                                                     | REQ-TABMGT-010                   | E2E (Playwright) + integration      |
| AC4 | Given a `csr` user, When they use "Create a new Order" (Express flow) against an open tab, Then the order is added successfully.                                               | REQ-ORDMGT-018                   | E2E (Playwright) + integration      |
| AC5 | Given a `csr` user, When they use "Close a Tab" (Express flow), Then the tab closes successfully and payment is recorded.                                                      | REQ-TABMGT-010                   | E2E (Playwright) + integration      |
| AC6 | Given a `csr` user, When they cancel an order, delete an order, or write off a tab, Then the action succeeds.                                                                  | REQ-ORDMGT-018 / REQ-TABMGT-007  | Integration + E2E                   |
| AC7 | Given a `csr` or `admin` user, When they attempt `deleteTabAction` with `superAdminOverride: true`, Then the action is rejected.                                               | REQ-TABMGT-004                   | Integration (unit-level regression) |
| AC8 | Given a customer/guest, When they complete checkout via `/menu` → `/checkout`, Then the order/tab is created with no tab UI ever presented to them.                            | REQ-ORDER-002 / REQ-CHECKOUT-007 | E2E (Playwright)                    |
