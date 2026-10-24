import crypto from 'crypto';

export const PIN_LENGTH = 6;

/**
 * REQ-115 — 6-digit verification PIN from a CSPRNG. Meta requires
 * authentication templates to carry exactly 6 digits, and `Math.random`
 * is predictable. Zero-padded so every value in 000000–999999 is valid.
 */
export function generatePin(): string {
  return crypto
    .randomInt(0, 10 ** PIN_LENGTH)
    .toString()
    .padStart(PIN_LENGTH, '0');
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{6}$/.test(pin);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getPinExpirationTime(): Date {
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + 10);
  return expirationTime;
}

export function isPinExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function validatePhone(phone: string): boolean {
  // Basic validation: allows +, spaces, dashes, but must have digits
  // We'll strip non-digits/plus before checking length
  const clean = phone.replace(/[^\d+]/g, '');
  return clean.length >= 10 && clean.length <= 15;
}

const DEFAULT_COUNTRY_CODE = '234';

/**
 * REQ-115 / ADR-006 — canonical phone format: E.164 with a leading `+`
 * (default country NG). `234…`, `0…`, `00234…` and `+234…` all become
 * `+234…`; other countries' numbers keep their country code. Returns ''
 * when the input has no digits.
 */
export function normalizePhone(input: string): string {
  let digits = (input ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) {
    // Local NG format, e.g. 08012345678
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  } else if (!input.trim().startsWith('+') && digits.length === 10) {
    // National number without the leading 0, e.g. 8012345678
    digits = DEFAULT_COUNTRY_CODE + digits;
  }
  return '+' + digits;
}

/**
 * Legacy stored forms of a number that `normalizePhone` would rewrite.
 * Lookups use `$in` over these until `scripts/migrate-normalize-phones.ts`
 * has run, so an account saved before the change is still found instead of
 * a duplicate being created.
 */
export function phoneLookupVariants(input: string): string[] {
  const canonical = normalizePhone(input);
  if (!canonical) return [];
  const digits = canonical.slice(1);
  // The input as given is included too, so a value stored exactly as typed
  // is still found.
  const variants = new Set<string>([
    canonical,
    digits,
    input.trim(),
    input.replace(/\D/g, ''),
  ]);
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === 13) {
    variants.add('0' + digits.slice(DEFAULT_COUNTRY_CODE.length));
  }
  return [...variants];
}

export function sanitizePhone(phone: string): string {
  return normalizePhone(phone);
}
