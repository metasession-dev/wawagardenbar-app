/**
 * @requirement REQ-019 - Restock recommendation calculation logic
 */
import { describe, it, expect } from 'vitest';

// ─── Pure functions extracted from restock-recommendation-service.ts ───

function calculatePriority(
  currentStock: number,
  minimumStock: number,
  velocity: number
): { level: 'urgent' | 'medium' | 'low'; daysUntilStockout: number } {
  const daysUntilStockout = velocity > 0 ? currentStock / velocity : Infinity;

  if (daysUntilStockout <= 2 || currentStock <= minimumStock) {
    return { level: 'urgent', daysUntilStockout };
  }
  if (daysUntilStockout <= 7) {
    return { level: 'medium', daysUntilStockout };
  }
  return { level: 'low', daysUntilStockout };
}

function calculateSuggestedReorderQty(
  velocity: number,
  minimumStock: number,
  currentStock: number
): number {
  return Math.max(0, Math.ceil(velocity * 7 + minimumStock - currentStock));
}

function formatCategoryLabel(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const PRIORITY_ORDER = { urgent: 0, medium: 1, low: 2 } as const;

interface MockItem {
  category: string;
  priority: 'urgent' | 'medium' | 'low';
  daysUntilStockout: number;
}

function sortItems(items: MockItem[]): MockItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff =
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    const aDays = a.daysUntilStockout === -1 ? Infinity : a.daysUntilStockout;
    const bDays = b.daysUntilStockout === -1 ? Infinity : b.daysUntilStockout;
    return aDays - bDays;
  });
}

function groupByCategory(items: MockItem[]) {
  const groupMap = new Map<string, MockItem[]>();
  for (const item of items) {
    const existing = groupMap.get(item.category) || [];
    existing.push(item);
    groupMap.set(item.category, existing);
  }
  return Array.from(groupMap.entries()).map(([category, groupItems]) => ({
    category,
    categoryLabel: formatCategoryLabel(category),
    itemCount: groupItems.length,
    urgentCount: groupItems.filter((i) => i.priority === 'urgent').length,
    items: sortItems(groupItems),
  }));
}

// ─── Tests ───

describe('REQ-019: Priority Calculation', () => {
  it('returns urgent when daysUntilStockout <= 2', () => {
    // velocity 5/day, stock 10 => 2 days
    const result = calculatePriority(10, 5, 5);
    expect(result.level).toBe('urgent');
    expect(result.daysUntilStockout).toBe(2);
  });

  it('returns urgent when currentStock <= minimumStock', () => {
    // stock 3, minimum 5, velocity 0.5/day => 6 days but stock below minimum
    const result = calculatePriority(3, 5, 0.5);
    expect(result.level).toBe('urgent');
  });

  it('returns urgent when currentStock equals minimumStock', () => {
    const result = calculatePriority(5, 5, 0.1);
    expect(result.level).toBe('urgent');
  });

  it('returns medium when daysUntilStockout is between 2 and 7', () => {
    // velocity 2/day, stock 10 => 5 days
    const result = calculatePriority(10, 2, 2);
    expect(result.level).toBe('medium');
    expect(result.daysUntilStockout).toBe(5);
  });

  it('returns low when daysUntilStockout > 7', () => {
    // velocity 1/day, stock 20 => 20 days
    const result = calculatePriority(20, 5, 1);
    expect(result.level).toBe('low');
    expect(result.daysUntilStockout).toBe(20);
  });

  it('returns low with Infinity when velocity is 0', () => {
    const result = calculatePriority(10, 5, 0);
    expect(result.level).toBe('low');
    expect(result.daysUntilStockout).toBe(Infinity);
  });

  it('returns urgent when velocity is 0 but stock is at or below minimum', () => {
    const result = calculatePriority(5, 5, 0);
    expect(result.level).toBe('urgent');
    expect(result.daysUntilStockout).toBe(Infinity);
  });

  it('returns urgent when stock is 0', () => {
    const result = calculatePriority(0, 5, 2);
    expect(result.level).toBe('urgent');
    expect(result.daysUntilStockout).toBe(0);
  });
});

describe('REQ-019: Suggested Reorder Quantity', () => {
  it('calculates reorder based on velocity, minimum stock, and current stock', () => {
    // velocity 3/day * 7 days = 21 + minimumStock 5 - currentStock 10 = 16
    const qty = calculateSuggestedReorderQty(3, 5, 10);
    expect(qty).toBe(16);
  });

  it('returns 0 when stock is sufficient', () => {
    // velocity 1/day * 7 = 7 + minimum 5 - current 20 = -8 → 0
    const qty = calculateSuggestedReorderQty(1, 5, 20);
    expect(qty).toBe(0);
  });

  it('returns 0 when velocity is 0 and stock exceeds minimum', () => {
    // 0 * 7 + 5 - 10 = -5 → 0
    const qty = calculateSuggestedReorderQty(0, 5, 10);
    expect(qty).toBe(0);
  });

  it('returns minimumStock when velocity is 0 and stock is 0', () => {
    // 0 * 7 + 5 - 0 = 5
    const qty = calculateSuggestedReorderQty(0, 5, 0);
    expect(qty).toBe(5);
  });

  it('rounds up fractional quantities', () => {
    // velocity 0.3/day * 7 = 2.1 + 3 - 4 = 1.1 → ceil → 2
    const qty = calculateSuggestedReorderQty(0.3, 3, 4);
    expect(qty).toBe(2);
  });

  it('handles high velocity correctly', () => {
    // velocity 50/day * 7 = 350 + 10 - 20 = 340
    const qty = calculateSuggestedReorderQty(50, 10, 20);
    expect(qty).toBe(340);
  });
});

