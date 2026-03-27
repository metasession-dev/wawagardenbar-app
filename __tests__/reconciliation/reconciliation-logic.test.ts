/**
 * @requirement REQ-014 - Reconciliation toggle logic and filter validation
 */
import { describe, it, expect } from 'vitest';

// ── Pure extraction of reconciliation filter logic ──────────────────

interface ReconcilableItem {
  _id: string;
  reconciled?: boolean;
  reconciledAt?: Date;
  reconciledBy?: string;
  tabId?: string;
}

function applyReconciliationFilter(
  items: ReconcilableItem[],
  filter: 'all' | 'reconciled' | 'not-reconciled'
): ReconcilableItem[] {
  if (filter === 'reconciled') {
    return items.filter((item) => item.reconciled === true);
  }
  if (filter === 'not-reconciled') {
    return items.filter((item) => !item.reconciled);
  }
  return items;
}

function toggleReconciliation(item: ReconcilableItem, userId: string) {
  const newState = !item.reconciled;
  return {
    reconciled: newState,
    reconciledAt: newState ? new Date() : undefined,
    reconciledBy: newState ? userId : undefined,
  };
}

function shouldShowReconciliationCheckbox(order: ReconcilableItem): boolean {
  return !order.tabId;
}

// ══════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════

describe('REQ-014: Reconciliation Toggle', () => {
  it('should set reconciled to true with timestamp and user', () => {
    const item: ReconcilableItem = { _id: '1', reconciled: false };
    const result = toggleReconciliation(item, 'admin-user-123');

    expect(result.reconciled).toBe(true);
    expect(result.reconciledAt).toBeInstanceOf(Date);
    expect(result.reconciledBy).toBe('admin-user-123');
  });

  it('should set reconciled to false and clear timestamp/user', () => {
    const item: ReconcilableItem = {
      _id: '1',
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: 'admin-user-123',
    };
    const result = toggleReconciliation(item, 'admin-user-123');

    expect(result.reconciled).toBe(false);
    expect(result.reconciledAt).toBeUndefined();
    expect(result.reconciledBy).toBeUndefined();
  });

  it('should toggle from undefined (legacy data) to true', () => {
    const item: ReconcilableItem = { _id: '1' };
    const result = toggleReconciliation(item, 'admin-user-123');

    expect(result.reconciled).toBe(true);
    expect(result.reconciledAt).toBeInstanceOf(Date);
  });
});

describe('REQ-014: Reconciliation Filter', () => {
  const items: ReconcilableItem[] = [
    { _id: '1', reconciled: true, reconciledAt: new Date() },
    { _id: '2', reconciled: false },
    { _id: '3' }, // legacy: no reconciled field
    { _id: '4', reconciled: true, reconciledAt: new Date() },
    { _id: '5', reconciled: false },
  ];

  it('should return all items when filter is "all"', () => {
    const result = applyReconciliationFilter(items, 'all');
    expect(result).toHaveLength(5);
  });

  it('should return only reconciled items', () => {
    const result = applyReconciliationFilter(items, 'reconciled');
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.reconciled === true)).toBe(true);
  });

  it('should return not-reconciled items including legacy (undefined)', () => {
    const result = applyReconciliationFilter(items, 'not-reconciled');
    expect(result).toHaveLength(3);
    expect(result.map((i) => i._id)).toEqual(['2', '3', '5']);
  });

  it('should handle empty list', () => {
    expect(applyReconciliationFilter([], 'reconciled')).toHaveLength(0);
    expect(applyReconciliationFilter([], 'not-reconciled')).toHaveLength(0);
    expect(applyReconciliationFilter([], 'all')).toHaveLength(0);
  });

  it('should handle list with all reconciled', () => {
    const allReconciled = [
      { _id: '1', reconciled: true },
      { _id: '2', reconciled: true },
    ];
    expect(
      applyReconciliationFilter(allReconciled, 'not-reconciled')
    ).toHaveLength(0);
    expect(applyReconciliationFilter(allReconciled, 'reconciled')).toHaveLength(
      2
    );
  });
});

describe('REQ-014: Reconciliation Checkbox Visibility', () => {
  it('should show checkbox for standalone orders (no tabId)', () => {
    expect(shouldShowReconciliationCheckbox({ _id: '1' })).toBe(true);
    expect(
      shouldShowReconciliationCheckbox({ _id: '2', tabId: undefined })
    ).toBe(true);
  });

  it('should NOT show checkbox for tab orders', () => {
    expect(
      shouldShowReconciliationCheckbox({ _id: '1', tabId: 'tab-123' })
    ).toBe(false);
  });
});
