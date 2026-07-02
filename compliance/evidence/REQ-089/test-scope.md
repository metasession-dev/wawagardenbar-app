# Test scope — REQ-089

**Requirement:** REQ-089 — Admin order management: portion size selection, manual price override, per-item special instructions, stock validation
**Risk class:** MEDIUM
**Issue:** [#452](https://github.com/metasession-dev/wawagardenbar-app/issues/452)

## Acceptance criteria

| AC  | Description                                                                                                                                                                                                                                                      | SRS item             | Verification method |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------- |
| AC1 | Given a menu item with portion options enabled, When staff open Express Create Order and click the item, Then a portion size selector (Full/Half/Quarter) appears with adjusted prices and the selected portion is persisted on the cart line.                   | REQ-ORDMGT-008       | E2E + unit          |
| AC2 | Given a menu item with portion options enabled, When staff open the Edit Order Dialog and add or edit an item, Then a portion size selector appears and the portion size can be changed with price recalculation.                                                | REQ-ORDMGT-003       | E2E + unit          |
| AC3 | Given a menu item with `allowManualPriceOverride: true`, When staff add the item in Express Create Order, Then an "Override Price" button appears, clicking it opens `PriceOverrideDialog` with reason capture, and the override is persisted on the order line. | REQ-ORDMGT-004       | E2E + unit          |
| AC4 | Given a menu item with `allowManualPriceOverride: true`, When staff edit an order line in the Edit Order Dialog, Then an "Override Price" button appears and the override is persisted with all metadata fields.                                                 | REQ-ORDMGT-004       | E2E + unit          |
| AC5 | Given the customer-facing cart, When any user views a cart line, Then no price override button, dialog, or `allowManualPriceOverride` forwarding is present.                                                                                                     | REQ-ORDMGT-011 (new) | E2E                 |
| AC6 | Given staff are creating an order in Express Create Order, When they view a cart line, Then a special instructions textarea is available per line and persisted to `specialInstructions`.                                                                        | REQ-ORDMGT-012 (new) | E2E + unit          |
| AC7 | Given staff are editing an order in the Edit Order Dialog, When they view an existing order item, Then a special instructions textarea is available and edits are persisted on save.                                                                             | REQ-ORDMGT-003       | E2E + unit          |
| AC8 | Given staff submit an order via Express Create Order, When any item's quantity (adjusted by portion multiplier) exceeds available `currentStock`, Then the server rejects with a clear error naming the item.                                                    | REQ-MENU-004         | Unit                |
| AC9 | Given staff are adding items in Express Create Order, When an item is out-of-stock, Then the item card is disabled and cannot be added to the cart.                                                                                                              | REQ-MENU-004         | E2E                 |
