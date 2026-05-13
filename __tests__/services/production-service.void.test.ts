/**
 * @requirement REQ-034 — AC13
 *
 * Voiding a production reverses every linked StockMovement.
 *   - super-admin only (admin / kitchen / etc. blocked)
 *   - within 24h: reasonNote optional
 *   - past 24h: reasonNote required, persisted on every reversal
 *   - idempotent: voiding an already-voided production is a no-op
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));
vi.mock('@/models/recipe-model', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/menu-item-model', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/stock-movement-model', () => ({
  default: { create: vi.fn() },
}));
vi.mock('@/models/production-model', () => ({
  default: { findById: vi.fn(), create: vi.fn(), find: vi.fn() },
}));
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: { getUnitsOfMeasurement: vi.fn() },
}));

import InventoryModel from '@/models/inventory-model';
import StockMovementModel from '@/models/stock-movement-model';
import ProductionModel from '@/models/production-model';
import { ProductionService } from '@/services/production-service';

const voidedBy = new Types.ObjectId().toString();

function makeProduction(opts: {
  performedAt: Date;
  status?: 'completed' | 'voided';
  actualYield?: number;
}) {
  const _id = new Types.ObjectId();
  const targetMenuItemId = new Types.ObjectId();
  const goatId = new Types.ObjectId();
  const oilId = new Types.ObjectId();
  const saveMock = vi.fn().mockResolvedValue(undefined);

  const production = {
    _id,
    recipeId: new Types.ObjectId(),
    targetMenuItemId,
    batchCount: 2,
    expectedYield: 8,
    actualYield: opts.actualYield ?? 8,
    yieldVariance: 0,
    ingredientsDeducted: [
      {
        inventoryId: goatId,
        quantityInInventoryUnit: 400,
        inventoryUnitId: 'g',
        name: 'Goat',
      },
      {
        inventoryId: oilId,
        quantityInInventoryUnit: 60,
        inventoryUnitId: 'ml',
        name: 'Palm Oil',
      },
    ],
    stockMovementIds: [],
    performedBy: new Types.ObjectId(),
    performedAt: opts.performedAt,
    status: opts.status ?? 'completed',
    save: saveMock,
    toObject() {
      const { save: _save, toObject: _t, ...rest } = this;
      return rest;
    },
    voidedBy: undefined as Types.ObjectId | undefined,
    voidedAt: undefined as Date | undefined,
    reasonNote: undefined as string | undefined,
  };

  return { production, _id, targetMenuItemId, goatId, oilId, saveMock };
}

beforeEach(() => {
  vi.clearAllMocks();
  (InventoryModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
    acknowledged: true,
    modifiedCount: 1,
  });
  (StockMovementModel.create as ReturnType<typeof vi.fn>).mockImplementation(
    async (payload: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...payload,
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-034 AC13 — void within 24h', () => {
  const performedAt = new Date(Date.now() - 60 * 60 * 1000); // 1h ago

  it('super-admin can void without reasonNote', async () => {
    const { production, _id, targetMenuItemId, saveMock } = makeProduction({
      performedAt,
    });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      menuItemId: targetMenuItemId,
      kind: 'menu-item',
    });

    await expect(
      ProductionService.voidBatch({
        productionId: _id.toString(),
        voidedBy,
        voidedByRole: 'super-admin',
      })
    ).resolves.toBeDefined();

    expect(saveMock).toHaveBeenCalled();
    expect(production.status).toBe('voided');
  });

  it('admin role is BLOCKED', async () => {
    const { production, _id } = makeProduction({ performedAt });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    await expect(
      ProductionService.voidBatch({
        productionId: _id.toString(),
        voidedBy,
        voidedByRole: 'admin',
      })
    ).rejects.toThrow(/super-admin/);
  });

  it('csr role is BLOCKED', async () => {
    const { production, _id } = makeProduction({ performedAt });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    await expect(
      ProductionService.voidBatch({
        productionId: _id.toString(),
        voidedBy,
        voidedByRole: 'csr',
      })
    ).rejects.toThrow(/super-admin/);
  });

  it('reverses every deduction StockMovement (creates additions)', async () => {
    const { production, _id, targetMenuItemId } = makeProduction({
      performedAt,
    });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      menuItemId: targetMenuItemId,
      kind: 'menu-item',
    });

    await ProductionService.voidBatch({
      productionId: _id.toString(),
      voidedBy,
      voidedByRole: 'super-admin',
    });

    const movements = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls;
    const additions = movements.filter(
      ([p]) => (p as { type: string }).type === 'addition'
    );
    expect(additions).toHaveLength(2); // one per deducted ingredient
    expect(
      additions.every(
        ([p]) => (p as { category: string }).category === 'production'
      )
    ).toBe(true);
  });

  it('reverses the MenuItem yield addition (creates a deduction)', async () => {
    const { production, _id, targetMenuItemId } = makeProduction({
      performedAt,
    });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      menuItemId: targetMenuItemId,
      kind: 'menu-item',
    });

    await ProductionService.voidBatch({
      productionId: _id.toString(),
      voidedBy,
      voidedByRole: 'super-admin',
    });

    const movements = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls;
    const deduction = movements.find(
      ([p]) => (p as { type: string }).type === 'deduction'
    );
    expect(deduction).toBeDefined();
    expect((deduction![0] as { quantity: number }).quantity).toBe(-8);
  });

  it('Production.status flips to voided', async () => {
    const { production, _id, targetMenuItemId } = makeProduction({
      performedAt,
    });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      menuItemId: targetMenuItemId,
      kind: 'menu-item',
    });

    await ProductionService.voidBatch({
      productionId: _id.toString(),
      voidedBy,
      voidedByRole: 'super-admin',
    });

    expect(production.status).toBe('voided');
    expect(production.voidedBy).toBeInstanceOf(Types.ObjectId);
    expect(production.voidedAt).toBeInstanceOf(Date);
  });
});

describe('REQ-034 AC13 — void past 24h', () => {
  const performedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago

  it('super-admin must provide reasonNote (rejects without)', async () => {
    const { production, _id } = makeProduction({ performedAt });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    await expect(
      ProductionService.voidBatch({
        productionId: _id.toString(),
        voidedBy,
        voidedByRole: 'super-admin',
      })
    ).rejects.toThrow(/reasonNote/);

    // also rejects empty string
    await expect(
      ProductionService.voidBatch({
        productionId: _id.toString(),
        voidedBy,
        voidedByRole: 'super-admin',
        reasonNote: '   ',
      })
    ).rejects.toThrow(/reasonNote/);
  });

  it('reasonNote persisted on every reversal StockMovement', async () => {
    const { production, _id, targetMenuItemId } = makeProduction({
      performedAt,
    });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      menuItemId: targetMenuItemId,
      kind: 'menu-item',
    });

    await ProductionService.voidBatch({
      productionId: _id.toString(),
      voidedBy,
      voidedByRole: 'super-admin',
      reasonNote: '  spoilt batch  ',
    });

    const movements = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls;
    expect(movements.length).toBeGreaterThan(0);
    for (const [payload] of movements) {
      expect((payload as { notes?: string }).notes).toBe('spoilt batch');
    }
  });

  it('Production.reasonNote persisted on the production row too', async () => {
    const { production, _id, targetMenuItemId } = makeProduction({
      performedAt,
    });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      menuItemId: targetMenuItemId,
      kind: 'menu-item',
    });

    await ProductionService.voidBatch({
      productionId: _id.toString(),
      voidedBy,
      voidedByRole: 'super-admin',
      reasonNote: 'spoilt batch',
    });

    expect(production.reasonNote).toBe('spoilt batch');
  });
});

describe('REQ-034 AC13 — idempotency', () => {
  it('voiding an already-voided production is a no-op', async () => {
    const { production, _id } = makeProduction({
      performedAt: new Date(Date.now() - 60 * 60 * 1000),
      status: 'voided',
    });
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      production
    );

    await ProductionService.voidBatch({
      productionId: _id.toString(),
      voidedBy,
      voidedByRole: 'super-admin',
    });

    expect(InventoryModel.updateOne).not.toHaveBeenCalled();
    expect(StockMovementModel.create).not.toHaveBeenCalled();
  });
});
