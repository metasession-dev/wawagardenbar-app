/**
 * @requirement REQ-012 - Partial payment validation logic for tabs
 *
 * Unit tests for partial payment validation rules extracted from
 * TabService.recordPartialPayment. Tests the pure validation logic
 * without database dependencies.
 */
import { describe, it, expect } from 'vitest';

// ── Pure extraction of validation logic from TabService.recordPartialPayment ──

interface PartialPayment {
  amount: number;
  note: string;
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference?: string;
  paidAt: Date;
}

interface TabState {
  total: number;
  status: 'open' | 'settling' | 'closed';
  paymentStatus: 'pending' | 'paid' | 'failed';
  partialPayments: PartialPayment[];
}

interface PartialPaymentInput {
  amount: number;
  note: string;
  paymentType: 'cash' | 'transfer' | 'card';
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function calculateOutstandingBalance(tab: TabState): number {
  const totalPartialPayments = tab.partialPayments.reduce(
    (sum, pp) => sum + pp.amount,
    0
  );
  return tab.total - totalPartialPayments;
}

function validatePartialPayment(
  tab: TabState,
  input: PartialPaymentInput
): ValidationResult {
  if (tab.status === 'closed') {
    return { valid: false, error: 'Cannot make a partial payment on a closed tab' };
  }

  if (tab.paymentStatus === 'paid') {
    return { valid: false, error: 'Tab is already fully paid' };
  }

  const outstandingBalance = calculateOutstandingBalance(tab);

  if (input.amount <= 0) {
    return { valid: false, error: 'Partial payment amount must be greater than zero' };
  }

  if (input.amount >= outstandingBalance) {
    return {
      valid: false,
      error: `Partial payment amount must be less than the outstanding balance (₦${outstandingBalance.toLocaleString()}). Use full payment to close the tab.`,
    };
  }

  if (!input.note || !input.note.trim()) {
    return { valid: false, error: 'A note is required for partial payments' };
  }

  return { valid: true };
}

// ══════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════

describe('REQ-012: Outstanding Balance Calculation', () => {
  it('should return full total when no partial payments exist', () => {
    const tab: TabState = {
      total: 10000,
      status: 'open',
      paymentStatus: 'pending',
      partialPayments: [],
    };
    expect(calculateOutstandingBalance(tab)).toBe(10000);
  });

  it('should subtract a single partial payment', () => {
    const tab: TabState = {
      total: 10000,
      status: 'open',
      paymentStatus: 'pending',
      partialPayments: [
        { amount: 3000, note: 'Cash for drinks', paymentType: 'cash', paidAt: new Date() },
      ],
    };
    expect(calculateOutstandingBalance(tab)).toBe(7000);
  });

  it('should subtract multiple partial payments', () => {
    const tab: TabState = {
      total: 10000,
      status: 'open',
      paymentStatus: 'pending',
      partialPayments: [
        { amount: 3000, note: 'First payment', paymentType: 'cash', paidAt: new Date() },
        { amount: 2000, note: 'Second payment', paymentType: 'transfer', paidAt: new Date() },
        { amount: 1500, note: 'Third payment', paymentType: 'card', paidAt: new Date() },
      ],
    };
    expect(calculateOutstandingBalance(tab)).toBe(3500);
  });
});

describe('REQ-012: Partial Payment — Tab State Validation', () => {
  it('should reject partial payment on a closed tab', () => {
    const tab: TabState = {
      total: 10000,
      status: 'closed',
      paymentStatus: 'paid',
      partialPayments: [],
    };
    const result = validatePartialPayment(tab, {
      amount: 5000,
      note: 'Test',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('closed tab');
  });

  it('should reject partial payment on a fully paid tab', () => {
    const tab: TabState = {
      total: 10000,
      status: 'open',
      paymentStatus: 'paid',
      partialPayments: [],
    };
    const result = validatePartialPayment(tab, {
      amount: 5000,
      note: 'Test',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('already fully paid');
  });

  it('should accept partial payment on an open tab with pending payment', () => {
    const tab: TabState = {
      total: 10000,
      status: 'open',
      paymentStatus: 'pending',
      partialPayments: [],
    };
    const result = validatePartialPayment(tab, {
      amount: 5000,
      note: 'Cash for drinks',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(true);
  });

  it('should accept partial payment on a settling tab', () => {
    const tab: TabState = {
      total: 10000,
      status: 'settling',
      paymentStatus: 'pending',
      partialPayments: [],
    };
    const result = validatePartialPayment(tab, {
      amount: 5000,
      note: 'Partial cash',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(true);
  });
});

describe('REQ-012: Partial Payment — Amount Validation', () => {
  const openTab: TabState = {
    total: 10000,
    status: 'open',
    paymentStatus: 'pending',
    partialPayments: [],
  };

  it('should reject zero amount', () => {
    const result = validatePartialPayment(openTab, {
      amount: 0,
      note: 'Test',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('greater than zero');
  });

  it('should reject negative amount', () => {
    const result = validatePartialPayment(openTab, {
      amount: -500,
      note: 'Test',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('greater than zero');
  });

  it('should reject amount equal to outstanding balance', () => {
    const result = validatePartialPayment(openTab, {
      amount: 10000,
      note: 'Full amount',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('less than the outstanding balance');
    expect(result.error).toContain('Use full payment to close the tab');
  });

  it('should reject amount exceeding outstanding balance', () => {
    const result = validatePartialPayment(openTab, {
      amount: 15000,
      note: 'Overpayment',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('less than the outstanding balance');
  });

  it('should accept amount less than outstanding balance', () => {
    const result = validatePartialPayment(openTab, {
      amount: 5000,
      note: 'Partial cash',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(true);
  });

  it('should accept small amount (1 naira)', () => {
    const result = validatePartialPayment(openTab, {
      amount: 1,
      note: 'Minimum payment',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject amount equal to remaining balance after prior partial payments', () => {
    const tabWithPayments: TabState = {
      total: 10000,
      status: 'open',
      paymentStatus: 'pending',
      partialPayments: [
        { amount: 7000, note: 'First payment', paymentType: 'cash', paidAt: new Date() },
      ],
    };
    // Outstanding is 3000, trying to pay exactly 3000 should be rejected
    const result = validatePartialPayment(tabWithPayments, {
      amount: 3000,
      note: 'Remaining balance',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Use full payment to close the tab');
  });

  it('should accept amount less than remaining balance after prior partial payments', () => {
    const tabWithPayments: TabState = {
      total: 10000,
      status: 'open',
      paymentStatus: 'pending',
      partialPayments: [
        { amount: 7000, note: 'First payment', paymentType: 'cash', paidAt: new Date() },
      ],
    };
    // Outstanding is 3000, paying 2000 should be valid
    const result = validatePartialPayment(tabWithPayments, {
      amount: 2000,
      note: 'Another partial',
      paymentType: 'transfer',
    });
    expect(result.valid).toBe(true);
  });
});

describe('REQ-012: Partial Payment — Note Validation', () => {
  const openTab: TabState = {
    total: 10000,
    status: 'open',
    paymentStatus: 'pending',
    partialPayments: [],
  };

  it('should reject empty note', () => {
    const result = validatePartialPayment(openTab, {
      amount: 5000,
      note: '',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('note is required');
  });

  it('should reject whitespace-only note', () => {
    const result = validatePartialPayment(openTab, {
      amount: 5000,
      note: '   ',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('note is required');
  });

  it('should accept valid note', () => {
    const result = validatePartialPayment(openTab, {
      amount: 5000,
      note: 'Cash payment for drinks',
      paymentType: 'cash',
    });
    expect(result.valid).toBe(true);
  });
});

describe('REQ-012: Partial Payment — Multiple Sequential Payments', () => {
  it('should correctly validate after three partial payments', () => {
    const tab: TabState = {
      total: 10000,
      status: 'open',
      paymentStatus: 'pending',
      partialPayments: [
        { amount: 2000, note: 'Round 1', paymentType: 'cash', paidAt: new Date() },
        { amount: 3000, note: 'Round 2', paymentType: 'transfer', paidAt: new Date() },
        { amount: 1000, note: 'Round 3', paymentType: 'card', paidAt: new Date() },
      ],
    };

    // Outstanding: 10000 - 6000 = 4000
    expect(calculateOutstandingBalance(tab)).toBe(4000);

    // Valid: 3999 < 4000
    const validResult = validatePartialPayment(tab, {
      amount: 3999,
      note: 'Almost all remaining',
      paymentType: 'cash',
    });
    expect(validResult.valid).toBe(true);

    // Invalid: 4000 == 4000 (must use full payment)
    const invalidResult = validatePartialPayment(tab, {
      amount: 4000,
      note: 'Exact remaining',
      paymentType: 'cash',
    });
    expect(invalidResult.valid).toBe(false);
  });
});
