---
req: REQ-122
generated_by: adr-author
generated_at: 2026-11-17T12:00:00Z
---

# Architecture decision — REQ-122

## Outcome

**Produced ADR-011:** Staff notification subsystem: persisted notifications, live socket event, minute escalation job, staff-own consent (`docs/ADR/ADR-011-staff-notification-subsystem.md`)

## Detail

- **ADR file:** `docs/ADR/ADR-011-staff-notification-subsystem.md`
- **Status:** Accepted (operator-confirmed at the plan approval, 2026-11-16)
- **Summary:** notifications are persisted, the live signal carries only an id and a type, a minute job escalates once per level with an atomic claim, and staff consent and numbers are separate from customer ones.
- **Affected files:** `models/staff-notification-model.ts`, `services/staff-notification-service.ts`, `services/staff-alert-number-service.ts`, `lib/socket-server.ts`, `lib/scheduled-jobs.ts`, `lib/staff-alerts/`
- **Cross-references:** SRS REQ-DASH-003 to 006, REQ-AUTHA-008, REQ-SETTINGS-006, REQ-WA-014, REQ-WA-015; risks R-63 to R-66. Plan deviations that refine it (content-free signal; failed sends while the template is pending, no `held_template_pending`) are recorded in the ADR and the plan.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [x] If ADR: the file at `docs/ADR/ADR-011-staff-notification-subsystem.md` is canonical prose and status is Accepted.
- [~] If no-ADR: not applicable (an ADR was produced).

**Reviewer:** William
**Date:** 2026-11-17
