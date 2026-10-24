/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Price, title and filename formatting (AC3, AC7; review finding R3).
 */
import { describe, it, expect } from 'vitest';
import {
  defaultTitleFor,
  effectiveTitle,
  formatMenuPrice,
  menuPrintFilename,
  slugifyTitle,
} from '@/lib/menu-print/format';

describe('formatMenuPrice', () => {
  it('formats integers with thousands separators and an ASCII N', () => {
    expect(formatMenuPrice(4500)).toBe('N4,500');
    expect(formatMenuPrice(800)).toBe('N800');
  });

  it('formats non-integers with two decimals', () => {
    expect(formatMenuPrice(4500.5)).toBe('N4,500.50');
  });

  it('never uses the ₦ sign (jsPDF Helvetica cannot render it)', () => {
    expect(formatMenuPrice(1500)).not.toContain('₦');
  });
});

describe('titles', () => {
  it('defaults the title to the price-type label (AC3)', () => {
    expect(defaultTitleFor('happyHour')).toBe('Happy hour price');
    expect(defaultTitleFor('default')).toBe('Default price');
    expect(defaultTitleFor('show')).toBe('Show price');
  });

  it('falls back to the default when blank or whitespace-only', () => {
    expect(effectiveTitle('', 'show')).toBe('Show price');
    expect(effectiveTitle('   ', 'happyHour')).toBe('Happy hour price');
  });

  it('trims and caps the title at 80 characters', () => {
    expect(effectiveTitle('  Friday Night  ', 'default')).toBe('Friday Night');
    expect(effectiveTitle('x'.repeat(100), 'default')).toHaveLength(80);
  });
});

describe('slugifyTitle', () => {
  it('lower-cases and hyphenates', () => {
    expect(slugifyTitle('Friday Night!')).toBe('friday-night');
  });

  it('strips accents', () => {
    expect(slugifyTitle('Café')).toBe('cafe');
  });

  it('returns "menu" when nothing usable is left', () => {
    expect(slugifyTitle('!!!')).toBe('menu');
  });

  it('cuts to 50 characters without a trailing hyphen', () => {
    const slug = slugifyTitle(`${'a'.repeat(49)} b`);
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('menuPrintFilename (AC7)', () => {
  it('builds wawa-menu-<slug>-<YYYY-MM-DD>.pdf', () => {
    expect(menuPrintFilename('Happy hour price', new Date(2026, 9, 23))).toBe(
      'wawa-menu-happy-hour-price-2026-10-23.pdf'
    );
  });
});
