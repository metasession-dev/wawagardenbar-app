/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Pure: printable items + category settings + the admin's selection →
 * the grouped model that both the preview and the PDF are laid out from.
 * Availability/kind filtering happens in the server action, not here.
 */
import type {
  MenuPrintModel,
  MenuPrintPriceType,
  MenuPrintSection,
  MenuPrintSubSection,
  PrintableMenuItem,
} from './types';

export interface MainCategoryInput {
  slug: string;
  label: string;
  order: number;
}

export interface SubCategoryInput {
  value: string;
  label: string;
  order: number;
}

const OTHER_VALUE = '__other';
const OTHER_LABEL = 'Other';

/**
 * Price for the chosen type, falling back to `price` when that type's value
 * is unset (`undefined`, `null`, `NaN`). Mirrors the Edit All page's fallback
 * (REQ-MENUMGT-009); `.lean()` reads skip schema defaults, so unset is common.
 */
export function resolvePrintPrice(
  item: PrintableMenuItem,
  t: MenuPrintPriceType
): number {
  const picked =
    t === 'happyHour'
      ? item.happyHourPrice
      : t === 'show'
        ? item.showPrice
        : item.price;
  return typeof picked === 'number' && Number.isFinite(picked)
    ? picked
    : item.price;
}

export function buildMenuPrintModel(input: {
  items: PrintableMenuItem[];
  mainCategories: MainCategoryInput[];
  menuSettings: Record<string, SubCategoryInput[]>;
  selectedMainCategorySlugs: string[];
  priceType: MenuPrintPriceType;
}): MenuPrintModel {
  const selected = new Set(input.selectedMainCategorySlugs);
  const mains = [...input.mainCategories]
    .filter((m) => selected.has(m.slug))
    .sort((a, b) => a.order - b.order);

  const sections: MenuPrintSection[] = [];
  for (const main of mains) {
    const known = input.menuSettings[main.slug] ?? [];
    const groups = new Map<
      string,
      { sub: MenuPrintSubSection; order: number }
    >();

    for (const item of input.items) {
      if (item.mainCategory !== main.slug) continue;
      // Sub-categories are matched regardless of their isEnabled flag: an
      // available item must never silently disappear from the printed menu.
      const setting = known.find((s) => s.value === item.category);
      const key = setting ? setting.value : OTHER_VALUE;
      let group = groups.get(key);
      if (!group) {
        group = {
          sub: {
            value: key,
            label: setting ? setting.label : OTHER_LABEL,
            items: [],
          },
          order: setting ? setting.order : Number.POSITIVE_INFINITY,
        };
        groups.set(key, group);
      }
      group.sub.items.push({
        name: item.name,
        price: resolvePrintPrice(item, input.priceType),
      });
    }

    const subSections = [...groups.values()]
      .sort((a, b) => a.order - b.order)
      .map(({ sub }) => ({
        ...sub,
        items: [...sub.items].sort((a, b) =>
          a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
        ),
      }))
      .filter((sub) => sub.items.length > 0);

    if (subSections.length > 0) {
      sections.push({ slug: main.slug, label: main.label, subSections });
    }
  }

  return { sections };
}
