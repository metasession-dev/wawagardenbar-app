# Test Plan — REQ-049

**Requirement:** REQ-049 — Webhook idempotency guard (Paystack + Monnify)
**Risk Level:** HIGH → unit + integration + abuse/negative; e2e n/a per `test-scope.md`
**Date:** 2026-05-28

## Approach

Vitest, fully mocked per `__tests__/services/*.test.ts` and `__tests__/api/public/*.test.ts` conventions. The integration tests import the Next.js Route Handler `POST` directly and call it with a duck-typed `NextRequest` (mocked `text()` + `headers.get()`) — no real Next runtime needed. 12 new test cases across 3 files.

## Cases

### 1. `recordWebhookEvent` (unit) — `__tests__/lib/webhook-idempotency.test.ts`

- **first delivery** — `create` resolves → returns `'new'`; the inserted doc carries `provider`, `eventId`, `paymentReference`, `eventType`, and a `Date` `receivedAt`.
- **duplicate (E11000)** — `create` rejects with `{code: 11000}` → returns `'duplicate'`. This is the load-bearing race-safe path.
- **other DB errors rethrow** — `connection lost` → propagates; caller's outer `try/catch` becomes a 500 (better than silently re-running side-effects).
- **provider namespacing** — paystack + monnify with the _same_ eventId both record cleanly (compound unique index isolates the namespaces).

### 2. Paystack route (integration) — `__tests__/api/webhooks/paystack-idempotency.test.ts`

- **first delivery runs side-effects** — `ProcessedWebhookEvent.create` called once with `provider: 'paystack'` + `eventId: String(data.id)`; `InventoryService.deductStockForOrder` + `RewardsService.calculateReward` each called once; HTTP 200.
- **replay is a no-op** — second call with the same event-id (mocked `create` rejects E11000) → 200 with `message: /already processed/i`; no inventory, no reward, no order lookup.
- **10-replay abuse** — first call succeeds; 9 subsequent calls all reject E11000 → side-effects fire exactly once across 10 deliveries; all 10 return 200.
- **non-`charge.success` events** — `charge.failed` returns 200 ignore BEFORE the dedup check (no table bloat from events we never act on).
- **unsigned requests** — `validateWebhookSignature → false` → 401 before any dedup work (attacker can't poison the dedup table).

### 3. Monnify route (integration) — `__tests__/api/webhooks/monnify-idempotency.test.ts`

- **first delivery runs side-effects** — `create` called with `provider: 'monnify'` + `eventId: payload.transactionReference`; inventory + reward each once; 200.
- **replay is a no-op** — E11000 on the second call → 200 `/already processed/i`; no inventory, no reward, no order lookup.
- **unsigned requests** — `validateWebhookSignature → false` → 401 before dedup.

## Gates run on develop @ `2a1dac8`

- `npx tsc --noEmit` — must exit 0
- `npx vitest run` — all green, including the 12 new cases
- `npx eslint <changed-files>` — 0 errors
- `semgrep scan --config auto --severity ERROR` — 0 findings on REQ-049 code
- `npm audit --audit-level=high` — 0 high/critical
