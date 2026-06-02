# REQ-061 — Test execution summary

**Date:** 2026-06-02
**Branch:** `feat/REQ-061-checkout-operational-gates` (merged to develop as PR #255, commit `023abb3`)

## Gate results

### `npx tsc --noEmit`

Exit 0. Clean.

### `npx vitest run __tests__/lib/geo/`

```
 ✓ __tests__/lib/geo/haversine.test.ts (3 tests)
 ✓ __tests__/lib/geo/geocode.test.ts (4 tests)

 Test Files  2 passed (2)
      Tests  7 passed (7)
```

Cases:

**`haversineKm` (3):**

- Returns 0 km for same point
- Returns ~111 km for 1° latitude difference at the equator
- Returns ~10 km for two known Lagos-area points

**`geocodeAddress` (4):**

- Returns null when `GOOGLE_MAPS_API_KEY` is missing (no fetch call)
- Returns `{ lat, lng }` on successful Google Maps response
- Returns null when Google responds with `ZERO_RESULTS` (logs warning)
- Returns null on network failure (logs error)

### `npx vitest run __tests__/services/settings-service.gates.test.ts`

```
 ✓ __tests__/services/settings-service.gates.test.ts (15 tests)

 Test Files  1 passed (1)
      Tests  15 passed (15)
```

Cases:

**`getNextOpenSlot` (4):**

- Open right now → today + closing-time message
- Closed earlier today, opens later → today + open-at message (09:00)
- Today fully closed → tomorrow open
- Closed all week → returns null + "closed" message

**`getBarCoordinates` (3):**

- Returns cached `geocodedCoordinates` when set (no geocode call)
- Lazy-geocodes via Google Maps + persists via `settings.save()` when missing
- Returns null when geocoding fails

**`checkDeliveryDistance` (4):**

- Within radius (same point, 0 km, radius 10) → `withinRadius: true, distanceKm: 0`
- Outside radius (1° lat away ≈ 111 km, radius 10) → `withinRadius: false`
- Bar coords missing (geocoding fails) → fail-open `withinRadius: true, distanceKm: null`
- Customer coords undefined → fail-open `withinRadius: true, distanceKm: null`

**`getPickupSlots` (4):**

- Open day → 15-min interval slots starting after prep time (label "Today at HH:MM")
- Closed today → rolls over to tomorrow (label "Tomorrow at HH:MM")
- All slots in the past today → rolls over to tomorrow
- Closed today AND tomorrow → returns `[]`

### `npx vitest run` (full)

```
 Test Files  102 passed | 1 skipped (103)
      Tests  1036 passed | 4 skipped (1040)
   Duration  4.58s
```

Up from 1014 / 4 skip (REQ-060 baseline) → **+22 new REQ-061 cases**. 0 failures.

### `npx eslint <changed>`

```
(0 errors, 0 warnings after fixing two `react/no-unescaped-entities` apostrophes)
```

0 errors on REQ-061 code. Two apostrophe escapes added during the gate sweep (`We're` → `We&apos;re`).

### `semgrep scan --severity=ERROR <REQ-061 files>`

```
Ran rules on N files: 0 findings.
```

Clean.

### `npm audit --audit-level=high`

```
high: 0  critical: 0
```

Unchanged from REQ-060 baseline.

## E2E execution

n/a — REQ-061's surface is multi-component checkout-flow change. The unit boundary at 22 cases is the load-bearing gate. Manual UAT verification on `/checkout` covers the visible surface (banner renders when bar is closed; pickup slot picker shows slots; cart-summary shows live fees; address step shows distance warning when outside radius — though distance check fails open in v1 because customer addresses don't have coords). Honours `project_e2e_targeted_until_117` policy.

## CI on develop after PR #255 merge

Run [26818359553](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26818359553) — all 3 jobs (Register Release / Quality Gates / Upload Evidence) PASS; `Release version: REQ-061` clean step-3 attribution via the `[REQ-061]` bracket in PR #255's merge-commit body.

Compliance Evidence Upload run [26818359639](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26818359639) also succeeded.

## Summary

- Unit gate: PASS (1036 / 0 / 4 skipped — +22 from REQ-060 baseline).
- Type gate: PASS.
- Lint gate: PASS (0 errors, 0 new warnings).
- Static-analysis gate: PASS (semgrep 0 findings).
- Dependency-audit gate: PASS (no new high/critical; no new packages).
- E2E gate: n/a (scope-justified + policy-justified).
- Release attribution: PASS — `Release version: REQ-061` clean.
