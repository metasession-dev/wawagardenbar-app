# REQ-071 — Test plan

**Requirement ID:** REQ-071
**Risk:** LOW (pure test addition; ephemeral read-only API key; no production code change)
**Related issue:** [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Date:** 2026-06-05

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                       | Test                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| AC1 | Authenticated GET to each public API endpoint returns 200 + envelope `{ success: true, data: <documented shape> }`. Shapes derived from each route's JSDoc `@returns` contract. | `e2e/api/public-contracts-authenticated.spec.ts` — 7 tests (health + 6 authenticated endpoints) |
| AC2 | Invalid `x-api-key` returns 401 + envelope `{ success: false, error: <string> }`                                                                                                | same spec — 1 test                                                                              |

## Endpoints covered

| Endpoint                            | Auth             | Asserted shape                                                                         |
| ----------------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `GET /api/public/health`            | None             | `{ status, service, version, uptime, timestamp }`                                      |
| `GET /api/public/menu`              | `menu:read`      | array of items with `{ _id, name, price }`                                             |
| `GET /api/public/menu/categories`   | `menu:read`      | `{ drinks: string[], food: string[] }`                                                 |
| `GET /api/public/inventory`         | `inventory:read` | array with `{ _id, currentStock, status ∈ ['in-stock', 'low-stock', 'out-of-stock'] }` |
| `GET /api/public/inventory/summary` | `inventory:read` | `{ totals, byStatus, byCategory[], needsRestock[], highValueItems[] }`                 |
| `GET /api/public/inventory/alerts`  | `inventory:read` | `{ lowStock: array, outOfStock: array }`                                               |
| `GET /api/public/orders?limit=5`    | `orders:read`    | array with `{ _id, orderNumber, status, paymentStatus, total }`                        |

## Test environment

E2E only. Playwright via the existing regression project. Spec:

- `beforeAll` creates an ephemeral API key with broad read scopes via `ApiKeyService.createKey`. Plaintext captured in spec scope only.
- Each test sends a Node `fetch` with `x-api-key` header. Asserts status + envelope shape inline.
- `afterAll` revokes + deletes the API key. No residue on UAT.
- Configured `describe.configure({ mode: 'serial' })` to respect the 30 req/min rate-limit default.

## Quality gates

| Gate                           | Expected   | Actual (2026-06-05)                                           |
| ------------------------------ | ---------- | ------------------------------------------------------------- |
| `npx tsc --noEmit`             | exit 0     | exit 0                                                        |
| `npx vitest run` (full)        | 0 failures | 1129 pass / 4 skip / 0 fail (unchanged from REQ-070 baseline) |
| E2E focused REQ-071 (UAT)      | 0 failures | 11 passed (3 auth-setup + 8 contract tests), 19s wall-clock   |
| E2E full regression pack (UAT) | green      | _to be run at evidence-pack push time_                        |

## Out of scope (this PR)

Tracked on sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) as a checklist:

- Dedicated audit-log spec (REQ-AUDIT-001) — 5+ admin actions → audit log readback.
- Profitability report E2E (REQ-REPORT-003) — UI-driven admin reports page.
- CSV/JSON export E2E (REQ-REPORT-004) — UI-driven export endpoint + file shape parse.
- Per-endpoint contracts for write methods (POST/PATCH/DELETE) — V1 covers reads only because writes carry larger side effects.
