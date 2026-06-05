# REQ-071 — Public API authenticated contracts E2E coverage (sub-issue #297)

**Status:** IN PROGRESS · **Risk:** LOW · **Issue:** [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))

## Context

Third cycle of umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) (SRS → E2E regression-pack coverage closure). Existing coverage at `e2e/requirements-verification.spec.ts` § Section 20 pins that every scoped public API endpoint REJECTS unauthenticated requests with 401/403/429. The missing half: **authenticated responses match the documented envelope shape**.

REQ-071 adds the missing half — one spec exercising every read-scoped public endpoint with a valid API key and asserting the response envelope matches the JSDoc contract at the route.

## Acceptance criteria

1. **AC1 — Authenticated contract per endpoint.** For each of the following endpoints, a GET with a valid `x-api-key` returns 200 + envelope `{ success: true, data: <documented shape> }`:
   - `/api/public/health` (no auth required)
   - `/api/public/menu`
   - `/api/public/menu/categories`
   - `/api/public/inventory`
   - `/api/public/inventory/summary`
   - `/api/public/inventory/alerts`
   - `/api/public/orders`
2. **AC2 — Invalid-key rejection envelope.** A GET with an invalid `x-api-key` returns 401 + envelope `{ success: false, error: <string> }`.

## Implementation approach

### Single spec file with ephemeral API key

- `e2e/api/public-contracts-authenticated.spec.ts` — `describe.configure({ mode: 'serial' })` so the rate-limit (30 req/min default) is respected.
- `beforeAll`: calls `ApiKeyService.createKey({ name, role: 'admin', scopes: [all read scopes], rateLimit: 300 }, SYSTEM_USER_ID)`. Captures the plaintext key returned.
- `afterAll`: revokes + deletes the key so it cannot be reused after the run.

### Shape assertions

Per-endpoint inline `expect` assertions on the response envelope + each nested field's type. No zod dependency added; the assertions are TypeScript-friendly + readable.

The shape contracts are derived from each route file's JSDoc `@returns` comments. If a route handler changes its response shape without updating the JSDoc, this spec catches the contract drift immediately.

### No production code change

Pure test addition.

## Deferred to follow-up (tracked on sub-issue #297)

- **Dedicated audit-log spec** (REQ-AUDIT-001) — exercise 5+ admin actions + verify the audit log row count + shape. Requires admin UI navigation + DB readback, more complex than HTTP contracts.
- **Profitability report E2E** (REQ-REPORT-003) — UI-driven E2E with admin reports page.
- **CSV/JSON export E2E** (REQ-REPORT-004) — UI-driven E2E exercising the export endpoint and parsing the file shape.
- **Per-endpoint contracts for write methods** (POST, PATCH, DELETE) — V1 covers reads only because writes carry larger side effects and need cleanup.

These ship in a follow-up REQ within sub-issue #297.

## Risk

**LOW.** Pure test addition. The ephemeral API key has read-only scopes; revoked + deleted in `afterAll` so it cannot persist past the run. No production code change. Synthetic key names carry `e2e-req071-*` prefix so they're easy to identify in audit queries.

## Security considerations

- The ephemeral API key is created with broad read scopes for the duration of the spec. The plaintext is captured in a JS variable scope (no logs, no env writes, no commits).
- `revokeKey` flips `isActive: false`, then `deleteKey` removes the row entirely. Even if the test crashes mid-run, the next manual cleanup is straightforward (filter apikeys by `name: /^e2e-req071-/`).
- No production data is modified. Reads are scoped to existing UAT inventory/menu/orders.

## Dependencies

- REQ-069 (IN PROGRESS via PR #298) — established the "Playwright spec + Node fetch + live UAT" pattern.
- REQ-070 (IN PROGRESS via PR #300) — established the "import service-layer functions in the spec" pattern.

## Test scope

E2E (live against UAT):

- `e2e/api/public-contracts-authenticated.spec.ts` — 8 tests (1 health + 6 authenticated endpoints + 1 invalid-key rejection).

Vitest unchanged from REQ-070 baseline (1129 pass / 4 skip / 0 fail).
