---
req: REQ-118
generated_by: e2e-test-engineer
generated_at: 2026-11-05T00:00:00Z
e2e_required: true
spec_path: e2e/critical/whatsapp-support-thread.spec.ts
---

# E2E scope decision — REQ-118

## Outcome

**E2E required — covered.** A new critical spec drives the signed webhook and the staff UI for AC1 to AC3. Two existing support specs were extended.

## Detail

- **`e2e_required`:** true.
- **Spec path(s):** `e2e/critical/whatsapp-support-thread.spec.ts` (4 tests: AC1 one thread with 72-hour reopen, AC2 free message inside the window, AC2 template after two days, AC3 urgent ticket, 15-minute SLA, queue order and SLA cleared by a staff reply).
- **Updated:** `e2e/support-ticket-whatsapp-inbound.spec.ts` (a second message joins the ticket, AC1) and `e2e/support-ticket-staff-flow.spec.ts` (the reply box says "template" for a customer who has never messaged, and the log carries `mode: template`, AC2).
- **AC4:** operator task, no product behaviour (`@srs-deferred`). Evidence is `template-status.md`. The live send of both modes is the UAT round-trip once `support_reply` is approved by Meta.
- **WhatsApp sends in e2e:** disabled in the environment. `NotificationService` still records each attempt in `NotificationLog` with the mode and the exact parameters, and the specs assert on those rows.
- **Isolation:** every test creates its own customer, tickets and messages and removes them afterwards. Phone numbers and `wamid`s are random (a clock-derived `wamid` collided across parallel workers and the duplicate was correctly dropped by the idempotency guard).
- **Evidence form:** UI assertions call `evidenceShot`; the NotificationLog assertions are transport-layer and evidenced by `test-execution-summary.md`.
- **Local run (2026-11-05):** isolated sandbox (disposable `mongo:7`, git worktree of the branch head, dummy payment keys, no `.env.local`), `--project=critical` at the default worker count: **337 passed, 0 failed, 1 skipped** on the second full run (the first run had one unrelated REQ-095 flake that passes in isolation). The skip is the pre-existing `close-tab-tip-capture.spec.ts` precondition gap, not touched by this change. The REQ-118 spec and the two updated support specs passed in every run. Full `regression` was not run locally; CI runs it.
- **Known limit:** `scripts/check-req-title-tags.sh --req REQ-118` passes. The script does not recognise the aliased fixture `csrTest`, so the REQ id sits in the enclosing `test.describe` title.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** _pending_
**Date:** _pending_
