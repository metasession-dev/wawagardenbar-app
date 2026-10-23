/**
 * @requirement REQ-114 - zod 3 → 4 upgrade (GHSA-mrhx-c7xc-m3w5)
 *
 * The app's single entry point for zod. Import `z` from here, not from
 * 'zod', so this module's global configuration is applied in every runtime
 * (server actions and client forms) before any schema parses.
 *
 * zod 4 rewrote its default error messages ("Too small: expected string to
 * have >=5 characters" instead of "String must contain at least 5
 * character(s)"). Many forms and server actions show zod's default message
 * when a validator has no custom one, so the upgrade would silently change
 * user-facing copy. `customError` below reproduces zod 3.25's default wording
 * for every issue the app can raise. It is consulted only when a schema has no
 * message of its own, so custom messages are untouched. Returning undefined
 * falls back to zod 4's default.
 */
import { z } from 'zod';

/** zod 3's `getParsedType`, used in its "Expected X, received Y" messages. */
function v3ParsedType(input: unknown): string {
  switch (typeof input) {
    case 'undefined':
      return 'undefined';
    case 'string':
      return 'string';
    case 'number':
      return Number.isNaN(input) ? 'nan' : 'number';
    case 'boolean':
      return 'boolean';
    case 'function':
      return 'function';
    case 'bigint':
      return 'bigint';
    case 'symbol':
      return 'symbol';
    default:
      if (input === null) return 'null';
      if (Array.isArray(input)) return 'array';
      if (input instanceof Date) return 'date';
      if (input instanceof Map) return 'map';
      if (input instanceof Set) return 'set';
      if (
        typeof (input as { then?: unknown }).then === 'function' &&
        typeof (input as { catch?: unknown }).catch === 'function'
      ) {
        return 'promise';
      }
      return 'object';
  }
}

/** zod 3's `util.joinValues`: strings single-quoted, joined with " | ". */
function joinValues(values: readonly unknown[]): string {
  return values
    .map((v) => (typeof v === 'string' ? `'${v}'` : String(v)))
    .join(' | ');
}

interface CompatIssue {
  code: string;
  input?: unknown;
  expected?: string;
  origin?: string;
  minimum?: number | bigint | Date;
  maximum?: number | bigint | Date;
  inclusive?: boolean;
  exact?: boolean;
  format?: string;
  prefix?: string;
  suffix?: string;
  includes?: string;
  divisor?: number | bigint;
  values?: readonly unknown[];
  keys?: readonly string[];
  inst?: { _zod?: { def?: { type?: string } } };
}

function sizeMessage(iss: CompatIssue): string | undefined {
  const small = iss.code === 'too_small';
  const bound = small ? iss.minimum : iss.maximum;
  const inclusive = iss.inclusive !== false;
  switch (iss.origin) {
    case 'string':
      if (iss.exact) return `String must contain exactly ${bound} character(s)`;
      return small
        ? `String must contain ${inclusive ? 'at least' : 'over'} ${bound} character(s)`
        : `String must contain ${inclusive ? 'at most' : 'under'} ${bound} character(s)`;
    case 'number':
    case 'bigint': {
      const noun = iss.origin === 'bigint' ? 'BigInt' : 'Number';
      if (iss.exact) return `${noun} must be exactly ${bound}`;
      return small
        ? `${noun} must be greater than ${inclusive ? 'or equal to ' : ''}${bound}`
        : `${noun} must be less than ${inclusive ? 'or equal to ' : ''}${bound}`;
    }
    case 'array':
      if (iss.exact) return `Array must contain exactly ${bound} element(s)`;
      return small
        ? `Array must contain ${inclusive ? 'at least' : 'more than'} ${bound} element(s)`
        : `Array must contain ${inclusive ? 'at most' : 'less than'} ${bound} element(s)`;
    case 'date': {
      const when = new Date(Number(bound));
      if (iss.exact) return `Date must be exactly ${when}`;
      return small
        ? `Date must be greater than ${inclusive ? 'or equal to ' : ''}${when}`
        : `Date must be ${inclusive ? 'smaller than or equal to' : 'smaller than'} ${when}`;
    }
    default:
      return undefined;
  }
}

/** Maps a zod 4 issue to zod 3.25's default message, or undefined to keep zod 4's. */
export function zodV3CompatibleMessage(iss: CompatIssue): string | undefined {
  switch (iss.code) {
    case 'invalid_type': {
      if (iss.input === undefined) return 'Required';
      if (iss.expected === 'date' && iss.input instanceof Date) {
        return 'Invalid date';
      }
      if (
        iss.expected === 'number' &&
        typeof iss.input === 'number' &&
        !Number.isNaN(iss.input)
      ) {
        // zod 3 accepted ±Infinity in z.number(); zod 4 rejects it. Use
        // zod 3's wording for non-finite numbers (`.finite()`).
        return 'Number must be finite';
      }
      if (iss.expected === 'int') {
        return `Expected integer, received ${
          typeof iss.input === 'number' && !Number.isNaN(iss.input)
            ? 'float'
            : v3ParsedType(iss.input)
        }`;
      }
      return `Expected ${iss.expected}, received ${v3ParsedType(iss.input)}`;
    }
    case 'too_small':
    case 'too_big':
      return sizeMessage(iss);
    case 'invalid_format':
      switch (iss.format) {
        case 'regex':
          return 'Invalid';
        case 'starts_with':
          return `Invalid input: must start with "${iss.prefix}"`;
        case 'ends_with':
          return `Invalid input: must end with "${iss.suffix}"`;
        case 'includes':
          return `Invalid input: must include "${iss.includes}"`;
        case undefined:
          return undefined;
        default:
          return `Invalid ${iss.format}`;
      }
    case 'not_multiple_of':
      return `Number must be a multiple of ${iss.divisor}`;
    case 'invalid_value': {
      if (iss.input === undefined) return 'Required';
      const values = iss.values ?? [];
      if (iss.inst?._zod?.def?.type === 'literal' && values.length === 1) {
        return `Invalid literal value, expected ${JSON.stringify(values[0])}`;
      }
      return `Invalid enum value. Expected ${joinValues(values)}, received '${String(iss.input)}'`;
    }
    case 'unrecognized_keys':
      return `Unrecognized key(s) in object: ${(iss.keys ?? []).map((k) => `'${k}'`).join(', ')}`;
    case 'invalid_union':
    case 'invalid_key':
    case 'invalid_element':
    case 'custom':
      return 'Invalid input';
    default:
      return undefined;
  }
}

z.config({
  customError: (iss) => zodV3CompatibleMessage(iss as unknown as CompatIssue),
});

export { z };
