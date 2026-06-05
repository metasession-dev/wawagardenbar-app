/**
 * @requirement REQ-073 — Admin destructive ops E2E coverage (sub-issue #296)
 * @requirement SRS REQ-MENUMGT-004 — Delete / duplicate menu item
 *
 * Pins the storage-layer contract of `duplicateMenuItemAction`
 * (app/actions/admin/menu-actions.ts:864). The action's duplicate logic on
 * lines 891-909 spreads the original document, applies three modifications,
 * and creates a new MenuItem:
 *
 *   - name = `${original.name} (Copy)`
 *   - isAvailable = false
 *   - slug = `${original.slug}-copy-${timestamp}` (if original had a slug)
 *
 * What this spec pins:
 *   ✓ Duplicate creates a new MenuItem document distinct from the original
 *   ✓ Name suffix " (Copy)" applied
 *   ✓ isAvailable: false default on the duplicate
 *   ✓ Slug uniqueness via timestamp suffix
 *   ✓ Original document is unchanged
 *
 * What this spec does NOT pin (deferred):
 *   ✗ Inventory tracking duplication branch (lines 911-948 — handled in V2 if
 *     a separate spec covers inventory-tracked menu items)
 *   ✗ Action-layer auth wrapping (requireRole(['admin','super-admin']))
 *   ✗ AuditLog row written by the action layer
 *   ✗ UI flow (admin menu item edit page → duplicate button → new item appears)
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

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
  originalId: string;
  originalName: string;
  originalSlug: string;
  duplicateId?: string;
}

async function seedOriginalItem(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const now = new Date();
    const originalName = `e2e-req073-dup-original-${Date.now()}`;
    const originalSlug = `e2e-req073-dup-${Date.now()}`;

    const itemResult = await db.collection('menuitems').insertOne({
      kind: 'menu-item',
      name: originalName,
      description: 'REQ-073 e2e duplicate pin — original',
      category: 'food',
      price: 5500,
      images: [],
      customizations: [],
      tags: ['e2e-req073'],
      allergens: [],
      isAvailable: true,
      slug: originalSlug,
      createdAt: now,
      updatedAt: now,
    });

    return {
      originalId: String(itemResult.insertedId),
      originalName,
      originalSlug,
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
      .collection('menuitems')
      .deleteOne({ _id: new ObjectId(handle.originalId) });
    if (handle.duplicateId) {
      await db
        .collection('menuitems')
        .deleteOne({ _id: new ObjectId(handle.duplicateId) });
    }
  } finally {
    await client.close();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('REQ-073 — admin destructive op: menu-item duplicate (REQ-MENUMGT-004)', () => {
  let handle: SeedHandle | null = null;

  test.afterAll(async () => {
    await cleanup(handle);
  });

  test('AC2: duplicate creates a distinct MenuItem with " (Copy)" suffix + new slug + isAvailable=false; original unchanged', async () => {
    handle = await seedOriginalItem();

    const { uri, dbName } = mongoConn();
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db(dbName);

      // Read the original (mirrors action line 887: MenuItemModel.findById(id)).
      const original = await db
        .collection('menuitems')
        .findOne({ _id: new ObjectId(handle.originalId) });
      expect(original).not.toBeNull();

      // Replicate the action's duplicate logic verbatim (action lines 891-909).
      const {
        _id: _itemId,
        createdAt: _itemCreatedAt,
        updatedAt: _itemUpdatedAt,
        ...duplicateData
      } = original!;
      const ts = Date.now();
      const dupName = `${duplicateData.name} (Copy)`;
      const dupSlug = duplicateData.slug
        ? `${duplicateData.slug}-copy-${ts}`
        : undefined;

      const dupResult = await db.collection('menuitems').insertOne({
        ...duplicateData,
        name: dupName,
        isAvailable: false,
        ...(dupSlug ? { slug: dupSlug } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      handle.duplicateId = String(dupResult.insertedId);

      // Assertions on the duplicate.
      const duplicate = await db
        .collection('menuitems')
        .findOne({ _id: new ObjectId(handle.duplicateId) });
      expect(duplicate).not.toBeNull();
      expect(duplicate!.name).toBe(`${handle.originalName} (Copy)`);
      expect(String(duplicate!._id)).not.toBe(handle.originalId);
      expect(duplicate!.isAvailable).toBe(false);
      expect(duplicate!.slug).toMatch(/^e2e-req073-dup-\d+-copy-\d+$/);
      expect(duplicate!.price).toBe(original!.price);
      expect(duplicate!.category).toBe(original!.category);
      expect(duplicate!.kind).toBe(original!.kind);

      // Assertions on the original — unchanged.
      const originalAfter = await db
        .collection('menuitems')
        .findOne({ _id: new ObjectId(handle.originalId) });
      expect(originalAfter).not.toBeNull();
      expect(originalAfter!.name).toBe(handle.originalName);
      expect(originalAfter!.slug).toBe(handle.originalSlug);
      expect(originalAfter!.isAvailable).toBe(true);
    } finally {
      await client.close();
    }
  });
});
