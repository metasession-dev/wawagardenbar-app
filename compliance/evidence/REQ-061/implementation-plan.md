# REQ-061 — Checkout operational gates (P2 #12-#15)

**Requirement ID:** REQ-061
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 P2 #12–#15](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-02

## Context

The admin can already configure business hours, delivery radius, prep time, and fees in `SystemSettings`, but the customer-side checkout flow ignores all four:

- **P2 #12** — `isWithinBusinessHours()` exists in `SettingsService` but no caller. Customers can place orders at 4am.
- **P2 #13** — `deliveryRadius` exists but checkout never validates. Customers in Lagos can order delivery from Abuja.
- **P2 #14** — `pickupTime` is a free-text input. No slot picker, no business-hours awareness.
- **P2 #15** — `cart-summary.tsx:22` has a `TODO: Replace with real-time fee calculation from settings`. The fees shown to customers in the cart are hardcoded `₦1000` / `₦500` instead of pulling from the admin-configurable `deliveryFeeBase` / `deliveryFeeReduced` / `freeDeliveryThreshold`.

`SettingsService` already has `getSettings`, `calculateFees`, `isWithinBusinessHours`, `getBusinessHoursForDay`, `canAcceptOrders` — REQ-061 wires the existing helpers into the customer surface, adds three new helpers (`getNextOpenSlot`, `getPickupSlots`, `checkDeliveryDistance`), and lazy-geocodes the bar's address via Google Maps so the delivery-distance check has bar coordinates to compare against.

## Acceptance criteria

