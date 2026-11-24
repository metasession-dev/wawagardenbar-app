---
req: REQ-124
generated_by: e2e-test-engineer
generated_at: 2026-11-21T21:43:22Z
e2e_required: true
spec_path: e2e/critical/whatsapp-order-tracking.spec.ts, e2e/critical/kitchen-serving-check.spec.ts
---

# E2E scope decision — REQ-124

## Outcome

**E2E required — covered.** Two merge-gating specs in `e2e/critical/` prove the user-visible acceptance criteria (AC1, AC3, AC4, AC5, AC7); AC2 and AC6 are proved at other layers (below).

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/critical/whatsapp-order-tracking.spec.ts`, `e2e/critical/kitchen-serving-check.spec.ts`; `e2e/critical/order-status-broadcast.spec.ts` updated to join with a tracking token.
- **ACs covered:**
  - AC1: `whatsapp-order-tracking.spec.ts` (US-A4.1, US-A4.2, US-A4.3, once per status, free-form inside the window).
  - AC7: `whatsapp-order-tracking.spec.ts` (US-A4.2: ready → out-for-delivery → delivered → completed from the dashboard order card with a message at each step; pickup and dine-in orders are not offered the steps), plus unit tests `__tests__/lib/order-status-transitions.test.ts` and `__tests__/actions/order-status-transitions-action.test.ts`.
  - AC3: `whatsapp-order-tracking.spec.ts` (US-A4.4, valid / other-order / expired / altered token, owner, other customer, socket join).
  - AC4: `kitchen-serving-check.spec.ts` (US-B1.5, US-B1.6, pickup and delivery labels, dashboard card and queue).
  - AC5: `kitchen-serving-check.spec.ts` (US-B1.7).
  - AC2: unit test `__tests__/actions/order-status-notify-call-site.test.ts` (no UI surface: a call-site property).
  - AC6: `compliance/evidence/REQ-124/template-submissions.md` and the template contract test.
- **Not covered end to end:** `confirmed` (set by payment, not by staff). Its message is proved by `__tests__/services/order-status-notifier.test.ts`.
- **Requirements gap:** staff could not reach `out-for-delivery` or `delivered`; resolved by amending the ACs (AC7, REQ-ORDMGT-020), operator decision 2026-11-21.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [x] The verdict matches the scope of this REQ.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-22

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-22; recorded by the agent from the operator's explicit reply._
