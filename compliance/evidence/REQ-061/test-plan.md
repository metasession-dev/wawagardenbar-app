# REQ-061 — Test plan

**Requirement ID:** REQ-061
**Risk:** MEDIUM
**Related issue:** [#117 P2 #12–#15](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-02

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                  | Test                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Business-hours gate: `getNextOpenSlot` returns next open boundary; banner + CTA renders on closed; server-side guard rejects pickup/delivery outside hours | `__tests__/services/settings-service.gates.test.ts` — 4 cases (open now, opens later today, today closed → tomorrow, closed all week → null). Server guard in `createOrderAction` inspected via diff.                   |
| AC2 | Max delivery distance: lazy bar-side geocoding; haversine math; fail-open posture; server-side guard                                                       | `__tests__/lib/geo/haversine.test.ts` (3 cases) + `__tests__/lib/geo/geocode.test.ts` (4 cases) + `__tests__/services/settings-service.gates.test.ts` `getBarCoordinates` (3 cases) + `checkDeliveryDistance` (4 cases) |
| AC3 | Pickup slot picker: 15-min intervals, prep-time floor, tomorrow rollover                                                                                   | `__tests__/services/settings-service.gates.test.ts` `getPickupSlots` — 4 cases                                                                                                                                          |
| AC4 | Real-time fee calculation: cart-summary fetches from `/api/settings`; fallback to prior hardcoded values on failure                                        | Manual UAT inspection. The fetch + fallback structure is straightforward and the fallback values match production.                                                                                                      |
| AC5 | All-passing tests + no regression                                                                                                                          | Full vitest suite — 1036 pass / 4 skip / 0 fail                                                                                                                                                                         |
| AC6 | Backwards-compat fail-open posture preserved across all gates                                                                                              | Tests for AC2 explicitly cover fail-open paths (bar coords missing, customer coords missing, geocoding fails)                                                                                                           |

## Test environment

- **Unit**: vitest 4.1.x. `@/lib/mongodb` mocked at boundary; `@/models/settings-model` mocked with `findOne` stub; `@/lib/geo/geocode` mocked inside the SettingsService tests; `global.fetch` mocked in the geocode unit tests. `vi.useFakeTimers()` + `vi.setSystemTime()` for the time-dependent tests.
- **No component test** — server-component + react-hook-form integration testing is non-trivial; manual UAT covers the visible surface.
- **No integration test on `createOrderAction`** — file doesn't have a test scaffold; adding one would balloon scope.
- **No E2E** — checkout flow customer-facing; unit + manual-UAT boundary is load-bearing. Honours `project_e2e_targeted_until_117` policy.

## Quality gates

| Gate                                                               | Expected                                           | Actual (2026-06-02)                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                                                 | exit 0                                             | exit 0                                                                                                                                                                                                                         |
| `npx vitest run` (full)                                            | 0 failures                                         | 1036 pass / 4 skip / 0 fail                                                                                                                                                                                                    |
| `npx vitest run __tests__/lib/geo/`                                | 7 pass                                             | 7 pass                                                                                                                                                                                                                         |
| `npx vitest run __tests__/services/settings-service.gates.test.ts` | 15 pass                                            | 15 pass                                                                                                                                                                                                                        |
| `npx eslint <changed>`                                             | 0 errors                                           | 0 errors                                                                                                                                                                                                                       |
| `semgrep scan --severity=ERROR <changed>`                          | 0 findings                                         | 0 findings on all files                                                                                                                                                                                                        |
| `npm audit --audit-level=high`                                     | 0 high/critical                                    | 0 high / 0 critical                                                                                                                                                                                                            |
| Develop CI Pipeline (post-merge)                                   | All 3 jobs PASS, attributed to `--release REQ-061` | run [26818359553](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26818359553) — `Release version: REQ-061` clean step-3 attribution; Quality Gates + Upload Evidence + Compliance Evidence Upload all green |

## Test data

- Time-based tests use `vi.setSystemTime(new Date('2026-06-01T14:00:00'))` (Monday 14:00 — within default 09:00-22:00 hours) for the "open now" path; flip to 06:00 / 23:00 for the "closed today" paths.
- Synthetic business-hours via `defaultBusinessHours()` factory: every day open 09:00-22:00, `closed: false`. Tests override per-day for negative cases.
- Synthetic settings via `makeSettings()` factory: address, businessHours, deliveryRadius, estimatedPreparationTime; `geocodedCoordinates` undefined by default.
- Synthetic geocode responses via `vi.fn().mockResolvedValue({ ok: true, json: () => ... })`.
- Synthetic E11000-style errors not needed (no DB writes in this REQ that would race).

## Sequencing

1. Unit gate runs locally + on CI per push.
2. E2E not dispatched — `project_e2e_targeted_until_117` policy + scope justification.
3. Phase 3 evidence pack (this bundle) lands on develop BEFORE the release PR per `feedback_phase3_release_ticket_mandatory` — fifth consecutive cycle applying this lesson.
4. Release PR `develop → main` aggregates the CI evidence under `REQ-061`.

## Rollback signal

The four checkout gates disappear; customers can order at 4am to anywhere; pickup is free-text again; cart-summary shows hardcoded fees again. The `geocodedCoordinates` field persists in Mongo (orphaned, harmless). The new env var `GOOGLE_MAPS_API_KEY` becomes unused (harmless to leave set in Railway).
