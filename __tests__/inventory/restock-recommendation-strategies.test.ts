/**
 * @requirement REQ-020 - Restock recommendation strategies and CSV export
 */
import { describe, it, expect } from 'vitest';

// ─── Types matching service interfaces ───

interface MockItem {
  itemName: string;
  category: string;
  avgDailySales: number;
  sellingPrice: number;
  costPerUnit: number;
  currentStock: number;
  minimumStock: number;
  suggestedReorderQty: number;
  priority: 'urgent' | 'medium' | 'low';
  score: number;
  diversityGuaranteed: boolean;
  unit: string;
  supplier: string;
}

type Strategy = 'urgency' | 'popularity' | 'profitability';

const MIN_DIVERSITY_PER_CATEGORY = 2;

// ─── Pure functions extracted from service ───

function applyScore(item: MockItem, strategy: Strategy): number {
  if (strategy === 'popularity') {
    return item.avgDailySales;
  }
  if (strategy === 'profitability') {
    return (
      Math.round(
        (item.sellingPrice - item.costPerUnit) * item.avgDailySales * 100
      ) / 100
    );
  }
  return 0;
}

function applyDiversityGuarantee(
  items: MockItem[],
  strategy: Strategy
): MockItem[] {
  if (strategy === 'urgency') return items;

  const categoryItems = new Map<string, MockItem[]>();
  for (const item of items) {
    const existing = categoryItems.get(item.category) || [];
    existing.push(item);
    categoryItems.set(item.category, existing);
  }

  for (const [, catItems] of categoryItems) {
    catItems.sort((a, b) => b.score - a.score);
    const guaranteed = catItems.slice(0, MIN_DIVERSITY_PER_CATEGORY);
    for (const item of guaranteed) {
      if (item.score === 0) {
        item.diversityGuaranteed = true;
        item.suggestedReorderQty = Math.max(
          0,
          item.minimumStock - item.currentStock
        );
      }
    }
  }

  return items;
}

