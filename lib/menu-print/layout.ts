/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Pure layout engine: model + options → pages of positioned draw operations
 * in millimetres. The SVG preview and the jsPDF renderer both draw these same
 * operations, so the preview cannot disagree with the PDF on columns,
 * wrapping or pagination. Text `y` values are baselines (jsPDF and SVG both
 * draw text from the baseline by default).
 *
 * Deliberately takes no theme: colours are referenced by role only, so the
 * template can never change content or layout (AC15). No Date, no randomness.
 */
import { formatMenuPrice } from './format';
import type { ColorRole } from './themes';
import type {
  MenuPrintColumns,
  MenuPrintModel,
  MenuPrintOptions,
  MenuPrintOrientation,
} from './types';

export type { ColorRole } from './themes';

export interface TextMeasurer {
  /** Width in mm of `text` at `sizePt` in Helvetica (bold or normal). */
  width(text: string, sizePt: number, bold: boolean): number;
  /** Wrap `text` to lines no wider than `maxWidthMm`. */
  split(
    text: string,
    sizePt: number,
    bold: boolean,
    maxWidthMm: number
  ): string[];
}

export type DrawOp =
  | { kind: 'logo'; x: number; y: number; w: number; h: number }
  | {
      kind: 'text';
      text: string;
      x: number;
      y: number;
      sizePt: number;
      bold: boolean;
      color: ColorRole;
      align: 'left' | 'center' | 'right';
    }
  | {
      kind: 'rule';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: ColorRole;
      widthMm: number;
    }
  | { kind: 'leader'; x1: number; x2: number; y: number; color: ColorRole };

export interface LayoutPage {
  ops: DrawOp[];
}

export interface MenuLayout {
  pageWidth: number;
  pageHeight: number;
  pages: LayoutPage[];
}

export const PAGE: Record<
  MenuPrintOrientation,
  { width: number; height: number }
> = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
};
export const MARGIN = 15;
export const FOOTER_H = 14;
export const CONTENT_TOP = MARGIN;
export const GUTTER = 8;
/** Millimetres per typographic point. */
export const PT = 0.3528;

export const LOGO_H = 30;
export const LOGO_W = (LOGO_H * 2551) / 2004;
export const LOGO_GAP = 4;

export const TITLE_SIZE_PT = 20;
export const TITLE_LINE_H = 9;
export const TITLE_MAX_LINES = 2;
export const TITLE_RULE_W = 0.6;

export const MAIN_HEADING_SIZE_PT = 14;
export const MAIN_HEADING_H = 10;
export const MAIN_HEADING_RULE_W = 0.4;

export const SUB_HEADING_SIZE_PT = 11;
export const SUB_HEADING_H = 7;

export const ITEM_SIZE_PT = 10;
export const ITEM_LINE_H = 5;
export const ITEM_ROW_GAP = 1;
export const PRICE_GAP = 3;
export const LEADER_MIN = 3;

export const SECTION_GAP = 6;

export const FOOTER_SIZE_PT = 8;
export const FOOTER_RULE_W = 0.3;
export const FOOTER_LINE_H = 3.5;
export const FOOTER_MAX_LINES = 2;
/** Width kept clear on the right of the footer text for "Page X of Y". */
export const FOOTER_PAGE_NO_W = 25;

export function contentBottom(pageHeight: number): number {
  return pageHeight - MARGIN - FOOTER_H;
}

export function columnWidth(
  pageWidth: number,
  columns: MenuPrintColumns
): number {
  const contentW = pageWidth - 2 * MARGIN;
  return (contentW - (columns - 1) * GUTTER) / columns;
}

interface Unit {
  h: number;
  subHeading: string | null;
  lines: string[];
  priceText: string;
  priceW: number;
}

// ASCII, not '…': jsPDF's built-in Helvetica silently drops U+2026 from the
// PDF (while still measuring it), the same WinAnsi limit that rules out '₦'.
const ELLIPSIS = '...';

