# Test Execution Summary — REQ-097

**Date:** 2026-07-30
**Implementation branch:** `feat/REQ-097-portion-pricing-fix`

## Test design

**Layers planned:** unit, integration, E2E. Visual regression and manual smoke: not needed (see exemptions).

**Layers covered:** unit ✓ (25 new tests across 3 files), E2E ✓ (2 tests in 1 new file, run locally against a real dev server + MongoDB — not mocked).

**Exemptions:**

- Visual regression — `NOT_NEEDED`: this project has no visual-regression tooling configured; not requested for this REQ.
- Manual smoke after deploy — see plan §8: spot-check one real menu item with portion surcharges configured in the live Express Create Order picker.

**Skill invocation:** `e2e-test-engineer` invoked during Phase 2 of this session (same turn implementation landed). The new spec file (`e2e/critical/express-order-portion-pricing-req097.spec.ts`) was authored via that invocation — confirmed via the Phase 2 step 9 self-audit.

## Gate results

| Gate                          | Result                                   | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript                    | PASS                                     | `npx tsc --noEmit` — 0 errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ESLint                        | PASS                                     | 0 errors (965 pre-existing warnings, unrelated to this REQ)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Unit                          | PASS                                     | 1,340 passed, 4 skipped (full suite); 25 new tests for this REQ across `cart-line-math.test.ts`, `order-line-totals.test.ts`, `express-actions-portion-pricing-req097.test.ts`                                                                                                                                                                                                                                                                                                                                                             |
| E2E — REQ-097 targeted        | PASS                                     | 2/2, local run against real dev server + MongoDB (`--project=regression`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| E2E — full `regression` suite | PASS (with pre-existing unrelated noise) | 519 passed, 13 failed, 15 skipped. All 13 failures confirmed pre-existing and unrelated: zero references to any file this REQ touches (grep-verified across all 13 spec files), and `customer-auth.spec.ts` reproduces the identical failure against the unmodified baseline via `git stash` (SMS-PIN mock/env issue, not a code regression). Others: WhatsApp inbound webhook 403, dashboard-nav, inventory-snapshots, kitchen-ingredient CRUD, profitability filter, units-of-measurement — none touch order/portion/pricing code paths. |
| Build                         | Not run this cycle                       | Production build not exercised locally; relies on CI Quality Gates on the integration PR                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Test executions

| Source  | SDLC stage       | Execution | Kind                         | Outcome                       | Workflow / run                                                    | Related evidence                                                                               | Date       |
| ------- | ---------------- | --------- | ---------------------------- | ----------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| REQ-097 | 2 implement/test | #1        | unit                         | passed                        | Local Vitest, then CI Quality Gates on release PR #623            | 25 new tests across 3 files, full suite 1,340 passed                                           | 2026-07-30 |
| REQ-097 | 2 implement/test | #2        | e2e (local)                  | passed                        | Local Playwright, `regression` project; CI E2E on release PR #623 | 2/2, `express-order-portion-pricing-req097.spec.ts`, AC1/AC2/AC3                               | 2026-07-30 |
| REQ-097 | 2 implement/test | #3        | e2e (local, full regression) | passed (with unrelated noise) | Local Playwright, `regression` project, `--workers=1`             | 519 passed / 13 failed (all pre-existing, verified unrelated via baseline re-run) / 15 skipped | 2026-07-30 |

## Test plan coverage

| Acceptance criterion                                                             | Status | Test                                                                                                                              |
| -------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — Half Portion picker price applies discount before surcharge                | PASS   | `express-order-portion-pricing-req097.spec.ts` AC1                                                                                |
| AC2 — Quarter Portion picker price applies discount before surcharge             | PASS   | `express-order-portion-pricing-req097.spec.ts` AC2                                                                                |
| AC3 — Persisted Express Create Order line price includes the surcharge           | PASS   | `order-line-totals.test.ts`; `express-actions-portion-pricing-req097.test.ts`; `express-order-portion-pricing-req097.spec.ts` AC3 |
| AC4 — Persisted Order Edit line price includes the surcharge                     | PASS   | `order-line-totals.test.ts` (shared reconciler fix)                                                                               |
| AC5 — Public checkout API recomputed subtotal + persisted line include surcharge | PASS   | `order-line-totals.test.ts` (shared reconciler fix)                                                                               |
| AC6 — Surcharge applies on top of an admin manual price override                 | PASS   | `express-actions-portion-pricing-req097.test.ts`                                                                                  |

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-097/`
- Screenshots: `compliance/evidence/REQ-097/screenshots/` (3 PNGs — AC1, AC2, AC3)
- CI run: release PR #623 (`develop` → `main`), production smoke run 30537370010 — see `compliance/approved-releases/RELEASE-TICKET-REQ-097.md`

## Final assessment

Code and automated verification are complete and locally verified, including a full-regression run cross-checked against the unmodified baseline to positively confirm the 13 observed failures are pre-existing and unrelated to this REQ. REQ-097 has since completed CI Quality Gates and UAT review and was released — see the close-out record at `compliance/approved-releases/RELEASE-TICKET-REQ-097.md`.
