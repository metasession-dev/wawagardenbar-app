/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Template colours (AC13, AC14).
 */
import { describe, it, expect } from 'vitest';
import { MENU_PRINT_THEMES, type ColorRole } from '@/lib/menu-print/themes';

const ROLES: ColorRole[] = [
  'title',
  'heading',
  'text',
  'muted',
  'rule',
  'leader',
];

describe('MENU_PRINT_THEMES', () => {
  it('brand uses the forest green and gold brand colours with a colour logo (AC13)', () => {
    const brand = MENU_PRINT_THEMES.brand;
    expect(brand.heading).toBe('#1a4d2e');
    expect(brand.title).toBe('#1a4d2e');
    expect(brand.rule).toBe('#c9a961');
    expect(brand.leader).toBe('#c9a961');
    expect(brand.logo).toBe('color');
  });

  it('black & white uses only greys (R = G = B) and a greyscale logo (AC14)', () => {
    const bw = MENU_PRINT_THEMES.bw;
    for (const role of ROLES) {
      const hex = bw[role];
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      const [r, g, b] = [1, 3, 5].map((i) => hex.slice(i, i + 2).toLowerCase());
      expect(r === g && g === b, `${role} ${hex} is not grey`).toBe(true);
    }
    expect(bw.logo).toBe('grayscale');
  });

  it('defines every colour role for both templates', () => {
    for (const theme of Object.values(MENU_PRINT_THEMES)) {
      for (const role of ROLES) {
        expect(theme[role]).toBeTruthy();
      }
    }
  });
});
