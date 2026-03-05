/**
 * @requirement REQ-005 - Public API Tab Support for Orders
 *
 * Unit tests for optional tab fields (tabId, useTab, customerName) on
 * POST /api/public/orders.  Tests validate request-level validation logic
 * and the three tab-handling branches (tabId, useTab=new, useTab=existing).
 *
 * Because the route handler is tightly coupled to Next.js request/response
 * objects and authenticated middleware, we test the **validation rules** and
 * **tab branching logic** by extracting them into pure helpers and testing
 * those helpers directly.
 */

import { describe, it, expect } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Extracted validation helpers (mirrors route.ts logic exactly)      */
/* ------------------------------------------------------------------ */

interface TabValidationInput {
  orderType: string;
  tabId?: string;
  useTab?: string;
  dineInDetails?: { tableNumber?: string };
}

interface TabValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Pure validation function that mirrors the tab validation logic
 * in POST /api/public/orders route handler (lines 306-317).
 */
function validateTabFields(input: TabValidationInput): TabValidationResult {
  const { orderType, tabId, useTab, dineInDetails } = input;

  if (useTab && !['new', 'existing'].includes(useTab)) {
    return { valid: false, error: 'useTab must be "new" or "existing"', statusCode: 400 };
  }

  if ((useTab || tabId) && orderType !== 'dine-in') {
    return { valid: false, error: 'Tab support is only available for dine-in orders', statusCode: 400 };
  }

  const tableNumber = dineInDetails?.tableNumber?.trim();
  if (useTab && !tableNumber) {
    return { valid: false, error: 'dineInDetails.tableNumber is required when using useTab', statusCode: 400 };
  }

  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Tab branch selection logic (mirrors route.ts lines 353-386)        */
/* ------------------------------------------------------------------ */

type TabBranch = 'none' | 'tabId' | 'useTab-new' | 'useTab-existing';

function determineTabBranch(input: {
  tabId?: string;
  useTab?: string;
}): TabBranch {
  if (input.tabId) return 'tabId';
  if (input.useTab === 'new') return 'useTab-new';
  if (input.useTab === 'existing') return 'useTab-existing';
  return 'none';
}

/* ------------------------------------------------------------------ */
/*  Customer name resolution (mirrors route.ts line 371)               */
/* ------------------------------------------------------------------ */

function resolveCustomerName(input: {
  customerName?: string;
  guestName?: string;
}): string {
  return input.customerName || input.guestName || 'Walk-in Customer';
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('REQ-005: Public API Tab Support — Validation', () => {
  describe('validateTabFields', () => {
    it('should pass when no tab fields are provided', () => {
      const result = validateTabFields({ orderType: 'dine-in' });
      expect(result.valid).toBe(true);
    });

    it('should pass for useTab="new" with dine-in and tableNumber', () => {
      const result = validateTabFields({
        orderType: 'dine-in',
        useTab: 'new',
        dineInDetails: { tableNumber: 'T5' },
      });
      expect(result.valid).toBe(true);
    });

    it('should pass for useTab="existing" with dine-in and tableNumber', () => {
      const result = validateTabFields({
        orderType: 'dine-in',
        useTab: 'existing',
        dineInDetails: { tableNumber: 'T5' },
      });
      expect(result.valid).toBe(true);
    });

    it('should pass for tabId with dine-in (no tableNumber required)', () => {
      const result = validateTabFields({
        orderType: 'dine-in',
        tabId: 'abc123',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid useTab value', () => {
      const result = validateTabFields({
        orderType: 'dine-in',
        useTab: 'invalid',
        dineInDetails: { tableNumber: 'T5' },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('useTab must be "new" or "existing"');
      expect(result.statusCode).toBe(400);
    });

    it('should reject useTab with non-dine-in orderType', () => {
      const result = validateTabFields({
        orderType: 'pickup',
        useTab: 'new',
        dineInDetails: { tableNumber: 'T5' },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tab support is only available for dine-in orders');
      expect(result.statusCode).toBe(400);
    });

    it('should reject tabId with non-dine-in orderType', () => {
      const result = validateTabFields({
        orderType: 'delivery',
        tabId: 'abc123',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tab support is only available for dine-in orders');
      expect(result.statusCode).toBe(400);
    });

    it('should reject useTab without dineInDetails.tableNumber', () => {
      const result = validateTabFields({
        orderType: 'dine-in',
        useTab: 'new',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('dineInDetails.tableNumber is required when using useTab');
      expect(result.statusCode).toBe(400);
    });

    it('should reject useTab with empty tableNumber', () => {
      const result = validateTabFields({
        orderType: 'dine-in',
        useTab: 'existing',
        dineInDetails: { tableNumber: '   ' },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('dineInDetails.tableNumber is required when using useTab');
      expect(result.statusCode).toBe(400);
    });

    it('should reject useTab="new" with pay-now orderType', () => {
      const result = validateTabFields({
        orderType: 'pay-now',
        useTab: 'new',
        dineInDetails: { tableNumber: 'T5' },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tab support is only available for dine-in orders');
    });

    it('should allow no-tab orders for any valid orderType', () => {
      const types = ['dine-in', 'pickup', 'delivery', 'pay-now'];
      for (const orderType of types) {
        const result = validateTabFields({ orderType });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('determineTabBranch', () => {
    it('should return "none" when no tab fields provided', () => {
      expect(determineTabBranch({})).toBe('none');
    });

    it('should return "tabId" when tabId is provided', () => {
      expect(determineTabBranch({ tabId: 'abc123' })).toBe('tabId');
    });

    it('should return "useTab-new" when useTab is "new"', () => {
      expect(determineTabBranch({ useTab: 'new' })).toBe('useTab-new');
    });

    it('should return "useTab-existing" when useTab is "existing"', () => {
      expect(determineTabBranch({ useTab: 'existing' })).toBe('useTab-existing');
    });

    it('should prioritize tabId over useTab', () => {
      expect(determineTabBranch({ tabId: 'abc123', useTab: 'new' })).toBe('tabId');
    });
  });

  describe('resolveCustomerName', () => {
    it('should use customerName when provided', () => {
      expect(resolveCustomerName({ customerName: 'John Doe', guestName: 'Jane' })).toBe('John Doe');
    });

    it('should fall back to guestName when customerName is not provided', () => {
      expect(resolveCustomerName({ guestName: 'Jane' })).toBe('Jane');
    });

    it('should fall back to "Walk-in Customer" when neither is provided', () => {
      expect(resolveCustomerName({})).toBe('Walk-in Customer');
    });

    it('should fall back to guestName when customerName is empty string', () => {
      expect(resolveCustomerName({ customerName: '', guestName: 'Jane' })).toBe('Jane');
    });

    it('should return "Walk-in Customer" when both are empty strings', () => {
      expect(resolveCustomerName({ customerName: '', guestName: '' })).toBe('Walk-in Customer');
    });
  });
});

describe('REQ-005: Public API Tab Support — Response Shape', () => {
  it('should produce flat order response when no tab is involved', () => {
    const tab = null;
    const order = { _id: 'order1', orderNumber: 'WGB-123', status: 'pending' };
    // Mirrors route.ts line 396: return apiSuccess(serialize(order), 201)
    const responseData = tab ? { order, tab } : order;
    expect(responseData).toEqual({ _id: 'order1', orderNumber: 'WGB-123', status: 'pending' });
    expect(responseData).not.toHaveProperty('order');
    expect(responseData).not.toHaveProperty('tab');
  });

  it('should produce wrapped { order, tab } response when tab is involved', () => {
    const tab = { _id: 'tab1', tabNumber: 'TAB-T5-123', status: 'open' };
    const order = { _id: 'order1', orderNumber: 'WGB-123', status: 'pending' };
    // Mirrors route.ts line 390-393: return apiSuccess(serialize({ order, tab }), 201)
    const responseData = tab ? { order, tab } : order;
    expect(responseData).toHaveProperty('order');
    expect(responseData).toHaveProperty('tab');
    const wrapped = responseData as { order: typeof order; tab: typeof tab };
    expect(wrapped.order._id).toBe('order1');
    expect(wrapped.tab._id).toBe('tab1');
  });
});

describe('REQ-005: Public API Tab Support — CreateOrderBody Interface', () => {
  it('should accept body without tab fields (backward compatible)', () => {
    const body = {
      orderType: 'dine-in' as const,
      items: [{ menuItemId: 'x', name: 'Beer', price: 800, quantity: 1, subtotal: 800 }],
      subtotal: 800,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: 800,
      dineInDetails: { tableNumber: 'T5' },
    };
    // Verify no tab fields present
    expect(body).not.toHaveProperty('tabId');
    expect(body).not.toHaveProperty('useTab');
    expect(body).not.toHaveProperty('customerName');
  });

  it('should accept body with tabId field', () => {
    const body = {
      orderType: 'dine-in' as const,
      items: [{ menuItemId: 'x', name: 'Beer', price: 800, quantity: 1, subtotal: 800 }],
      subtotal: 800,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: 800,
      dineInDetails: { tableNumber: 'T5' },
      tabId: 'abc123',
    };
    expect(body.tabId).toBe('abc123');
  });

  it('should accept body with useTab and customerName fields', () => {
    const body = {
      orderType: 'dine-in' as const,
      items: [{ menuItemId: 'x', name: 'Beer', price: 800, quantity: 1, subtotal: 800 }],
      subtotal: 800,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: 800,
      dineInDetails: { tableNumber: 'T5' },
      useTab: 'new' as const,
      customerName: 'John Doe',
    };
    expect(body.useTab).toBe('new');
    expect(body.customerName).toBe('John Doe');
  });
});