1. **AC1 — Business-hours gate at checkout (P2 #12)**
   - New `SettingsService.getNextOpenSlot()` returns `{ openAt: Date | null; message: string }` — next open time (today if still in the future today, otherwise next-day's open; `null` + "closed all week" message if every day's `closed: true`).
   - New `<BusinessHoursBanner>` client component renders on the checkout `order-details-step` when `!isWithinBusinessHours()`: "We're closed right now. We open at HH:MM today. Schedule for then?" with a "Schedule for opening" CTA that sets `pickupTime` to the next open slot.
   - **Server-side guard**: the order-submission action (`placeOrderAction` or equivalent — to be identified during impl) re-validates via `SettingsService.isWithinBusinessHours()`. Rejects with `{ success: false, error: 'OUTSIDE_BUSINESS_HOURS', message: '...' }` if outside. Prevents tampered-client bypass.

2. **AC2 — Max delivery-distance validation via Google Maps geocoding (P2 #13)**
   - New env var `GOOGLE_MAPS_API_KEY` (required for the geocoding API; absent → distance check fails open).
   - Add `geocodedCoordinates: { lat: number; lng: number; geocodedAt: Date }` (optional, no default) to `ISettings`. Backend-populated only; not in the admin form.
   - New `lib/geo/geocode.ts` — `geocodeAddress(address): Promise<{ lat, lng } | null>`. Calls Google Maps Geocoding API; returns `null` on any error (missing key, API failure, no results, rate limit).
   - New `lib/geo/haversine.ts` — pure-function distance helper. `haversineKm(lat1, lng1, lat2, lng2): number`.
   - New `SettingsService.getBarCoordinates()` returns cached `geocodedCoordinates` if present, otherwise lazy-geocodes the bar's `address` string, persists the result, and returns it. Reads use the cached value; only the first call (or after admin changes the address) hits Google.
   - New `SettingsService.checkDeliveryDistance(customerLat, customerLng)` → `{ withinRadius: boolean; distanceKm: number | null }`. Fail-open when either side's coords are missing (returns `withinRadius: true, distanceKm: null` so customers without geocoded addresses aren't blocked).
   - Address-step UI: when `!withinRadius`, show "This address is outside our delivery area ({distanceKm} km — we deliver up to {deliveryRadius} km)" and disable the "Continue" button.
   - Server-side guard on order submission: same distance check; rejects with `OUTSIDE_DELIVERY_RADIUS` if delivery orders fall outside.

3. **AC3 — Pickup time-slot picker (P2 #14)**
   - New `SettingsService.getPickupSlots(forDate?: Date)` returns `Array<{ value: string; label: string; date: string }>`. `value` is `'YYYY-MM-DDTHH:MM'` (ISO local), `label` is user-facing ("Today at 14:30" / "Tomorrow at 10:00"), `date` is `'YYYY-MM-DD'`.
   - Slots are 15-minute intervals starting at `max(now + estimatedPreparationTime, businessHours.open)` and ending at `businessHours.close - estimatedPreparationTime` (so the kitchen has time to finish).
   - When no slots today (closed day or all slots in the past), include tomorrow's slots.
   - Replace the free-text `pickupTime` input in `order-details-step.tsx:175` with a `<Select>` populated from `getPickupSlots()` (loaded server-side, passed as a prop to the client step). Zod schema in `checkout-form.tsx:48` switches from `z.string().optional()` to `z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional()`.

4. **AC4 — Real-time fee calculation (P2 #15)**
   - New public API endpoint `app/api/public/settings/fees/route.ts` (GET) returns `{ serviceFeePercentage, deliveryFeeBase, deliveryFeeReduced, freeDeliveryThreshold, taxPercentage, taxEnabled, minimumOrderAmount }`.
   - `cart-summary.tsx` fetches the endpoint on mount via `useEffect` + `useState`; falls back to current hardcoded values if fetch fails (no regression for offline / outage scenarios).
   - Replace the hardcoded computation block at lines 22-33 with the fetched values.
   - The minimum-order amount comes from settings too (currently hardcoded `1000` / `2000` at lines 38-42).

5. **AC5 — Tests**
   - Unit `lib/geo/haversine.ts` — known-pair distance assertions (0 km same point; ~111 km on 1° latitude difference; ~10 km local pair) — 3 cases.
   - Unit `lib/geo/geocode.ts` — mock fetch; success path returns coords; failure / no results / missing key all return null — 4 cases.
   - Unit `SettingsService.getNextOpenSlot()` — open now → today's close; closed now today → today's open later; closed all day, has tomorrow → tomorrow's open; closed all week → null — 4 cases.
   - Unit `SettingsService.checkDeliveryDistance()` — within radius; outside radius; bar coords missing → fail-open; customer coords missing → fail-open — 4 cases.
   - Unit `SettingsService.getPickupSlots()` — slot generation respects start time, end time, 15-min intervals; tomorrow rollover; closed today + tomorrow returns [] — 4 cases.
   - Unit `SettingsService.getBarCoordinates()` — uses cached value when present; lazy-geocodes when missing; geocode failure returns null — 3 cases.
   - Total: ~22 new cases.

6. **AC6 — Backwards-compat**
   - All four gates are additive; missing data (coords, slots, business-hours edge cases) fails open or falls back to current behaviour. No order path that works today should fail after this REQ ships.
   - Google Maps API key absence is treated as "skip distance check" (fail-open).

## Technical approach

| File                                                       | Status | Change                                                                                |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `models/settings-model.ts`                                 | modify | Add `geocodedCoordinates?: { lat, lng, geocodedAt }` (optional, backend-populated)    |
| `services/settings-service.ts`                             | modify | Add `getNextOpenSlot`, `getPickupSlots`, `checkDeliveryDistance`, `getBarCoordinates` |
| `lib/geo/haversine.ts`                                     | new    | Pure function                                                                         |
| `lib/geo/geocode.ts`                                       | new    | Google Maps API wrapper                                                               |
| `app/api/public/settings/fees/route.ts`                    | new    | GET handler for the cart-summary fetch                                                |
| `components/features/checkout/business-hours-banner.tsx`   | new    | Banner + CTA                                                                          |
| `components/features/checkout/order-details-step.tsx`      | modify | Swap pickup input → select; render banner                                             |
| `components/features/checkout/delivery-address-step.tsx`   | modify | Distance check on address selection                                                   |
| `components/features/cart/cart-summary.tsx`                | modify | Fetch fees; use fetched values; fallback to hardcoded                                 |
| `app/actions/orders/place-order-action.ts` (or equivalent) | modify | Server-side re-validation of business hours + delivery distance                       |
| Tests                                                      | new    | ~22 cases across 5-6 test files                                                       |

### Google Maps integration (AC2)

- **Env var:** `GOOGLE_MAPS_API_KEY` — read at the top of `lib/geo/geocode.ts`. Missing key → `geocodeAddress` returns `null` immediately (no Google call).
- **Endpoint:** `https://maps.googleapis.com/maps/api/geocode/json?address={ENCODED_ADDRESS}&key={API_KEY}`.
- **Response:** `data.results[0].geometry.location.{lat,lng}` when success; everything else returns null.
- **Caching:** lazy-cache on the singleton settings doc. First read with no `geocodedCoordinates` triggers a geocode + a settings save. Subsequent reads hit the cache. If admin updates `address`, the existing geocode stays cached (until a future REQ adds invalidation on address-change — out of scope for v1; admins can manually clear by editing the field in Mongo if needed).
- **Failure mode:** all geocoding failures → fail-open (distance check passes). The customer page must never crash because Google had a hiccup.

### No new packages

Haversine is pure math. Geocoding uses `fetch` directly. No npm dependency added.

## Tests (TDD — written before implementation)

See AC5 above. Cases use vitest 4.1.x with the `@/models/settings-model` and `@/services/settings-service` boundaries mocked. The geocode helper test mocks `global.fetch`.

## Dependencies

- Existing `SettingsService.getSettings`, `isWithinBusinessHours`, `calculateFees`, `getDeliveryFee`, `canAcceptOrders` ✅
- Existing `businessHours` / `deliveryRadius` / `estimatedPreparationTime` / `deliveryFeeBase` / `deliveryFeeReduced` / `freeDeliveryThreshold` / `minimumOrderAmount` settings ✅
- Existing customer `IAddress.coordinates` (optional) ✅
- **New:** Google Maps Geocoding API access via `GOOGLE_MAPS_API_KEY` env var
- No new npm packages
- DB migration: settings doc gets a new optional `geocodedCoordinates` field (backend-populated on first delivery check)

## Security considerations

### STRIDE

| Cat                     | Risk                                                | Mitigation                                                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | None new                                            | All four checks have a server-side re-validation; client UI is a hint, not authority                                                                                                                                        |
| **T** — Tampering       | Client could bypass business-hours / distance gates | Server-side re-validation in `placeOrderAction` rejects with explicit error codes                                                                                                                                           |
| **R** — Repudiation     | None new                                            | Existing order audit log captures the rejection reason via the error code                                                                                                                                                   |
| **I** — Info disclosure | New public fees endpoint exposes pricing config     | Pricing IS public (already visible in cart summary today); endpoint returns only fee config, not coords or admin-only fields. Bar coordinates stay server-side.                                                             |
| **D** — DoS             | New API endpoint + Google geocoding calls           | Fees endpoint uses cached `SettingsService.getSettings()` (line 205-208 cache layer); per-request cost is one Mongo read or cache hit. Geocoding happens once at first read; lazy-cache prevents repeated Google API calls. |
| **E** — Elevation       | None                                                | No role/permission change                                                                                                                                                                                                   |

### Threat model — gate-bypass

1. **Tampered client submits outside business hours** → `placeOrderAction` re-validates → rejected with `OUTSIDE_BUSINESS_HOURS`. Server is authoritative.
2. **Tampered client submits delivery to far address** → same; rejected with `OUTSIDE_DELIVERY_RADIUS`.
3. **Geocoding fails on first call** → `getBarCoordinates` returns null; distance check fails open; customer can place delivery orders to anywhere. Acceptable: better to ship orders than block customers on a Google outage. Admin sees Mongo's `geocodedCoordinates` is null and can investigate.
4. **Customer with no coords on their address** → distance check fails open. Same address experience as today.
5. **Customer changes their address while order is in flight** → not a new race; same as today.

### Privacy / regulatory

- Bar address was already public-facing.
- Customer addresses were already collected.
- Geocoding sends the bar's address (public info) to Google. No customer data is sent to Google in this REQ.

### Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Rollback plan

`git revert <merge-sha>`. The four gates disappear; customers can order at 4am to anywhere; pickup is free-text again; cart-summary shows hardcoded fees again. The `geocodedCoordinates` field persists in Mongo (orphaned, harmless). The new `GOOGLE_MAPS_API_KEY` env var becomes unused (harmless to leave set).

## Test scope

| Gate                            | Expected                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0                                                                             |
| `npx vitest run`                | 0 failures; +~22 new cases                                                         |
| `npx eslint <changed>`          | 0 errors                                                                           |
| `semgrep scan --severity=ERROR` | 0 new findings                                                                     |
| `npm audit --audit-level=high`  | 0 high/critical                                                                    |
| E2E focused                     | n/a per `project_e2e_targeted_until_117` (full regression reserved for #117 close) |

## Plan deviation log

- **2026-06-02 (plan-time):** Geocoding-source choice changed from "admin manually enters lat/lng" to "Google Maps Geocoding API (lazy + cached)" per operator selection at plan-approval. Adds `GOOGLE_MAPS_API_KEY` env var, `lib/geo/geocode.ts` helper, `getBarCoordinates` lazy-cache pattern. Customer-side fail-open posture preserved.
