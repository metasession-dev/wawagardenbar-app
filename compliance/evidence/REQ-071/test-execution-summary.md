# REQ-071 — Test execution summary

**Run date:** 2026-06-05
**Branch:** `feat/REQ-071-api-contracts-e2e`

## Vitest

Unchanged from REQ-070 baseline:

```
 Test Files  121 passed | 1 skipped (122)
      Tests  1129 passed | 4 skipped (1133)
```

This REQ adds zero unit tests — the route handlers' shape contracts are documented in JSDoc; this E2E spec verifies them at runtime.

## E2E (Playwright)

### Focused REQ-071 run against UAT

```
[auth-setup] auth.setup.ts × 3                                                                                              ✓
[regression] e2e/api/public-contracts-authenticated.spec.ts:
  GET /api/public/health: unauthenticated → envelope { status, service, version, uptime, timestamp }                        ✓ (816ms)
  GET /api/public/menu: envelope { success, data: array<MenuItem> } + each item has id/name/price                           ✓ (803ms)
  GET /api/public/menu/categories: envelope { success, data: { drinks: string[], food: string[] } }                         ✓ (506ms)
  GET /api/public/inventory: envelope { success, data: array<Inventory> } + status enum                                     ✓ (803ms)
  GET /api/public/inventory/summary: envelope + { totals, byStatus, byCategory[], needsRestock[], highValueItems[] }        ✓ (601ms)
  GET /api/public/inventory/alerts: envelope + low/out-of-stock arrays                                                      ✓ (1.0s)
  GET /api/public/orders: envelope { success, data: array<Order> } + pagination                                             ✓ (303ms)
  invalid x-api-key: 401 envelope { success: false, error: <string> }                                                       ✓ (493ms)

 11 passed (19s)
```

### What the spec pins

For each of 6 authenticated endpoints + the unauthenticated health endpoint, the spec asserts:

1. **HTTP status code** — 200 for authenticated reads + the public health endpoint; 401 for invalid keys.
2. **Standard envelope** — `{ success: <bool>, data: <object> }` for success cases; `{ success: false, error: <string> }` for failure cases.
3. **Nested shape** — each `data` field's type matches the JSDoc `@returns` contract at the route handler.

These contracts have shallow coverage today (existing `e2e/requirements-verification.spec.ts` § Section 20 pins only that unauthenticated requests are rejected — it does NOT validate the authenticated response shape). This REQ adds the missing half.

### Mid-cycle drift catches

During spec authoring, two endpoints' actual shapes deviated from the assumed shape (initial guesses):

1. `GET /api/public/menu/categories` — initially asserted `Array.isArray(json.data)`. Actual shape: `{ drinks: string[], food: string[] }`. Updated the assertion to match the JSDoc contract.
2. `GET /api/public/inventory/summary` — initially asserted `typeof json.data.totalItems === 'number'`. Actual shape: `{ totals: { totalItems, ... }, byStatus, byCategory[], needsRestock[], highValueItems[] }`. Updated the assertion to match the nested-totals contract.

Both contracts were caught + corrected in one iteration. The spec now matches the documented shape exactly.

### Ephemeral API key

Created in `beforeAll` via `ApiKeyService.createKey({ name: 'e2e-req071-<ts>', role: 'admin', scopes: [<all read scopes>], rateLimit: 300 }, SYSTEM_USER_ID)`. Plaintext captured in spec-local scope only.

Revoked + deleted in `afterAll` so the key cannot persist past the run. Even if the spec crashes mid-run, the next manual cleanup is straightforward (filter `apikeys` by `name: /^e2e-req071-/`).

## TypeScript

```
$ npx tsc --noEmit
# exit 0
```

0 errors.

## Regression posture

- Vitest: 1129 / 1133 (99.6%; 4 skipped pre-existing).
- Focused REQ-071 E2E: 11/11 pass live against UAT (19s).
- Full regression pack: to be run at evidence-pack push time per `feedback_phase3_release_ticket_mandatory`.
- Net delta vs REQ-070 baseline: +8 E2E test cases, 0 unit tests, 0 regressions.
