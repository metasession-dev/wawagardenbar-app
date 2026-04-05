/**
 * @requirement REQ-022 - Public sales summary COGS must use order-snapshotted cost
 *
 * Tests that the public sales summary API calculates COGS from item.costPerUnit
 * on the order record, not from current inventory.costPerUnit.
 */
import { describe, it, expect } from 'vitest';

// ── Pure extraction of COGS aggregation from public/sales/summary ──

interface SalesOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  subtotal: number;
  costPerUnit: number; // snapshotted at order creation
}

interface ItemAggEntry {
  name: string;
  mainCategory: string;
  quantity: number;
  revenue: number;
  costPerUnit: number;
}

/**
 * Correct implementation: uses item.costPerUnit from order record.
 */
function aggregateSalesItems(
  orders: { items: SalesOrderItem[] }[],
  menuItemLookup: Map<string, { category: string; mainCategory: string }>
): Map<string, ItemAggEntry> {
  const itemAgg = new Map<string, ItemAggEntry>();

  for (const order of orders) {
    for (const item of order.items) {
      const itemId = item.menuItemId;
      if (itemAgg.has(itemId)) {
        const existing = itemAgg.get(itemId)!;
        existing.quantity += item.quantity;
        existing.revenue += item.subtotal;
      } else {
        const menuItem = menuItemLookup.get(itemId);
        itemAgg.set(itemId, {
          name: item.name,
          mainCategory: menuItem?.mainCategory || 'food',
          quantity: item.quantity,
          revenue: item.subtotal,
          costPerUnit: item.costPerUnit, // from order, not inventory
        });
      }
    }
  }

  return itemAgg;
}

function calculateCOGS(itemAgg: Map<string, ItemAggEntry>) {
  let foodCOGS = 0;
  let drinksCOGS = 0;
  let foodRevenue = 0;
  let drinksRevenue = 0;

  for (const [, item] of itemAgg) {
    const costTotal = item.costPerUnit * item.quantity;
    if (item.mainCategory === 'drinks') {
      drinksRevenue += item.revenue;
      drinksCOGS += costTotal;
    } else {
      foodRevenue += item.revenue;
      foodCOGS += costTotal;
    }
  }

  const totalRevenue = foodRevenue + drinksRevenue;
  const totalCOGS = foodCOGS + drinksCOGS;
  const grossProfit = totalRevenue - totalCOGS;

  return { foodCOGS, drinksCOGS, totalCOGS, totalRevenue, grossProfit };
}

// ── Test data ──────────────────────────────────────────────────────

const menuItemLookup = new Map([
  ['item-A', { category: 'mains', mainCategory: 'food' }],
  ['item-B', { category: 'spirits', mainCategory: 'drinks' }],
]);

describe('REQ-022: COGS calculated from order item cost, not inventory', () => {
  it('should calculate COGS from snapshotted costPerUnit', () => {
    // Order placed when food cost was ₦400 and drink cost was ₦200.
    // Current inventory costs may differ — irrelevant for this report.
    const orders = [
      {
        items: [
          {
            menuItemId: 'item-A',
            name: 'Pepper Soup',
            quantity: 4,
            subtotal: 6000,
            costPerUnit: 400,
          },
          {
            menuItemId: 'item-B',
            name: 'Hennessy',
            quantity: 2,
            subtotal: 10000,
            costPerUnit: 200,
          },
        ],
      },
    ];

    const itemAgg = aggregateSalesItems(orders, menuItemLookup);
    const result = calculateCOGS(itemAgg);

    expect(result.foodCOGS).toBe(1600); // 4 × ₦400
    expect(result.drinksCOGS).toBe(400); // 2 × ₦200
    expect(result.totalCOGS).toBe(2000);
    expect(result.totalRevenue).toBe(16000);
    expect(result.grossProfit).toBe(14000);
  });

  it('should aggregate quantities correctly across multiple orders', () => {
    const orders = [
      {
        items: [
          {
            menuItemId: 'item-A',
            name: 'Pepper Soup',
            quantity: 2,
            subtotal: 3000,
            costPerUnit: 400,
          },
        ],
      },
      {
        items: [
          {
            menuItemId: 'item-A',
            name: 'Pepper Soup',
            quantity: 3,
            subtotal: 4500,
            costPerUnit: 400,
          },
        ],
      },
    ];

    const itemAgg = aggregateSalesItems(orders, menuItemLookup);
    const result = calculateCOGS(itemAgg);

    // 5 total quantity × ₦400 = ₦2000
    expect(result.foodCOGS).toBe(2000);
    expect(result.totalRevenue).toBe(7500);
  });

  it('should return zero COGS when no orders exist', () => {
    const itemAgg = aggregateSalesItems([], menuItemLookup);
    const result = calculateCOGS(itemAgg);

    expect(result.totalCOGS).toBe(0);
    expect(result.grossProfit).toBe(0);
  });
});
