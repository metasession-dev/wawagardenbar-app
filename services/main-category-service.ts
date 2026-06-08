/**
 * REQ-075 — Configurable main categories.
 *
 * Authoritative CRUD + reference-counted-delete + transactional-rename
 * service for the main-category registry. The registry replaces the
 * pre-REQ-075 hardcoded `MenuMainCategory = 'food' | 'drinks'` union.
 *
 * Standalone Mongo (no `withTransaction`) — matches the existing project
 * pattern documented in `services/production-service.ts`. The rename
 * operation does multi-document writes sequentially; partial-failure
 * leaves a discoverable mismatch (MenuItem.mainCategory vs registry)
 * that the operator can re-run rename against to converge.
 *
 * @see interfaces/main-category.interface.ts for the registry shape.
 * @see services/system-settings-service.ts for the persistence layer.
 * @requirement REQ-075
 * @requirement SRS REQ-MENUMGT-005
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import SystemSettingsModel from '@/models/system-settings-model';
import { SystemSettingsService } from '@/services/system-settings-service';
import {
  IMainCategoryConfig,
  MAIN_CATEGORY_SLUG_RE,
  RESERVED_MAIN_CATEGORY_SLUGS,
} from '@/interfaces/main-category.interface';

export interface CreateMainCategoryInput {
  label: string;
  /** Optional slug override. Defaults to kebab-case of `label`. */
  slug?: string;
  icon?: string;
  portionsEnabled?: boolean;
}

export interface UpdateMainCategoryInput {
  label?: string;
  order?: number;
  isEnabled?: boolean;
  icon?: string;
  portionsEnabled?: boolean;
}

export interface MainCategoryReferenceCount {
  /** Number of MenuItem documents with `mainCategory: slug`. */
  menuItems: number;
  /** Number of sub-categories under this main category in `IMenuSettings`. */
  subCategories: number;
}

/**
 * Derive a registry slug from a free-text label. Lowercase, hyphenated,
 * non-alphanumerics stripped. Mirrors the existing convention used by
 * `MenuCategoriesForm` for auto-from-label sub-category slugs.
 */
function deriveSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export class MainCategoryService {
  /**
   * List all main categories sorted by `order`.
   */
  static async list(): Promise<IMainCategoryConfig[]> {
    return SystemSettingsService.getMainCategories();
  }

  /**
   * Lookup a single main category by slug. Returns null if absent.
   */
  static async get(slug: string): Promise<IMainCategoryConfig | null> {
    const list = await this.list();
    return list.find((c) => c.slug === slug) ?? null;
  }

  /**
   * Return reference counts for a main category. Used by the settings UI
   * to surface "N menu items + M sub-categories" + to block delete when
   * either count is non-zero.
   */
  static async referenceCount(
    slug: string
  ): Promise<MainCategoryReferenceCount> {
    await connectDB();
    const menuItems = await MenuItemModel.countDocuments({
      mainCategory: slug,
    });

    // `.lean()` returns a POJO; without it Mongoose's Mixed wrapper can
    // make nested arrays fail `Array.isArray()`, masking real refs.
    const menuCatsSetting = await SystemSettingsModel.findOne({
      key: 'menu-categories',
    }).lean<{ value?: Record<string, unknown[]> }>();
    const sub = menuCatsSetting?.value?.[slug];
    const subCategories = Array.isArray(sub) ? sub.length : 0;

    return { menuItems, subCategories };
  }

  /**
   * Create a new main category. Slug is auto-derived from label unless
   * provided. Rejects on duplicate slug, invalid format, or reserved
   * name. New entry's `order` is appended (max + 1).
   */
  static async create(
    input: CreateMainCategoryInput,
    adminUserId: string
  ): Promise<IMainCategoryConfig> {
    if (!input.label?.trim()) {
      throw new Error('Main category label is required');
    }

    const list = await this.list();

    const slug = input.slug?.trim() || deriveSlug(input.label);

    if (!MAIN_CATEGORY_SLUG_RE.test(slug)) {
      throw new Error(
        `Invalid main category slug "${slug}" — must match ${MAIN_CATEGORY_SLUG_RE}`
      );
    }

    if (RESERVED_MAIN_CATEGORY_SLUGS.has(slug)) {
      throw new Error(`Slug "${slug}" is reserved and cannot be used`);
    }

    if (list.some((c) => c.slug === slug)) {
      throw new Error(`Main category with slug "${slug}" already exists`);
    }

    const next: IMainCategoryConfig = {
      slug,
      label: input.label.trim(),
      order: list.length === 0 ? 0 : Math.max(...list.map((c) => c.order)) + 1,
      isEnabled: true,
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.portionsEnabled !== undefined
        ? { portionsEnabled: input.portionsEnabled }
        : {}),
    };

    await SystemSettingsService.updateMainCategories(
      [...list, next],
      adminUserId
    );

    return next;
  }

  /**
   * Patch mutable fields on a main category. `slug` cannot change — use
   * `rename` for that.
   */
  static async update(
    slug: string,
    patch: UpdateMainCategoryInput,
    adminUserId: string
  ): Promise<IMainCategoryConfig> {
    const list = await this.list();
    const idx = list.findIndex((c) => c.slug === slug);
    if (idx === -1) {
      throw new Error(`Main category "${slug}" not found`);
    }

    const current = list[idx];
    const updated: IMainCategoryConfig = {
      ...current,
      ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
      ...(patch.order !== undefined ? { order: patch.order } : {}),
      ...(patch.isEnabled !== undefined ? { isEnabled: patch.isEnabled } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      ...(patch.portionsEnabled !== undefined
        ? { portionsEnabled: patch.portionsEnabled }
        : {}),
    };

    const nextList = [...list];
    nextList[idx] = updated;

    await SystemSettingsService.updateMainCategories(nextList, adminUserId);
    return updated;
  }

  /**
   * Reorder the full list by an array of slugs. Slugs not present in the
   * input are treated as missing — throws to prevent accidental drops.
   * `order` is set to the array index of each entry.
   */
  static async reorder(
    slugs: string[],
    adminUserId: string
  ): Promise<IMainCategoryConfig[]> {
    const list = await this.list();
    const knownSlugs = new Set(list.map((c) => c.slug));
    const inputSlugs = new Set(slugs);

    if (
      knownSlugs.size !== inputSlugs.size ||
      ![...knownSlugs].every((s) => inputSlugs.has(s))
    ) {
      throw new Error(
        'Reorder slug set must exactly match the current main category set'
      );
    }

    const byCategorySlug = new Map(list.map((c) => [c.slug, c]));
    const next = slugs.map((s, i) => ({
      ...(byCategorySlug.get(s) as IMainCategoryConfig),
      order: i,
    }));

    await SystemSettingsService.updateMainCategories(next, adminUserId);
    return next;
  }

  /**
   * Rename — transactional intent, sequential execution.
   *
   * Atomically (best-effort) updates:
   *   1. Every `MenuItem.mainCategory` document from `oldSlug` to `newSlug`.
   *   2. `'menu-categories'` SystemSettings: relocates sub-categories from
   *      the old top-level key to the new one.
   *   3. `'main-categories'` SystemSettings: changes the entry's `slug`
   *      field from `oldSlug` to `newSlug`.
   *
   * If a partial failure occurs (e.g. step 1 succeeds but step 2 fails),
   * the operator's next list-read will show an inconsistency — re-running
   * `rename(oldSlug, newSlug)` is idempotent once step 1 has completed
   * because step 1 becomes a no-op (no MenuItems match `oldSlug`); steps
   * 2 + 3 are then retried.
   */
  static async rename(
    oldSlug: string,
    newSlug: string,
    adminUserId: string
  ): Promise<{
    menuItemsUpdated: number;
    subCategoriesMoved: number;
  }> {
    if (oldSlug === newSlug) {
      throw new Error('oldSlug and newSlug are identical — nothing to rename');
    }

    if (!MAIN_CATEGORY_SLUG_RE.test(newSlug)) {
      throw new Error(`Invalid new slug "${newSlug}"`);
    }

    if (RESERVED_MAIN_CATEGORY_SLUGS.has(newSlug)) {
      throw new Error(`Slug "${newSlug}" is reserved and cannot be used`);
    }

    await connectDB();

    const list = await this.list();
    const old = list.find((c) => c.slug === oldSlug);
    if (!old) {
      throw new Error(`Main category "${oldSlug}" not found`);
    }
    if (list.some((c) => c.slug === newSlug)) {
      throw new Error(`Slug "${newSlug}" is already in use`);
    }

    // Step 1: bulk-rename MenuItem.mainCategory.
    const menuItemResult = await MenuItemModel.updateMany(
      { mainCategory: oldSlug },
      { $set: { mainCategory: newSlug } }
    );

    // Step 2: relocate sub-categories in 'menu-categories' SystemSettings.
    //
    // NOTE: read via `.lean()` so `value` comes back as a plain JS object
    // (POJO) — without it, Mongoose hydrates `value` as a Mixed wrapper
    // whose nested arrays don't pass `Array.isArray()` and whose in-place
    // mutations don't always re-serialize cleanly for `$set`. The old
    // implementation could silently no-op step 2, leaving sub-categories
    // pinned to `oldSlug` after the registry had been renamed to
    // `newSlug` — making the MenuCategoriesForm tab for the new slug
    // appear empty (the "menu categories lost the link" symptom).
    let subCategoriesMoved = 0;
    const menuCatsSettingLean = await SystemSettingsModel.findOne({
      key: 'menu-categories',
    }).lean<{ value?: Record<string, unknown[]> }>();

    if (menuCatsSettingLean?.value) {
      const sourceList = menuCatsSettingLean.value[oldSlug];
      if (Array.isArray(sourceList) && sourceList.length > 0) {
        subCategoriesMoved = sourceList.length;
        // Build the post-rename value as a fresh POJO clone — don't
        // mutate the read result + assume Mongoose will serialize it
        // back correctly.
        const nextValue: Record<string, unknown[]> = {
          ...menuCatsSettingLean.value,
          [newSlug]: sourceList,
        };
        delete nextValue[oldSlug];

        await SystemSettingsModel.findOneAndUpdate(
          { key: 'menu-categories' },
          {
            $set: {
              value: nextValue,
              updatedBy: new Types.ObjectId(adminUserId),
              updatedAt: new Date(),
            },
            $push: {
              changeHistory: {
                value: nextValue,
                changedBy: new Types.ObjectId(adminUserId),
                changedAt: new Date(),
                reason: `Main category rename ${oldSlug} → ${newSlug}`,
              },
            },
          }
        );
      }
    }

    // Step 3: rename in 'main-categories' registry.
    const nextList = list.map((c) =>
      c.slug === oldSlug ? { ...c, slug: newSlug } : c
    );
    await SystemSettingsService.updateMainCategories(nextList, adminUserId);

    return {
      menuItemsUpdated: menuItemResult.modifiedCount ?? 0,
      subCategoriesMoved,
    };
  }

  /**
   * Delete a main category. Refuses if any MenuItem references it OR any
   * sub-categories are still configured under it. The operator should
   * `disable` to soft-remove, or move references first then delete.
   */
  static async delete(slug: string, adminUserId: string): Promise<void> {
    const refs = await this.referenceCount(slug);
    if (refs.menuItems > 0 || refs.subCategories > 0) {
      throw new Error(
        `Cannot delete "${slug}" — ${refs.menuItems} menu items + ${refs.subCategories} sub-categories reference it. Move or remove them first, or disable instead.`
      );
    }

    const list = await this.list();
    const next = list.filter((c) => c.slug !== slug);
    if (next.length === list.length) {
      throw new Error(`Main category "${slug}" not found`);
    }

    await SystemSettingsService.updateMainCategories(next, adminUserId);
  }
}
