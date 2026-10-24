/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Renders a real layout with the real jsPDF class under Node (AC7, AC13,
 * AC14, AC17). jsPDF writes uncompressed content streams by default, so the
 * drawn text and colour operators can be read back from the output.
 */
import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { buildMenuPrintModel } from '@/lib/menu-print/build-menu-print-model';
import { computeMenuLayout } from '@/lib/menu-print/layout';
import {
  createJsPdfMeasurer,
  renderMenuPdf,
} from '@/lib/menu-print/render-pdf';
import { MENU_PRINT_THEMES } from '@/lib/menu-print/themes';
import type {
  MenuPrintOrientation,
  PrintableMenuItem,
} from '@/lib/menu-print/types';

const items: PrintableMenuItem[] = Array.from({ length: 90 }, (_, i) => ({
  id: String(i),
  name: `Menu item number ${i + 1}`,
  mainCategory: i % 2 ? 'drinks' : 'food',
  category: i % 2 ? 'beer' : 'mains',
  price: 4500 + i,
}));

function layoutFor(orientation: MenuPrintOrientation) {
  const model = buildMenuPrintModel({
    items,
    mainCategories: [
      { slug: 'food', label: 'Food', order: 1 },
      { slug: 'drinks', label: 'Drinks', order: 2 },
    ],
    menuSettings: {
      food: [{ value: 'mains', label: 'Mains', order: 1 }],
      drinks: [{ value: 'beer', label: 'Beer', order: 1 }],
    },
    selectedMainCategorySlugs: ['food', 'drinks'],
    priceType: 'default',
  });
  const measurer = createJsPdfMeasurer(new jsPDF({ unit: 'mm', format: 'a4' }));
  return computeMenuLayout(
    model,
    { title: 'Friday Night', columns: 3, orientation, footerText: 'Thanks' },
    measurer,
    false
  );
}

/**
 * Colour operators in the content stream: jsPDF writes RGB as "r g b rg"
 * (fill, 3 decimals) / "RG" (stroke, 2 decimals) with trailing zeros
 * trimmed, and pure greys as a single "v g" / "v G".
 */
function colourOps(out: string): { op: string; comps: number[] }[] {
  return [...out.matchAll(/(?:^|\n)((?:[\d.]+ ){1,3})(rg|RG|g|G)(?=\n)/g)].map(
    (m) => ({
      op: m[2],
      comps: m[1].trim().split(' ').map(Number),
    })
  );
}

function rgbOf(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function hasColour(out: string, hex: string, op: 'rg' | 'RG'): boolean {
  const want = rgbOf(hex);
  return colourOps(out).some(
    (c) =>
      c.op === op &&
      c.comps.length === 3 &&
      c.comps.every((v, i) => Math.abs(v - want[i]) < 0.006)
  );
}

describe('renderMenuPdf', () => {
  it('produces an A4 landscape document with one PDF page per layout page (AC7, AC17)', () => {
    const layout = layoutFor('landscape');
    expect(layout.pages.length).toBeGreaterThan(1);
    const doc = renderMenuPdf(
      jsPDF,
      layout,
      'landscape',
      MENU_PRINT_THEMES.bw,
      null
    );
    expect(doc.getNumberOfPages()).toBe(layout.pages.length);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(297, 0);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(210, 0);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(0);
  });

  it('draws the title and N-prefixed prices into the PDF', () => {
    const doc = renderMenuPdf(
      jsPDF,
      layoutFor('portrait'),
      'portrait',
      MENU_PRINT_THEMES.brand,
      null
    );
    const out = doc.output();
    expect(out).toContain('(Friday Night) Tj');
    expect(out).toContain('(N4,500) Tj');
  });

  it('uses the brand green and gold in the Brand template (AC13)', () => {
    const out = renderMenuPdf(
      jsPDF,
      layoutFor('portrait'),
      'portrait',
      MENU_PRINT_THEMES.brand,
      null
    ).output();
    expect(hasColour(out, '#1a4d2e', 'rg')).toBe(true);
    expect(hasColour(out, '#c9a961', 'RG')).toBe(true);
  });

  it('uses only greys in the black & white template (AC14)', () => {
    const out = renderMenuPdf(
      jsPDF,
      layoutFor('portrait'),
      'portrait',
      MENU_PRINT_THEMES.bw,
      null
    ).output();
    const colours = colourOps(out);
    expect(colours.length).toBeGreaterThan(0);
    for (const c of colours) {
      expect(c.comps.every((v) => v === c.comps[0])).toBe(true);
    }
    expect(hasColour(out, '#1a4d2e', 'rg')).toBe(false);
  });
});
