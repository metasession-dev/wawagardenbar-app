# REQ-070 — Security summary

## Surface review

This REQ adds **test code only** — zero changes to production application code. REQ-048's reversal logic (`OrderService.cancelOrder` → `PointsService.reverseOrderTransactions` + `RewardsService.restoreRedeemedRewards`) is unchanged.

## STRIDE pass on the new test infrastructure

| Threat                     | Surface                                                                                                         | Status                                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | Test seeds a synthetic User document with `role: 'customer'`                                                    | Synthetic users carry `e2e-req070-cancel-*` email prefix; cannot be confused with real customers.                                                                          |
| **Tampering**              | Test calls `OrderService.cancelOrder` directly against live UAT Mongo via the Playwright runner                 | Affects only the seeded order (E2E-REQ070-\* paymentReference). Cleanup deletes user + order + all the user's PointsTransactions + the seeded reward. No production touch. |
| **Repudiation**            | The `cancelOrder` service-layer call writes the standard `statusHistory` row + the `adjusted` PointsTransaction | Audit trail unchanged.                                                                                                                                                     |
| **Information disclosure** | Test reads back Mongo state for assertions                                                                      | Reads only the seeded documents (filtered by inserted \_id). No customer PII accessed.                                                                                     |
| **Denial of service**      | Test runs sequentially against UAT Mongo                                                                        | One seed + one cancel + one cleanup per run. UAT capacity is unaffected.                                                                                                   |
| **Elevation of privilege** | Test calls service-layer methods directly                                                                       | The service-layer methods themselves are the same as production. Test does not bypass any production guards.                                                               |

## Secret handling

- No secrets read or written. The spec uses only the `MONGODB_URI` env var (UAT-targeted via `.env.local`).

## What this REQ does NOT change

- Production cancel-reversal logic: unchanged.
- Production reward-restoration logic: unchanged.
- Production Auth / RBAC: unchanged.

## Compliance posture

- **No new auth surface.** Spec runs server-side in the Playwright runner.
- **No new data egress.** Test seeds + cleans up on UAT only.
- **No new packages.** Uses `mongoose` + `mongodb` + `@playwright/test` already in deps.

## Related

- REQ-048 (RELEASED 2026-05-28) — the rewards-ledger correctness work that this REQ pins.
- REQ-069 (IN PROGRESS via PR #298) — established the "Playwright spec + live UAT Mongo + service-layer call" pattern this REQ extends.
