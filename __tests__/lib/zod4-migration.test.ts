/**
 * @requirement REQ-114 - zod 3 → 4 upgrade (GHSA-mrhx-c7xc-m3w5)
 *
 * The upgrade must not change what users see (AC2, AC3). Expected strings
 * below were captured from zod 3.25.76 — the version this upgrade replaces —
 * by running the same schemas and inputs against it, so they pin the exact
 * pre-upgrade behaviour of `@/lib/zod`'s v3-compatible messages.
 */
import { describe, it, expect } from 'vitest';
import { z } from '@/lib/zod';
import { requiredError } from '@/lib/validation/zod-errors';

function firstMessage(schema: z.ZodType, input: unknown): string | null {
  const result = schema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
}

describe('zod 3 default messages are preserved (AC3)', () => {
  const cases: [string, z.ZodType, unknown, string][] = [
    ['missing string', z.object({ a: z.string() }), {}, 'Required'],
    ['missing number', z.object({ a: z.number() }), {}, 'Required'],
    [
      'string min',
      z.string().min(5),
      'abc',
      'String must contain at least 5 character(s)',
    ],
    [
      'string min 1',
      z.string().min(1),
      '',
      'String must contain at least 1 character(s)',
    ],
    [
      'string max',
      z.string().max(3),
      'abcdef',
      'String must contain at most 3 character(s)',
    ],
    [
      'string length',
      z.string().length(2),
      'abc',
      'String must contain exactly 2 character(s)',
    ],
    ['email', z.string().email(), 'x', 'Invalid email'],
    ['url', z.string().url(), 'x', 'Invalid url'],
    ['uuid', z.string().uuid(), 'x', 'Invalid uuid'],
    ['regex', z.string().regex(/a/), 'b', 'Invalid'],
    ['number type', z.number(), 'x', 'Expected number, received string'],
    ['number NaN', z.number(), Number.NaN, 'Expected number, received nan'],
    [
      'number min',
      z.number().min(1),
      0,
      'Number must be greater than or equal to 1',
    ],
    [
      'number max',
      z.number().max(5),
      9,
      'Number must be less than or equal to 5',
    ],
    ['number gt', z.number().gt(1), 1, 'Number must be greater than 1'],
    ['number lt', z.number().lt(1), 1, 'Number must be less than 1'],
    ['positive', z.number().positive(), 0, 'Number must be greater than 0'],
    [
      'nonnegative',
      z.number().nonnegative(),
      -1,
      'Number must be greater than or equal to 0',
    ],
    ['int', z.number().int(), 1.5, 'Expected integer, received float'],
    [
      'multipleOf',
      z.number().multipleOf(5),
      7,
      'Number must be a multiple of 5',
    ],
    [
      'array min',
      z.array(z.string()).min(1),
      [],
      'Array must contain at least 1 element(s)',
    ],
    [
      'array max',
      z.array(z.string()).max(1),
      ['a', 'b'],
      'Array must contain at most 1 element(s)',
    ],
    [
      'array length',
      z.array(z.string()).length(2),
      ['a'],
      'Array must contain exactly 2 element(s)',
    ],
    [
      'enum',
      z.enum(['a', 'b']),
      'c',
      "Invalid enum value. Expected 'a' | 'b', received 'c'",
    ],
    ['missing enum', z.object({ e: z.enum(['a', 'b']) }), {}, 'Required'],
    [
      'literal',
      z.literal('DELETE'),
      'x',
      'Invalid literal value, expected "DELETE"',
    ],
    ['literal number', z.literal(3), 4, 'Invalid literal value, expected 3'],
    ['missing date', z.object({ d: z.date() }), {}, 'Required'],
    ['invalid date', z.date(), new Date('x'), 'Invalid date'],
    ['boolean', z.boolean(), 'x', 'Expected boolean, received string'],
    [
      'strict object',
      z.object({}).strict(),
      { k: 1, j: 2 },
      "Unrecognized key(s) in object: 'k', 'j'",
    ],
    ['union', z.union([z.string(), z.number()]), true, 'Invalid input'],
    ['refine', z.string().refine(() => false), 'a', 'Invalid input'],
    [
      'coerce number',
      z.coerce.number(),
      'abc',
      'Expected number, received nan',
    ],
    ['null', z.string(), null, 'Expected string, received null'],
    ['array type', z.array(z.string()), 'x', 'Expected array, received string'],
    ['object type', z.object({}), 'x', 'Expected object, received string'],
  ];

  it.each(cases)('%s', (_name, schema, input, expected) => {
    expect(firstMessage(schema, input)).toBe(expected);
  });

  it('keeps custom messages untouched', () => {
    expect(
      firstMessage(z.string().min(3, 'Name must be at least 3 characters'), 'a')
    ).toBe('Name must be at least 3 characters');
    expect(
      firstMessage(z.string().email('Please enter a valid email'), 'x')
    ).toBe('Please enter a valid email');
  });
});

