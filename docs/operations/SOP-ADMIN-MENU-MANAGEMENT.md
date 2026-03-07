# Standard Operating Procedure

| Field            | Detail                                      |
|------------------|---------------------------------------------|
| **Document ID**  | SOP-ADMIN-002                               |
| **Title**        | Menu Management                             |
| **Version**      | 1.0                                         |
| **Effective Date** | March 7, 2026                             |
| **Department**   | Operations / Management                     |
| **Applies To**   | Super-Admin (menuManagement permission required) |

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Prerequisites](#3-prerequisites)
4. [Procedure](#4-procedure)
   - 4.1 Creating a New Menu Item
   - 4.2 Editing an Existing Menu Item
   - 4.3 Managing Availability
   - 4.4 Configuring Customizations and Portion Options
   - 4.5 Category Management
   - 4.6 Linking Items to Inventory
5. [Quick Reference](#5-quick-reference)
6. [Common Scenarios](#6-common-scenarios)
7. [Troubleshooting](#7-troubleshooting)
8. [Important Reminders](#8-important-reminders)
9. [Related Procedures](#9-related-procedures)
10. [Revision History](#10-revision-history)
11. [Approval](#11-approval)

---

## 1. Purpose

This procedure establishes the standardized process for creating, editing, and managing menu items within the Wawa Garden Bar management dashboard. It ensures that all menu data is accurate, complete, and consistently maintained across the system.

## 2. Scope

This SOP covers all menu management operations performed through the Wawa Garden Bar dashboard, including:

- Creation of new food and drink menu items
- Modification of existing menu items (including price and cost changes)
- Availability management (toggling items on or off)
- Configuration of customizations (add-ons, modifiers) and portion options
- Category assignment and management
- Linking menu items to inventory records

This procedure does **not** cover inventory stock management (see SOP-ADMIN-003).

## 3. Prerequisites

| Requirement         | Detail                                                        |
|---------------------|---------------------------------------------------------------|
| **Role**            | Super-Admin                                                   |
| **Permission**      | `menuManagement` permission must be granted to the user       |
| **Access**          | Authenticated session on the Wawa Garden Bar dashboard        |
| **Dashboard Path**  | `/dashboard/menu` (menu list) and `/dashboard/menu/new` (new item) |

Before performing any menu management task, confirm that:

1. You are logged in with a Super-Admin account that holds the `menuManagement` permission.
2. You have the correct item details available (name, description, price, cost price, category, images).
3. If linking to inventory, the relevant inventory record already exists or will be created concurrently (coordinate with SOP-ADMIN-003).

---

## 4. Procedure

### 4.1 Creating a New Menu Item

1. Navigate to `/dashboard/menu/new`.
2. Complete all **required fields**:

   | Field              | Description                                                        |
   |--------------------|--------------------------------------------------------------------|
   | **Name**           | The display name of the menu item as it will appear to customers.  |
   | **Description**    | A clear, concise description of the item.                         |
   | **Price**          | The selling price to the customer.                                 |
   | **Cost Price**     | The cost to produce or procure the item (used in profitability reports). |
   | **Category**       | Select from the available categories (11 food, 18 drink).         |
   | **Main Category**  | Select either **Food** or **Drinks**.                              |

3. Complete **optional fields** as applicable:

   | Field                    | Description                                                   |
   |--------------------------|---------------------------------------------------------------|
   | **Images**               | Upload one or more images of the item. Use high-quality, well-lit photos. |
   | **Customization Options**| Configure add-ons and modifiers (see Section 4.4).            |
   | **Portion Options**      | Define available portions: full, half, quarter (see Section 4.4). |
   | **Preparation Time**     | Estimated preparation time in minutes.                        |
   | **Inventory Link**       | Link to an existing inventory record (see Section 4.6).       |

4. Set the **Availability** status:
   - **Available** -- the item will appear on the active menu.
   - **Unavailable** -- the item will be hidden from the active menu.

5. Review all entered information for accuracy.
6. Save the menu item.
7. Verify the item appears correctly in the menu list at `/dashboard/menu`.

### 4.2 Editing an Existing Menu Item

1. Navigate to `/dashboard/menu`.
2. Locate the item to be edited using the menu list or search functionality.
3. Open the item for editing.
4. Make the required changes.

**Price Changes:**

- When the **Price** field is modified, the system automatically records the change in the price history audit trail.
- The audit trail captures: previous price, new price, date/time of change, and the user who made the change.
- Review the price history to ensure the change is intentional and correct before saving.

**Cost Price Changes:**

- When the **Cost Price** field is modified, the system automatically records the change in the cost history audit trail.
- Cost price changes directly affect profitability reports and margin calculations.
- Confirm the new cost price with the supplier invoice or procurement records before saving.

5. Save the updated menu item.
6. Verify the changes are reflected correctly in the menu list.

### 4.3 Managing Availability

1. Navigate to `/dashboard/menu`.
2. Locate the target menu item.
3. Use the **Availability Toggle** to switch the item between:
   - **Available** -- item is visible and orderable by customers.
   - **Unavailable** -- item is hidden from the customer-facing menu.

**When to toggle availability:**

- An ingredient is temporarily out of stock but will be restocked soon.
- A seasonal item is being rotated on or off the menu.
- An item is being discontinued (set to unavailable before removal).

**Note:** If an item's stock status is linked to inventory, the system may automatically set items to unavailable when stock reaches zero. Manual overrides should be used with caution.

### 4.4 Configuring Customizations and Portion Options

**Customizations (Add-ons and Modifiers):**

1. Open the menu item for editing.
2. Navigate to the customization options section.
3. Add or modify customizations:
   - **Add-ons** -- additional items that can be added to the base item (e.g., extra toppings, sauces). Each add-on should have a name and an additional price.
   - **Modifiers** -- variations that alter the base item (e.g., spice level, cooking preference). Modifiers may or may not carry an additional charge.
4. Save the customization configuration.

**Portion Options:**

1. Open the menu item for editing.
2. Navigate to the portion options section.
3. Configure the available portion sizes:
   - **Full** -- standard serving size at full price.
   - **Half** -- half serving at a proportionally adjusted price.
   - **Quarter** -- quarter serving at a proportionally adjusted price.
4. Set the price for each enabled portion size.
5. Save the portion configuration.

### 4.5 Category Management

The system supports the following category structure:

| Main Category | Number of Categories |
|---------------|----------------------|
| Food          | 11 categories        |
| Drinks        | 18 categories        |

When assigning categories:

1. Select the correct **Main Category** (Food or Drinks) first.
2. Select the specific **Category** from the filtered list.
3. Ensure the category assignment is logical and consistent with existing items.

If a new category is required, coordinate with the system administrator to add it before proceeding.

### 4.6 Linking Items to Inventory

1. Open the menu item for editing.
2. Navigate to the inventory linking section.
3. Search for and select the corresponding inventory record.
4. Once linked:
   - The menu item's stock status will reflect the inventory record's current stock level.
   - Stock will be automatically deducted when orders containing this item are placed.
   - Stock will be restored when orders containing this item are cancelled.
5. Save the link.

**Important:** Ensure the inventory record exists before attempting to link. If it does not exist, create it first following SOP-ADMIN-003 (Inventory Management).

---

## 5. Quick Reference

| Task                        | Path                      | Key Action                              |
|-----------------------------|---------------------------|-----------------------------------------|
| View all menu items         | `/dashboard/menu`         | Browse or search the menu list          |
| Create a new item           | `/dashboard/menu/new`     | Fill all required fields and save       |
| Edit an existing item       | `/dashboard/menu`         | Select item, modify fields, save        |
| Toggle availability         | `/dashboard/menu`         | Use the availability toggle on the item |
| Configure customizations    | Item edit view             | Add/modify add-ons and modifiers        |
| Set portion options         | Item edit view             | Enable and price full/half/quarter      |
| Link to inventory           | Item edit view             | Search and select inventory record      |

---

## 6. Common Scenarios

### Scenario 1: Adding a New Seasonal Dish

1. Confirm the dish details (name, description, price, cost) with the kitchen.
2. Navigate to `/dashboard/menu/new`.
3. Enter all required and optional fields.
4. Set main category to **Food** and select the appropriate food category.
5. Upload images of the dish.
6. Set preparation time.
7. Link to the relevant inventory record(s).
8. Set availability to **Available**.
9. Save and verify.

### Scenario 2: Price Increase for an Existing Item

1. Obtain approval for the price change per business policy.
2. Navigate to `/dashboard/menu` and locate the item.
3. Open the item for editing.
4. Update the **Price** field to the new value.
5. Save. The system will automatically log the previous price and timestamp in the audit trail.
6. Verify the updated price displays correctly.

### Scenario 3: Temporarily Removing an Item from the Menu

1. Navigate to `/dashboard/menu` and locate the item.
2. Toggle the **Availability** to **Unavailable**.
3. The item will no longer appear on the customer-facing menu.
4. When ready to reinstate, toggle back to **Available**.

---

## 7. Troubleshooting

| Issue                                        | Possible Cause                              | Resolution                                                    |
|----------------------------------------------|---------------------------------------------|---------------------------------------------------------------|
| Unable to create or edit menu items          | Missing `menuManagement` permission         | Contact the system administrator to verify role permissions.  |
| Item not appearing on customer menu          | Availability set to Unavailable             | Check and toggle the availability status.                     |
| Item showing as out of stock unexpectedly    | Linked inventory record has zero stock      | Check the inventory record; restock as needed (SOP-ADMIN-003).|
| Price history not recording changes          | System error or caching issue               | Clear browser cache and retry; if persistent, report to IT.   |
| Images not uploading                         | File size or format not supported           | Ensure images meet supported format and size requirements.    |
| Category not available in dropdown           | Category does not exist in the system       | Contact the system administrator to add the new category.     |
| Cost price change not reflecting in reports  | Reports may use cached or period-end data   | Allow time for report regeneration or manually refresh.       |

---

## 8. Important Reminders

- **All price changes are audited.** Every modification to the selling price is recorded with the previous value, new value, timestamp, and the user who made the change. This audit trail is permanent and cannot be edited.
- **All cost price changes are audited.** Cost price modifications are similarly tracked. Inaccurate cost prices will distort profitability reports and margin analysis.
- **Cost price directly affects profitability reports.** Ensure cost prices are kept current and reflect actual procurement costs. Review cost prices whenever supplier pricing changes.
- **Inventory links are bidirectional.** Changes to inventory stock levels will affect menu item availability, and orders placed against menu items will affect inventory stock levels.
- **Do not delete menu items that have active order history.** Set items to unavailable rather than deleting them to preserve order records and reporting integrity.

---

## 9. Related Procedures

| Document ID   | Title                  | Relevance                                              |
|---------------|------------------------|--------------------------------------------------------|
| SOP-ADMIN-003 | Inventory Management   | Stock management, delivery receiving, inventory counts |

---

## 10. Revision History

| Version | Date           | Author | Description         |
|---------|----------------|--------|---------------------|
| 1.0     | March 7, 2026  |        | Initial release     |

---

## 11. Approval

| Role               | Name | Signature | Date |
|--------------------|------|-----------|------|
| Prepared By        |      |           |      |
| Reviewed By        |      |           |      |
| Approved By        |      |           |      |

---

*End of Document -- SOP-ADMIN-002 Menu Management v1.0*
