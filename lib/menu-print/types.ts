/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Shared types and constants for the "Print New Menu" feature. Everything
 * here is serializable so it can cross the server-action boundary and be
 * compared with JSON.stringify for the "preview out of date" check.
 */

export type MenuPrintPriceType = 'default' | 'happyHour' | 'show';
export type MenuPrintTemplate = 'brand' | 'bw';
export type MenuPrintOrientation = 'portrait' | 'landscape';
export type MenuPrintColumns = 1 | 2 | 3;

export const PRICE_TYPE_LABELS: Record<MenuPrintPriceType, string> = {
  default: 'Default price',
  happyHour: 'Happy hour price',
  show: 'Show price',
};

export const TITLE_MAX_LENGTH = 80;
export const FOOTER_MAX_LENGTH = 160;
export const DEFAULT_FOOTER_TEXT =
  'Prices are subject to change without notice.';

/** Serializable item as returned by the server action. */
export interface PrintableMenuItem {
  id: string;
  name: string;
  mainCategory: string;
  category: string;
  price: number;
  showPrice?: number | null;
  happyHourPrice?: number | null;
}

export interface MenuPrintModelItem {
  name: string;
  price: number;
}

export interface MenuPrintSubSection {
  value: string;
  label: string;
  items: MenuPrintModelItem[];
}

export interface MenuPrintSection {
  slug: string;
  label: string;
  subSections: MenuPrintSubSection[];
}

export interface MenuPrintModel {
  sections: MenuPrintSection[];
}

/** Everything the user chose; a snapshot of this is what "Generate" captures. */
export interface MenuPrintOptions {
  /** Always stored sorted, so two snapshots compare equal regardless of click order. */
  mainCategorySlugs: string[];
  priceType: MenuPrintPriceType;
  /** Effective title (already defaulted and trimmed). */
  title: string;
  columns: MenuPrintColumns;
  orientation: MenuPrintOrientation;
  template: MenuPrintTemplate;
  /** Trimmed; '' means no footer text. */
  footerText: string;
}
