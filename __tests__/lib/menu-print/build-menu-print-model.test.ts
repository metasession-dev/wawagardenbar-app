/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Grouping, ordering and price resolution for the printable menu model
 * (AC5, AC6, AC18; review findings R6, R7).
 */
import { describe, it, expect } from 'vitest';
import {
  buildMenuPrintModel,
  resolvePrintPrice,
} from '@/lib/menu-print/build-menu-print-model';
import type { PrintableMenuItem } from '@/lib/menu-print/types';

function item(overrides: Partial<PrintableMenuItem>): PrintableMenuItem {
  return {
    id: 'id',
    name: 'Item',
    mainCategory: 'food',
    category: 'main-courses',
    price: 1000,
    ...overrides,
  };
}

const mainCategories = [
  { slug: 'drinks', label: 'Drinks', order: 2 },
  { slug: 'food', label: 'Food', order: 1 },
];

const menuSettings = {
  food: [
    { value: 'soups', label: 'Soups', order: 2 },
    { value: 'main-courses', label: 'Main Courses', order: 1 },
  ],
  drinks: [{ value: 'beer', label: 'Beer', order: 1 }],
};

describe('resolvePrintPrice', () => {
  const full = item({ price: 1000, happyHourPrice: 800, showPrice: 1200 });

  it('picks the price for each type', () => {
    expect(resolvePrintPrice(full, 'default')).toBe(1000);
    expect(resolvePrintPrice(full, 'happyHour')).toBe(800);
    expect(resolvePrintPrice(full, 'show')).toBe(1200);
  });

  it.each([undefined, null, Number.NaN])(
    'falls back to price when the chosen value is %s (AC6)',
    (missing) => {
      const it1 = item({
        price: 1500,
        happyHourPrice: missing,
        showPrice: missing,
      });
      expect(resolvePrintPrice(it1, 'happyHour')).toBe(1500);
      expect(resolvePrintPrice(it1, 'show')).toBe(1500);
    }
  );
});

describe('buildMenuPrintModel', () => {
  const items: PrintableMenuItem[] = [
    item({ name: 'jollof rice', category: 'main-courses', price: 3000 }),
    item({ name: 'Egusi', category: 'soups', price: 2500 }),
    item({
      name: 'Asun',
      category: 'main-courses',
      price: 4000,
      happyHourPrice: 3500,
    }),
    item({
      name: 'Star',
      mainCategory: 'drinks',
      category: 'beer',
      price: 1200,
    }),
    item({ name: 'Mystery', category: 'not-in-settings', price: 500 }),
  ];

  it('includes only the selected main categories (AC5)', () => {
    const model = buildMenuPrintModel({
      items,
      mainCategories,
      menuSettings,
      selectedMainCategorySlugs: ['food'],
      priceType: 'default',
    });
    expect(model.sections.map((s) => s.slug)).toEqual(['food']);
    const names = model.sections.flatMap((s) =>
      s.subSections.flatMap((sub) => sub.items.map((i) => i.name))
    );
    expect(names).not.toContain('Star');
  });

  it('orders main and sub sections by their settings order', () => {
    const model = buildMenuPrintModel({
      items,
      mainCategories,
      menuSettings,
      selectedMainCategorySlugs: ['drinks', 'food'],
      priceType: 'default',
    });
    expect(model.sections.map((s) => s.slug)).toEqual(['food', 'drinks']);
    expect(model.sections[0].subSections.map((s) => s.label)).toEqual([
      'Main Courses',
      'Soups',
      'Other',
    ]);
  });

  it('sorts item names case-insensitively', () => {
    const model = buildMenuPrintModel({
      items,
      mainCategories,
      menuSettings,
      selectedMainCategorySlugs: ['food'],
      priceType: 'default',
    });
    expect(model.sections[0].subSections[0].items.map((i) => i.name)).toEqual([
      'Asun',
      'jollof rice',
    ]);
  });

  it('prices items per the chosen type with fallback (AC5, AC6)', () => {
    const model = buildMenuPrintModel({
      items,
      mainCategories,
      menuSettings,
      selectedMainCategorySlugs: ['food'],
      priceType: 'happyHour',
    });
    const mains = model.sections[0].subSections[0].items;
    expect(mains).toEqual([
      { name: 'Asun', price: 3500 },
      { name: 'jollof rice', price: 3000 },
    ]);
  });

  it('puts items with an unknown sub-category under "Other", last', () => {
    const model = buildMenuPrintModel({
      items,
      mainCategories,
      menuSettings,
      selectedMainCategorySlugs: ['food'],
      priceType: 'default',
    });
    const last = model.sections[0].subSections.at(-1);
    expect(last).toEqual({
      value: '__other',
      label: 'Other',
      items: [{ name: 'Mystery', price: 500 }],
    });
  });

  it('carries only name and price per item (AC18)', () => {
    const model = buildMenuPrintModel({
      items,
      mainCategories,
      menuSettings,
      selectedMainCategorySlugs: ['food', 'drinks'],
      priceType: 'default',
    });
    for (const section of model.sections) {
      for (const sub of section.subSections) {
        for (const it1 of sub.items) {
          expect(Object.keys(it1).sort()).toEqual(['name', 'price']);
        }
      }
    }
  });

  it('drops empty sub-sections and sections', () => {
    const model = buildMenuPrintModel({
      items: [item({ name: 'Egusi', category: 'soups' })],
      mainCategories,
      menuSettings,
      selectedMainCategorySlugs: ['food', 'drinks'],
      priceType: 'default',
    });
    expect(model.sections).toHaveLength(1);
    expect(model.sections[0].subSections.map((s) => s.value)).toEqual([
      'soups',
    ]);
  });

  it('returns no sections when nothing is selected', () => {
    expect(
      buildMenuPrintModel({
        items,
        mainCategories,
        menuSettings,
        selectedMainCategorySlugs: [],
        priceType: 'default',
      })
    ).toEqual({ sections: [] });
  });
});
