# Tabs and Orders System Specification & Implementation Plan

## 1. Requirements Overview

This document details the requirements and implementation plan for enhancing the Tabs and Orders system, specifically focusing on the "Dine-in" checkout flow and Staff Dashboard capabilities.

### 1.1 Customer Checkout Flow (Dine-in)
*   **Open New Tab:** Customers can ONLY open a new tab if they do not already have an open tab for the current session/table.
*   **Add to Existing Tab:** Customers can add orders to their existing open tab.
*   **Pay Now (No Tab):** Customers can pay immediately without opening a tab (if they don't have one).
*   **Constraint:** If a customer has an open tab, they are **restricted** from:
    *   Opening a second tab.
    *   Paying for a separate "Pay Now" order.
    *   *Action:* They must either add the order to the existing tab OR close the existing tab first.

### 1.2 Staff Capabilities
*   **Manage Tabs:** Staff can open tabs, add orders to tabs, and close tabs.
*   **Dashboard:** A "Tabs Display" (similar to Kitchen Display) in the dashboard to view and manage all open tabs.

---

## 2. Gap Analysis & Code Review

### 2.1 Current Checkout Implementation (`CheckoutForm`)
*   **Status:** Partially Compliant.
*   **Gap:** The current `TabOptionsStep` allows users with an existing tab to still select "Pay Now" or "Open Another Tab". It warns/labels them but does not strictly enforce the restriction as requested.
*   **Gap:** The default selection might not always prioritize the existing tab.

### 2.2 Admin Dashboard (`/dashboard/orders`)
*   **Status:** Missing Feature.
*   **Gap:** There is currently no "Tabs Display" button or dedicated view for managing open tabs in the orders dashboard.
*   **Gap:** Staff flow to "open a tab and create an order for it" explicitly from the dashboard is not optimized (they likely use the customer checkout flow currently).

---

## 3. Implementation Plan

### 3.1 Phase 1: Enforce Checkout Constraints
**Objective:** Lock down the customer UI to prevent invalid actions when a tab is open.

#### Changes to `components/features/checkout/tab-options-step.tsx`:
1.  **Props:** Component already receives `existingTab`.
2.  **Logic:**
    *   If `existingTab` is present:
        *   Disable/Hide the "Pay Now" `RadioGroupItem`.
        *   Disable/Hide the "New Tab" `RadioGroupItem`.
        *   Force the selection to "Add to Existing Tab".
        *   Display a clear alert/banner: *"You have an open tab. Please add this order to your tab, or close your tab to pay separately."*
        *   Add a link/button: "View/Close Tab" pointing to `/orders/tabs/[id]`.

#### Changes to `components/features/checkout/checkout-form.tsx`:
1.  **Logic:**
    *   In the `useEffect` that fetches `existingTab`, automatically set the form value `useTab` to `'existing-tab'` if a tab is found.

### 3.2 Phase 2: Staff Dashboard - Tabs Display
**Objective:** Provide visibility and management of tabs to staff.

#### Changes to `app/dashboard/orders/page.tsx`:
1.  **UI:** Add a "Tabs Display" button next to "Kitchen Display".

#### New Page `app/dashboard/orders/tabs/page.tsx`:
1.  **Components:** Create a `TabsGrid` or `TabsTable` component.
2.  **Data:** Use `TabService.listOpenTabs()` to fetch all open tabs.
3.  **Actions:**
    *   **View Orders:** Link to tab details.
    *   **Close Tab:** Button to close tab (settle payment).
    *   **Add Order:** Button to redirect to checkout with this tab pre-selected (or a dedicated POS interface).

---

## 4. Technical Specifications

### 4.1 Data Validation
*   **Server-Side:** Ensure `createTab` action continues to enforce "one tab per table" uniqueness.
*   **Client-Side:** `CheckoutForm` validation should ensure `useTab` is valid based on the `existingTab` state.

### 4.2 User Experience
*   **Feedback:** Toast notifications when adding to a tab (already exists).
*   **Navigation:** Smooth transitions between "Order" and "Tab Details".

---

## 5. Work Items (Checklist)

- [ ] **Checkout UI:** Modify `tab-options-step.tsx` to disable invalid options when tab exists.
- [ ] **Checkout Logic:** Update `checkout-form.tsx` to auto-select existing tab.
- [ ] **Dashboard:** Add "Tabs Display" button to Orders Dashboard.
- [ ] **Dashboard:** Create Tabs Listing page (`/dashboard/orders/tabs`).
- [ ] **Testing:** Verify "Dine-in" flow with and without existing tabs.
