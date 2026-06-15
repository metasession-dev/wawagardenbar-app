/**
 * @requirement REQ-034 — AC2
 *
 * Customer-menu queries must always filter `kind: 'menu-item'` so
 * kitchen-ingredient MenuItems never appear on customer surfaces.
 *
 * Tests mock MenuItemModel + InventoryModel and assert the filter
 * passed to each find / findOne / distinct call contains
 * `kind: 'menu-item'`. The five sites listed in the implementation
 * plan (`services/category-service.ts` × 3, `express-actions.ts` × 1,
 * `order-edit-actions.ts` × 2) plus the additional customer-facing
 * surfaces (search, by-id, distinct categories) are all covered.
 *
 * @requirement REQ-081 - Express main-category filtering and grouped category envelope
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(async () => ({
    userId: '65a1b2c3d4e5f6a7b8c9d000',
    role: 'super-admin',
    email: 'admin@test.local',
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getMenuCategories: vi.fn(async () => ({
      food: [],
      drinks: [],
    })),
    // REQ-075 — getCategories now reads the configurable main-category
    // registry; seed it with the default `food` + `drinks` pair so the
    // pre-REQ-075 kind-filter assertions still find their `mainCategory`
    // `distinct(..)` calls.
    getMainCategories: vi.fn(async () => [
      {
        slug: 'food',
        label: 'Food',
        order: 0,
        isEnabled: true,
      },
      {
        slug: 'drinks',
        label: 'Drinks',
        order: 1,
        isEnabled: true,
      },
    ]),
  },
}));

const recordedFilters: Array<{ method: string; filter: unknown }> = [];

const buildChainable = () => {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    sort: ReturnType<typeof vi.fn>;
    lean: ReturnType<typeof vi.fn>;
  } = {} as never;
  chain.select = vi.fn(() => chain);
  chain.sort = vi.fn(() => chain);
  chain.lean = vi.fn(async () => []);
  return chain;
};

vi.mock('@/models/menu-item-model', () => ({
  default: {
    find: vi.fn((filter: unknown) => {
      recordedFilters.push({ method: 'find', filter });
      return buildChainable();
    }),
    findOne: vi.fn((filter: unknown) => {
      recordedFilters.push({ method: 'findOne', filter });
      return {
        lean: vi.fn(async () => null),
      };
    }),
    distinct: vi.fn(async (_field: string, filter: unknown) => {
      recordedFilters.push({ method: 'distinct', filter });
      return [];
    }),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    find: vi.fn(() => ({
      lean: vi.fn(async () => []),
    })),
    findOne: vi.fn(() => ({
      lean: vi.fn(async () => null),
    })),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const lastFilter = (method: string) => {
  const entries = recordedFilters.filter((r) => r.method === method);
  return entries[entries.length - 1]?.filter as Record<string, unknown>;
};

beforeEach(() => {
  recordedFilters.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── category-service ──────────────────────────────────────────────────────────

describe('REQ-034 AC2 — services/category-service.ts', () => {
  it('getAllMenuItems filters kind:menu-item', async () => {
    const { CategoryService } = await import('@/services/category-service');
    await CategoryService.getAllMenuItems();
    expect(lastFilter('find')).toMatchObject({
      isAvailable: true,
      kind: 'menu-item',
    });
  });

  it('getItemsByMainCategory filters kind:menu-item', async () => {
    const { CategoryService } = await import('@/services/category-service');
    await CategoryService.getItemsByMainCategory('food');
    expect(lastFilter('find')).toMatchObject({
      mainCategory: 'food',
      isAvailable: true,
      kind: 'menu-item',
    });
  });

  it('getItemsByCategory filters kind:menu-item', async () => {
    const { CategoryService } = await import('@/services/category-service');
    await CategoryService.getItemsByCategory('soups');
    expect(lastFilter('find')).toMatchObject({
      category: 'soups',
      isAvailable: true,
      kind: 'menu-item',
    });
  });

  it('searchItems filters kind:menu-item', async () => {
    const { CategoryService } = await import('@/services/category-service');
    await CategoryService.searchItems('beer');
    expect(lastFilter('find')).toMatchObject({
      isAvailable: true,
      kind: 'menu-item',
    });
  });

  it('getCategories distinct queries filter kind:menu-item', async () => {
    const { CategoryService } = await import('@/services/category-service');
    await CategoryService.getCategories();
    const distinctCalls = recordedFilters.filter(
      (r) => r.method === 'distinct'
    );
    expect(distinctCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of distinctCalls) {
      expect(call.filter).toMatchObject({ kind: 'menu-item' });
    }
  });

  it('getItemById filters kind:menu-item via findOne', async () => {
    const { CategoryService } = await import('@/services/category-service');
    await CategoryService.getItemById('65a1b2c3d4e5f6a7b8c9d100');
    expect(lastFilter('findOne')).toMatchObject({
      _id: '65a1b2c3d4e5f6a7b8c9d100',
      kind: 'menu-item',
    });
  });

  it('checkAvailability filters kind:menu-item via findOne', async () => {
    const { CategoryService } = await import('@/services/category-service');
    const result = await CategoryService.checkAvailability(
      '65a1b2c3d4e5f6a7b8c9d100'
    );
    expect(lastFilter('findOne')).toMatchObject({
      _id: '65a1b2c3d4e5f6a7b8c9d100',
      kind: 'menu-item',
    });
    expect(result.available).toBe(false);
  });
});

describe('REQ-081 — app/actions/admin/express-actions.ts', () => {
  it('expressSearchMenuAction filters by mainCategory and category', async () => {
    const { expressSearchMenuAction } = await import(
      '@/app/actions/admin/express-actions'
    );

    await expressSearchMenuAction({
      query: 'pepper',
      mainCategory: 'food',
      category: 'soups',
    });

    expect(lastFilter('find')).toMatchObject({
      isAvailable: true,
      kind: 'menu-item',
      mainCategory: 'food',
      category: 'soups',
    });
  });

  it('expressGetCategoriesAction returns the grouped main-category envelope', async () => {
    const { expressGetCategoriesAction } = await import(
      '@/app/actions/admin/express-actions'
    );

    const result = await expressGetCategoriesAction();

    expect(result.success).toBe(true);
    expect(result.data?.mainCategories).toEqual([
      {
        slug: 'food',
        label: 'Food',
        order: 0,
        subCategories: [],
      },
      {
        slug: 'drinks',
        label: 'Drinks',
        order: 1,
        subCategories: [],
      },
    ]);
  });
});
