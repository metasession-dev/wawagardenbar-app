/**
 * @requirement REQ-006 - Tab Lookup by tabNumber, Item Name Lookup, SOP Enhancement
 *
 * Unit tests for the tabNumber filter and filter-building logic
 * extracted from GET /api/public/tabs route handler.
 */
import { describe, it, expect } from 'vitest';

// ── Pure extraction of the filter-building logic from route.ts ───

interface TabFilterParams {
  status?: string | null;
  tableNumber?: string | null;
  tabNumber?: string | null;
  customerId?: string | null;
  paymentStatus?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface TabFilter {
  status?: string;
  tableNumber?: string;
  tabNumber?: string;
  userId?: unknown;
  paymentStatus?: string;
  openedAt?: Record<string, Date>;
}

function buildTabFilter(params: TabFilterParams): TabFilter {
  const filter: TabFilter = {};
  const { status, tableNumber, tabNumber, customerId, paymentStatus, startDate, endDate } = params;
  if (status && ['open', 'settling', 'closed'].includes(status)) {
    filter.status = status;
  }
  if (tableNumber) filter.tableNumber = tableNumber;
  if (tabNumber) filter.tabNumber = tabNumber;
  if (customerId && /^[a-fA-F0-9]{24}$/.test(customerId)) {
    filter.userId = customerId;
  }
  if (paymentStatus && ['pending', 'paid', 'failed'].includes(paymentStatus)) {
    filter.paymentStatus = paymentStatus;
  }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.openedAt = dateFilter;
  }
  return filter;
}

// ── Sort logic extraction ────────────────────────────────────────

function resolveSort(sortParam: string | null): { field: string; dir: 1 | -1 } {
  const raw = sortParam || '-openedAt';
  const dir = raw.startsWith('-') ? -1 : 1;
  const field = raw.replace(/^-/, '');
  const allowed = ['openedAt', 'total', 'createdAt'];
  return { field: allowed.includes(field) ? field : 'openedAt', dir };
}

// ── Menu item search result mapping (mirrors SOP lookupMenuItem) ─

interface MenuSearchResult {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  stockStatus: string;
  portionOptions?: { allowHalf: boolean; allowQuarter: boolean };
  customizationOptions?: unknown[];
}

interface ResolvedMenuItem {
  menuItemId: string;
  name: string;
  price: number;
  portionOptions?: { allowHalf: boolean; allowQuarter: boolean };
  customizationOptions?: unknown[];
}

function resolveMenuItem(results: MenuSearchResult[]): ResolvedMenuItem | null {
  if (!results || results.length === 0) return null;
  const item = results.find(i => i.isAvailable && i.stockStatus !== 'out-of-stock');
  if (!item) return null;
  return {
    menuItemId: item._id,
    name: item.name,
    price: item.price,
    portionOptions: item.portionOptions,
    customizationOptions: item.customizationOptions,
  };
}

// ══════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════

describe('REQ-006: Tab Filter Building — tabNumber support', () => {
  it('should include tabNumber in filter when provided', () => {
    const filter = buildTabFilter({ tabNumber: 'TAB-5-123456' });
    expect(filter.tabNumber).toBe('TAB-5-123456');
  });

  it('should not include tabNumber when null', () => {
    const filter = buildTabFilter({ tabNumber: null });
    expect(filter).not.toHaveProperty('tabNumber');
  });

  it('should not include tabNumber when undefined', () => {
    const filter = buildTabFilter({});
    expect(filter).not.toHaveProperty('tabNumber');
  });

  it('should include both tableNumber and tabNumber when both provided', () => {
    const filter = buildTabFilter({ tableNumber: '5', tabNumber: 'TAB-5-123456' });
    expect(filter.tableNumber).toBe('5');
    expect(filter.tabNumber).toBe('TAB-5-123456');
  });
});

describe('REQ-006: Tab Filter Building — tableNumber support', () => {
  it('should include tableNumber when provided', () => {
    const filter = buildTabFilter({ tableNumber: '5' });
    expect(filter.tableNumber).toBe('5');
  });

  it('should not include tableNumber when null', () => {
    const filter = buildTabFilter({ tableNumber: null });
    expect(filter).not.toHaveProperty('tableNumber');
  });
});

describe('REQ-006: Tab Filter Building — status validation', () => {
  it('should accept valid status "open"', () => {
    const filter = buildTabFilter({ status: 'open' });
    expect(filter.status).toBe('open');
  });

  it('should accept valid status "settling"', () => {
    const filter = buildTabFilter({ status: 'settling' });
    expect(filter.status).toBe('settling');
  });

  it('should accept valid status "closed"', () => {
    const filter = buildTabFilter({ status: 'closed' });
    expect(filter.status).toBe('closed');
  });

  it('should reject invalid status values', () => {
    const filter = buildTabFilter({ status: 'invalid' });
    expect(filter).not.toHaveProperty('status');
  });

  it('should not set status when null', () => {
    const filter = buildTabFilter({ status: null });
    expect(filter).not.toHaveProperty('status');
  });
});

