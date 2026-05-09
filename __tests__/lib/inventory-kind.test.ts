/**
 * @requirement REQ-034 — AC1
 *
 * Inventory.kind discriminator + backfill helper tests.
 *
 * - Schema accepts the new `kind` path with a `'menu-item'` default and
 *   `'kitchen-ingredient'` as the only other allowed value.
 * - Backfill query filter matches only legacy rows without `kind`, so
 *   a re-run after a successful run finds 0 candidates (idempotent).
 *
 * Schema validation is exercised via `new Model(doc).validateSync()` —
 * no Mongo connection required.
 */
import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import InventoryModel from '@/models/inventory-model';
import {
  INVENTORY_KIND_BACKFILL_FILTER,
  isInventoryKindBackfillCandidate,
} from '@/lib/inventory-kind-backfill';
import type { InventoryKind } from '@/interfaces/inventory.interface';

const baseInventoryDoc = () => ({
  menuItemId: new Types.ObjectId(),
  currentStock: 10,
  minimumStock: 1,
  maximumStock: 100,
  unit: 'g',
  costPerUnit: 0,
});

describe('REQ-034 AC1 — Inventory.kind discriminator', () => {
  it('defaults kind to menu-item when omitted', () => {
    const doc = new InventoryModel(baseInventoryDoc());
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.kind).toBe('menu-item');
  });

  it('accepts kind: menu-item explicitly', () => {
    const doc = new InventoryModel({
      ...baseInventoryDoc(),
      kind: 'menu-item',
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.kind).toBe('menu-item');
  });

  it('accepts kind: kitchen-ingredient', () => {
    const doc = new InventoryModel({
      ...baseInventoryDoc(),
      kind: 'kitchen-ingredient',
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.kind).toBe('kitchen-ingredient');
  });

  it('rejects an unknown kind value', () => {
    const doc = new InventoryModel({
      ...baseInventoryDoc(),
      kind: 'something-else' as InventoryKind,
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors?.kind).toBeDefined();
  });
});

describe('REQ-034 AC1 — backfill helper', () => {
  it('filter matches rows missing kind ($exists:false OR null)', () => {
    expect(INVENTORY_KIND_BACKFILL_FILTER).toEqual({
      $or: [{ kind: { $exists: false } }, { kind: null }],
    });
  });

  it('flags a legacy row (kind unset) as a backfill candidate', () => {
    expect(isInventoryKindBackfillCandidate({})).toBe(true);
    expect(isInventoryKindBackfillCandidate({ kind: null })).toBe(true);
    expect(isInventoryKindBackfillCandidate({ kind: undefined })).toBe(true);
  });

  it('skips rows that already have a kind set (idempotent re-run)', () => {
    expect(isInventoryKindBackfillCandidate({ kind: 'menu-item' })).toBe(false);
    expect(
      isInventoryKindBackfillCandidate({ kind: 'kitchen-ingredient' })
    ).toBe(false);
  });
});