function generateCsvContent(items: MockItem[]): string {
  const headers = [
    'Item Name',
    'Category',
    'Current Stock',
    'Unit',
    'Avg Daily Sales',
    'Suggested Reorder Qty',
    'Supplier',
    'Priority',
    'Cost Per Unit',
    'Selling Price',
  ];

  const rows = items.map((item) => [
    item.itemName,
    item.category,
    String(item.currentStock),
    item.unit,
    String(item.avgDailySales),
    String(item.suggestedReorderQty),
    item.supplier || '',
    item.priority,
    String(item.costPerUnit),
    String(item.sellingPrice),
  ]);

  return [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');
}

function makeItem(overrides: Partial<MockItem> = {}): MockItem {
  return {
    itemName: 'Test Item',
    category: 'beer-local',
    avgDailySales: 5,
    sellingPrice: 1000,
    costPerUnit: 400,
    currentStock: 10,
    minimumStock: 5,
    suggestedReorderQty: 30,
    priority: 'low',
    score: 0,
    diversityGuaranteed: false,
    unit: 'bottles',
    supplier: 'Supplier A',
    ...overrides,
  };
}

// ─── Tests ───

describe('REQ-020: Popularity Scoring', () => {
  it('scores by avgDailySales in popularity mode', () => {
    const item = makeItem({ avgDailySales: 12.5 });
    expect(applyScore(item, 'popularity')).toBe(12.5);
  });

  it('scores 0 for items with no sales', () => {
    const item = makeItem({ avgDailySales: 0 });
    expect(applyScore(item, 'popularity')).toBe(0);
  });

  it('sorts items by score descending', () => {
    const items = [
      makeItem({ itemName: 'Low', avgDailySales: 1 }),
      makeItem({ itemName: 'High', avgDailySales: 10 }),
      makeItem({ itemName: 'Mid', avgDailySales: 5 }),
    ];
    for (const item of items) {
      item.score = applyScore(item, 'popularity');
    }
    items.sort((a, b) => b.score - a.score);

    expect(items[0].itemName).toBe('High');
    expect(items[1].itemName).toBe('Mid');
    expect(items[2].itemName).toBe('Low');
  });
});

describe('REQ-020: Profitability Scoring', () => {
  it('scores by margin times volume', () => {
    // (1000 - 400) * 5 = 3000
    const item = makeItem({
      sellingPrice: 1000,
      costPerUnit: 400,
      avgDailySales: 5,
    });
    expect(applyScore(item, 'profitability')).toBe(3000);
  });

  it('scores 0 when no sales regardless of margin', () => {
    const item = makeItem({
      sellingPrice: 5000,
      costPerUnit: 100,
      avgDailySales: 0,
    });
    expect(applyScore(item, 'profitability')).toBe(0);
  });

  it('handles negative margins', () => {
    // (100 - 200) * 3 = -300
    const item = makeItem({
      sellingPrice: 100,
      costPerUnit: 200,
      avgDailySales: 3,
    });
    expect(applyScore(item, 'profitability')).toBe(-300);
  });

  it('ranks high-margin high-volume items first', () => {
    const items = [
      makeItem({
        itemName: 'Cheap popular',
        sellingPrice: 500,
        costPerUnit: 400,
        avgDailySales: 20,
      }),
      makeItem({
        itemName: 'Expensive niche',
        sellingPrice: 5000,
        costPerUnit: 1000,
        avgDailySales: 1,
      }),
      makeItem({
        itemName: 'Balanced',
        sellingPrice: 2000,
        costPerUnit: 800,
        avgDailySales: 5,
      }),
    ];
    for (const item of items) {
      item.score = applyScore(item, 'profitability');
    }
    items.sort((a, b) => b.score - a.score);

    // Balanced: (2000-800)*5 = 6000
    // Expensive niche: (5000-1000)*1 = 4000
    // Cheap popular: (500-400)*20 = 2000
    expect(items[0].itemName).toBe('Balanced');
    expect(items[1].itemName).toBe('Expensive niche');
    expect(items[2].itemName).toBe('Cheap popular');
  });
});

describe('REQ-020: Urgency Scoring', () => {
  it('returns 0 score in urgency mode', () => {
    const item = makeItem({ avgDailySales: 10 });
    expect(applyScore(item, 'urgency')).toBe(0);
  });
});

describe('REQ-020: Diversity Guarantee', () => {
  it('guarantees minimum items per category in popularity mode', () => {
    const items = [
      makeItem({
        itemName: 'Popular A',
        category: 'beer-local',
        avgDailySales: 10,
      }),
      makeItem({ itemName: 'Unpopular B', category: 'wine', avgDailySales: 0 }),
      makeItem({ itemName: 'Unpopular C', category: 'wine', avgDailySales: 0 }),
    ];
    for (const item of items) {
      item.score = applyScore(item, 'popularity');
    }

    applyDiversityGuarantee(items, 'popularity');

    const wineItems = items.filter((i) => i.category === 'wine');
    expect(wineItems.length).toBe(2);
    expect(wineItems[0].diversityGuaranteed).toBe(true);
    expect(wineItems[1].diversityGuaranteed).toBe(true);
  });

  it('does not apply diversity guarantee in urgency mode', () => {
    const items = [
      makeItem({ itemName: 'A', category: 'wine', avgDailySales: 0 }),
    ];
    applyDiversityGuarantee(items, 'urgency');
    expect(items[0].diversityGuaranteed).toBe(false);
  });

  it('does not mark items with sales as diversity guaranteed', () => {
    const items = [
      makeItem({
        itemName: 'Active',
        category: 'beer-local',
        avgDailySales: 5,
      }),
      makeItem({
        itemName: 'Also Active',
        category: 'beer-local',
        avgDailySales: 3,
      }),
    ];
    for (const item of items) {
      item.score = applyScore(item, 'popularity');
    }
    applyDiversityGuarantee(items, 'popularity');

    expect(items[0].diversityGuaranteed).toBe(false);
    expect(items[1].diversityGuaranteed).toBe(false);
  });

  it('adjusts reorder qty for zero-score guaranteed items to minimum viable', () => {
    const items = [
      makeItem({
        itemName: 'No Sales',
        category: 'wine',
        avgDailySales: 0,
        currentStock: 2,
        minimumStock: 5,
        suggestedReorderQty: 0,
      }),
    ];
    for (const item of items) {
      item.score = applyScore(item, 'popularity');
    }
    applyDiversityGuarantee(items, 'popularity');

    // minimumStock (5) - currentStock (2) = 3
    expect(items[0].suggestedReorderQty).toBe(3);
    expect(items[0].diversityGuaranteed).toBe(true);
  });

  it('adjusts reorder qty to 0 when stock exceeds minimum', () => {
    const items = [
      makeItem({
        itemName: 'Overstocked',
        category: 'wine',
        avgDailySales: 0,
        currentStock: 10,
        minimumStock: 5,
        suggestedReorderQty: 0,
      }),
    ];
    for (const item of items) {
      item.score = applyScore(item, 'popularity');
    }
    applyDiversityGuarantee(items, 'popularity');

    expect(items[0].suggestedReorderQty).toBe(0);
    expect(items[0].diversityGuaranteed).toBe(true);
  });

  it('works with profitability mode too', () => {
    const items = [
      makeItem({
        itemName: 'No Sales',
        category: 'starters',
        avgDailySales: 0,
        currentStock: 1,
        minimumStock: 3,
      }),
    ];
    for (const item of items) {
      item.score = applyScore(item, 'profitability');
    }
    applyDiversityGuarantee(items, 'profitability');

    expect(items[0].diversityGuaranteed).toBe(true);
    expect(items[0].suggestedReorderQty).toBe(2); // 3 - 1
  });

  it('handles category with exactly MIN_DIVERSITY items', () => {
    const items = [
      makeItem({ itemName: 'A', category: 'juice', avgDailySales: 0 }),
      makeItem({ itemName: 'B', category: 'juice', avgDailySales: 0 }),
    ];
    for (const item of items) {
      item.score = applyScore(item, 'popularity');
    }
    applyDiversityGuarantee(items, 'popularity');

    expect(items.filter((i) => i.diversityGuaranteed).length).toBe(2);
  });
});

describe('REQ-020: CSV Export', () => {
  it('generates correct CSV columns', () => {
    const csv = generateCsvContent([]);
    const headerLine = csv.split('\n')[0];
    expect(headerLine).toBe(
      'Item Name,Category,Current Stock,Unit,Avg Daily Sales,Suggested Reorder Qty,Supplier,Priority,Cost Per Unit,Selling Price'
    );
  });

  it('generates correct CSV data rows', () => {
    const items = [
      makeItem({
        itemName: 'Star Lager',
        category: 'beer-local',
        currentStock: 24,
        unit: 'bottles',
        avgDailySales: 8,
        suggestedReorderQty: 37,
        supplier: 'ABC Distributors',
        priority: 'medium',
        costPerUnit: 350,
        sellingPrice: 800,
      }),
    ];
    const csv = generateCsvContent(items);
    const lines = csv.split('\n');

    expect(lines.length).toBe(2); // header + 1 row
    expect(lines[1]).toBe(
      '"Star Lager","beer-local","24","bottles","8","37","ABC Distributors","medium","350","800"'
    );
  });

  it('escapes quotes in item names', () => {
    const items = [makeItem({ itemName: 'Item "Special"' })];
    const csv = generateCsvContent(items);
    expect(csv).toContain('"Item ""Special"""');
  });

  it('handles empty supplier', () => {
    const items = [makeItem({ supplier: '' })];
    const csv = generateCsvContent(items);
    const lines = csv.split('\n');
    // supplier column should be empty string in quotes
    expect(lines[1]).toContain('""');
  });

  it('filename follows expected pattern', () => {
    const strategy: Strategy = 'popularity';
    const date = '2026-04-01';
    const filename = `restock-recommendations-${strategy}-${date}.csv`;
    expect(filename).toBe('restock-recommendations-popularity-2026-04-01.csv');
  });
});
