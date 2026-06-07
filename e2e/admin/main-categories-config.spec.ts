/**
 * @requirement REQ-075 — Configurable main categories
 * @requirement SRS REQ-MENUMGT-005 — Admins can rename, add, and delete main
 *   categories from the dashboard; delete is blocked while MenuItems or
 *   sub-categories reference the main category.
 *
 * Storage-layer contract pin for `MainCategoryService`
 * (services/main-category-service.ts) — the same path the admin settings
 * actions exercise. We talk to MongoDB directly so the spec doesn't depend
 * on the admin UI being clickable in the regression environment.
 *
 * What this spec pins:
 *   ✓ AC1 — create: new entry persists with auto-derived slug + correct
 *           order (max + 1) under SystemSettings key `main-categories`.
 *   ✓ AC2 — rename: every MenuItem.mainCategory referencing the old slug
 *           is rewritten; sub-categories under `menu-categories` move
 *           from the old key to the new one; the registry entry's slug
 *           is rewritten in place.
 *   ✓ AC3 — delete-blocked: throws with a referenced-count message when
 *           a MenuItem still points at the slug.
 *   ✓ AC4 — delete-allowed: removes the entry once no references exist.
 *
 * What this spec does NOT pin (deferred):
 *   ✗ UI flow (admin settings page → row → rename/delete buttons → toast)
 *     — covered by Phase 6 dashboard smoke once the regression UI is wired.
 *   ✗ Cross-tab reactivity (the form re-renders after revalidatePath).
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { MainCategoryService } from '@/services/main-category-service';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

const SETTINGS_KEY = 'main-categories';
const ADMIN_USER_ID = '65a1b2c3d4e5f6a7b8c9d000';

async function withDb<T>(work: (db: any) => Promise<T>): Promise<T> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await work(client.db(dbName));
  } finally {
    await client.close();
  }
}

async function readRegistry(): Promise<
  Array<{ slug: string; label: string; order: number; isEnabled: boolean }>
> {
  return withDb(async (db) => {
    const doc = await db
      .collection('systemsettings')
      .findOne({ key: SETTINGS_KEY });
    return (doc?.value as Array<any>) ?? [];
  });
}

async function deleteByIdsCleanup(menuItemIds: string[]): Promise<void> {
  if (menuItemIds.length === 0) return;
  await withDb(async (db) => {
    await db.collection('menuitems').deleteMany({
      _id: { $in: menuItemIds.map((id) => new ObjectId(id)) },
    });
  });
}

async function deleteRegistryEntries(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  await withDb(async (db) => {
    const doc = await db
      .collection('systemsettings')
      .findOne({ key: SETTINGS_KEY });
    if (!doc?.value) return;
    const next = (doc.value as Array<any>).filter(
      (c) => !slugs.includes(c.slug)
    );
    await db
      .collection('systemsettings')
      .updateOne({ key: SETTINGS_KEY }, { $set: { value: next } });
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('REQ-075 — main-category registry (REQ-MENUMGT-005)', () => {
  const seededSlugs: string[] = [];
  const seededMenuItemIds: string[] = [];

  test.afterAll(async () => {
    await deleteByIdsCleanup(seededMenuItemIds);
    await deleteRegistryEntries(seededSlugs);
  });

  test('AC1 — create persists slug + label + order under main-categories key', async () => {
    const label = `e2e-req075 Snacks ${Date.now()}`;
    // Read the service-layer view (which respects the default seed when
    // the SystemSettings doc hasn't been persisted yet) rather than the
    // raw Mongo doc — pre-REQ-075 envs may have a doc with empty value.
    const beforeList = await MainCategoryService.list();
    const expectedOrder =
      beforeList.length === 0
        ? 0
        : Math.max(...beforeList.map((c) => c.order ?? 0)) + 1;

    const created = await MainCategoryService.create({ label }, ADMIN_USER_ID);
    seededSlugs.push(created.slug);

    expect(created.slug).toBe(
      label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32)
    );
    expect(created.label).toBe(label);
    expect(created.order).toBe(expectedOrder);
    expect(created.isEnabled).toBe(true);

    const after = await readRegistry();
    const persisted = after.find((c) => c.slug === created.slug);
    expect(persisted).toBeDefined();
    expect(persisted!.label).toBe(label);
  });

  test('AC2 — rename rewrites MenuItem.mainCategory + relocates sub-categories', async () => {
    const oldSlug = `e2e-req075-pre-${Date.now()}`;
    const newSlug = `e2e-req075-post-${Date.now()}`;

    // Seed: registry entry + 2 referencing MenuItems + menu-categories key.
    await withDb(async (db) => {
      await db.collection('systemsettings').updateOne(
        { key: SETTINGS_KEY },
        {
          $push: {
            value: {
              slug: oldSlug,
              label: 'Pre',
              order: 99,
              isEnabled: true,
            },
          },
        },
        { upsert: true }
      );

      const insertResult = await db.collection('menuitems').insertMany([
        {
          kind: 'menu-item',
          name: `e2e-req075-rename-a-${Date.now()}`,
          description: 'REQ-075 rename pin',
          mainCategory: oldSlug,
          category: 'starters',
          price: 100,
          preparationTime: 1,
          isAvailable: false,
        },
        {
          kind: 'menu-item',
          name: `e2e-req075-rename-b-${Date.now()}`,
          description: 'REQ-075 rename pin',
          mainCategory: oldSlug,
          category: 'starters',
          price: 200,
          preparationTime: 1,
          isAvailable: false,
        },
      ]);
      seededMenuItemIds.push(
        ...Object.values(insertResult.insertedIds).map((i) => String(i))
      );

      await db.collection('systemsettings').updateOne(
        { key: 'menu-categories' },
        {
          $set: {
            [`value.${oldSlug}`]: [
              {
                value: 'starters',
                label: 'Starters',
                order: 1,
                isEnabled: true,
              },
            ],
          },
        },
        { upsert: true }
      );
    });
    seededSlugs.push(oldSlug, newSlug);

    const result = await MainCategoryService.rename(
      oldSlug,
      newSlug,
      ADMIN_USER_ID
    );
    expect(result.menuItemsUpdated).toBe(2);
    expect(result.subCategoriesMoved).toBe(1);

    await withDb(async (db) => {
      const stillOld = await db
        .collection('menuitems')
        .countDocuments({ mainCategory: oldSlug });
      expect(stillOld).toBe(0);

      const remappedItems = await db
        .collection('menuitems')
        .find({
          _id: {
            $in: seededMenuItemIds.slice(-2).map((id) => new ObjectId(id)),
          },
        })
        .toArray();
      expect(remappedItems).toHaveLength(2);
      for (const item of remappedItems) {
        expect(item.mainCategory).toBe(newSlug);
      }

      const menuCats = await db
        .collection('systemsettings')
        .findOne({ key: 'menu-categories' });
      expect(menuCats?.value?.[oldSlug]).toBeUndefined();
      expect(Array.isArray(menuCats?.value?.[newSlug])).toBe(true);
      expect(menuCats!.value![newSlug]).toHaveLength(1);

      const reg = await db
        .collection('systemsettings')
        .findOne({ key: SETTINGS_KEY });
      const entries = reg?.value as Array<any>;
      expect(entries.find((c) => c.slug === oldSlug)).toBeUndefined();
      expect(entries.find((c) => c.slug === newSlug)).toBeDefined();
    });
  });

  test('AC3 — delete blocked while MenuItems still reference the slug', async () => {
    const slug = `e2e-req075-block-${Date.now()}`;

    await withDb(async (db) => {
      await db.collection('systemsettings').updateOne(
        { key: SETTINGS_KEY },
        {
          $push: {
            value: { slug, label: 'Block', order: 98, isEnabled: true },
          },
        },
        { upsert: true }
      );

      const insertResult = await db.collection('menuitems').insertOne({
        kind: 'menu-item',
        name: `e2e-req075-delete-block-${Date.now()}`,
        description: 'REQ-075 delete-block pin',
        mainCategory: slug,
        category: 'starters',
        price: 1,
        preparationTime: 1,
        isAvailable: false,
      });
      seededMenuItemIds.push(String(insertResult.insertedId));
    });
    seededSlugs.push(slug);

    await expect(
      MainCategoryService.delete(slug, ADMIN_USER_ID)
    ).rejects.toThrow(/cannot delete/i);
  });

  test('AC4 — delete removes the entry once no references exist', async () => {
    const slug = `e2e-req075-orphan-${Date.now()}`;

    await withDb(async (db) => {
      await db.collection('systemsettings').updateOne(
        { key: SETTINGS_KEY },
        {
          $push: {
            value: { slug, label: 'Orphan', order: 97, isEnabled: true },
          },
        },
        { upsert: true }
      );
    });
    seededSlugs.push(slug);

    await MainCategoryService.delete(slug, ADMIN_USER_ID);

    const after = await readRegistry();
    expect(after.find((c) => c.slug === slug)).toBeUndefined();
  });
});
