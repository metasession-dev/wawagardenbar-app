/**
 * @requirement REQ-075 — Configurable main categories
 * @requirement SRS REQ-MENUMGT-005
 *
 * Pins the contract of `MainCategoryService`:
 *
 *   - list / get
 *   - create with slug auto-derive + duplicate + reserved + format guards
 *   - update mutable fields; slug immutable
 *   - reorder requires exact slug set
 *   - rename updates MenuItem.mainCategory + relocates sub-categories
 *   - delete blocked while MenuItem or sub-category refs exist
 *
 * Mongo + SystemSettingsService.update are mocked; tests assert the
 * service called them with the right arguments + raised the right errors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(),
}));

const mockCount = vi.fn();
vi.mock('@/models/menu-item-model', () => ({
  default: {
    countDocuments: (...args: unknown[]) => mockCount(...args),
    updateMany: (...args: unknown[]) => mockUpdateMany(...args),
  },
}));
const mockUpdateMany = vi.fn();

const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
// `MainCategoryService` reads SystemSettings via `findOne().lean()` (fix
// for the rename-loses-link bug). The mock returns a chainable whose
// `.lean()` resolves to whatever the test set on `mockFindOne`.
vi.mock('@/models/system-settings-model', () => ({
  default: {
    findOne: (...args: unknown[]) => ({
      lean: () => mockFindOne(...args),
    }),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

const mockGetMainCategories = vi.fn();
const mockUpdateMainCategories = vi.fn();
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getMainCategories: (...args: unknown[]) => mockGetMainCategories(...args),
    updateMainCategories: (...args: unknown[]) =>
      mockUpdateMainCategories(...args),
  },
}));

import { MainCategoryService } from '@/services/main-category-service';

const ADMIN = '65a1b2c3d4e5f6a7b8c9d0e1';

const SEED = [
  {
    slug: 'food',
    label: 'Food',
    order: 0,
    isEnabled: true,
    icon: '🍽️',
    portionsEnabled: true,
  },
  {
    slug: 'drinks',
    label: 'Drinks',
    order: 1,
    isEnabled: true,
    icon: '🥤',
    portionsEnabled: false,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMainCategories.mockResolvedValue(SEED);
  mockUpdateMainCategories.mockResolvedValue(true);
  mockCount.mockResolvedValue(0);
  mockUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  mockFindOne.mockResolvedValue(null);
  mockFindOneAndUpdate.mockResolvedValue({});
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('REQ-075 — MainCategoryService', () => {
  describe('list / get', () => {
    it('list returns sorted entries', async () => {
      const list = await MainCategoryService.list();
      expect(list).toHaveLength(2);
      expect(list.map((c) => c.slug)).toEqual(['food', 'drinks']);
    });

    it('get finds a known slug', async () => {
      const c = await MainCategoryService.get('drinks');
      expect(c?.label).toBe('Drinks');
    });

    it('get returns null for unknown slug', async () => {
      const c = await MainCategoryService.get('nope');
      expect(c).toBeNull();
    });
  });

  describe('create', () => {
    it('derives slug from label when not provided', async () => {
      await MainCategoryService.create({ label: 'Snacks & Bites' }, ADMIN);
      expect(mockUpdateMainCategories).toHaveBeenCalledOnce();
      const passedList = mockUpdateMainCategories.mock.calls[0][0];
      const created = passedList[passedList.length - 1];
      expect(created.slug).toBe('snacks-bites');
      expect(created.label).toBe('Snacks & Bites');
      expect(created.order).toBe(2); // max(0,1)+1
      expect(created.isEnabled).toBe(true);
    });

    it('rejects duplicate slug', async () => {
      await expect(
        MainCategoryService.create({ label: 'Drinks' }, ADMIN)
      ).rejects.toThrow(/already exists/i);
    });

    it('rejects reserved slug', async () => {
      await expect(
        MainCategoryService.create({ label: 'Other' }, ADMIN)
      ).rejects.toThrow(/reserved/i);
    });

    it('rejects invalid slug format', async () => {
      await expect(
        MainCategoryService.create({ label: 'Bad', slug: 'Bad Slug!' }, ADMIN)
      ).rejects.toThrow(/must match/i);
    });

    it('rejects empty label', async () => {
      await expect(
        MainCategoryService.create({ label: '   ' }, ADMIN)
      ).rejects.toThrow(/label is required/i);
    });
  });

  describe('update', () => {
    it('patches label without touching slug', async () => {
      await MainCategoryService.update('food', { label: 'Meals' }, ADMIN);
      const passedList = mockUpdateMainCategories.mock.calls[0][0];
      const food = passedList.find((c: { slug: string }) => c.slug === 'food');
      expect(food.label).toBe('Meals');
      expect(food.slug).toBe('food'); // unchanged
    });

    it('rejects unknown slug', async () => {
      await expect(
        MainCategoryService.update('nope', { label: 'X' }, ADMIN)
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('reorder', () => {
    it('sets order from array index', async () => {
      await MainCategoryService.reorder(['drinks', 'food'], ADMIN);
      const passedList = mockUpdateMainCategories.mock.calls[0][0];
      expect(passedList[0].slug).toBe('drinks');
      expect(passedList[0].order).toBe(0);
      expect(passedList[1].slug).toBe('food');
      expect(passedList[1].order).toBe(1);
    });

    it('rejects when input slug set differs from current set', async () => {
      await expect(
        MainCategoryService.reorder(['food'], ADMIN)
      ).rejects.toThrow(/exactly match/i);
    });
  });

  describe('rename', () => {
    it('updates MenuItem.mainCategory + relocates sub-categories + updates registry', async () => {
      mockUpdateMany.mockResolvedValue({ modifiedCount: 3 });
      mockFindOne.mockResolvedValue({
        key: 'menu-categories',
        value: { food: [{ label: 'Starters' }], drinks: [] },
      });

      const result = await MainCategoryService.rename('food', 'meals', ADMIN);

      expect(mockUpdateMany).toHaveBeenCalledWith(
        { mainCategory: 'food' },
        { $set: { mainCategory: 'meals' } }
      );
      expect(result.menuItemsUpdated).toBe(3);
      expect(result.subCategoriesMoved).toBe(1);

      // Registry update: the 'food' entry got its slug rewritten to 'meals'.
      const finalListUpdate = mockUpdateMainCategories.mock.calls[0][0];
      expect(
        finalListUpdate.find((c: { slug: string }) => c.slug === 'meals')
      ).toBeDefined();
      expect(
        finalListUpdate.find((c: { slug: string }) => c.slug === 'food')
      ).toBeUndefined();
    });

    // Regression: the rename relocates 'food' → 'meals' inside the
    // 'menu-categories' SystemSettings doc. Old impl mutated the
    // Mongoose-Mixed wrapper in place + assumed `$set: { value: ... }`
    // would persist the deletion; that left sub-categories under the
    // old slug while the registry had been renamed, breaking the
    // MenuCategoriesForm tab for the new slug.
    it('writes a $set with the new slug key and without the old slug key', async () => {
      mockFindOne.mockResolvedValueOnce({
        key: 'menu-categories',
        value: {
          food: [
            { value: 'starters', label: 'Starters', order: 1, isEnabled: true },
            {
              value: 'main-courses',
              label: 'Main Courses',
              order: 2,
              isEnabled: true,
            },
          ],
          drinks: [{ value: 'wine', label: 'Wine', order: 1, isEnabled: true }],
        },
      });

      await MainCategoryService.rename('food', 'meals', ADMIN);

      const menuCatsWriteCall = mockFindOneAndUpdate.mock.calls.find(
        (c) => c[0]?.key === 'menu-categories'
      );
      expect(menuCatsWriteCall).toBeDefined();
      const nextValue = menuCatsWriteCall![1].$set.value;
      expect(nextValue.food).toBeUndefined();
      expect(Array.isArray(nextValue.meals)).toBe(true);
      expect(nextValue.meals).toHaveLength(2);
      expect(nextValue.meals[0].value).toBe('starters');
      // Drinks unchanged.
      expect(nextValue.drinks).toHaveLength(1);
    });

    it('rejects identical old/new slug', async () => {
      await expect(
        MainCategoryService.rename('food', 'food', ADMIN)
      ).rejects.toThrow(/nothing to rename/i);
    });

    it('rejects when newSlug already exists', async () => {
      await expect(
        MainCategoryService.rename('food', 'drinks', ADMIN)
      ).rejects.toThrow(/already in use/i);
    });

    it('rejects reserved newSlug', async () => {
      await expect(
        MainCategoryService.rename('food', 'other', ADMIN)
      ).rejects.toThrow(/reserved/i);
    });
  });

  describe('delete', () => {
    it('refuses when MenuItems still reference the main category', async () => {
      mockCount.mockResolvedValue(5);
      await expect(MainCategoryService.delete('food', ADMIN)).rejects.toThrow(
        /5 menu items/i
      );
    });

    it('refuses when sub-categories still configured', async () => {
      mockCount.mockResolvedValue(0);
      mockFindOne.mockResolvedValue({
        key: 'menu-categories',
        value: { food: [{ label: 'Starters' }, { label: 'Mains' }] },
      });
      await expect(MainCategoryService.delete('food', ADMIN)).rejects.toThrow(
        /2 sub-categories/i
      );
    });

    it('removes from list when no references', async () => {
      mockCount.mockResolvedValue(0);
      mockFindOne.mockResolvedValue({
        key: 'menu-categories',
        value: { food: [], drinks: [] },
      });

      await MainCategoryService.delete('food', ADMIN);
      const finalList = mockUpdateMainCategories.mock.calls[0][0];
      expect(finalList).toHaveLength(1);
      expect(finalList[0].slug).toBe('drinks');
    });
  });
});