describe('REQ-006: Tab Filter Building — combined filters', () => {
  it('should build filter with status + tableNumber', () => {
    const filter = buildTabFilter({ status: 'open', tableNumber: '5' });
    expect(filter.status).toBe('open');
    expect(filter.tableNumber).toBe('5');
  });

  it('should build filter with status + tabNumber', () => {
    const filter = buildTabFilter({ status: 'open', tabNumber: 'TAB-5-123456' });
    expect(filter.status).toBe('open');
    expect(filter.tabNumber).toBe('TAB-5-123456');
  });

  it('should build empty filter when no params provided', () => {
    const filter = buildTabFilter({});
    expect(Object.keys(filter)).toHaveLength(0);
  });

  it('should include paymentStatus when valid', () => {
    const filter = buildTabFilter({ paymentStatus: 'paid' });
    expect(filter.paymentStatus).toBe('paid');
  });

  it('should reject invalid paymentStatus', () => {
    const filter = buildTabFilter({ paymentStatus: 'refunded' });
    expect(filter).not.toHaveProperty('paymentStatus');
  });

  it('should include date range filter', () => {
    const filter = buildTabFilter({ startDate: '2026-03-01', endDate: '2026-03-05' });
    expect(filter.openedAt).toBeDefined();
    expect(filter.openedAt!.$gte).toBeInstanceOf(Date);
    expect(filter.openedAt!.$lte).toBeInstanceOf(Date);
  });
});

describe('REQ-006: Tab Sort Resolution', () => {
  it('should default to -openedAt when null', () => {
    const sort = resolveSort(null);
    expect(sort.field).toBe('openedAt');
    expect(sort.dir).toBe(-1);
  });

  it('should parse ascending sort', () => {
    const sort = resolveSort('total');
    expect(sort.field).toBe('total');
    expect(sort.dir).toBe(1);
  });

  it('should parse descending sort with dash prefix', () => {
    const sort = resolveSort('-total');
    expect(sort.field).toBe('total');
    expect(sort.dir).toBe(-1);
  });

  it('should fall back to openedAt for disallowed fields', () => {
    const sort = resolveSort('hackerField');
    expect(sort.field).toBe('openedAt');
  });
});

describe('REQ-006: Menu Item Name Resolution', () => {
  it('should return first available item from search results', () => {
    const results: MenuSearchResult[] = [
      { _id: 'item1', name: 'Star Lager Beer', price: 800, isAvailable: true, stockStatus: 'in-stock' },
      { _id: 'item2', name: 'Star Radler', price: 900, isAvailable: true, stockStatus: 'in-stock' },
    ];
    const resolved = resolveMenuItem(results);
    expect(resolved).not.toBeNull();
    expect(resolved!.menuItemId).toBe('item1');
    expect(resolved!.name).toBe('Star Lager Beer');
    expect(resolved!.price).toBe(800);
  });

  it('should skip unavailable items', () => {
    const results: MenuSearchResult[] = [
      { _id: 'item1', name: 'Star Lager Beer', price: 800, isAvailable: false, stockStatus: 'in-stock' },
      { _id: 'item2', name: 'Star Radler', price: 900, isAvailable: true, stockStatus: 'in-stock' },
    ];
    const resolved = resolveMenuItem(results);
    expect(resolved!.menuItemId).toBe('item2');
  });

  it('should skip out-of-stock items', () => {
    const results: MenuSearchResult[] = [
      { _id: 'item1', name: 'Star Lager Beer', price: 800, isAvailable: true, stockStatus: 'out-of-stock' },
      { _id: 'item2', name: 'Star Radler', price: 900, isAvailable: true, stockStatus: 'low-stock' },
    ];
    const resolved = resolveMenuItem(results);
    expect(resolved!.menuItemId).toBe('item2');
  });

  it('should return null when no results', () => {
    expect(resolveMenuItem([])).toBeNull();
  });

  it('should return null when all items are unavailable', () => {
    const results: MenuSearchResult[] = [
      { _id: 'item1', name: 'Beer', price: 800, isAvailable: false, stockStatus: 'out-of-stock' },
    ];
    expect(resolveMenuItem(results)).toBeNull();
  });

  it('should include portionOptions and customizationOptions', () => {
    const results: MenuSearchResult[] = [
      {
        _id: 'item1',
        name: 'Jollof Rice',
        price: 3500,
        isAvailable: true,
        stockStatus: 'in-stock',
        portionOptions: { allowHalf: true, allowQuarter: false },
        customizationOptions: [{ name: 'Protein', type: 'single' }],
      },
    ];
    const resolved = resolveMenuItem(results);
    expect(resolved!.portionOptions).toEqual({ allowHalf: true, allowQuarter: false });
    expect(resolved!.customizationOptions).toHaveLength(1);
  });
});
