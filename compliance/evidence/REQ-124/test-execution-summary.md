# Test Execution Summary — REQ-124

**Date:** 2026-11-22
**Implementation branch:** `feat/REQ-124-order-status-notifications` (merged to `develop` by PR #1068, merge commit `94bfe388`)
**Risk class:** HIGH

CI as of: 44954782886/1 @ 7f7d2d49 (PR #1068; terminal state success). PR #1068 run 44954782886 (Quality Gates) and run 44954782928 (Feature In-Scope E2E) both passed. The `CI Pipeline` run on the merge commit (44995827046) failed in `Register Release`, step "Generate and upload bundled changes": "release ticket for REQ-124 not found; cannot build explicit bundle manifest". That is expected before the release ticket exists; it was not a test failure (Quality Gates was skipped on that run, not failed). It is re-run by the Stage 3 compliance commit (see Release gates below).

## Test design

**Layers planned:** unit, UI end-to-end, transport-layer end-to-end (socket), type-check, lint, production build, dependency and SAST gates (CI).

**Layers covered:** unit ✓ (token, access, socket join, notifier, transitions, serving label, call-site, kitchen card, template contract; 2,247 passed on the last full local run); UI E2E ✓ (`e2e/critical/whatsapp-order-tracking.spec.ts` AC1, AC3, AC7; `e2e/critical/kitchen-serving-check.spec.ts` AC4, AC5; `order-status-broadcast.spec.ts` updated to join with a token; 26 e2e tests passed locally on the isolated stack and in-scope E2E passed on CI); type-check ✓; lint ✓; build ✓.

**Tier placement:** both new specs are in `e2e/critical/` (Must-priority access control and a headline order flow).

**Exemptions:**

- **AC2** (single call site) is a property of the code: proved by `__tests__/actions/order-status-notify-call-site.test.ts`, no UI.
- **AC6** (template submission) is an operator and Meta action: see `template-submissions.md`. UAT copy submitted (PENDING at the last check); production copy cannot be created through the API (`SMB_ACCOUNT_NOT_ON_COEX`) and is being created by the operator in WhatsApp Manager.
- **Confirmed message** is payment-driven, so it is proved by `__tests__/services/order-status-notifier.test.ts`, not by e2e.
- **WhatsApp sends** are off in the e2e stack; the `NotificationLog` rows are the assertion. Real delivery is checked in UAT.
- **Visual regression (`NOT_NEEDED`):** none configured.

**Skill invocation:** `e2e-test-engineer` was invoked in Phase 2 and authored the two specs and `e2e/helpers/order-tracking-seed.ts`; it found the requirements gap resolved as AC7. `requirements-aligner`, `adr-author` and `risk-register-keeper` ran at Stage 1 and Stage 3.

## Gate results

| Gate                | Result  | Details                                                                                                                                              |
| ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit    | PASS    | CI Quality Gates on PR #1068 passed; no dependency was added or changed by this REQ                                                                  |
| SAST (Semgrep)      | PASS    | Not installed locally; ran in CI Quality Gates on PR #1068 and passed                                                                                |
| TypeScript          | PASS    | `npx tsc --noEmit`: 0 errors in this REQ's files                                                                                                    |
| ESLint              | PASS    | 0 errors; pre-existing warnings only                                                                                                                 |
| Production build    | PASS    | `npm run build` completed                                                                                                                           |
| Unit + integration  | PASS    | Full suite: 2,247 passed                                                                                                                             |
| E2E new and updated | PASS    | 26 e2e tests passed locally (isolated `mongo:7` stack, production-mode `server.ts`, WhatsApp off); CI in-scope E2E on PR #1068 passed (7m 1s)      |
| E2E `critical` tier | PASS  | Not run in full locally; the in-scope run passed on CI. The release-PR gate is the full check                                                         |

## UI regression sweep

Strings and routes changed by the diff: the order page `/orders/[orderId]` (and `/cancel`, `/review`) now return 404 without owner or token; the kitchen card no longer shows the customer name, phone or email; order cards and the queue gained a serving label and delivery steps. `e2e/critical/order-status-broadcast.spec.ts` was updated to join the room with a token. Other specs that open `/orders/<id>` were searched and use the seeded owner or token.

## Test executions

<!-- generated-by: render-test-executions.sh journey-at 2026-11-22T08:29:30Z -->
| Source Release | SDLC Stage | Execution | Suite | Outcome | Workflow / Run | Related Evidence | Incident / Remediation | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-124 | 2 implement_test | #1 | e2e | passed | [Feature In-Scope E2E](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/44954782928) (run 44954782928, attempt 1) | None | None | 2026-11-21 22:43:02 |

**Final assessment:** Stage-scoped execution numbering is authoritative from first-class portal test execution records.

### Local executions (Stage 2)

| Source  | SDLC stage       | Execution | Kind                    | Outcome | Run                                    |
| ------- | ---------------- | --------- | ----------------------- | ------- | -------------------------------------- |
| REQ-124 | 2 implement/test | local #1  | unit                    | passed  | Local Vitest, full suite: 2,247 passed |
| REQ-124 | 2 implement/test | local #2  | e2e (new and updated)   | passed  | 26 of 26                               |

## E2E failures & triage

| Spec / check                                            | Source        | Classification | Evidence                                                                                                                              | Disposition | Reference |
| ------------------------------------------------------- | ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------- |
| Order page returned 404 for a signed-in owner           | local e2e     | app defect     | A populated `userId` was compared as an object, not a string; fixed with `idString` in `lib/order-access.ts` and unit-tested        | Fix         | #1068     |
| Serving name came from the wrong field                  | local e2e     | app defect     | Account name precedence corrected in `lib/serving-info.ts`                                                                           | Fix         | #1068     |
| Parallel specs shared a bell and a status counter       | local e2e     | test bug       | Specs seeded isolated orders; passes with CI's one worker                                                                             | Fix         | #1068     |

**Final assessment:** every REQ-124 acceptance criterion is proved by passing tests (AC2 at unit level, AC6 as operator evidence). The two new e2e specs and the unit suite pass locally and on CI. The release-PR E2E gate and the UAT live round-trip are still to come; UAT needs `order_status_update_v2` APPROVED on UAT (PENDING at the last check, 2026-11-22), and production switch-on needs the production copy (operator, WhatsApp Manager).
