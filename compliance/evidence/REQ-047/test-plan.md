# Test Plan — REQ-047

**Requirement:** REQ-047 — Harden CORS origin reflection (`lib/cors.ts`)
**Risk Level:** LOW
**Date:** 2026-05-25

## Test approach

Single layer — unit (vitest) — plus the restored SAST gate as the regression guard.

## Unit test cases (`__tests__/security/cors-origin-reflection.test.ts`)

| # | Case | Assertion |
| --- | --- | --- |
| 1 | Exact allow-list match | `Access-Control-Allow-Origin` === the configured origin; `Vary: Origin` set |
| 2 | Origin not allow-listed | `Access-Control-Allow-Origin` absent; `Vary` absent |
| 3 | Allow-list is `'*'` | arbitrary origin **not** reflected (the security fix) |
| 4 | No allow-list configured | not reflected |
| 5 | Static headers | Methods / Headers / Max-Age / Credentials always set |

## Gates

- `npx tsc --noEmit` → 0 errors.
- `npx vitest run __tests__/security/cors-origin-reflection.test.ts` → 5/5 green.
- SAST (semgrep `--config auto`) → **0 findings** (baseline 0); `cors-misconfiguration` cleared.
- CI Quality Gates on the develop run → green; E2E + build unaffected.

## Pass criteria

All gates green; the `cors-misconfiguration` finding no longer present.
