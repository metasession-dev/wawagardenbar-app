# REQ-069 — Security summary

## Surface review

This REQ adds **test code only** — zero changes to production application code. The security surface of the underlying webhook handlers (`app/api/webhooks/paystack/route.ts`, `app/api/webhooks/monnify/route.ts`) is unchanged from REQ-049 (RELEASED 2026-05-28).

## STRIDE pass on the new test infrastructure

| Threat                     | Surface                                                                   | Status                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Spoofing**               | Signature-generation helpers `signPaystackPayload` + `signMonnifyPayload` | Read secrets from the SAME source the server reads (env for monnify, SystemSettings for paystack). Helpers cannot generate valid signatures without the secret.                                        |
| **Tampering**              | Test creates orders on UAT Mongo via direct `MongoClient.insertOne`       | Test orders prefixed `E2E-REQ069-*` so they're distinguishable from real orders. Cleanup in `afterEach` deletes seeded order + dedup row. No production touch.                                         |
| **Repudiation**            | Synthetic webhooks fire against UAT route handlers                        | The route handler's existing AuditLogService logging captures each webhook delivery the same way it does for real ones. Audit trail unchanged.                                                         |
| **Information disclosure** | Helpers log nothing sensitive                                             | `webhook-mock.ts` + `payment-provider-mock.ts` emit no logs. Secret values are read once + used once + discarded.                                                                                      |
| **Denial of service**      | Tests POST synthetic webhooks at the UAT endpoint                         | 5 test cases per focused run + at most 2 webhook POSTs per case = ≤10 webhook POSTs per run. UAT route handler is the same code as production and has no rate-limit-bypass concerns.                   |
| **Elevation of privilege** | Tests can theoretically mark any seeded order as paid                     | Only orders the test itself seeds (with `E2E-REQ069-*` reference prefix) can be targeted because the route handler finds orders by `paymentReference`. No way to escalate to existing customer orders. |

## Secret handling

- **Monnify** secret read from `process.env.MONNIFY_SECRET_KEY` via `readMonnifySecretFromEnv()`. Operator manages via `.env.local` matching UAT server config.
- **Paystack** secret read from UAT MongoDB `systemsettings.payment.paystack.secretKey` via `readPaystackSecretFromMongo(uri, dbName)`. Operator manages via dashboard/settings UI.
- Secrets are NEVER written to logs, NEVER committed to git, NEVER persisted in test artifacts.

## What this REQ does NOT change

- Production webhook signature verification path: unchanged.
- Production idempotency-dedup logic: unchanged.
- Production rewards / order-confirmation side effects from webhooks: unchanged.
- Production Auth / RBAC: unchanged (webhook routes are deliberately unauthenticated — protected by signature).

## Compliance posture

Headline:

- **No new auth surface.** The new test helpers run server-side in the Playwright runner; do not introduce any new API endpoint or production code path.
- **No new data egress.** Test seeds + cleans up orders on UAT Mongo; no production touches; no third-party calls beyond the existing UAT webhook endpoint.
- **No new packages.** Helpers use Node-stdlib `crypto` (already used by the production webhook services) and Node 18+ `fetch` (already available).

## Related

- REQ-049 (RELEASED 2026-05-28) — webhook idempotency that this REQ pins.
- REQ-066 (RELEASED 2026-06-04) — chokepoint refactor that owns the post-webhook side effects.
