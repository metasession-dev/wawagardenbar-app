/**
 * @requirement REQ-030 - Multi-component inventory deduction via customization option links
 *
 * Unit tests for the pure resolver that maps an order item's selected customizations
 * back to the menu item's configured inventory links, producing the list of
 * `(inventoryId, deductionPerUnit)` pairs that should be deducted in addition to the
 * base menu item's stock.
 *
 * No Mongo dependency — resolver operates on plain objects.
 */
import { describe, it, expect } from 'vitest';
import { resolveLinkedInventoryFor } from '@/lib/customization-inventory';

const INV_OGBONO = '65a1b2c3d4e5f6a7b8c9d0e1';
const INV_UGU = '65a1b2c3d4e5f6a7b8c9d0e3';

type MinimalOption = {
  name: string;
  price: number;
  available: boolean;
  inventoryId?: string;
  inventoryDeduction?: number;
};

type MinimalCustomization = {
  name: string;
  required: boolean;
  options: MinimalOption[];
};

type MinimalMenuItem = {
  customizations: MinimalCustomization[];
};

type OrderCustomization = { name: string; option: string; price: number };

function soupGroup(options: MinimalOption[]): MinimalCustomization {
  return { name: 'Soup', required: true, options };
}

describe('REQ-030: resolveLinkedInventoryFor', () => {
  it('returns empty array when menu item has no customizations', () => {
    const menuItem: MinimalMenuItem = { customizations: [] };
    const selected: OrderCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];

    expect(resolveLinkedInventoryFor(menuItem, selected)).toEqual([]);
  });

  it('returns empty array when order item has no selected customizations', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        soupGroup([
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: INV_OGBONO,
          },
        ]),
      ],
    };

    expect(resolveLinkedInventoryFor(menuItem, [])).toEqual([]);
  });

  it('returns empty array when selected option has no inventoryId', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        soupGroup([
          { name: 'Ogbono', price: 0, available: true }, // no inventoryId
        ]),
      ],
    };
    const selected: OrderCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];

    expect(resolveLinkedInventoryFor(menuItem, selected)).toEqual([]);
  });

  it('returns one entry per selected option with an inventoryId', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        soupGroup([
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: INV_OGBONO,
          },
          { name: 'None', price: 0, available: true },
        ]),
      ],
    };
    const selected: OrderCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];

    expect(resolveLinkedInventoryFor(menuItem, selected)).toEqual([
      { inventoryId: INV_OGBONO, deductionPerUnit: 1 },
    ]);
  });

  it('defaults deductionPerUnit to 1 when inventoryDeduction omitted', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        soupGroup([
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: INV_OGBONO,
          },
        ]),
      ],
    };
    const selected: OrderCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];

    const result = resolveLinkedInventoryFor(menuItem, selected);

    expect(result[0].deductionPerUnit).toBe(1);
  });

  it('uses inventoryDeduction verbatim when provided', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        soupGroup([
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: INV_OGBONO,
            inventoryDeduction: 2.5,
          },
        ]),
      ],
    };
    const selected: OrderCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];

    const result = resolveLinkedInventoryFor(menuItem, selected);

    expect(result).toEqual([
      { inventoryId: INV_OGBONO, deductionPerUnit: 2.5 },
    ]);
  });

  it('returns multiple entries when multiple groups link inventories', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        {
          name: 'Soup',
          required: true,
          options: [
            {
              name: 'Ogbono',
              price: 0,
              available: true,
              inventoryId: INV_OGBONO,
            },
          ],
        },
        {
          name: 'Extra veg',
          required: false,
          options: [
            {
              name: 'Ugu',
              price: 500,
              available: true,
              inventoryId: INV_UGU,
              inventoryDeduction: 0.25,
            },
          ],
        },
      ],
    };
    const selected: OrderCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
      { name: 'Extra veg', option: 'Ugu', price: 500 },
    ];

    expect(resolveLinkedInventoryFor(menuItem, selected)).toEqual([
      { inventoryId: INV_OGBONO, deductionPerUnit: 1 },
      { inventoryId: INV_UGU, deductionPerUnit: 0.25 },
    ]);
  });

  it('skips selected option when menu item group name no longer matches', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        soupGroup([
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: INV_OGBONO,
          },
        ]),
      ],
    };
    // Customer selected under a group that no longer exists on the menu item
    const selected: OrderCustomization[] = [
      { name: 'Stew', option: 'Ogbono', price: 0 },
    ];

    expect(resolveLinkedInventoryFor(menuItem, selected)).toEqual([]);
  });

  it('skips selected option when menu item option name no longer matches', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        soupGroup([
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: INV_OGBONO,
          },
        ]),
      ],
    };
    // Customer selected an option that has been removed from the menu item
    const selected: OrderCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 0 },
    ];

    expect(resolveLinkedInventoryFor(menuItem, selected)).toEqual([]);
  });

  it('returns duplicate entries when two options point at the same inventoryId', () => {
    const menuItem: MinimalMenuItem = {
      customizations: [
        {
          name: 'Soup',
          required: true,
          options: [
            {
              name: 'Ogbono',
              price: 0,
              available: true,
              inventoryId: INV_OGBONO,
            },
          ],
        },
        {
          name: 'Extra Soup',
          required: false,
          options: [
            {
              name: 'Ogbono',
              price: 500,
              available: true,
              inventoryId: INV_OGBONO,
            },
          ],
        },
      ],
    };
    const selected: OrderCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
      { name: 'Extra Soup', option: 'Ogbono', price: 500 },
    ];

    expect(resolveLinkedInventoryFor(menuItem, selected)).toEqual([
      { inventoryId: INV_OGBONO, deductionPerUnit: 1 },
      { inventoryId: INV_OGBONO, deductionPerUnit: 1 },
    ]);
  });
});
