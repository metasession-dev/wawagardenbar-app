/**
 * @requirement REQ-034 — AC3
 *
 * Inventory dashboard tab helpers.
 *
 * AC3 requires the Inventory dashboard to surface two tabs (Sellable / Kitchen)
 * driven by the `Inventory.kind` discriminator added in AC1, with the Kitchen
 * tab hidden from users whose role is `kitchen` (defense in depth — the route
 * is also super-admin-gated in `lib/permissions.ts`).
 *
 * Logic is extracted to a pure helper so it can be exercised under the
 * node-environment vitest config (no React rendering required).
 */
import { describe, it, expect } from 'vitest';
import {
  INVENTORY_TABS,
  INVENTORY_TAB_TO_KIND,
  filterInventoryByTab,
  type InventoryTab,
} from '@/lib/inventory-tabs';
import type { InventoryKind } from '@/interfaces/inventory.interface';

type Row = { _id: string; kind?: InventoryKind | null };

const rows: Row[] = [
  { _id: 'a', kind: 'menu-item' },
  { _id: 'b', kind: 'kitchen-ingredient' },
  { _id: 'c', kind: 'menu-item' },
  { _id: 'd', kind: 'kitchen-ingredient' },
  // legacy row pre-backfill — treated as sellable per AC1 default
  { _id: 'e' },
  { _id: 'f', kind: null },
];

describe('REQ-034 AC3 — INVENTORY_TABS registry', () => {
  it('exposes both tabs in stable order: sellable then kitchen', () => {
    expect(INVENTORY_TABS).toEqual(['sellable', 'kitchen']);
  });

  it('maps each tab to the correct inventory kind', () => {
    expect(INVENTORY_TAB_TO_KIND).toEqual({
      sellable: 'menu-item',
      kitchen: 'kitchen-ingredient',
    });
  });
});

describe('REQ-034 AC3 — filterInventoryByTab', () => {
  it('returns only menu-item rows for the sellable tab', () => {
    const result = filterInventoryByTab(rows, 'sellable');
    expect(result.map((r) => r._id).sort()).toEqual(['a', 'c', 'e', 'f']);
  });

  it('returns only kitchen-ingredient rows for the kitchen tab', () => {
    const result = filterInventoryByTab(rows, 'kitchen');
    expect(result.map((r) => r._id).sort()).toEqual(['b', 'd']);
  });

  it('treats rows with missing kind as sellable (legacy back-compat)', () => {
    const legacy: Row[] = [{ _id: 'x' }, { _id: 'y', kind: null }];
    expect(filterInventoryByTab(legacy, 'sellable').map((r) => r._id)).toEqual([
      'x',
      'y',
    ]);
    expect(filterInventoryByTab(legacy, 'kitchen')).toEqual([]);
  });

  it('returns a new array (does not mutate input)', () => {
    const input: Row[] = [{ _id: 'a', kind: 'menu-item' }];
    const out = filterInventoryByTab(input, 'sellable');
    expect(out).not.toBe(input);
    expect(input).toHaveLength(1);
  });
});

describe('REQ-034 AC3 — type re-export sanity', () => {
  it('InventoryTab type accepts both tab literals', () => {
    const sellable: InventoryTab = 'sellable';
    const kitchen: InventoryTab = 'kitchen';
    expect(sellable).toBe('sellable');
    expect(kitchen).toBe('kitchen');
  });
});
