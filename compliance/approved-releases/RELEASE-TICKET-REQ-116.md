# Release Ticket: REQ-116 — WhatsApp webhook hardening, STOP/START, PIN delivery fix and regression-pack fixes (WA-02)

**Status:** RELEASED
**Date:** 2026-11-01
**Requirement ID:** REQ-116
**Risk Level:** HIGH
**Issue:** [#964](https://github.com/metasession-dev/wawagardenbar-app/issues/964) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953)); also addresses [#979](https://github.com/metasession-dev/wawagardenbar-app/issues/979) and [#932](https://github.com/metasession-dev/wawagardenbar-app/issues/932)
**Implementation branch:** `feat/WA-02-webhook-hardening` (PR [#991](https://github.com/metasession-dev/wawagardenbar-app/pull/991), merged to `develop`)

## Summary

Hardens the WhatsApp webhook, adds START and a marketing-only STOP, fixes the sign-in PIN that was not being delivered, and repairs the regression pack. One release; scope amended by operator-approved option (b), not a `Bundles:` declaration.

- **Webhook authenticity:** without `WHATSAPP_APP_SECRET` the route returns 503 and processes nothing (it used to accept everything). Bad, missing, malformed or wrong-length signatures return 403 without throwing. The verify token, signatures and raw payloads are no longer logged.
- **Idempotency and coverage:** the `IncomingMessage` row is inserted first on the unique `wamid` index (ADR-007), so a duplicate delivery causes no second reply, ticket or consent write. Every `entry[]` and `changes[]` item is processed.
- **Consent:** STOP clears marketing consent only; order and booking messages continue. START restores marketing and records the source `whatsapp_inbound`. Operator approved the marketing-only policy (R-045).
- **Abuse and delivery:** 20 messages per 10 minutes per phone (in memory, per instance, ADR-007); failed replies retry at 1s, 5s and 30s and then raise an incident.
- **PIN delivery (Meta #131008):** `verification_pin` sends the code in both the body and the Copy-code URL button. This was failing on UAT and production.
- **Regression pack:** REQ-097 uses its own fixture item; shared-state critical specs run as chained projects so the critical tier is green at the default worker count; silent self-skips in `cost-snapshot` and `partial-payments` are removed (they hid real test bugs); the staff-pot start-date test waits for hydration (#932 cause confirmed from a CI trace); `csr-uat` and the REQ-115 AC2 test are tagged.
- **CI:** `devaudit update` regenerated the workflows so `e2e_env` carries a test-only `WHATSAPP_APP_SECRET`. DevAudit version unchanged (1.11.0).

## AI contributors

| Tool        | Version    | Commits                                                                           | Date                     |
| ----------- | ---------- | --------------------------------------------------------------------------------- | ------------------------ |
| Claude Code | Sonnet 5.5 | plan, ADR, risk, implementation, test and compliance commits on this REQ's branch | 2026-10-29 to 2026-11-01 |

## Implementation details

- **`app/api/webhooks/whatsapp/route.ts`:** fail-closed secret check, length-checked HMAC, token no longer logged.
- **`lib/whatsapp.ts`:** `sendVerificationPinWhatsApp` sends body and button parameters; `handleWebhook` iterates all entries and changes and logs counts only.
- **`services/whatsapp-inbound-service.ts`:** insert-first dedup, STOP/START (`opt_in` intent), per-phone limiter, `sendWithRetry` with an incident record.
- **Models and interfaces:** `IncomingMessage` intent enum gains `opt_in`; `User.preferences.communicationPreferencesSource` added.
- **Tests and config:** `playwright.config.ts` (chained `critical-aggregate-*` projects), `e2e/helpers/{hydration,whatsapp-webhook}.ts`, three new critical specs, fixes to the specs listed in `test-plan.md`, `sdlc-config.json`, regenerated workflows.
- **Design:** ADR-007. **SRS:** REQ-WA-009 and REQ-WA-010 new; REQ-WA-001, 005, 006 updated. **Risk register:** R-043 to R-046.

## Operator tasks (not code)

1. Done by the operator (2026-11-01): `WHATSAPP_APP_SECRET` set in Railway production and `.env.uat.local`. After each deploy, check that an unsigned POST to `/api/webhooks/whatsapp` returns 403 (503 means the secret is missing on that server).
2. AC10: sign in on UAT with a real number and confirm the PIN arrives, then record the date in evidence (never the PIN).
3. Sign off the SRS, ADR and risk artefacts in `compliance/evidence/REQ-116/`.
4. REQ-115 carry-overs still open: the live `account_recovery` check, the production account IDs (AC13), the R-042 sign-off, and the phone migration run (dry run first).

## Verification

- TypeScript: 0 errors. ESLint: 0 errors (pre-existing warnings only).
- Unit/integration: 1783 passed, 4 skipped (full suite).
- E2E: full `critical` tier at the default worker count: 326 passed, 0 failed, 0 skipped, against an isolated server and disposable MongoDB. PR #991 CI: Quality Gates and in-scope E2E passed. Full `regression` was not run locally; CI runs it.
- Dependency audit: `0 accepted, 0 unresolved`; no dependency changed.
- Full detail: `compliance/evidence/REQ-116/test-execution-summary.md` and `security-summary.md`.
- Not yet done (operator): AC10 live UAT sign-in.

## Sign-off (dual-actor)

This is a HIGH-risk release on a solo-operator team, so the "reviewer ≠ submitter" check is read as actor type, not human identity. The AI tooling that implemented this REQ and the human operator who performs UAT and approves on the portal are distinct actors.

- **Submitter (implementation):** Claude Code (Sonnet 5.5)
- **UAT reviewer / approver:** operator, on the DevAudit portal
- **Operator approvals on record:** plan approval, marketing-only STOP (R-045) and R-043 to R-046 sign-off (2026-10-31); ADR-007 accepted (2026-10-31).
