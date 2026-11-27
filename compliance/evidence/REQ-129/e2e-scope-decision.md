---
req: REQ-129
generated_by: e2e-test-engineer
generated_at: 2026-11-27T12:30:00Z
e2e_required: true
spec_path: e2e/critical/booking-customer.spec.ts, e2e/critical/booking-dashboard.spec.ts, e2e/critical/whatsapp-booking-intent.spec.ts
---

# E2E scope decision — REQ-129

## Outcome

**E2E required — covered.** The change adds a public page and form, a customer list, and a staff dashboard section, so every user-facing acceptance criterion has a critical-tier spec. The gate passed locally against an isolated stack (disposable Mongo, `ENABLE_WHATSAPP_NOTIFICATIONS=false`, `ENABLE_E2E_PIN_INTERCEPT=true`).

## Detail

- **`e2e_required`:** true.
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/critical/booking-customer.spec.ts` (AC1, AC2, AC6), `e2e/critical/booking-dashboard.spec.ts` (AC4, AC5), `e2e/critical/whatsapp-booking-intent.spec.ts` (AC3). Helper: `e2e/helpers/booking-seed.ts`.
- **ACs covered:** AC1 (forms, prefill, PIN gate, validation, five a day), AC2 (confirmation and `booking_received` log row), AC3 (booking intent, transport-layer, no screenshot), AC4 (list, filters, calendar, detail, status, assignee, note, reply, audit, role refusal), AC5 (one staff alert, never failing the submission), AC6 (My bookings, owner only). AC7 (templates) is covered by the unit contract test and the template submission record, not by a browser spec.
- **Negative cases:** a past date, an event ending before it starts and zero guests are refused; a sixth booking in a day is refused; another customer's booking id is a 404 and reveals nothing; a kitchen-only member and a customer cannot open `/dashboard/bookings`.
- **Messages:** the customer messages are asserted on their `NotificationLog` rows (template key and exact parameters), because WhatsApp is off in CI.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [ ] The verdict matches the actual scope of this REQ's diff.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
