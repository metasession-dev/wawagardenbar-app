# Release Ticket: REQ-122 — Staff notifications, alert numbers and escalation (WA-12)

**Status:** TESTED - PENDING SIGN-OFF
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
