/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Price, title and filename formatting shared by the preview and the PDF.
 */
import { format } from 'date-fns';
import {
  PRICE_TYPE_LABELS,
  TITLE_MAX_LENGTH,
  type MenuPrintPriceType,
} from './types';

const integerFormatter = new Intl.NumberFormat('en-NG', {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a menu price as `N4,500` (or `N4,500.50`). jsPDF's built-in
 * Helvetica uses WinAnsi encoding and cannot render `₦` (U+20A6), so the
 * ASCII Naira form is used in both the PDF and the preview.
 */
export function formatMenuPrice(n: number): string {
  return Number.isInteger(n)
    ? `N${integerFormatter.format(n)}`
    : `N${decimalFormatter.format(n)}`;
}

export function defaultTitleFor(t: MenuPrintPriceType): string {
  return PRICE_TYPE_LABELS[t];
}

export function effectiveTitle(raw: string, t: MenuPrintPriceType): string {
  const title = raw.trim().slice(0, TITLE_MAX_LENGTH);
  return title || defaultTitleFor(t);
}

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
  return slug || 'menu';
}

export function menuPrintFilename(title: string, date: Date): string {
  return `wawa-menu-${slugifyTitle(title)}-${format(date, 'yyyy-MM-dd')}.pdf`;
}
