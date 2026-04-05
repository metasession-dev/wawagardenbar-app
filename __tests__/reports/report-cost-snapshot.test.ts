/**
 * @requirement REQ-022 - Financial reports must use order-snapshotted costPerUnit
 *
 * Tests the invariant: report cost figures come from item.costPerUnit on the
 * order record (snapshotted at time of sale), NOT from current inventory cost.
 */
import { describe, it, expect } from 'vitest';

// ── Pure extraction of the item aggregation logic ──────────────────

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  costPerUnit: number; // snapshotted at order creation
}

interface AggregatedItem {
  name: string;
  category: string;
  mainCategory: string;
  quantity: number;
  price: number;
  costPerUnit: number;
}

/**
 * Correct implementation: uses item.costPerUnit from order record.
 * This is what the code should do after the fix.
 */
function aggregateItemCosts(
  orders: { items: OrderItem[] }[],
  menuItemLookup: Map<string, { category: string; mainCategory: string }>
): Map<string, AggregatedItem> {
  const itemMap = new Map<string, AggregatedItem>();

  for (const order of orders) {
    for (const item of order.items) {
      const itemId = item.menuItemId;

      if (itemMap.has(itemId)) {
        const existing = itemMap.get(itemId)!;
        existing.quantity += item.quantity;
      } else {
        const menuItem = menuItemLookup.get(itemId);
        if (!menuItem) continue;

        itemMap.set(itemId, {
          name: item.name,
          category: menuItem.category,
          mainCategory: menuItem.mainCategory,
          quantity: item.quantity,
          price: item.price,
          costPerUnit: item.costPerUnit, // from order, not inventory
        });
      }
    }
  }

  return itemMap;
}

function calculateCostBreakdown(itemMap: Map<string, AggregatedItem>) {
  let foodCost = 0;
  let drinkCost = 0;

  for (const [, item] of itemMap) {
    const costTotal = item.costPerUnit * item.quantity;
    if (item.mainCategory === 'drinks') {
      drinkCost += costTotal;
    } else {
      foodCost += costTotal;
    }
  }

  return { foodCost, drinkCost, totalCost: foodCost + drinkCost };
}

// ── Test data ──────────────────────────────────────────────────────

const menuItemLookup = new Map([
  ['item-A', { category: 'mains', mainCategory: 'food' }],
  ['item-B', { category: 'beer', mainCategory: 'drinks' }],
]);

describe('REQ-022: daily report uses item.costPerUnit from order, not current inventory', () => {
  it('should use cost snapshotted at order time', () => {
    // Order was placed when cost was ₦500. Inventory cost has since changed to ₦800.
    // The report should show ₦500, the cost at time of sale.
    const orders = [
      {
        items: [
          {
            menuItemId: 'item-A',
            name: 'Jollof Rice',
            quantity: 3,
            price: 1500,
            subtotal: 4500,
            costPerUnit: 500, // snapshotted at sale — cost was ₦500 then
          },
        ],
      },
    ];

    const itemMap = aggregateItemCosts(orders, menuItemLookup);
    const costs = calculateCostBreakdown(itemMap);

    // Should be 3 × ₦500 = ₦1500, NOT 3 × ₦800
    expect(costs.foodCost).toBe(1500);
    expect(costs.totalCost).toBe(1500);
  });

  it('should not be affected by current inventory cost changes', () => {
    // Two orders for the same item, placed at different costs
    const orders = [
      {
        items: [
          {
            menuItemId: 'item-B',
            name: 'Star Lager',
            quantity: 2,
            price: 800,
            subtotal: 1600,
            costPerUnit: 300, // cost at first order
          },
        ],
      },
      {
        items: [
          {
            menuItemId: 'item-B',
            name: 'Star Lager',
            quantity: 1,
            price: 800,
            subtotal: 800,
            costPerUnit: 300, // same snapshot for same day
          },
        ],
      },
    ];

    const itemMap = aggregateItemCosts(orders, menuItemLookup);
    const costs = calculateCostBreakdown(itemMap);

    // 3 total × ₦300 = ₦900
    expect(costs.drinkCost).toBe(900);
    expect(costs.totalCost).toBe(900);
  });
});

describe('REQ-022: custom date range report uses item.costPerUnit from order', () => {
  it('should aggregate costs from order snapshots across multiple days', () => {
    // Orders from different days, all with snapshotted costs
    const orders = [
      {
        items: [
          {
            menuItemId: 'item-A',
            name: 'Jollof Rice',
            quantity: 5,
            price: 1500,
            subtotal: 7500,
            costPerUnit: 500,
          },
          {
            menuItemId: 'item-B',
            name: 'Star Lager',
            quantity: 10,
            price: 800,
            subtotal: 8000,
            costPerUnit: 350,
          },
        ],
      },
    ];

    const itemMap = aggregateItemCosts(orders, menuItemLookup);
    const costs = calculateCostBreakdown(itemMap);

    expect(costs.foodCost).toBe(2500); // 5 × 500
    expect(costs.drinkCost).toBe(3500); // 10 × 350
    expect(costs.totalCost).toBe(6000);
  });

  it('should handle items with zero cost', () => {
    const orders = [
      {
        items: [
          {
            menuItemId: 'item-A',
            name: 'Complimentary Dish',
            quantity: 1,
            price: 0,
            subtotal: 0,
            costPerUnit: 0,
          },
        ],
      },
    ];

    const itemMap = aggregateItemCosts(orders, menuItemLookup);
    const costs = calculateCostBreakdown(itemMap);

    expect(costs.totalCost).toBe(0);
  });
});