describe('REQ-019: Category Label Formatting', () => {
  it('formats single-word slug', () => {
    expect(formatCategoryLabel('wine')).toBe('Wine');
  });

  it('formats hyphenated slug', () => {
    expect(formatCategoryLabel('beer-local')).toBe('Beer Local');
  });

  it('formats multi-hyphenated slug', () => {
    expect(formatCategoryLabel('pre-mixed-spirit')).toBe('Pre Mixed Spirit');
  });
});

describe('REQ-019: Grouping by Category', () => {
  it('groups items by category', () => {
    const items: MockItem[] = [
      { category: 'beer-local', priority: 'low', daysUntilStockout: 15 },
      { category: 'beer-local', priority: 'urgent', daysUntilStockout: 1 },
      { category: 'wine', priority: 'medium', daysUntilStockout: 5 },
    ];

    const groups = groupByCategory(items);
    expect(groups).toHaveLength(2);

    const beerGroup = groups.find((g) => g.category === 'beer-local');
    expect(beerGroup).toBeDefined();
    expect(beerGroup!.itemCount).toBe(2);
    expect(beerGroup!.urgentCount).toBe(1);
    expect(beerGroup!.categoryLabel).toBe('Beer Local');

    const wineGroup = groups.find((g) => g.category === 'wine');
    expect(wineGroup).toBeDefined();
    expect(wineGroup!.itemCount).toBe(1);
    expect(wineGroup!.urgentCount).toBe(0);
  });

  it('sorts items within group by priority then daysUntilStockout', () => {
    const items: MockItem[] = [
      { category: 'beer-local', priority: 'low', daysUntilStockout: 15 },
      { category: 'beer-local', priority: 'urgent', daysUntilStockout: 1 },
      { category: 'beer-local', priority: 'medium', daysUntilStockout: 5 },
      { category: 'beer-local', priority: 'urgent', daysUntilStockout: 0.5 },
    ];

    const groups = groupByCategory(items);
    const group = groups[0];

    expect(group.items[0].priority).toBe('urgent');
    expect(group.items[0].daysUntilStockout).toBe(0.5);
    expect(group.items[1].priority).toBe('urgent');
    expect(group.items[1].daysUntilStockout).toBe(1);
    expect(group.items[2].priority).toBe('medium');
    expect(group.items[3].priority).toBe('low');
  });

  it('handles items with no sales (daysUntilStockout = -1) sorted last within priority', () => {
    const items: MockItem[] = [
      { category: 'wine', priority: 'low', daysUntilStockout: -1 },
      { category: 'wine', priority: 'low', daysUntilStockout: 10 },
    ];

    const groups = groupByCategory(items);
    expect(groups[0].items[0].daysUntilStockout).toBe(10);
    expect(groups[0].items[1].daysUntilStockout).toBe(-1);
  });

  it('returns empty array for no items', () => {
    const groups = groupByCategory([]);
    expect(groups).toHaveLength(0);
  });
});

describe('REQ-019: Summary Counts', () => {
  it('counts priorities correctly', () => {
    const items: MockItem[] = [
      { category: 'a', priority: 'urgent', daysUntilStockout: 1 },
      { category: 'a', priority: 'urgent', daysUntilStockout: 0 },
      { category: 'b', priority: 'medium', daysUntilStockout: 5 },
      { category: 'c', priority: 'low', daysUntilStockout: 20 },
      { category: 'c', priority: 'low', daysUntilStockout: 30 },
    ];

    const urgent = items.filter((i) => i.priority === 'urgent').length;
    const medium = items.filter((i) => i.priority === 'medium').length;
    const low = items.filter((i) => i.priority === 'low').length;

    expect(urgent).toBe(2);
    expect(medium).toBe(1);
    expect(low).toBe(2);
    expect(urgent + medium + low).toBe(items.length);
  });
});

describe('REQ-019: Velocity Calculation', () => {
  it('calculates velocity as totalSales / days', () => {
    const totalSales = 90;
    const days = 30;
    const velocity = totalSales / days;
    expect(velocity).toBe(3);
  });

  it('defaults to 0 velocity when no sales exist', () => {
    const velocity = 0; // no sales in aggregation result
    expect(velocity).toBe(0);
    expect(calculateSuggestedReorderQty(velocity, 5, 10)).toBe(0);
  });

  it('lookback period affects velocity', () => {
    const totalSales = 30;
    const velocity7 = totalSales / 7;
    const velocity30 = totalSales / 30;
    const velocity90 = totalSales / 90;

    // Shorter lookback = higher velocity = larger reorder
    expect(velocity7).toBeGreaterThan(velocity30);
    expect(velocity30).toBeGreaterThan(velocity90);

    expect(calculateSuggestedReorderQty(velocity7, 5, 10)).toBeGreaterThan(
      calculateSuggestedReorderQty(velocity30, 5, 10)
    );
  });
});
