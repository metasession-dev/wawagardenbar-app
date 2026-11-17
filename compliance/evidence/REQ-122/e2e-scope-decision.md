---
req: REQ-122
generated_by: e2e-test-engineer
generated_at: 2026-11-16T22:34:07Z
e2e_required: true
spec_path: e2e/critical/staff-notifications.spec.ts
---

# E2E scope decision — REQ-122

## Outcome

**E2E required — covered.** Staff notifications have dashboard surfaces (bell, panel, toggle, account page, settings form), so each has a browser test; the inbound routing rule is covered at the transport layer.

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/critical/staff-notifications.spec.ts` (8 tests), `e2e/critical/staff-alert-number.spec.ts` (5 tests, including the super-admin dialog), `e2e/critical/staff-alert-rules.spec.ts` (1 test), `e2e/critical/whatsapp-staff-number-routing.spec.ts` (3 tests, transport layer, no `page`). A customer order is paid by a signed Paystack webhook, as in production; WhatsApp is off, and the staff PIN uses the same e2e intercept as the customer sign-in.
- **ACs covered:** AC1 a paid customer order raises one alert for the rule's roles, a staff-created order none, a retried webhook no second one · AC2 live bell count, toast, tab count, list with link, acknowledge, acknowledge all, opening the item or the order page acknowledges (US-B5.3, US-B5.9), audience limited to kitchen and csr · AC3 Needs-attention panel with minutes waiting (US-B5.4) · AC4 alert number saved unverified, wrong code refused, right code verifies and records consent, customer numbers refused, kitchen-only access, admin sets a number (US-B5.5) · AC5 on-shift toggle · AC6 rule edit stored (US-B5.10) · AC8 verified staff number creates no ticket, welcome or account; unverified and ordinary senders unchanged (US-B5.11).
- **Not covered by e2e:** AC7 escalation timing (US-B5.6 to US-B5.8) needs minutes of real time; it is covered by `__tests__/jobs/staff-alert-escalation.test.ts` against an in-memory store with the atomic level claim and fake times. AC9 is an operator task (template submission), no product behaviour.
- **Defects found by the e2e run and fixed in this REQ:** a malformed local number (12 digits) was accepted and stored as `+080…` (now refused); the new components used `sonner` toasts that this app has no toaster for (now the app's `use-toast`).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [x] The verdict (e2e required) matches the actual scope of this REQ.
- [x] The spec paths and ACs covered above are accurate.

**Reviewer:** William
**Date:** 2026-11-17
