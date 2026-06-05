/**
 * @requirement REQ-073 — Admin destructive ops E2E coverage (sub-issue #296)
 * @requirement SRS REQ-KITCHEN-005 — Void kitchen production batch; inventory restored, audit trail preserved
 * @requirement REQ-034 AC13 — Voiding a completed production reverses each ingredientsDeducted + yield + is idempotent
 *
 * Pins the storage-layer contract of `ProductionService.voidBatch`
 * (services/production-service.ts:300). After voiding a completed batch:
 *
 *   - production.status flips to 'voided'
 *   - production.voidedBy + voidedAt are set
 *   - Each ingredientsDeducted[i].inventoryId's currentStock increased by
 *     ingredientsDeducted[i].quantityInInventoryUnit
 *   - Yield Inventory's currentStock decreased by production.actualYield
 *   - 2 StockMovement rows written: one 'addition' per ingredient
 *     (category: 'production'), one 'deduction' for the yield reversal
 *   - Idempotent: re-voiding leaves all of the above unchanged
 *
 * What this spec pins:
 *   ✓ Storage-layer state transitions across Production + Inventory + StockMovement
 *   ✓ Idempotency (second call is a no-op)
 *   ✓ Audit trail via StockMovement (the destructive op leaves a paper trail)
 *
 * What this spec does NOT pin (deferred):
 *   ✗ Action-layer auth wrapping (voidProductionAction's session cookie gate
 *     to super-admin) — covered by separate action unit tests
 *   ✗ UI flow (kitchen dashboard → recent productions list → void button)
 *   ✗ The 24h reasonNote-required gate (validateVoidReason) — has unit-test
 *     coverage already
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { ProductionService } from '@/services/production-service';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

interface SeedHandle {
  superAdminId: string;
  ingredientInventoryId: string;
  yieldInventoryId: string;
  menuItemId: string;
  recipeId: string;
  productionId: string;
  actualYield: number;
  ingredientQuantityDeducted: number;
  ingredientStockAfterDeduct: number;
  yieldStockAfterProduce: number;
}

async function seedCompletedBatch(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const now = new Date();
    const ts = Date.now();

    const userResult = await db.collection('users').insertOne({
      email: `e2e-req073-void-${ts}@test.wawagardenbar.com`,
      phone: `+234E2E${ts}`.slice(0, 15),
      firstName: 'E2E',
      lastName: 'REQ073Void',
      role: 'super-admin',
      isAdmin: true,
      accountStatus: 'active',
      emailVerified: true,
      phoneVerified: false,
      loyaltyPoints: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0,
      rewardsEarned: 0,
      totalSpent: 0,
      totalOrders: 0,
      addresses: [],
      paymentMethods: [],
      createdAt: now,
      updatedAt: now,
    });
    const superAdminId = String(userResult.insertedId);

    const menuItemResult = await db.collection('menuitems').insertOne({
      kind: 'menu-item',
      name: `e2e-req073-void-menu-${ts}`,
      description: 'REQ-073 e2e void target',
      category: 'food',
      price: 2000,
      images: [],
      customizations: [],
      tags: ['e2e-req073'],
      allergens: [],
      isAvailable: true,
      slug: `e2e-req073-void-menu-${ts}`,
      createdAt: now,
      updatedAt: now,
    });
    const menuItemId = String(menuItemResult.insertedId);

    const ingredientQuantityDeducted = 5;
    const ingredientStockAfterDeduct = 0;
    const ingredientInvResult = await db.collection('inventories').insertOne({
      kind: 'kitchen-ingredient',
      name: `e2e-req073-void-ingredient-${ts}`,
      currentStock: ingredientStockAfterDeduct,
      minimumStock: 0,
      maximumStock: 100,
      unit: 'g',
      status: 'out-of-stock',
      costPerUnit: 10,
      preventOrdersWhenOutOfStock: false,
      salesVelocity: 0,
      totalSales: 0,
      totalWaste: 0,
      totalRestocked: 0,
      trackByLocation: false,
      locations: [],
      autoReorderEnabled: false,
      reorderQuantity: 0,
      createdAt: now,
      updatedAt: now,
    });
    const ingredientInventoryId = String(ingredientInvResult.insertedId);

    const actualYield = 10;
    const yieldStockAfterProduce = actualYield;
    const yieldInvResult = await db.collection('inventories').insertOne({
      menuItemId: new ObjectId(menuItemId),
      kind: 'menu-item',
      name: `e2e-req073-void-menu-inv-${ts}`,
      currentStock: yieldStockAfterProduce,
      minimumStock: 0,
      maximumStock: 100,
      unit: 'portion',
      status: 'in-stock',
      costPerUnit: 100,
      preventOrdersWhenOutOfStock: false,
      salesVelocity: 0,
      totalSales: 0,
      totalWaste: 0,
      totalRestocked: 0,
      trackByLocation: false,
      locations: [],
      autoReorderEnabled: false,
      reorderQuantity: 0,
      createdAt: now,
      updatedAt: now,
    });
    const yieldInventoryId = String(yieldInvResult.insertedId);

    const recipeResult = await db.collection('recipes').insertOne({
      menuItemId: new ObjectId(menuItemId),
      name: `e2e-req073-void-recipe-${ts}`,
      ingredients: [
        {
          inventoryId: new ObjectId(ingredientInventoryId),
          quantityPerUnit: ingredientQuantityDeducted / actualYield,
          unitId: 'g',
        },
      ],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const recipeId = String(recipeResult.insertedId);

    const productionResult = await db.collection('productions').insertOne({
      recipeId: new ObjectId(recipeId),
      targetMenuItemId: new ObjectId(menuItemId),
      batchCount: 1,
      expectedYield: actualYield,
      actualYield,
      yieldVariance: 0,
      ingredientsDeducted: [
        {
          inventoryId: new ObjectId(ingredientInventoryId),
          quantityInInventoryUnit: ingredientQuantityDeducted,
          inventoryUnitId: 'g',
          name: 'e2e-req073-ingredient',
        },
      ],
      performedBy: new ObjectId(superAdminId),
      performedByName: 'E2E REQ073Void',
      performedAt: now,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    });
    const productionId = String(productionResult.insertedId);

    return {
      superAdminId,
      ingredientInventoryId,
      yieldInventoryId,
      menuItemId,
      recipeId,
      productionId,
      actualYield,
      ingredientQuantityDeducted,
      ingredientStockAfterDeduct,
      yieldStockAfterProduce,
    };
  } finally {
    await client.close();
  }
}

async function cleanup(handle: SeedHandle | null): Promise<void> {
  if (!handle) return;
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db
      .collection('stockmovements')
      .deleteMany({ productionId: new ObjectId(handle.productionId) });
    await db
      .collection('productions')
      .deleteOne({ _id: new ObjectId(handle.productionId) });
    await db
      .collection('recipes')
      .deleteOne({ _id: new ObjectId(handle.recipeId) });
    await db
      .collection('inventories')
      .deleteOne({ _id: new ObjectId(handle.yieldInventoryId) });
    await db
      .collection('inventories')
      .deleteOne({ _id: new ObjectId(handle.ingredientInventoryId) });
    await db
      .collection('menuitems')
      .deleteOne({ _id: new ObjectId(handle.menuItemId) });
    await db
      .collection('users')
      .deleteOne({ _id: new ObjectId(handle.superAdminId) });
  } finally {
    await client.close();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('REQ-073 — admin destructive op: kitchen-void-batch (REQ-KITCHEN-005)', () => {
  let handle: SeedHandle | null = null;

  test.afterAll(async () => {
    await cleanup(handle);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('AC3: voidBatch flips status + restores ingredient + reverses yield + writes audit StockMovement rows', async () => {
    handle = await seedCompletedBatch();

    await ProductionService.voidBatch({
      productionId: handle.productionId,
      voidedBy: handle.superAdminId,
      voidedByName: 'E2E REQ073Void',
      voidedByRole: 'super-admin',
      reasonNote: 'e2e-req073-void-pin',
    });

    const { uri, dbName } = mongoConn();
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db(dbName);

      const prod = await db
        .collection('productions')
        .findOne({ _id: new ObjectId(handle.productionId) });
      expect(prod).not.toBeNull();
      expect(prod!.status).toBe('voided');
      expect(prod!.voidedAt).toBeInstanceOf(Date);
      expect(String(prod!.voidedBy)).toBe(handle.superAdminId);

      const ingredientInv = await db
        .collection('inventories')
        .findOne({ _id: new ObjectId(handle.ingredientInventoryId) });
      expect(ingredientInv).not.toBeNull();
      expect(ingredientInv!.currentStock).toBe(
        handle.ingredientStockAfterDeduct + handle.ingredientQuantityDeducted
      );

      const yieldInv = await db
        .collection('inventories')
        .findOne({ _id: new ObjectId(handle.yieldInventoryId) });
      expect(yieldInv).not.toBeNull();
      expect(yieldInv!.currentStock).toBe(
        handle.yieldStockAfterProduce - handle.actualYield
      );

      const stockMovements = await db
        .collection('stockmovements')
        .find({ productionId: new ObjectId(handle.productionId) })
        .toArray();
      expect(stockMovements).toHaveLength(2);

      const additionRow = stockMovements.find((m) => m.type === 'addition');
      expect(additionRow).toBeDefined();
      expect(additionRow!.category).toBe('production');
      expect(additionRow!.quantity).toBe(handle.ingredientQuantityDeducted);
      expect(String(additionRow!.inventoryId)).toBe(
        handle.ingredientInventoryId
      );

      const deductionRow = stockMovements.find((m) => m.type === 'deduction');
      expect(deductionRow).toBeDefined();
      expect(deductionRow!.category).toBe('production');
      expect(deductionRow!.quantity).toBe(-handle.actualYield);
      expect(String(deductionRow!.inventoryId)).toBe(handle.yieldInventoryId);
    } finally {
      await client.close();
    }
  });

  test('AC4: re-voiding an already-voided batch is a no-op (idempotent)', async () => {
    if (!handle) throw new Error('handle missing');

    const { uri, dbName } = mongoConn();
    const client = new MongoClient(uri);
    let beforeIngredientStock: number;
    let beforeYieldStock: number;
    let beforeMovementCount: number;
    try {
      await client.connect();
      const db = client.db(dbName);
      const beforeIngredientInv = await db
        .collection('inventories')
        .findOne({ _id: new ObjectId(handle.ingredientInventoryId) });
      const beforeYieldInv = await db
        .collection('inventories')
        .findOne({ _id: new ObjectId(handle.yieldInventoryId) });
      const beforeMovements = await db
        .collection('stockmovements')
        .find({ productionId: new ObjectId(handle.productionId) })
        .toArray();
      beforeIngredientStock = beforeIngredientInv!.currentStock;
      beforeYieldStock = beforeYieldInv!.currentStock;
      beforeMovementCount = beforeMovements.length;
    } finally {
      await client.close();
    }

    await ProductionService.voidBatch({
      productionId: handle.productionId,
      voidedBy: handle.superAdminId,
      voidedByName: 'E2E REQ073Void',
      voidedByRole: 'super-admin',
      reasonNote: 'e2e-req073-void-pin-again',
    });

    const client2 = new MongoClient(mongoConn().uri);
    try {
      await client2.connect();
      const db = client2.db(mongoConn().dbName);
      const afterIngredientInv = await db
        .collection('inventories')
        .findOne({ _id: new ObjectId(handle.ingredientInventoryId) });
      const afterYieldInv = await db
        .collection('inventories')
        .findOne({ _id: new ObjectId(handle.yieldInventoryId) });
      const afterMovements = await db
        .collection('stockmovements')
        .find({ productionId: new ObjectId(handle.productionId) })
        .toArray();

      expect(afterIngredientInv!.currentStock).toBe(beforeIngredientStock);
      expect(afterYieldInv!.currentStock).toBe(beforeYieldStock);
      expect(afterMovements).toHaveLength(beforeMovementCount);
    } finally {
      await client2.close();
    }
  });
});
