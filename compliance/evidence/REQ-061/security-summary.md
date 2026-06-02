# REQ-061 — Security summary

**Requirement ID:** REQ-061
**Risk class:** MEDIUM
**Surface:** new `lib/geo/haversine.ts` (pure function) + `lib/geo/geocode.ts` (Google Maps wrapper); extension to `services/settings-service.ts` (~280 LOC across 4 new methods); new `geocodedCoordinates` field on `models/settings-model.ts`; two new public API routes (`/api/settings/business-hours-status`, `/api/settings/pickup-slots`); rewrite of `components/features/cart/cart-summary.tsx` to fetch fees; new `<BusinessHoursBanner>` client component; updates to `components/features/checkout/order-details-step.tsx` (slot picker swap + banner render); server-side guards in `app/actions/order/order-actions.ts:createOrderAction`.

## STRIDE assessment

| Category                | Risk introduced?           | Rationale / mitigation                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **S** — Spoofing        | No                         | No new auth surface; all customer-facing gates have a server-side re-validation in `createOrderAction`. Client-side UI is a hint, server is authoritative.                                                                                                                                                                                                                                                   |
| **T** — Tampering       | Reduces risk               | Without REQ-061, customers could submit orders at 4am or to far addresses freely (the configuration existed but wasn't enforced). REQ-061 closes those gaps with explicit server-side rejections (`OUTSIDE_BUSINESS_HOURS`, `OUTSIDE_DELIVERY_RADIUS`). Tampered client can bypass the UI banner but not the server check.                                                                                   |
| **R** — Repudiation     | No new repudiation surface | Existing order audit log captures order creations + their rejection reason via the returned error code.                                                                                                                                                                                                                                                                                                      |
| **I** — Info disclosure | Low                        | New public endpoints (`/api/settings/business-hours-status`, `/api/settings/pickup-slots`) return business config the bar publishes publicly anyway (hours, slot times). The bar's geocoded coordinates stay server-side — exposed only as a yes/no `withinRadius` boolean to the client. Customer addresses + Google Maps API requests go server-to-server; no customer data leaves the server in this REQ. |
| **D** — DoS             | Low                        | New routes are cached at `SettingsService.getSettings()` (60s TTL cache layer already in place). Per request: 1 cached settings read + small math. Google Maps geocoding is lazy-cached on the settings doc — at most one hit per bar-address change (essentially once per Railway deploy lifetime in steady state).                                                                                         |
| **E** — Elevation       | No                         | No role/permission change.                                                                                                                                                                                                                                                                                                                                                                                   |

## Threat model — gate-bypass + external-API attack surfaces

1. **Tampered client submits outside business hours** — `createOrderAction` re-validates via `SettingsService.isWithinBusinessHours()` → rejected with `OUTSIDE_BUSINESS_HOURS`. Server is authoritative. Verified by reading the diff at `order-actions.ts:87-99` (post-AC-validation, pre-`OrderService.createOrder`).

2. **Tampered client submits delivery to far address** — same; server-side `SettingsService.checkDeliveryDistance(input.customerLat, input.customerLng)` → rejected with `OUTSIDE_DELIVERY_RADIUS` if outside. **However:** the guard fails open when `customerLat`/`customerLng` are missing from the action input. In v1 they typically ARE missing (the address-step form doesn't collect them — customer-address geocoding is a future REQ). So in v1 the guard is structural but not enforcing; the bar accepts delivery to anywhere with a customer-supplied address. **Honest framing:** REQ-061 lands the structure; real enforcement waits on customer-address geocoding.

3. **Google Maps API key leakage** — `GOOGLE_MAPS_API_KEY` is server-side only (read in `lib/geo/geocode.ts` at module-init time). Not exposed via any client bundle. Even if leaked, the worst case is geocoding quota abuse; Google's free tier covers our usage (one geocode per address change, essentially once per Railway env per deploy).

4. **Google Maps API outage** — `geocodeAddress` catches all error paths and returns null. `getBarCoordinates` returns null. `checkDeliveryDistance` fails open. The customer flow doesn't crash; orders flow through.

5. **Stale `geocodedCoordinates` after admin edits the address** — the cache doesn't invalidate on address change. Admin would need to manually clear the field in Mongo. Acceptable for v1 (admin changes the address rarely); future REQ can hook into `updateSettings` to invalidate.

6. **Bad business-hours admin config (e.g. closed:true on a wrong day)** — would block pickup/delivery orders for that day. Mitigation: admin sees the config they entered; server logs the rejection so on-call can spot the pattern.

7. **Long-running tick `getPickupSlots` with weird timezone** — operation is in JS Date (local server time, Lagos/WAT). The pickup slot's `value` is `YYYY-MM-DDTHH:MM` ISO local — no UTC conversion. Customer-side timezone confusion would only matter if the bar served customers in a different timezone, which it doesn't.

## Privacy / regulatory

- No new PII collected.
- Customer addresses were already collected.
- Bar's address (publicly published) is sent to Google Maps for geocoding. No customer data goes to Google in this REQ.
- The new endpoints expose business config the bar publishes publicly (hours, slot times) — no operational secrets.

## Static analysis

`semgrep scan --severity=ERROR` on all REQ-061 files → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- Customer-address geocoding (would close the AC2 fail-open gap) → future REQ.
- Stale-coords invalidation on admin address change → future REQ.
- Holiday / special-hours override → future REQ.
- Pickup slot capacity throttling (`maxOrdersPerHour` wiring) → future REQ.
- E2E checkout-flow tests → per `project_e2e_targeted_until_117`, deferred to post-#117 regression.
