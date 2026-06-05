# REQ-072 — Test execution summary

**Date:** 2026-06-05
**Target:** UAT (`https://wawagardenbar-app-uat.up.railway.app`)
**Risk:** LOW

## Focused E2E run

```
$ BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  npx playwright test e2e/realtime/order-status-broadcast.spec.ts \
  --project=regression --reporter=list

Running 6 tests using 3 workers
  ✓ 1 [auth-setup] › authenticate as admin (2.8s)
  ✓ 2 [auth-setup] › authenticate as super-admin (2.9s)
  ✓ 3 [auth-setup] › authenticate as csr (3.1s)
  ✓ 4 [regression] › order-status-broadcast.spec.ts › AC1+AC2: client joined to order room receives order-status-update event within 5s (1.9s)
  ✓ 5 [regression] › order-status-broadcast.spec.ts › AC3: client joined to a DIFFERENT order room does NOT receive the event (2.8s)
  ✓ 6 [regression] › order-status-broadcast.spec.ts › AC2 extended: payload contains every field emitOrderStatusUpdate sets (1.4s)

  6 passed (10.2s)
```

3 contract tests pass against live UAT. 3 auth-setup tests pass (regression project's dependency).

## Vitest

```
$ npx vitest run --reporter=dot
 Test Files  121 passed | 1 skipped (122)
      Tests  1129 passed | 4 skipped (1133)
   Duration  4.11s
```

Unchanged from REQ-071 baseline — zero unit tests added or modified.

## TypeScript

```
$ npx tsc --noEmit
(exit 0)
```

## Notes on the run

- All 3 contract tests use synthetic `orderId` strings — no real Order document is required because `emitOrderStatusUpdate` broadcasts based on the supplied id without DB lookup. Zero UAT data state mutated.
- The `triggerInternalEmit` helper POSTs to UAT's `/api/internal/socket/emit` with `x-internal-auth: ${INTERNAL_API_SECRET}`. The placeholder value `your-secret-key-here` (from local `.env.local`) was accepted by UAT — see `security-summary.md` § "Finding: UAT INTERNAL_API_SECRET appears to be the placeholder" for the honest report.
- Room isolation test (AC3) uses a 1.5s no-arrival window before asserting `received === false`. Larger windows would catch potential late deliveries; 1.5s strikes the balance between sensitivity and run time. If a future regression breaks room scoping, the false-negative window would need to be widened in a follow-up.

## What this run proves

✓ Socket.IO transport handshake works against UAT's `/api/socket` path.
✓ Server-side `emitOrderStatusUpdate` correctly routes to the `order-${orderId}` room.
✓ Payload shape matches `lib/socket-server.ts:108`'s contract verbatim.
✓ Room scoping — events bound to one `order-*` room don't leak to siblings.

## What this run does NOT prove

✗ Real Order documents transitioning status via business actions trigger this broadcast (V1 hits the internal-emit endpoint directly — pins transport, not the full business chain).
✗ `kitchen:new-order` broadcast (REQ-RT-002) — deferred for the reasons in `test-scope.md`.
✗ DOM updates on the admin orders dashboard / kitchen display pages when these events arrive — a browser-context full-chain test would assert that.
