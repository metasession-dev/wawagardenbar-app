---
req: REQ-123
generated_by: e2e-test-engineer
generated_at: 2026-11-19T00:00:00Z
e2e_required: true
spec_path: e2e/critical/paystack-payment-lifecycle.spec.ts, e2e/critical/kitchen-paid-gate.spec.ts, e2e/critical/whatsapp-payment-link.spec.ts
---

# E2E scope decision — REQ-123

## Outcome

**E2E required — covered.** Three new critical-tier specs (10 tests) and a shared helper were written through `e2e-test-engineer` and pass against an isolated stack (disposable MongoDB, dev server with WhatsApp off, as in CI). The Phase 2 run also found a defect that unit tests missed: the kitchen event was emitted when a customer order was created, not when it was paid (fixed in `markOrderPaid`; see Detail).

## Detail

- **`e2e_required`:** true.
- **Rationale:** N/A — covered below.
- **Spec path(s):**
  - `e2e/critical/paystack-payment-lifecycle.spec.ts` (transport layer: API key, signed webhooks, Mongo and socket assertions; no `page`, so evidence is this record plus `test-execution-summary.md`, not screenshots).
  - `e2e/critical/kitchen-paid-gate.spec.ts` (UI: kitchen display and `/dashboard/orders` Awaiting-payment view; `evidenceShot` at the AC5 assertions).
  - `e2e/critical/whatsapp-payment-link.spec.ts` (transport layer: the one-minute scheduler tick and the NotificationLog row).
  - Helper: `e2e/helpers/paystack-lifecycle.ts` (installs a known Paystack secret in SystemSettings and restores it; signs webhooks over the raw body; seeds and cleans orders, notification rows, incidents and dedup rows).
- **ACs covered:**

| AC  | Proved by                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | US-A2.13 (response provider is `paystack`); unit `payment-service.paystack-customer`, `initialize-payment-stable-reference`                                    |
| AC2 | US-A2.13 (same reference and URL on a second Pay); unit tests                                                                                                  |
| AC3 | US-A2.14 to US-A2.17 and the bad-signature test (raw-body signature, lookup before dedup, amount check, replay, 404 with no dedup row then a successful retry) |
| AC4 | US-A2.14 (paid and confirmed, one `kitchen:new-order`, `order_confirmation` then `receipt` rows); US-A2.15 (replay sends nothing twice)                        |
| AC5 | US-B1.3, US-B1.4 and the Awaiting-payment view test                                                                                                            |
| AC6 | unit `__tests__/jobs/expire-unpaid-orders.test.ts` (US-A2.18): the 30-minute cancel needs a clock, so it is a unit test, as the issue specifies                |
| AC7 | US-A2.19 (one `payment_link` with the stable access code after the scheduler tick); once-only claim in the unit test                                           |
| AC8 | contract test (`whatsapp-template-contract`) and `template-submissions.md` (MCP)                                                                               |
| AC9 | operator confirmation (`paystack-refund-capability.md`), no e2e                                                                                                |

### Honest limits

- **No live Paystack call in e2e.** CI has no Paystack network access, so US-A2.13 uses an order that already carries the stored checkout fields. The creation of a real Paystack transaction (first Pay) is covered by unit tests and by the UAT live round-trip.
- **Customer UI "Pay twice" is not driven through the browser**: the public payments API and the server action share the same stable-reference path, covered by unit tests.
- **Scheduler timing:** US-A2.19 waits for the in-process one-minute tick (about 45 seconds on a warm server, up to about 2 minutes after boot).

### Defect found by the e2e run (fixed before commit)

`createOrder` (customer checkout) emitted `kitchen:new-order` when the order was created, so an unpaid customer order appeared live on the kitchen display, contradicting AC4 and AC5. The emit moved into `markOrderPaid` (`kitchen:new-order` and `order:created`, once, to customer orders only), and the wrapper test now asserts nothing is emitted at creation.

### Existing specs reviewed

Specs that seed orders directly in Mongo (inventory invariants, order-status-revert, admin-order-inventory-delta) write no `origin`, which the gate reads as staff, so they still pass; the full `critical` project was re-run (see `test-execution-summary.md`). `e2e/helpers/customer-journey.ts` already pays by signed webhook.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [ ] The verdict (E2E required) matches the actual scope of this REQ.
- [ ] The honest limits above are acceptable for a HIGH-risk release.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