/** Keep at most `max` lines; if any were dropped, end the last kept line with an ellipsis that still fits. */
function clampLines(
  lines: string[],
  max: number,
  sizePt: number,
  bold: boolean,
  maxWidth: number,
  measure: TextMeasurer
): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1].trimEnd();
  while (
    last.length > 0 &&
    measure.width(last + ELLIPSIS, sizePt, bold) > maxWidth
  ) {
    last = last.slice(0, -1).trimEnd();
  }
  kept[max - 1] = last + ELLIPSIS;
  return kept;
}

export function computeMenuLayout(
  model: MenuPrintModel,
  opts: Pick<
    MenuPrintOptions,
    'title' | 'columns' | 'orientation' | 'footerText'
  >,
  measure: TextMeasurer,
  hasLogo: boolean
): MenuLayout {
  const { width: pageWidth, height: pageHeight } = PAGE[opts.orientation];
  if (model.sections.length === 0) {
    return { pageWidth, pageHeight, pages: [] };
  }

  const columns = opts.columns;
  const contentW = pageWidth - 2 * MARGIN;
  const bottom = contentBottom(pageHeight);
  const colWidth = columnWidth(pageWidth, columns);

  const pages: LayoutPage[] = [{ ops: [] }];
  let ops = pages[0].ops;
  let cursorY = CONTENT_TOP;

  const newPage = () => {
    const page: LayoutPage = { ops: [] };
    pages.push(page);
    ops = page.ops;
    cursorY = CONTENT_TOP;
  };

  // 1. Page 1 header: logo, title (≤ 2 lines), title rule.
  if (hasLogo) {
    ops.push({
      kind: 'logo',
      x: (pageWidth - LOGO_W) / 2,
      y: cursorY,
      w: LOGO_W,
      h: LOGO_H,
    });
    cursorY += LOGO_H + LOGO_GAP;
  }
  const titleLines = clampLines(
    measure.split(opts.title, TITLE_SIZE_PT, true, contentW),
    TITLE_MAX_LINES,
    TITLE_SIZE_PT,
    true,
    contentW,
    measure
  );
  for (const line of titleLines) {
    ops.push({
      kind: 'text',
      text: line,
      x: pageWidth / 2,
      y: cursorY + 7,
      sizePt: TITLE_SIZE_PT,
      bold: true,
      color: 'title',
      align: 'center',
    });
    cursorY += TITLE_LINE_H;
  }
  ops.push({
    kind: 'rule',
    x1: MARGIN,
    y1: cursorY + 2,
    x2: pageWidth - MARGIN,
    y2: cursorY + 2,
    color: 'rule',
    widthMm: TITLE_RULE_W,
  });
  cursorY += 8;

  const emitMainHeading = (label: string) => {
    ops.push({
      kind: 'text',
      text: label,
      x: MARGIN,
      y: cursorY + 6,
      sizePt: MAIN_HEADING_SIZE_PT,
      bold: true,
      color: 'heading',
      align: 'left',
    });
    ops.push({
      kind: 'rule',
      x1: MARGIN,
      y1: cursorY + 8,
      x2: pageWidth - MARGIN,
      y2: cursorY + 8,
      color: 'rule',
      widthMm: MAIN_HEADING_RULE_W,
    });
  };

  const emitUnit = (u: Unit, colX: number, startY: number) => {
    let rowY = startY;
    if (u.subHeading !== null) {
      ops.push({
        kind: 'text',
        text: u.subHeading,
        x: colX,
        y: rowY + 5,
        sizePt: SUB_HEADING_SIZE_PT,
        bold: true,
        color: 'heading',
        align: 'left',
      });
      rowY += SUB_HEADING_H;
    }
    u.lines.forEach((line, i) => {
      ops.push({
        kind: 'text',
        text: line,
        x: colX,
        y: rowY + 4 + i * ITEM_LINE_H,
        sizePt: ITEM_SIZE_PT,
        bold: false,
        color: 'text',
        align: 'left',
      });
    });
    const baseline = rowY + 4 + (u.lines.length - 1) * ITEM_LINE_H;
    ops.push({
      kind: 'text',
      text: u.priceText,
      x: colX + colWidth,
      y: baseline,
      sizePt: ITEM_SIZE_PT,
      bold: false,
      color: 'text',
      align: 'right',
    });
    const lastLine = u.lines[u.lines.length - 1];
    const x1 = colX + measure.width(lastLine, ITEM_SIZE_PT, false) + 2;
    const x2 = colX + colWidth - u.priceW - 2;
    if (x2 - x1 >= LEADER_MIN) {
      ops.push({ kind: 'leader', x1, x2, y: baseline - 0.5, color: 'leader' });
    }
  };

  for (const section of model.sections) {
    // 2. Units: one per item; a sub-section's first item carries its heading
    // so the heading can never be separated from it.
    const units: Unit[] = [];
    for (const sub of section.subSections) {
      sub.items.forEach((item, i) => {
        const priceText = formatMenuPrice(item.price);
        const priceW = measure.width(priceText, ITEM_SIZE_PT, false);
        const split = measure.split(
          item.name,
          ITEM_SIZE_PT,
          false,
          colWidth - priceW - PRICE_GAP
        );
        const lines = split.length > 0 ? split : [''];
        const itemH = lines.length * ITEM_LINE_H + ITEM_ROW_GAP;
        units.push({
          h: (i === 0 ? SUB_HEADING_H : 0) + itemH,
          subHeading: i === 0 ? sub.label : null,
          lines,
          priceText,
          priceW,
        });
      });
    }
    if (units.length === 0) continue;

    // 3.1 Keep the main heading with at least its first unit.
    if (
      bottom - cursorY < MAIN_HEADING_H + units[0].h &&
      cursorY > CONTENT_TOP
    ) {
      newPage();
    }

    let next = 0;
    let continued = false;
    while (next < units.length) {
      if (continued) newPage();
      emitMainHeading(
        continued
          ? `${section.label.toUpperCase()} (CONTINUED)`
          : section.label.toUpperCase()
      );
      const y0 = cursorY + MAIN_HEADING_H;
      const available = bottom - y0;
      const remaining = units.slice(next);
      const total = remaining.reduce((sum, u) => sum + u.h, 0);
      const maxH = Math.max(...remaining.map((u) => u.h));
      const target = Math.min(available, Math.max(total / columns, maxH));

      // 3.4 Fill columns top-to-bottom, then across.
      const colHeights: number[] = [];
      for (let c = 0; c < columns && next < units.length; c++) {
        const limit = c === columns - 1 ? available : target;
        const colX = MARGIN + c * (colWidth + GUTTER);
        let colH = 0;
        while (next < units.length) {
          const u = units[next];
          // An empty column always takes one unit, so an oversized unit
          // cannot loop forever.
          if (colH > 0 && colH + u.h > limit) break;
          emitUnit(u, colX, y0 + colH);
          colH += u.h;
          next++;
        }
        colHeights.push(colH);
      }

      cursorY = y0 + Math.max(0, ...colHeights) + SECTION_GAP;
      continued = true;
    }
  }

  // 5. Footer on every page, once the page count is known.
  const pageCount = pages.length;
  const footerTextLines = opts.footerText
    ? measure
        .split(
          opts.footerText,
          FOOTER_SIZE_PT,
          false,
          contentW - FOOTER_PAGE_NO_W
        )
        .slice(0, FOOTER_MAX_LINES)
    : [];
  pages.forEach((page, p) => {
    const ruleY = pageHeight - MARGIN - 9;
    page.ops.push({
      kind: 'rule',
      x1: MARGIN,
      y1: ruleY,
      x2: pageWidth - MARGIN,
      y2: ruleY,
      color: 'rule',
      widthMm: FOOTER_RULE_W,
    });
    footerTextLines.forEach((line, i) => {
      page.ops.push({
        kind: 'text',
        text: line,
        x: MARGIN,
        y: pageHeight - MARGIN - 5 + i * FOOTER_LINE_H,
        sizePt: FOOTER_SIZE_PT,
        bold: false,
        color: 'muted',
        align: 'left',
      });
    });
    if (pageCount > 1) {
      page.ops.push({
        kind: 'text',
        text: `Page ${p + 1} of ${pageCount}`,
        x: pageWidth - MARGIN,
        y: pageHeight - MARGIN - 5,
        sizePt: FOOTER_SIZE_PT,
        bold: false,
        color: 'muted',
        align: 'right',
      });
    }
  });

  return { pageWidth, pageHeight, pages };
}
