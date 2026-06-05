# REQ-073 — Security summary

## Surface review

This REQ adds **test code only** — zero changes to production application code. The MenuItem schema, ProductionService.voidBatch, action handlers, and audit-log writers are all unchanged.

## STRIDE pass on the new test infrastructure

| Threat                     | Surface                                                                                                                              | Status                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | Specs create ephemeral MongoDB documents via the operator's `MONGODB_UAT_EXTERNAL_URI` credentials                                   | Same DB-access path REQ-070 + REQ-069's existing specs use. Operator-supplied credentials loaded from `.env.local`. Never logged, never persisted in test artefacts.                                                                                                                                                                               |
| **Tampering**              | Spec 3 directly invokes `ProductionService.voidBatch` against UAT — flips a Production document's status + writes StockMovement rows | All mutations target the spec's own seeded documents (synthetic identifiers `e2e-req073-{ts}`). Zero impact on real records.                                                                                                                                                                                                                       |
| **Repudiation**            | Spec 3 writes a real super-admin user document + 2 StockMovement rows during the void call                                           | All seeded documents have the `e2e-req073-{ts}` identifier. `afterAll` deletes every seeded document by `_id` including the 2 audit-trail StockMovements. No long-lived super-admin user left behind.                                                                                                                                              |
| **Information disclosure** | Specs read back seeded document state to assert post-conditions                                                                      | Reading back synthetic, spec-owned documents. No real PII enumerated or echoed.                                                                                                                                                                                                                                                                    |
| **Denial of service**      | 3 specs run sequentially per worker. Spec 3 performs 4 mutations + ~6 reads against UAT Mongo                                        | Negligible UAT load. Each spec ends with full teardown.                                                                                                                                                                                                                                                                                            |
| **Elevation of privilege** | Spec 3 seeds a `role: 'super-admin'` user document to satisfy `voidBatch`'s `voidedByRole === 'super-admin'` precondition            | Seeded user has synthetic email `e2e-req073-void-{ts}@test.wawagardenbar.com` + synthetic phone. Deleted in `afterAll`. No session is created for this user — Spec 3 calls the service-layer `voidBatch` directly, bypassing the action's session-cookie auth. The user document exists only as the value of `production.voidedBy` (FK reference). |

## Secret handling

- `MONGODB_URI` (operator-set to UAT value) is read from `process.env`. Loaded by `dotenv` from `.env.local` at Playwright startup. Never logged, never persisted to test artefacts.
- No new credentials introduced.

## Honest disclosure: ephemeral super-admin user

Spec 3 (`kitchen-void-batch.spec.ts`) seeds a real super-admin User document on UAT. Required because `ProductionService.voidBatch` validates `input.voidedByRole === 'super-admin'` at the service-layer and uses `input.voidedBy` as the ObjectId stamped onto `production.voidedBy` (FK reference into the `users` collection).

**Mitigations:**

- The seeded user has the prefix `e2e-req073-void-` in email + name fields. Identifiable as test residue if cleanup fails.
- `accountStatus: 'active'` is set so the seed satisfies User schema defaults, but **no session is created** — the user cannot log in (`afterAll` cleanup deletes the user before the spec process exits).
- The cleanup `afterAll` block runs even on test failure. Manual cleanup query if needed: `db.users.deleteMany({ email: /^e2e-req073-void-/ })`.
- The blast radius if cleanup fails is bounded: a single ghost super-admin user with synthetic email + no associated session + no password. Not exploitable without first obtaining the database connection string + setting up auth bypass.

## What this REQ does NOT change

- Production route handlers: unchanged.
- Production service-layer logic (MenuItem deletion, duplicate logic, ProductionService.voidBatch): unchanged.
- Production rate limits, auth surfaces, or session handling: unchanged.

## Compliance posture

- **No new auth surface.** Specs run server-side in the Playwright runner using operator-supplied DB credentials.
- **No new data egress.** Synthetic documents only.
- **No new packages.** Uses existing `mongodb` driver + service-layer imports.
- **UAT only.** Honors `feedback_no_prod_db_touches` — `MONGODB_URI` set to `MONGODB_UAT_EXTERNAL_URI`'s value.

## Related

- REQ-069 (MERGED) — webhook signature + idempotency E2E. Established the "Playwright spec + UAT Mongo" pattern this REQ extends.
- REQ-070 (MERGED) — rewards-pipeline E2E. Established the "import service-layer from spec + call directly" pattern this REQ extends to ProductionService.
- REQ-071 (MERGED) — public API authenticated contracts E2E.
- REQ-072 (MERGED) — Socket.IO broadcast E2E.
