/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Layout engine properties: columns, pagination, wrapping, footer
 * (AC11, AC15, AC16, AC17, AC19, AC20). Uses a deterministic fake measurer
 * so the assertions do not depend on font metrics.
 */
import { describe, it, expect } from 'vitest';
import {
  CONTENT_TOP,
  FOOTER_RULE_W,
  ITEM_SIZE_PT,
  MAIN_HEADING_RULE_W,
  MARGIN,
  SUB_HEADING_SIZE_PT,
  columnWidth,
  computeMenuLayout,
  contentBottom,
  type DrawOp,
  type MenuLayout,
  type TextMeasurer,
} from '@/lib/menu-print/layout';
import type {
  MenuPrintColumns,
  MenuPrintModel,
  MenuPrintOptions,
} from '@/lib/menu-print/types';

const fakeWidth = (t: string, pt: number) => t.length * pt * 0.3528 * 0.5;

const fake: TextMeasurer = {
  width: (t, pt) => fakeWidth(t, pt),
  split: (t, pt, _bold, w) => {
    const lines: string[] = [];
    let line = '';
    for (const word of t.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && fakeWidth(candidate, pt) > w) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  },
};

/** About 120 items across two mains and several subs: forces several pages. */
function bigModel(longName?: string): MenuPrintModel {
  const sub = (value: string, n: number, base: number) => ({
    value,
    label: value.toUpperCase(),
    items: Array.from({ length: n }, (_, i) => ({
      name: i === 0 && longName ? longName : `${value} item ${i + 1}`,
      price: base + i * 50,
    })),
  });
  return {
    sections: [
      {
        slug: 'food',
        label: 'Food',
        subSections: [
          sub('mains', 30, 3000),
          sub('soups', 25, 2000),
          sub('sides', 15, 800),
        ],
      },
      {
        slug: 'drinks',
        label: 'Drinks',
        subSections: [sub('beer', 25, 1200), sub('wine', 25, 9000)],
      },
    ],
  };
}

const smallModel: MenuPrintModel = {
  sections: [
    {
      slug: 'food',
      label: 'Food',
      subSections: [
        {
          value: 'mains',
          label: 'Mains',
          items: [{ name: 'Jollof', price: 3000 }],
        },
      ],
    },
  ],
};

function opts(
  overrides: Partial<
    Pick<MenuPrintOptions, 'title' | 'columns' | 'orientation' | 'footerText'>
  > = {}
) {
  return {
    title: 'Default price',
    columns: 2 as MenuPrintColumns,
    orientation: 'portrait' as const,
    footerText: 'Prices are subject to change without notice.',
    ...overrides,
  };
}

type TextOp = Extract<DrawOp, { kind: 'text' }>;
const texts = (ops: DrawOp[]) =>
  ops.filter((o): o is TextOp => o.kind === 'text');

function isFooterOp(op: DrawOp): boolean {
  return (
    (op.kind === 'text' && op.color === 'muted') ||
    (op.kind === 'rule' && op.widthMm === FOOTER_RULE_W)
  );
}

const isPriceOp = (op: DrawOp): boolean =>
  op.kind === 'text' && op.color === 'text' && op.align === 'right';
const isItemLineOp = (op: DrawOp): boolean =>
  op.kind === 'text' && op.color === 'text' && op.align === 'left';

function opY(op: DrawOp): number {
  if (op.kind === 'rule') return Math.max(op.y1, op.y2);
  if (op.kind === 'logo') return op.y + op.h;
  return op.y;
}

