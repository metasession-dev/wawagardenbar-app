/**
 * @requirement REQ-024 - Regex injection and ReDoS prevention
 */
import { describe, it, expect } from 'vitest';

/**
 * Escapes special regex characters in a string so it can be safely
 * used in new RegExp(). Used in category-service.ts for search queries.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive exact string match — replaces regex-based comparison
 * in instagram-service.ts for username matching.
 */
function caseInsensitiveMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

describe('Regex escape for search queries', () => {
  it('escapes special characters before RegExp construction', () => {
    const input = 'item (large)';
    const escaped = escapeRegex(input);
    expect(escaped).toBe('item \\(large\\)');
    // Must not throw when used in RegExp
    expect(() => new RegExp(escaped, 'i')).not.toThrow();
  });

  it('handles catastrophic backtracking patterns safely', () => {
    const malicious = '(a+)+$';
    const escaped = escapeRegex(malicious);
    expect(escaped).toBe('\\(a\\+\\)\\+\\$');
    // The escaped version is safe — it matches the literal string
    const regex = new RegExp(escaped, 'i');
    expect(regex.test('(a+)+$')).toBe(true);
    expect(regex.test('aaaaaaaaaaaa')).toBe(false);
  });

  it('escapes all regex special characters', () => {
    const allSpecial = '.*+?^${}()|[]\\';
    const escaped = escapeRegex(allSpecial);
    // Each special char should be preceded by backslash
    expect(() => new RegExp(escaped)).not.toThrow();
    const regex = new RegExp(escaped);
    expect(regex.test('.*+?^${}()|[]\\')).toBe(true);
  });

  it('leaves normal search strings unchanged', () => {
    expect(escapeRegex('chicken wings')).toBe('chicken wings');
    expect(escapeRegex('beer')).toBe('beer');
    expect(escapeRegex('jollof rice')).toBe('jollof rice');
  });

  it('handles empty string', () => {
    expect(escapeRegex('')).toBe('');
  });
});

describe('Case-insensitive username matching (replaces regex)', () => {
  it('matches usernames case-insensitively', () => {
    expect(caseInsensitiveMatch('JohnDoe', 'johndoe')).toBe(true);
    expect(caseInsensitiveMatch('WAWA_GARDEN', 'wawa_garden')).toBe(true);
  });

  it('rejects non-matching usernames', () => {
    expect(caseInsensitiveMatch('john', 'jane')).toBe(false);
  });

  it('handles empty strings', () => {
    expect(caseInsensitiveMatch('', '')).toBe(true);
    expect(caseInsensitiveMatch('user', '')).toBe(false);
  });
});
