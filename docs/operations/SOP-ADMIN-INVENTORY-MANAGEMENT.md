# Standard Operating Procedure

| Field            | Detail                                          |
|------------------|-------------------------------------------------|
| **Document ID**  | SOP-ADMIN-003                                   |
| **Title**        | Inventory Management                            |
| **Version**      | 1.0                                             |
| **Effective Date** | March 7, 2026                                 |
| **Department**   | Operations / Management                         |
| **Applies To**   | Super-Admin (inventoryManagement permission required) |

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Prerequisites](#3-prerequisites)
4. [Procedure](#4-procedure)
   - 4.1 Viewing Inventory Status and Stock Levels
   - 4.2 Adding Stock (Receiving Deliveries)
   - 4.3 Stock Transfers Between Locations
   - 4.4 Conducting Inventory Counts (Snapshots)
   - 4.5 Handling Low Stock Alerts
   - 4.6 Adjusting Stock for Waste, Breakage, and Spillage
   - 4.7 Reviewing Stock Movement History
5. [Quick Reference](#5-quick-reference)
6. [Common Scenarios](#6-common-scenarios)
7. [Troubleshooting](#7-troubleshooting)
8. [Related Procedures](#8-related-procedures)
9. [Revision History](#9-revision-history)
10. [Approval](#10-approval)

---

## 1. Purpose

This procedure establishes the standardized process for managing inventory within the Wawa Garden Bar management dashboard. It ensures that stock levels are accurately tracked, deliveries are properly recorded, physical counts are conducted systematically, and stock discrepancies are promptly identified and resolved.

## 2. Scope

This SOP covers all inventory management operations performed through the Wawa Garden Bar dashboard, including:

- Viewing and monitoring inventory status and stock levels across all locations
- Recording stock additions from deliveries
- Transferring stock between storage locations
- Conducting physical inventory counts using snapshots
- Responding to and resolving low stock alerts
- Adjusting stock for waste, breakage, and spillage
- Reviewing stock movement history and audit records

This procedure does **not** cover menu item creation or pricing (see SOP-ADMIN-002).

## 3. Prerequisites

| Requirement         | Detail                                                              |
|---------------------|---------------------------------------------------------------------|
| **Role**            | Super-Admin                                                         |
| **Permission**      | `inventoryManagement` permission must be granted to the user        |
| **Access**          | Authenticated session on the Wawa Garden Bar dashboard              |
| **Dashboard Paths** | `/dashboard/inventory` (stock levels)                               |
|                     | `/dashboard/inventory/snapshots` (inventory counts)                 |
|                     | `/dashboard/inventory/transfer` (location transfers)                |

Before performing any inventory management task, confirm that:

1. You are logged in with a Super-Admin account that holds the `inventoryManagement` permission.
2. You have the relevant documentation available (delivery notes, count sheets, transfer requests).
3. You understand the location structure: bar, chiller, storage, kitchen, and other configured locations.

---

## 4. Procedure

### 4.1 Viewing Inventory Status and Stock Levels

1. Navigate to `/dashboard/inventory`.
2. The inventory dashboard displays all tracked items with the following data:

   | Field              | Description                                                    |
   |--------------------|----------------------------------------------------------------|
   | **Item Name**      | The name of the inventory item.                                |
   | **Current Stock**  | The current quantity on hand.                                  |
   | **Minimum Stock**  | The threshold below which a low stock alert is triggered.      |
   | **Maximum Stock**  | The upper limit for stock (used for reorder planning).         |
   | **Unit**           | The unit of measurement (e.g., kg, litres, pieces, bottles).   |
   | **Cost Per Unit**  | The current cost per unit for the item.                        |
   | **Location**       | The storage location (bar, chiller, storage, kitchen, etc.).   |

3. Use filters and search to locate specific items or view items by location.
4. Items with stock at or below the **minimumStock** threshold will be flagged with a low stock alert.

### 4.2 Adding Stock (Receiving Deliveries)

1. Navigate to `/dashboard/inventory`.
2. Locate the inventory item that has been delivered.
3. Open the stock addition form for the item.
4. Enter the following details:

   | Field              | Description                                             |
   |--------------------|---------------------------------------------------------|
   | **Quantity**       | The number of units received.                           |
   | **Cost Per Unit**  | The cost per unit as stated on the supplier invoice.    |
   | **Location**       | The storage location where the stock will be placed.    |

5. Cross-reference the quantity entered with the physical delivery and the supplier delivery note.
6. Save the stock addition.
7. Verify that the **currentStock** value for the item has increased by the correct amount.
8. File the delivery note for record-keeping.

**Important:** Always verify the physical delivery against the delivery note before recording stock additions. Discrepancies should be noted and reported to the supplier immediately.

### 4.3 Stock Transfers Between Locations

1. Navigate to `/dashboard/inventory/transfer`.
2. Complete the transfer form:

   | Field                | Description                                           |
   |----------------------|-------------------------------------------------------|
   | **Item**             | Select the inventory item to transfer.                |
   | **From Location**    | The current location of the stock (e.g., storage).    |
   | **To Location**      | The destination location (e.g., bar, kitchen).        |
   | **Quantity**         | The number of units to transfer.                      |

3. Verify that the **From Location** has sufficient stock to fulfil the transfer.
4. Submit the transfer.
5. Verify that:
   - The stock at the **From Location** has decreased by the transferred quantity.
   - The stock at the **To Location** has increased by the transferred quantity.

**Available Locations:**

| Location    | Typical Use                                    |
|-------------|------------------------------------------------|
| Bar         | Items actively used at the bar service area    |
| Chiller     | Refrigerated items                             |
| Storage     | Dry storage and bulk inventory                 |
| Kitchen     | Items actively used in food preparation        |

Additional locations may be configured as needed by the system administrator.

### 4.4 Conducting Inventory Counts (Snapshots)

Inventory snapshots are used to verify physical stock levels against system records and identify discrepancies.

1. Navigate to `/dashboard/inventory/snapshots`.
2. Initiate a new snapshot (inventory count).
3. For each item in the count:
   - Physically count the stock on hand at each location.
   - Enter the actual counted quantity into the snapshot form.
   - The system will display the expected quantity (from system records) alongside the entered quantity.
4. Review all discrepancies between the system quantity and the physical count.
5. For each discrepancy:
   - Investigate the cause (see Common Scenarios, Section 6).
   - Record the reason for the discrepancy if the system provides a notes field.
6. Submit the completed snapshot.
7. The system records the snapshot for historical reference and audit purposes.

**Best Practices for Inventory Counts:**

- Conduct counts during periods of low activity (e.g., before opening or after closing).
- Count each location separately to maintain accuracy.
- Have a second person verify counts for high-value items.
- Complete the count in a single session to avoid double-counting or missed items.

### 4.5 Handling Low Stock Alerts

The system triggers low stock alerts when an item's **currentStock** falls at or below its configured **minimumStock** threshold.

1. Review low stock alerts on the `/dashboard/inventory` page.
2. For each alert, determine the appropriate action:

   | Situation                          | Action                                                    |
   |------------------------------------|-----------------------------------------------------------|
   | Routine restock needed             | Place a reorder with the supplier.                        |
   | Stock available at another location | Initiate a transfer (see Section 4.3).                   |
   | Item linked to a menu item         | Consider toggling menu item availability (SOP-ADMIN-002). |
   | Supplier lead time is long         | Notify management for advance planning.                   |

3. After restocking, verify that the alert has cleared.
4. If the threshold itself needs adjustment (too sensitive or not sensitive enough), update the **minimumStock** value for the item.

**Adjusting Low Stock Thresholds:**

1. Navigate to `/dashboard/inventory`.
2. Open the item whose threshold needs adjustment.
3. Modify the **minimumStock** value based on:
   - Average daily consumption.
   - Supplier lead time.
   - Desired buffer stock level.
4. Save the updated threshold.

### 4.6 Adjusting Stock for Waste, Breakage, and Spillage

Stock adjustments must be recorded whenever inventory is lost due to waste, breakage, spillage, or other non-sale reasons.

1. Navigate to `/dashboard/inventory`.
2. Locate the affected inventory item.
3. Open the stock adjustment form.
4. Record the adjustment:

   | Field              | Description                                              |
   |--------------------|----------------------------------------------------------|
   | **Quantity**       | The number of units lost (entered as a deduction).       |
   | **Reason**         | The reason for the adjustment (waste, breakage, spillage, expiry, other). |
   | **Location**       | The location where the loss occurred.                    |

5. Save the adjustment.
6. Verify that the **currentStock** has been reduced by the correct amount.

**Important:** All stock adjustments are tracked in the stock movement history. Accurate recording of waste and breakage is essential for cost control and identifying recurring issues.

### 4.7 Reviewing Stock Movement History

1. Navigate to `/dashboard/inventory`.
2. Select the item whose history you wish to review.
3. Open the stock movement history view.
4. The history displays all movements for the item, including:

   | Movement Type       | Description                                              |
   |---------------------|----------------------------------------------------------|
   | **Addition**        | Stock added (delivery received).                         |
   | **Deduction**       | Stock removed (order placed, waste, breakage, spillage). |
   | **Transfer Out**    | Stock sent to another location.                          |
   | **Transfer In**     | Stock received from another location.                    |
   | **Order Deduction** | Automatic deduction when a customer order is placed.     |
   | **Order Restore**   | Automatic restoration when a customer order is cancelled.|

5. Use the history to investigate discrepancies, track consumption patterns, and verify delivery records.

---

## 5. Quick Reference

| Task                          | Path                                  | Key Action                                    |
|-------------------------------|---------------------------------------|-----------------------------------------------|
| View all stock levels         | `/dashboard/inventory`                | Browse or search inventory items              |
| Add stock (delivery)          | `/dashboard/inventory`                | Select item, enter quantity and cost          |
| Transfer stock                | `/dashboard/inventory/transfer`       | Select item, from/to locations, quantity      |
| Conduct inventory count       | `/dashboard/inventory/snapshots`      | Initiate snapshot, enter physical counts      |
| Review low stock alerts       | `/dashboard/inventory`                | Check flagged items at or below minimumStock  |
| Adjust for waste/breakage     | `/dashboard/inventory`                | Select item, record deduction with reason     |
| View movement history         | `/dashboard/inventory`                | Select item, open movement history            |

---

## 6. Common Scenarios

### Scenario 1: Delivery Received

1. Verify the physical delivery against the supplier delivery note (count items, check quantities).
2. Note any discrepancies between the delivery note and the physical goods received.
3. Navigate to `/dashboard/inventory`.
4. For each item in the delivery:
   - Open the stock addition form.
   - Enter the **actual quantity received** (not the delivery note quantity, if different).
   - Enter the **cost per unit** from the supplier invoice.
   - Select the storage **location** where the goods are being placed.
5. Save each addition.
6. If discrepancies exist, contact the supplier to report and resolve.
7. File the delivery note.

### Scenario 2: Stock Count Discrepancy

1. During an inventory snapshot, a discrepancy is identified between the system quantity and the physical count.
2. Recount the item to confirm the physical quantity.
3. Investigate possible causes:
   - Unrecorded waste, breakage, or spillage.
   - Orders that were not properly processed through the system.
   - Deliveries that were received physically but not recorded.
   - Theft or unauthorized removal.
   - Transfers that were not recorded in the system.
4. Record the discrepancy reason in the snapshot notes.
5. Adjust the stock level to match the physical count.
6. If the discrepancy is significant or recurring, report to management for further investigation.

### Scenario 3: Item Out of Stock During Service

1. A staff member reports that an item is out of stock during active service.
2. Navigate to `/dashboard/inventory` and confirm the stock level is zero or insufficient.
3. Check if stock is available at another location:
   - If yes, initiate an immediate transfer (Section 4.3).
   - If no, proceed to step 4.
4. Navigate to `/dashboard/menu` and toggle the affected menu item(s) to **Unavailable** (refer to SOP-ADMIN-002, Section 4.3).
5. Notify front-of-house staff that the item is unavailable.
6. Place an emergency reorder with the supplier if applicable.
7. Once stock is replenished, restore the menu item availability.

---

## 7. Troubleshooting

| Issue                                          | Possible Cause                                | Resolution                                                       |
|------------------------------------------------|-----------------------------------------------|------------------------------------------------------------------|
| Unable to access inventory dashboard           | Missing `inventoryManagement` permission      | Contact the system administrator to verify role permissions.     |
| Stock level does not match physical count       | Unrecorded adjustments or system error        | Investigate using movement history; adjust stock via snapshot.    |
| Low stock alert triggered incorrectly          | minimumStock threshold set too high           | Review and adjust the minimumStock value for the item.           |
| Low stock alert not triggering                 | minimumStock threshold set too low or at zero | Review and increase the minimumStock value for the item.         |
| Transfer fails or shows error                  | Insufficient stock at source location         | Verify stock at the source location before attempting transfer.  |
| Stock not deducting when orders are placed     | Menu item not linked to inventory record      | Link the menu item to the inventory record (SOP-ADMIN-002).     |
| Stock not restoring when orders are cancelled  | System processing delay or configuration issue| Check the order cancellation status; report to IT if persistent. |
| Cost per unit appears incorrect                | Outdated cost not updated after new delivery  | Update cost per unit when recording the next delivery.           |
| Snapshot shows items not in current inventory  | Discontinued items still in system            | Archive or remove discontinued items per business policy.        |

---

## 8. Related Procedures

| Document ID   | Title              | Relevance                                                     |
|---------------|--------------------|---------------------------------------------------------------|
| SOP-ADMIN-002 | Menu Management    | Menu item creation, pricing, availability, inventory linking  |

---

## 9. Revision History

| Version | Date           | Author | Description         |
|---------|----------------|--------|---------------------|
| 1.0     | March 7, 2026  |        | Initial release     |

---

## 10. Approval

| Role               | Name | Signature | Date |
|--------------------|------|-----------|------|
| Prepared By        |      |           |      |
| Reviewed By        |      |           |      |
| Approved By        |      |           |      |

---

*End of Document -- SOP-ADMIN-003 Inventory Management v1.0*
