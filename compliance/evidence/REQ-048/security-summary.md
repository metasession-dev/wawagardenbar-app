# Security Summary — REQ-048

**Requirement:** REQ-048 — Rewards-ledger correctness bundle
**Date:** 2026-05-28
**Risk Level:** MEDIUM

## Threat surface

REQ-048 touches the loyalty ledger (points + rewards) but introduces **no new auth, RBAC, payments-credential, or external-input surface**. Specifically:

- **`PointsService.reverseOrderTransactions`** — invoked only from `OrderService.cancelOrder`, which is already RBAC-gated upstream by its existing callers. The **idempotency guard** (existing-`adjusted`-with-`orderId` check) is the in-scope control preventing **repeated credits** (value inflation if cancel were retried).
- **`RewardsService.restoreRedeemedRewards`** — `updateMany` keyed to `{ redeemedInOrderId: orderId, status: 'redeemed' }`. Naturally idempotent (only matches still-redeemed-for-this-order).
- **`lib/scheduled-jobs.ts` / `runRewardExpiryJob`** — runs **in-process** on the server; **no external trigger endpoint, no API route**, so no unauthenticated-trigger surface. Errors swallowed-with-log so a job tick can't crash the server.
- **`TabService.prepareTabForCheckout` eligibleRewards** — read-only listing of `RewardRule` rows already published to authenticated tab API consumers; no new data exposure.

## Gate posture

| Gate                           | Result                                   |
| ------------------------------ | ---------------------------------------- |
| Semgrep (SAST baseline)        | 0 high/critical — baseline 0 preserved   |
| `npm audit --audit-level=high` | 0 high/critical                          |
| TypeScript (`tsc --noEmit`)    | Clean (no `any`/escape-hatch introduced) |
| ESLint                         | 0 errors on changed files                |

No new dependencies introduced (scheduler chosen as `setInterval` over `node-cron` specifically to keep the audit/SBOM surface flat).

## Logging discipline

The cancel-reversal path uses `console.error` with a `[REQ-048]` prefix on failure (not swallowed silently — value loss must be loud). The scheduler module logs `console.warn` on expiry counts > 0 and `console.error` on job failures.
