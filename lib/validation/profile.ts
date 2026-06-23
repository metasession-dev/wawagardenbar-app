import { z } from 'zod';

/**
 * @requirement REQ-057 — Instagram handle zod pipe (IG-2).
 *
 * Exported from a shared validation module (not a `'use server'` file) so
 * both client forms and server actions can import it without proxy
 * issues. Client and server apply the SAME transform + refine — no drift.
 *
 * Pipe stages:
 *   1. `.max(30)` — guard the input size before the transform allocates.
 *   2. `.transform(strip-`@`-and-trim)` — normalise common paste shapes
 *      so the user can paste `@foo` or ` foo ` and have it just work.
 *   3. `.refine(IG-char-regex)` — validates the POST-strip handle
 *      against Instagram's actual handle character set
 *      (`[a-zA-Z0-9._]{1,30}`). Empty-string `''` is the explicit
 *      "clear handle" sentinel and is allowed through.
 */
export const instagramHandleSchema = z
  .string()
  .max(30, 'Handle is too long')
  .transform((v) => v.replace(/^@/, '').trim())
  .refine((v) => v === '' || /^[a-zA-Z0-9._]{1,30}$/.test(v), {
    message: 'Only letters, numbers, periods, and underscores; max 30 chars',
  });
