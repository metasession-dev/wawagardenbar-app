# Test Execution Summary — REQ-111

**Date:** 2026-10-20
**Implementation branch:** `feat/REQ-111-whatsapp-account-recovery-routing`

## Test design

**Layers planned:** Unit + E2E, per MEDIUM-risk depth (`Test_Policy.md`).

**Layers covered:** Unit ✓ (new `detectAccountRecoverySignal` suite + routing-matrix cases in two existing files). E2E ✓ (1 new regression-tier transport-layer spec, run locally against a disposable MongoDB container). Visual regression — `NOT_NEEDED`: no UI surface is touched by this REQ (pure service/model/webhook-handler logic).

**Exemptions:**

- Visual regression — `NOT_NEEDED`: no UI-facing files in this REQ's diff.
- Manual smoke after deploy — `NOT_NEEDED` for this REQ alone: the `account_recovery` template isn't approved by Meta yet (tracked separately in #933 Section C), so there is no live-send path to smoke-test until that lands.

**Skill invocation:** `e2e-test-engineer` invoked during this REQ's Phase 2 to author `e2e/whatsapp-inbound-registration-templates.spec.ts`, covering AC1 and AC4 (AC2/AC3 covered at the unit level — see Test plan coverage below for rationale).

## Gate results

| Gate                                                     | Result       | Details                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                                               | PASS         | `npx tsc --noEmit` — 0 errors                                                                                                                                                                                                                                                      |
| ESLint                                                   | PASS         | 0 errors; pre-existing `no-console` warnings unchanged baseline                                                                                                                                                                                                                    |
| Unit — full suite                                        | PASS         | 1512 passed, 4 skipped (170 files) — `npx vitest run`                                                                                                                                                                                                                              |
| Unit — REQ-111 targeted                                  | PASS         | `__tests__/services/whatsapp-inbound-service.classify.test.ts` (20 tests, incl. new `detectAccountRecoverySignal` suite), `__tests__/services/whatsapp-inbound-service.routing.test.ts` (17 tests, incl. new `account_recovery routing` suite) — 37 tests total in these two files |
| Unit — coverage (`services/whatsapp-inbound-service.ts`) | PASS         | 93.96% statements, 71.42% branches, 100% functions, 94.23% lines — `npx vitest run --coverage`                                                                                                                                                                                     |
| E2E — REQ-111 targeted                                   | PASS         | `e2e/whatsapp-inbound-registration-templates.spec.ts` AC1 + AC4 — 2/2 passed locally (disposable Mongo container + isolated dev-server worktree, `--project=regression`)                                                                                                           |
| E2E — adjacent regression check                          | PASS         | Ran alongside `e2e/support-ticket-whatsapp-inbound.spec.ts` — 5 passed, 1 skipped (pre-existing: that spec needs `E2E_CSR_*` creds not configured in this throwaway verification env; unrelated to REQ-111)                                                                        |
| npm audit --audit-level=high                             | PRE-EXISTING | No new dependencies introduced by this REQ (`package.json`/`package-lock.json` untouched)                                                                                                                                                                                          |

## Test executions

| Source  | SDLC stage       | Execution | Kind         | Outcome                | Workflow / run                                                                                                                  | Related evidence                                                                                                              | Date       |
| ------- | ---------------- | --------- | ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------- |
| REQ-111 | 2 implement/test | #1        | unit (local) | passed                 | `npx vitest run`                                                                                                                | `__tests__/services/whatsapp-inbound-service.classify.test.ts`, `__tests__/services/whatsapp-inbound-service.routing.test.ts` | 2026-10-20 |
| REQ-111 | 2 implement/test | #2        | e2e (local)  | passed (after one fix) | Detached git worktree + isolated dev server against a disposable `mongo:7` container (`wwg-e2e-mongo`), via `e2e-test-engineer` | `e2e/whatsapp-inbound-registration-templates.spec.ts` AC1, AC4 — see note below                                               | 2026-10-20 |
| REQ-111 | 2 implement/test | #3        | e2e (local)  | passed                 | Re-run of execution #2, including the sibling `e2e/support-ticket-whatsapp-inbound.spec.ts`, after the actionTaken fix          | 5 passed, 1 skipped (unrelated — missing test credentials in the throwaway env)                                               | 2026-10-20 |

**Execution #2 note:** the first attempt at AC1 failed (`actionTaken` was `send_failed` instead of `sent_account_recovery`) — not a test-authoring bug, a real implementation bug. `WhatsAppService.sendMessage()`'s `success` flag is always `false` when `ENABLE_WHATSAPP_NOTIFICATIONS` is disabled (`SERVICE_DISABLED`), so gating `actionTaken` on that flag meant the "attempted send" signal could never read `sent_account_recovery` in any test/CI environment. Fixed in `services/whatsapp-inbound-service.ts` to match the existing `welcome_new_user`/`welcome_back` branches' convention (attempted = call didn't throw, not "Meta confirmed delivery") before the second, passing run. See `compliance/evidence/REQ-111/e2e-scope-decision.md` for the full account, including why the sandbox needed a disposable MongoDB container in the first place.

## Test plan coverage

| Acceptance criterion                                                                                             | Status | Test                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — phone-mismatch via email → `account_recovery` sent, `classifiedState: 'phone_mismatch'`, `userId` resolves | PASS   | `e2e/whatsapp-inbound-registration-templates.spec.ts` (e2e) + `whatsapp-inbound-service.classify.test.ts` / `.routing.test.ts` (unit) |
| AC2 — phone-mismatch via order number (`WG` + 10 digits)                                                         | PASS   | `whatsapp-inbound-service.classify.test.ts` (unit) — not duplicated at e2e, same code path as AC1 past the detector                   |
| AC3 — resolved match with the _same_ phone as sender → not a mismatch, falls through to ordinary `new` handling  | PASS   | `whatsapp-inbound-service.classify.test.ts` + `.routing.test.ts` (unit)                                                               |
| AC4 — brand-new phone, no identifying signal → unchanged `new`/`welcome_new_user` (regression)                   | PASS   | `e2e/whatsapp-inbound-registration-templates.spec.ts` (e2e)                                                                           |

## E2E failures & triage

| Spec / check                                                                            | Source | Classification                                                                                                                        | Evidence                                                                                                                                                                                                                                                                                                                                            | Disposition                                                                                                                  | Reference                                                                                                                                                        |
| --------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/whatsapp-inbound-registration-templates.spec.ts` AC1 (execution #2, first attempt) | local  | Application defect — `actionTaken` gated on `WhatsAppService.sendMessage()`'s `success` flag, always `false` under `SERVICE_DISABLED` | Test failure: `Expected: "sent_account_recovery" Received: "send_failed"`; root cause confirmed by reading `NotificationService.send()`'s contract (resolves `success: false` rather than throwing, same as `sendMessage`) and comparing against the existing `welcome_new_user`/`welcome_back` branches, which never check the return value at all | Fix — corrected in `services/whatsapp-inbound-service.ts` in the same local verification cycle, before commit; re-run passed | [#933](https://github.com/metasession-dev/wawagardenbar-app/issues/933), commit [`6a74ed6`](https://github.com/metasession-dev/wawagardenbar-app/commit/6a74ed6) |

## Accepted skips

None.

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-111/`
- Screenshots: N/A — transport-layer spec, no UI surface (`e2e-scope-decision.md`).
- CI run: pending — this run's local verification is the authoritative pre-PR evidence; CI on the integration PR will re-confirm.
