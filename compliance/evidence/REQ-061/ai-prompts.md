# REQ-061 — AI prompts log

**Date:** 2026-06-02

## Session prompts (user → AI)

1. `plan P2 #12-#15 as REQ-061`
   - AI surveyed existing SettingsService (`isWithinBusinessHours`, `calculateFees`, etc.) + cart-summary's TODO + settings model fields. Discovered most of the infrastructure was already there; surfaced design decisions including the bar-coords source. Presented plan with 6 ACs + STRIDE + rollback.

2. Selected via AskUserQuestion:
   - REQ-061 scope: "Approve as scoped (4-in-1 bundle)"
   - Bar coords source: "Geocode the existing `address: string` via Google Maps"
   - Plan updated to reflect the geocoding choice (new env var, new lib/geo/geocode.ts, lazy-cache pattern).

3. _(AI proceeded with TDD-first implementation. Mid-way through, surfaced a checkpoint with progress + remaining scope. Operator chose "Keep pushing the 4-in-1" via AskUserQuestion.)_

4. `I have set the GOOGLE_MAPS_API_KEY in my .env file`
   - AI acknowledged + reminded that Railway UAT + prod env vars also need to be set before the distance check enforces in deployed environments.

5. `#225 merged` (typo for #255 — confirmed by checking develop's tip)
   - Confirmation that the integration PR landed cleanly with `Release version: REQ-061` step-3 attribution. AI started assembling Phase 3 evidence pack per `feedback_phase3_release_ticket_mandatory`.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-061. The work is service + model + UI + server-action wiring; no e2e author work needed (per the `project_e2e_targeted_until_117` policy + scope justification — unit + manual-UAT boundary covers the surface). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **4-in-1 bundle vs split** — operator approved the 4-in-1 at plan time per `feedback_single_pr_default`. Four tightly-coupled gates at the checkout flow ship as one REQ. Bigger than recent cycles (22 tests, 11 files touched) but kept clean by TDD-first + scope-shrink discovery.

- **Bar coords via Google Maps geocoding** — operator chose the external-API path over admin-manual-entry. Adds env-var dependency + lazy-cache pattern + fail-open posture for the geocode helper. Worth it for: no manual admin work, robust against typos, future-flexible for moves.

- **Customer-side fail-open on AC2** — customer addresses don't have coords in v1 (no map-picker, no address-geocoding-on-save). So the distance check's customer side passes for everyone. AC2's server guard is structural; real enforcement waits on a future REQ. **Honest framing in the PR + security-summary** — better to ship the structure ready-to-enforce than block the bundle on customer geocoding which is a separate concern.

- **Dropped `/api/public/settings/fees` at impl-time** — discovered `/api/settings` already exposed every fee field. Plan-deviation: saved one route + one new auth surface. Cart-summary uses the existing unauthenticated endpoint.

- **Two new public endpoints (`/api/settings/business-hours-status`, `/api/settings/pickup-slots`)** — needed because the client-side components (`<BusinessHoursBanner>`, `OrderDetailsStep` slot picker) need to read server state. Public + unauthenticated because the data is public business config the bar publishes (open hours, available pickup slots).

- **Business-hours guard bypasses dine-in** — customer is physically at the bar; their order can be after-hours. Pickup + delivery still gate.

- **Fallback paths preserved at every fetch boundary** — cart-summary falls back to hardcoded values on fetch fail; pickup slot picker falls back to legacy datetime-local input; business-hours banner renders null on fetch fail. Zero-regression posture.

- **Server-side guards in `createOrderAction`** — mandatory for the STRIDE Tampering mitigation. Client banner + UI disable are hints; server is authoritative. Even with the customer-side fail-open on AC2, the guard structure is ready.

## Audit cross-refs

- Parent backlog: #117 (P2 #12, #13, #14, #15).
- Direct dependencies:
  - Existing `SettingsService` ✅
  - Existing `businessHours` / `deliveryRadius` / `estimatedPreparationTime` / fee fields ✅
  - Existing customer `IAddress.coordinates` (optional) ✅
  - **New env var:** `GOOGLE_MAPS_API_KEY`
- Cycle artefacts: PR #255 (integration), PR #256 (Phase 3 evidence pack — about to open), upcoming release PR develop → main, upcoming close-out PR.
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_wait_for_ci`, `feedback_single_pr_default`, `feedback_pr_title_req_brackets`, `feedback_no_delete_develop_on_release_merge`, `project_e2e_targeted_until_117`, `feedback_phase3_release_ticket_mandatory`.
- Unblocks future work:
  - Customer-address geocoding (would close the AC2 fail-open gap)
  - `geocodedCoordinates` invalidation on admin address change
  - Holiday / special-hours override
  - Pickup slot capacity throttling (`maxOrdersPerHour` wiring)
