# Release Ticket: REQ-122 — Staff notifications, alert numbers and escalation (WA-12)

**Status:** RELEASED
**Date:** 2026-11-16
**Requirement ID:** REQ-122
**Risk Level:** HIGH
**Issue:** [#974](https://github.com/metasession-dev/wawagardenbar-app/issues/974) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `feat/bundle-wa-06-wa-12-checkout-staff-alerts` (declared bundle with REQ-121, whose release ticket is the core of the bundle)
**Absorbed predecessor releases:** None

## Summary

New customer orders and support messages raise a live dashboard alert (bell, sound, toast, Needs-attention panel); unacknowledged items escalate by WhatsApp to on-shift staff and then to an escalation role, with staff alert numbers verified by WhatsApp PIN. Details, acceptance criteria and risks: `compliance/plans/REQ-122/implementation-plan.md`.

Stage 3 evidence is in `compliance/evidence/REQ-122/`; the UAT pack for the whole bundle is on REQ-121. Local gates (tsc, lint, 2129 unit tests, build, `smoke` + `critical` e2e) pass; CI runs and the full regression tier come with the integration PR.

## Sign-off (dual-actor)

To be completed at Stage 3.

## Operator tasks

- Confirm, then submit the `staff_alert` template to the UAT (+44 7363 078509) and production (+234 814 825 3342) WhatsApp accounts; record the status per environment here.
  - UAT (+44 7363 078509): submitted 2026-11-17 on operator confirmation (William), template id 2324079068440203, status PENDING at last check (2026-11-17).
  - Production (+234 814 825 3342): submitted 2026-11-17 on operator confirmation (William), template id 3855651177908683, status PENDING at last check (2026-11-17).
- Sign off risks R-60 to R-66 in `compliance/risk-register.md`.

## Known limitations at release (operator decision, William, 2026-11-17)

- UAT steps 15 to 18 (staff alert number verification, wrong code and customer-number refusal, alert rules, staff-number routing) were **not run**: they need a real WhatsApp phone and the approved `staff_alert` template, which was still PENDING at Meta for UAT and production. The release continues to production on the operator's instruction; the release reviewer accepts or rejects this in the portal.
- Until the production `staff_alert` template is approved and a real staff number is verified, WhatsApp alerts and escalation to staff will not be delivered. The in-app bell, toast and Needs-attention panel work without it (UAT steps 11 to 14 passed).
- Risks R-62 and R-65 stay OPEN until the WhatsApp path has been verified.
- Follow-up: re-check both template statuses and, once approved and a real number is verified, run steps 15 to 18 on UAT and record the result.
**Release PR:** #1050
**Released with bundle:** REQ-121 (closed out 2026-11-19)
