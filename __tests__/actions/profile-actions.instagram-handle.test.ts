/**
 * @requirement REQ-057 — Instagram handle format validation (IG-2)
 *
 * Direct-on-the-schema coverage of the zod pipe used by both
 * `updateProfileSchema` (server-side) and the matching `personal-info-tab`
 * (client-side). The transform strips a leading `@` and trims, then the
 * refine validates against Instagram's actual handle character set.
 *
 * The schema is exported so client + server share one source of truth —
 * this test exercises the exported export rather than importing the full
 * action (which would pull in mongodb, models, audit-log, etc.).
 */
import { describe, it, expect } from 'vitest';
import { instagramHandleSchema } from '@/lib/validation/profile';

describe('REQ-057 instagramHandleSchema', () => {
  it('AC3 — accepts bare handle "foo"', () => {
    const result = instagramHandleSchema.safeParse('foo');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('foo');
  });

  it('AC3 — accepts dotted handle "foo.bar"', () => {
    const result = instagramHandleSchema.safeParse('foo.bar');
    expect(result.success).toBe(true);
  });

  it('AC3 — accepts underscore handle "foo_bar"', () => {
    const result = instagramHandleSchema.safeParse('foo_bar');
    expect(result.success).toBe(true);
  });

  it('AC3 — accepts mixed alphanumeric "foo.123"', () => {
    const result = instagramHandleSchema.safeParse('foo.123');
    expect(result.success).toBe(true);
  });

  it('AC3 — accepts leading-digit "123foo"', () => {
    const result = instagramHandleSchema.safeParse('123foo');
    expect(result.success).toBe(true);
  });

  it('AC3 — empty string accepted (clear-handle sentinel)', () => {
    const result = instagramHandleSchema.safeParse('');
    expect(result.success).toBe(true);
  });

  it('AC3 — rejects space "foo bar"', () => {
    const result = instagramHandleSchema.safeParse('foo bar');
    expect(result.success).toBe(false);
  });

  it('AC3 — rejects hyphen "foo-bar"', () => {
    const result = instagramHandleSchema.safeParse('foo-bar');
    expect(result.success).toBe(false);
  });

  it('AC3 — rejects special char "foo!"', () => {
    const result = instagramHandleSchema.safeParse('foo!');
    expect(result.success).toBe(false);
  });

  it('AC3 — rejects 31-char handle', () => {
    const long = 'a'.repeat(31);
    const result = instagramHandleSchema.safeParse(long);
    expect(result.success).toBe(false);
  });

  it('AC3 — rejects "<script>alert(1)</script>"', () => {
    const result = instagramHandleSchema.safeParse('<script>alert(1)</script>');
    expect(result.success).toBe(false);
  });

  it('AC4 — leading "@" stripped: "@foo" → "foo"', () => {
    const result = instagramHandleSchema.safeParse('@foo');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('foo');
  });

  it('AC4 — leading "@" + dotted: "@foo.bar" → "foo.bar"', () => {
    const result = instagramHandleSchema.safeParse('@foo.bar');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('foo.bar');
  });

  it('AC4 — surrounding whitespace trimmed: "  foo  " → "foo"', () => {
    const result = instagramHandleSchema.safeParse('  foo  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('foo');
  });

  it('AC4 — combined "@foo  " stripped + trimmed to "foo"', () => {
    const result = instagramHandleSchema.safeParse('@foo  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('foo');
  });

  it('AC3 — rejects only-special "@@@" (post-strip becomes "@@" then invalid)', () => {
    const result = instagramHandleSchema.safeParse('@@@');
    expect(result.success).toBe(false);
  });
});
