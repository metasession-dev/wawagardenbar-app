/**
 * @requirement REQ-115 — canonical E.164 phone format (ADR-006) and 6-digit PINs
 */
import { describe, it, expect } from 'vitest';
import {
  generatePin,
  isValidPinFormat,
  normalizePhone,
  phoneLookupVariants,
  sanitizePhone,
} from '@/lib/auth-utils';

describe('REQ-115 normalizePhone', () => {
  it.each([
    ['2348012345678', '+2348012345678'],
    ['08012345678', '+2348012345678'],
    ['+2348012345678', '+2348012345678'],
    ['002348012345678', '+2348012345678'],
    ['8012345678', '+2348012345678'],
    ['+234 801 234 5678', '+2348012345678'],
    ['0801-234-5678', '+2348012345678'],
  ])('AC5 — %s becomes %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('keeps other countries’ numbers on their own country code', () => {
    expect(normalizePhone('447363078509')).toBe('+447363078509');
    expect(normalizePhone('+44 7363 078509')).toBe('+447363078509');
  });

  it('does not strip a zero that follows the country code (+234 0… synthetic test numbers)', () => {
    expect(normalizePhone('+2340000012345')).toBe('+2340000012345');
  });

  it('returns an empty string when there are no digits', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('abc')).toBe('');
  });

  it('is idempotent', () => {
    const once = normalizePhone('08012345678');
    expect(normalizePhone(once)).toBe(once);
  });

  it('sanitizePhone delegates to normalizePhone', () => {
    expect(sanitizePhone('08012345678')).toBe('+2348012345678');
  });
});

describe('REQ-115 phoneLookupVariants', () => {
  it('covers canonical, digits-only and local forms of an NG number', () => {
    expect(phoneLookupVariants('2348012345678').sort()).toEqual(
      ['+2348012345678', '2348012345678', '08012345678'].sort()
    );
  });

  it('has no local-form variant for non-NG numbers', () => {
    expect(phoneLookupVariants('+447363078509')).toEqual([
      '+447363078509',
      '447363078509',
    ]);
  });

  it('also includes the input exactly as given (value stored as typed)', () => {
    expect(phoneLookupVariants('0801 234 5678')).toEqual(
      expect.arrayContaining(['+2348012345678', '0801 234 5678', '08012345678'])
    );
    expect(phoneLookupVariants('1234567890')).toContain('1234567890');
  });

  it('is empty for unusable input', () => {
    expect(phoneLookupVariants('')).toEqual([]);
  });
});

describe('REQ-115 PIN generation and format', () => {
  it('AC15 — generatePin returns exactly 6 digits, zero-padded, every time', () => {
    for (let i = 0; i < 2000; i++) {
      expect(generatePin()).toMatch(/^\d{6}$/);
    }
  });

  it('AC15 — generatePin is not constant (CSPRNG output varies)', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generatePin()));
    expect(seen.size).toBeGreaterThan(150);
  });

  it('AC15 — isValidPinFormat accepts only 6 digits', () => {
    expect(isValidPinFormat('123456')).toBe(true);
    expect(isValidPinFormat('000000')).toBe(true);
    expect(isValidPinFormat('1234')).toBe(false);
    expect(isValidPinFormat('1234567')).toBe(false);
    expect(isValidPinFormat('12345a')).toBe(false);
    expect(isValidPinFormat(undefined)).toBe(false);
  });
});
