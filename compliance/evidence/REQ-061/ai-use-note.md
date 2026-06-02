# REQ-061 — AI use note

**Date:** 2026-06-02
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- **Pre-implementation survey** — discovered that `SettingsService` already had `getSettings`, `calculateFees`, `getDeliveryFee`, `isWithinBusinessHours`, `getBusinessHoursForDay`, `canAcceptOrders`. The admin already configures `businessHours` / `deliveryRadius` / `estimatedPreparationTime` / fees in `SystemSettings`; the customer-side checkout flow was the gap. Scope-shrunk from "build new gates from scratch" to "wire the existing helpers + add three new helpers + lazy-geocode the bar's address".
- **Authored** `compliance/plans/REQ-061/implementation-plan.md` with 6 ACs, technical approach with diffs, STRIDE table, threat model (gate-bypass + external API surfaces), rollback. MEDIUM risk → presented for plan approval per `feedback_sdlc_impl_plan_review`.
- **Operator chose two design points at plan-approval:** (a) approved the 4-in-1 bundle; (b) bar-address geocoding via Google Maps Geocoding API rather than admin manually entering lat/lng. The geocoding choice added an env var (`GOOGLE_MAPS_API_KEY`), a new `lib/geo/geocode.ts` helper, and a lazy-cache pattern (`getBarCoordinates`) — non-trivial scope addition that I noted in the plan-deviation log.
- **TDD red baselines** — wrote 22 tests across 3 files BEFORE production code: 3 haversine, 4 geocode, 15 SettingsService gates. Pure-function tests for haversine were the easiest start; geocode tests mocked `global.fetch` per test; SettingsService tests used `vi.useFakeTimers()` + `vi.setSystemTime()` for time-dependent logic and `mockGeocodeAddress` for the geocoding boundary.
- **Implementation order**: lib/geo (pure helpers) → settings model field → SettingsService methods → API routes → UI components (cart-summary, BusinessHoursBanner, order-details-step) → server-side guards in `createOrderAction`. Each step verified with a focused vitest run.
- **One plan deviation at impl-time** — the planned new `/api/public/settings/fees` endpoint was dropped because `/api/settings` already exposes every fee field. Logged in plan deviation. Saved one route + one new auth surface.
- **Gates** — full vitest 1036 / 4 skip / 0 fail (+22 from REQ-060 baseline of 1014); tsc 0 errors; eslint 0 errors (2 apostrophe escapes added during the gate sweep); semgrep ERROR-severity 0 findings; npm audit 0 high/critical.
- **Commit + push + PR #255** — `feat(checkout,settings): operational gates — business hours, distance, slots, real fees [REQ-061]`. Commit message documented the four ACs + the plan deviation + the v1 fail-open posture on customer-address coords.
- **Operator set `GOOGLE_MAPS_API_KEY` in `.env`** — I reminded them to also set it in Railway UAT + prod env vars before customers hit the distance check; without it, the guard fails open (no breakage, no enforcement either).
- **Phase 3 evidence pack assembled BEFORE the release PR** per `feedback_phase3_release_ticket_mandatory` — fifth consecutive cycle applying this lesson (REQ-057 → REQ-058 → REQ-059 → REQ-060 → REQ-061).
- **Updated** `compliance/RTM.md` with the REQ-061 row.

## What the human did

- Picked the P2 #12–#15 bundle for REQ-061 after my recommendation (four operational gates, tightly coupled at the checkout flow).
- Approved the plan + selected the geocoding-via-Google-Maps design choice at plan-time (introduces the `GOOGLE_MAPS_API_KEY` dependency).
- Checkpointed me at the half-way mark when I surfaced the remaining scope; chose to push through the 4-in-1 rather than split.
- Set `GOOGLE_MAPS_API_KEY` in `.env`; will need to also set it in Railway UAT + prod.
- Merged the integration PR #255.
- Will perform Phase 4 portal UAT approval + Phase 5 Production approval.

## Risk-tier compliance

- MEDIUM risk → plan approval offered + granted before any code was written (matches `feedback_sdlc_impl_plan_review`).
- Tests written before implementation per `feedback_tests_before_push` (22 red cases confirmed locally before commit).
- All gates run locally before push per `feedback_wait_for_ci`.
- Single bundled PR per `feedback_single_pr_default` (production + RTM + plan + tests in PR #255; evidence pack in PR #256 per Phase 3 sequencing).
- E2E policy honoured per `project_e2e_targeted_until_117` — no full regression dispatched; unit + manual-UAT boundary is load-bearing.
- Phase 3 evidence pack lands BEFORE release PR per `feedback_phase3_release_ticket_mandatory`.
- No `--no-verify`. PR titles use `[REQ-XXX]` brackets per `feedback_pr_title_req_brackets`.

## Cycle hygiene — fifth consecutive clean cycle

REQ-057 → REQ-058 → REQ-059 → REQ-060 → REQ-061 streak:

- Phase 3 BEFORE release PR — applied every time.
- Clean `[REQ-XXX]` step-3 attribution — zero re-attribution PRs needed.
- No CVE blocks.
- No commit-msg case violations.
- Mongoose `validateSync()` gotcha (REQ-057) hasn't recurred.

Notable change this cycle vs the previous four: REQ-061 is the biggest by far (22 tests, 5 ACs collapsed to 4 here, 11 files touched, new external API integration). Manageable but qualitatively different from the small-and-focused REQs that preceded it. The clean cycle streak holds because:

- Plan-approval before coding kept design crisp
- TDD-first made the test boundary clear ahead of the wire-up
- The scope-shrink discovery (mostly wire-up, not new logic) kept LOC count down
- Phase 3 BEFORE release PR is now muscle memory

## Decision points worth recording

- **Customer-side fail-open on distance check** — the right v1 posture given no customer-address geocoding. AC2's server guard is structural; it'll enforce when a future REQ adds map-picker or address-geocode-on-save. Honest framing in the PR body + security-summary.
- **Pickup-slot fallback to legacy datetime-local** — keeps a path open for customers if the /api/settings/pickup-slots fetch fails or returns empty (closed today + tomorrow edge case).
- **Cart-summary fallback to prior hardcoded values** — preserves prior UX exactly if /api/settings is unreachable. No regression.
- **Dropped the new `/api/public/settings/fees` endpoint at impl-time** — discovered `/api/settings` already had everything needed. Plan-deviation logged. Saves one route + one new auth surface.
- **Business-hours guard bypasses dine-in** — customer is physically at the bar; their order can be after-hours (e.g. a late dine-in order placed at 21:55 for an open kitchen at 22:00). Pickup + delivery still gate.
- **Lazy geocoding cache on settings doc** — geocodes the bar's address once per address change (essentially once per Railway env per deploy). Google free tier (40k/month) covers this trivially. If admin updates the address, the cache stays stale until manually cleared — acceptable for v1, future REQ can hook updateSettings invalidation.
