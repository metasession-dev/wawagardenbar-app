# Security summary — REQ-088

## Requirement

REQ-088 — Invariant E2E test class + silent-path alarm layer

## Risk class

HIGH (AI-involved → raised one level from MEDIUM)

## Changes

1. **IncidentEventModel** — extended `IncidentEventKind` union with 4 new kinds: `points_award_failed`, `notification_delivery_failed`, `reward_grant_failed`, `webhook_replay_mismatch`
2. **IncidentEventService** — added `getUnresolvedSummary()` method for daily admin summary
3. **Catch site refactoring** — replaced `console.error` with `IncidentEventService.recordIncident` in:
   - `services/order-service.ts` (cancel reversal, complete order)
   - `app/api/webhooks/monnify/route.ts` (reward grant)
   - `app/api/webhooks/paystack/route.ts` (reward grant)
   - `services/notification-log-service.ts` (record/update)
4. **Daily incident summary cron** — `runDailyIncidentSummaryJob` in `lib/scheduled-jobs.ts`
5. **8 E2E invariant specs** under `e2e/invariants/` with shared helpers

## Threat model

| Threat                                               | Likelihood | Impact | Mitigation                                                                                      |
| ---------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------- |
| IncidentEvent flood from recurring failures          | Medium     | Medium | `dedupRecent` guards against duplicates within 24h window per kind+entityId                     |
| Daily summary cron sends to wrong admin              | Low        | High   | Cron queries `UserModel` for `role: { $in: ['admin', 'super-admin'] }` — same RBAC as dashboard |
| New IncidentEvent kinds injected via untrusted input | Low        | Medium | Kinds are TypeScript union type + Mongoose enum — rejected at schema validation                 |
| Invariant E2E specs mutate UAT data                  | Medium     | Low    | Each spec uses seed/cleanup pattern (seed → test → restore)                                     |

## Secrets / credentials

No new secrets. Daily summary cron reuses existing `NotificationService.send` path with existing WhatsApp/email credentials.

## Dependencies introduced

None.

## Risk register entries

- **RISK-009** — IncidentEvent flood from recurring failures — OPEN. `dedupRecent` mitigates within 24h windows.
- **RISK-010** — Invariant E2E specs leave UAT in dirty state — MITIGATED. Each spec uses afterEach cleanup.

## Data protection (GDPR Art. 25)

- **Personal data processed:** Yes — incident summaries sent via WhatsApp/email to admins may contain order numbers and customer email addresses
- **Lawful basis:** Art. 6(1)(f) — legitimate interest (operational monitoring)
- **Data minimisation:** errorDetails captures only error message + entity ID; no customer PII beyond what's already in the Order document
- **Retention:** IncidentEvent rows retained indefinitely (operational need); future REQ can add TTL

## AI / model considerations (EU AI Act Art. 11)

N/A — no AI behaviour introduced or changed.

## Gate results

| Gate                                  | Result                                   |
| ------------------------------------- | ---------------------------------------- |
| `npx tsc --noEmit`                    | PASS (0 errors)                          |
| `npx vitest run`                      | PASS (21 tests)                          |
| `npx playwright test e2e/invariants/` | PASS (11 specs)                          |
| CI Quality Gates                      | PASS (PR #437, run 28359562162)          |
| CI Run in-scope E2E                   | PASS (PR #437, run 28359562173)          |
| semgrep scan                          | PASS (CI, 0 new findings above baseline) |
| npm audit                             | PASS (CI, 0 high/critical)               |

## UAT verification

- **UAT URL:** https://wawagardenbar-app-uat.up.railway.app
- **Status:** Pending Railway auto-deploy from `develop`
- **Smoke test:** To be verified after deploy

## Rollback plan

git revert — all changes are code-level (no migrations, no schema changes to existing collections). New IncidentEvent kinds are additive enum values.
