# REQ-061 — Test scope

**Requirement:** Checkout operational gates — business hours + delivery distance + pickup slot picker + real-time fees (#117 P2 #12–#15).

## In scope

- **Unit (haversine, pure function)** — `__tests__/lib/geo/haversine.test.ts` (3 cases) — same-point returns 0; 1° latitude difference ≈ 111 km; known Lagos-area pair ≈ 9 km.
- **Unit (geocode, Google Maps wrapper)** — `__tests__/lib/geo/geocode.test.ts` (4 cases) — missing `GOOGLE_MAPS_API_KEY` returns null without calling fetch; OK response returns `{ lat, lng }`; `ZERO_RESULTS` returns null with `console.warn`; network failure returns null with `console.error`.
- **Unit (SettingsService gates)** — `__tests__/services/settings-service.gates.test.ts` (15 cases):
  - `getNextOpenSlot` — open now (4 cases: open today, closed earlier today, closed all day with tomorrow open, closed all week).
  - `getBarCoordinates` — cached value, lazy-geocode + persist, fail when geocoding fails (3 cases).
  - `checkDeliveryDistance` — within radius, outside radius, bar coords missing → fail-open, customer coords missing → fail-open (4 cases).
  - `getPickupSlots` — open day generates intervals, closed today rolls to tomorrow, all-slots-past rolls to tomorrow, both today + tomorrow closed → `[]` (4 cases).
- **Regression** — full vitest suite confirms no impact on existing tests.
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --severity=ERROR`, `npm audit --audit-level=high`.

## Out of scope

- **Component tests** for `<BusinessHoursBanner>` and `<OrderDetailsStep>` slot picker swap — server-component + react-hook-form integration testing is non-trivial; manual UAT covers the surface.
- **Integration test on `createOrderAction`** — the existing `app/actions/order/order-actions.ts` doesn't have a unit-test scaffold; adding one is out-of-scope and would balloon the REQ. The server-side guards are inspected by reading the diff at lines 67-90.
- **End-to-end pickup-slot booking** — would exercise the full checkout flow; per `project_e2e_targeted_until_117`, deferred to manual UAT + post-#117 regression.
- **Customer-address geocoding** — the spec calls customer coords as "optional"; the bar-side geocoding lands but customer-side stays fail-open until a future REQ adds map-picker or address-geocode-on-save. The structure is in place (the action accepts `customerLat`/`customerLng`).
- **Customer admin UI for `geocodedCoordinates`** — the field is backend-populated only; no admin form exposes it. Manual Mongo edit if the admin needs to override.
- **Special-hours / holiday overrides** — `businessHours` is week-of-regular only.
- **Pickup slot capacity throttling** — `maxOrdersPerHour` exists but isn't yet wired to slot generation. Future REQ.

## Risk-based depth

MEDIUM risk → unit boundary at 22 cases is the load-bearing gate. The four-AC bundle has different risk profiles:

| AC                      | Risk surface                                                           | Test coverage                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AC1 (business hours)    | Client + server enforcement; bad config could block orders             | `getNextOpenSlot` (4 cases) + manual inspection of server guard                                                            |
| AC2 (delivery distance) | Geocoding cost / failure; fail-open is correctness-critical            | `geocode` (4 cases) + `getBarCoordinates` (3) + `checkDeliveryDistance` (4)                                                |
| AC3 (pickup slots)      | Time-math edge cases (rollover, close-min vs open-min)                 | `getPickupSlots` (4 cases)                                                                                                 |
| AC4 (real fees)         | Customer-visible totals; mismatch with server-calculated could confuse | Client-side fallback to prior hardcoded values is the load-bearing safety; manual UAT confirms the fees-from-settings path |

Server-side guards in `createOrderAction` deliberately mirror the client checks. The fail-open posture (no coords → distance check passes) is documented + intentional; the structural guard is ready for when customer-address geocoding lands.
