/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * The two PDF templates. Draw ops reference colours by role, never by hex,
 * so switching template cannot change content, order or pagination.
 * Brand values come from tailwind.config.ts `brand.*`; the page stays white
 * because the logo is green/gold on transparent.
 */
import type { MenuPrintTemplate } from './types';

export type ColorRole =
  | 'title'
  | 'heading'
  | 'text'
  | 'muted'
  | 'rule'
  | 'leader';

export interface MenuPrintTheme extends Record<ColorRole, string> {
  id: MenuPrintTemplate;
  logo: 'color' | 'grayscale';
}

export const MENU_PRINT_THEMES: Record<MenuPrintTemplate, MenuPrintTheme> = {
  brand: {
    id: 'brand',
    title: '#1a4d2e',
    heading: '#1a4d2e',
    text: '#1f2937',
    muted: '#6b7280',
    rule: '#c9a961',
    leader: '#c9a961',
    logo: 'color',
  },
  bw: {
    id: 'bw',
    title: '#000000',
    heading: '#000000',
    text: '#000000',
    muted: '#555555',
    rule: '#999999',
    leader: '#999999',
    logo: 'grayscale',
  },
};
