'use server';

/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Read-only data for "Print New Menu". Called on every "Generate Menu" click
 * so printed prices are always read from the database at generation time
 * (NFR-3). No audit log or revalidation: nothing is written.
 */

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { z } from 'zod';
import { sessionOptions, SessionData } from '@/lib/session';
import { hasSessionPermission } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import { SystemSettingsService } from '@/services/system-settings-service';
import { MAIN_CATEGORY_SLUG_RE } from '@/interfaces/main-category.interface';
import type { ActionResult } from '@/app/actions/admin/menu-actions';
import type { PrintableMenuItem } from '@/lib/menu-print/types';
import type {
  MainCategoryInput,
  SubCategoryInput,
} from '@/lib/menu-print/build-menu-print-model';

export interface PrintableMenuData {
  items: PrintableMenuItem[];
  mainCategories: MainCategoryInput[];
  menuSettings: Record<string, SubCategoryInput[]>;
}

const mainCategorySlugsSchema = z
  .array(z.string().regex(MAIN_CATEGORY_SLUG_RE))
  .min(1)
  .max(50);

interface LeanPrintableItem {
  _id: unknown;
  name: string;
  mainCategory: string;
  category: string;
  price: number;
  showPrice?: number | null;
  happyHourPrice?: number | null;
}

export async function getPrintableMenuDataAction(
  mainCategorySlugs: string[]
): Promise<ActionResult<PrintableMenuData>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId || !hasSessionPermission(session, 'menuManagement')) {
      return {
        success: false,
        error: 'You do not have permission to print the menu',
      };
    }

    const parsed = mainCategorySlugsSchema.safeParse(mainCategorySlugs);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Select at least one valid main category',
      };
    }
    const slugs = parsed.data;

    await connectDB();

    const [items, menuCategories, mainCategories] = await Promise.all([
      MenuItemModel.find({
        kind: 'menu-item',
        isAvailable: true,
        mainCategory: { $in: slugs },
      })
        .select('_id name mainCategory category price showPrice happyHourPrice')
        .lean<LeanPrintableItem[]>(),
      SystemSettingsService.getMenuCategories(),
      SystemSettingsService.getMainCategories(),
    ]);

    const data: PrintableMenuData = {
      items: items.map((item) => ({
        id: String(item._id),
        name: item.name,
        mainCategory: item.mainCategory,
        category: item.category,
        price: item.price,
        showPrice: item.showPrice,
        happyHourPrice: item.happyHourPrice,
      })),
      mainCategories: mainCategories
        .filter((m) => m.isEnabled)
        .map(({ slug, label, order }) => ({ slug, label, order })),
      menuSettings: Object.fromEntries(
        Object.entries(menuCategories).map(([slug, subs]) => [
          slug,
          subs.map(({ value, label, order }) => ({ value, label, order })),
        ])
      ),
    };

    // Plain objects only across the server-action boundary.
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error) {
    console.error('Error loading printable menu data:', error);
    return { success: false, error: 'Failed to load menu items' };
  }
}