describe('requiredError keeps zod 3 required_error semantics (AC3)', () => {
  const enumSchema = z.object({
    method: z.enum(['cash', 'transfer'], {
      error: requiredError('Payment method is required'),
    }),
  });
  const dateSchema = z.object({
    date: z.date({ error: requiredError('Date is required') }),
  });

  it('shows the custom message only when the value is missing', () => {
    expect(firstMessage(enumSchema, {})).toBe('Payment method is required');
    expect(firstMessage(dateSchema, {})).toBe('Date is required');
  });

  it('falls back to the zod 3 default for any other issue', () => {
    expect(firstMessage(enumSchema, { method: 'card' })).toBe(
      "Invalid enum value. Expected 'cash' | 'transfer', received 'card'"
    );
    expect(firstMessage(dateSchema, { date: new Date('x') })).toBe(
      'Invalid date'
    );
  });

  it('accepts valid values (AC2)', () => {
    expect(enumSchema.safeParse({ method: 'transfer' }).success).toBe(true);
    expect(dateSchema.safeParse({ date: new Date() }).success).toBe(true);
  });
});

describe('email and URL acceptance matches zod 3 (AC2, AC3)', () => {
  // Accept/reject decisions captured from zod 3.25.76.
  const emails: [string, boolean][] = [
    ['ade@wawagardenbar.com', true],
    ['first.last@example.co.uk', true],
    ['user+tag@gmail.com', true],
    ["o'brien@example.ie", true],
    ['user_name@sub.domain.ng', true],
    ['a@b.co', true],
    ['UPPER@EXAMPLE.COM', true],
    ['e2e-superadmin@test.wawagardenbar.local', true],
    ['name@domain.museum', true],
    ['a.b-c_d@e-f.gh', true],
    ['x@localhost', false],
    ['.lead@example.com', false],
    ['double..dot@example.com', false],
    ['trail.@example.com', false],
    ['no-at-sign', false],
    ['user@-bad.com', false],
    ['user@example', false],
    ['user@exa_mple.com', false],
    ['user@example.c', false],
  ];
  const urls: [string, boolean][] = [
    ['https://wawagardenbar.com', true],
    ['http://localhost:3000/api', true],
    ['https://example.com/path?x=1#h', true],
    ['https://sub.domain.ng/a/b', true],
    ['http://192.168.0.1', true],
    ['example.com', false],
    ['not a url', false],
  ];

  it.each(emails)('email %s → %s', (value, ok) => {
    expect(z.string().email().safeParse(value).success).toBe(ok);
  });

  it.each(urls)('url %s → %s', (value, ok) => {
    expect(z.string().url().safeParse(value).success).toBe(ok);
  });
});

describe('known behaviour change', () => {
  it('rejects non-finite numbers (zod 3 accepted ±Infinity) with zod 3 finite wording', () => {
    expect(firstMessage(z.number(), Number.POSITIVE_INFINITY)).toBe(
      'Number must be finite'
    );
  });
});