describe('computeMenuLayout', () => {
  it.each([1, 2, 3] as const)(
    'lays items out in %i column(s) (AC11)',
    (columns) => {
      const layout = computeMenuLayout(
        bigModel(),
        opts({ columns }),
        fake,
        true
      );
      const priceXs = new Set(
        layout.pages.flatMap((p) =>
          (p.ops.filter(isPriceOp) as TextOp[]).map((o) => o.x.toFixed(3))
        )
      );
      expect(priceXs.size).toBe(columns);
      expect(layout.pages.length).toBeGreaterThan(1);
    }
  );

  it('draws main-heading rules across the full content width (AC11)', () => {
    const layout = computeMenuLayout(
      bigModel(),
      opts({ columns: 3 }),
      fake,
      true
    );
    const rules = layout.pages.flatMap((p) =>
      p.ops.filter(
        (o): o is Extract<DrawOp, { kind: 'rule' }> =>
          o.kind === 'rule' && o.widthMm === MAIN_HEADING_RULE_W
      )
    );
    expect(rules.length).toBeGreaterThanOrEqual(2);
    for (const r of rules) {
      expect(r.x1).toBe(MARGIN);
      expect(r.x2).toBe(layout.pageWidth - MARGIN);
    }
  });

  it('repeats a main heading as "(CONTINUED)" when a section spans pages', () => {
    const layout = computeMenuLayout(
      bigModel(),
      opts({ columns: 1 }),
      fake,
      true
    );
    const headings = layout.pages.flatMap((p) =>
      texts(p.ops)
        .filter((o) => o.color === 'heading' && o.sizePt === 14)
        .map((o) => o.text)
    );
    expect(headings[0]).toBe('FOOD');
    expect(headings).toContain('FOOD (CONTINUED)');
  });

  it('uses A4 landscape dimensions when asked (AC17)', () => {
    const layout = computeMenuLayout(
      smallModel,
      opts({ orientation: 'landscape' }),
      fake,
      true
    );
    expect(layout.pageWidth).toBe(297);
    expect(layout.pageHeight).toBe(210);
  });

  it('places the logo on page 1 only, and not at all without a logo', () => {
    const withLogo = computeMenuLayout(bigModel(), opts(), fake, true);
    const logoPages = withLogo.pages.map(
      (p) => p.ops.filter((o) => o.kind === 'logo').length
    );
    expect(logoPages[0]).toBe(1);
    expect(logoPages.slice(1).every((n) => n === 0)).toBe(true);

    const noLogo = computeMenuLayout(bigModel(), opts(), fake, false);
    expect(
      noLogo.pages.flatMap((p) => p.ops).some((o) => o.kind === 'logo')
    ).toBe(false);
  });

  it('never splits an item: its lines and price share one page and one column (AC16)', () => {
    for (const columns of [1, 2, 3] as const) {
      const layout = computeMenuLayout(
        bigModel('A really long item name '.repeat(5).trim()),
        opts({ columns }),
        fake,
        true
      );
      const colW = columnWidth(layout.pageWidth, columns);
      for (const page of layout.pages) {
        let pending: TextOp[] = [];
        for (const op of page.ops) {
          if (isItemLineOp(op)) {
            pending.push(op as TextOp);
          } else if (isPriceOp(op)) {
            expect(pending.length).toBeGreaterThan(0);
            for (const line of pending) {
              expect(line.x + colW).toBeCloseTo((op as TextOp).x, 6);
            }
            pending = [];
          }
        }
        expect(pending).toEqual([]);
      }
    }
  });

  it('keeps each sub-heading with its first item in the same column', () => {
    const layout = computeMenuLayout(
      bigModel(),
      opts({ columns: 3 }),
      fake,
      true
    );
    for (const page of layout.pages) {
      page.ops.forEach((op, i) => {
        if (op.kind === 'text' && op.sizePt === SUB_HEADING_SIZE_PT) {
          const next = page.ops[i + 1];
          expect(next && isItemLineOp(next)).toBe(true);
          expect((next as TextOp).x).toBe(op.x);
        }
      });
    }
  });

  it('keeps content above the footer area and the footer below it (AC19)', () => {
    for (const orientation of ['portrait', 'landscape'] as const) {
      const layout = computeMenuLayout(
        bigModel(),
        opts({ columns: 2, orientation }),
        fake,
        true
      );
      const bottom = contentBottom(layout.pageHeight);
      for (const page of layout.pages) {
        for (const op of page.ops) {
          if (isFooterOp(op)) {
            expect(opY(op)).toBeGreaterThanOrEqual(bottom);
          } else {
            expect(opY(op)).toBeLessThanOrEqual(bottom);
            expect(opY(op)).toBeGreaterThanOrEqual(CONTENT_TOP);
          }
        }
      }
    }
  });

  it('prints footer text and "Page X of Y" on every page of a multi-page menu (AC19)', () => {
    const layout = computeMenuLayout(bigModel(), opts(), fake, true);
    const n = layout.pages.length;
    expect(n).toBeGreaterThan(1);
    layout.pages.forEach((page, i) => {
      const muted = texts(page.ops)
        .filter((o) => o.color === 'muted')
        .map((o) => o.text);
      expect(muted).toContain(`Page ${i + 1} of ${n}`);
      expect(muted).toContain('Prices are subject to change without notice.');
    });
  });

  it('omits "Page X of Y" on a single-page menu', () => {
    const layout = computeMenuLayout(smallModel, opts(), fake, true);
    expect(layout.pages).toHaveLength(1);
    const muted = texts(layout.pages[0].ops).filter((o) => o.color === 'muted');
    expect(muted.some((o) => o.text.startsWith('Page '))).toBe(false);
  });

  it('prints no footer text when it is blank, but keeps the footer rule (AC20)', () => {
    const layout = computeMenuLayout(
      bigModel(),
      opts({ footerText: '' }),
      fake,
      true
    );
    for (const page of layout.pages) {
      const muted = texts(page.ops).filter(
        (o) => o.color === 'muted' && !o.text.startsWith('Page ')
      );
      expect(muted).toEqual([]);
      expect(
        page.ops.some((o) => o.kind === 'rule' && o.widthMm === FOOTER_RULE_W)
      ).toBe(true);
    }
  });

  it('wraps a long name inside its column, clear of the price (AC16)', () => {
    const longName =
      'Peppered goat meat with plantain, jollof rice and a side of coleslaw '
        .repeat(2)
        .slice(0, 120);
    const layout = computeMenuLayout(
      bigModel(longName),
      opts({ columns: 3 }),
      fake,
      true
    );
    const ops = layout.pages[0].ops;
    const firstLine = ops.findIndex(
      (o) => isItemLineOp(o) && longName.startsWith((o as TextOp).text)
    );
    expect(firstLine).toBeGreaterThan(-1);
    const lines: TextOp[] = [];
    let i = firstLine;
    while (isItemLineOp(ops[i])) lines.push(ops[i++] as TextOp);
    const price = ops[i] as TextOp;
    expect(isPriceOp(price)).toBe(true);
    expect(lines.length).toBeGreaterThan(1);
    const priceW = fakeWidth(price.text, ITEM_SIZE_PT);
    for (const line of lines) {
      expect(line.x + fakeWidth(line.text, ITEM_SIZE_PT)).toBeLessThan(
        price.x - priceW
      );
    }
  });

  it('clamps a long title to two lines ending in "..."', () => {
    const layout = computeMenuLayout(
      smallModel,
      opts({ title: 'Very long menu title '.repeat(20) }),
      fake,
      false
    );
    const titleLines = texts(layout.pages[0].ops).filter(
      (o) => o.color === 'title'
    );
    expect(titleLines).toHaveLength(2);
    expect(titleLines[1].text.endsWith('...')).toBe(true);
  });

  it('takes no theme: the template cannot affect layout (AC15)', () => {
    expect(computeMenuLayout.length).toBe(4);
    const a: MenuLayout = computeMenuLayout(bigModel(), opts(), fake, true);
    const b: MenuLayout = computeMenuLayout(bigModel(), opts(), fake, true);
    expect(a).toEqual(b);
  });

  it('returns no pages for an empty model', () => {
    expect(
      computeMenuLayout({ sections: [] }, opts(), fake, true).pages
    ).toEqual([]);
  });
});
