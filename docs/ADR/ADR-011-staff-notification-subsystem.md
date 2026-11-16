---
adr_id: 'ADR-011'
status: 'Accepted'
date: '2026-11-16'
authored_by: 'adr-author (Claude) for operator'
related_reqs: ['REQ-122']
supersedes: []
superseded_by: null
---

# ADR-011: Staff notification subsystem: persisted notifications, live socket event, minute escalation job, staff-own consent

## Status

**Accepted** (William, 2026-11-16, at plan approval)

## Context

New customer orders and support messages must produce an alert staff cannot miss. Today only the kitchen screen plays a sound, and only while it is open; the dashboard top bar has a "Future: Notifications" placeholder; staff have no phone field of their own, and the notification settings cover customer email and SMS only. REQ-122 (WA-12, SRS REQ-DASH-003 to REQ-DASH-006, REQ-SETTINGS-006, REQ-AUTHA-008, REQ-WA-014, REQ-WA-015) needs alerts that persist until acknowledged, reach the right roles, escalate over WhatsApp when nobody acts, and never mix staff numbers with customer identity. Programme decision: staff capability is never reachable from a customer session, and the customer consent flags (REQ-WA-006) govern customers only.

## Decision

1. **Persisted notifications.** A new Mongoose model `StaffNotification` (`models/staff-notification-model.ts`: type, refModel, refId, title, targetRoles, targetUserIds, acknowledgedBy, acknowledgedAt, escalationLevel 0 to 2, lastAlertAt) is the source of truth. One entry point, `StaffNotificationService.raise(type, ref, title)`, reads the rule for that type from system settings and creates the row; callers (paid customer order, support ticket) never write the model directly. Audience is resolved with the any-of role helpers from `lib/session.ts` (ADR-009), never new `session.role ===` checks.
2. **Live delivery.** A new socket event `staff-notification` through `lib/socket-emit-helper.ts` tells the bell to refetch. The event carries only an id and a type, because the socket rooms are not authenticated; the content comes from an authenticated, role-scoped server action. The persisted row, not the event, is authoritative: a client that was offline, or missed the event, reads the unacknowledged list on load and every 30 seconds.
3. **Escalation by an in-process job.** A once-a-minute job in `lib/scheduled-jobs.ts` (the existing in-process scheduler, REQ-048) walks unacknowledged rows. Each level is sent once: the level transition is an atomic conditional update (`findOneAndUpdate` on `escalationLevel`), and only the instance that wins the update sends, so a second app instance cannot double-send. A user with several roles is de-duplicated per level. Quiet hours keep alerts in-app only.
4. **Staff-own consent and number.** Staff carry `alertPhone`, `alertPhoneVerified`, `alertsEnabled`, `onShift` and a consent timestamp, separate from the customer `phone`. Verification reuses the WhatsApp PIN flow. `staff_alert` is sent through `WhatsAppService.sendMessage` gated on the staff member's own verified number and consent, not through the customer-consent-gated `NotificationService.send`, and each send is still written to `NotificationLog`.
5. **Routing.** The inbound router recognises only a **verified** staff `alertPhone` and never creates a customer, ticket or welcome for it; an unverified number is treated as any other sender.

## Consequences

- **Good:** alerts survive a closed dashboard and a page reload; escalation is auditable (`acknowledgedBy`, `acknowledgedAt`, `NotificationLog`); no new runtime dependency or service; staff and customer identity and consent stay separate; later REQs (WA-13 bookings, WA-11 refunds) only call `raise`.
- **Bad:** one more collection and a once-a-minute query over unacknowledged rows (small, indexed on `acknowledgedAt` and `createdAt`); the in-process job couples escalation to app uptime; staff numbers are new personal data to retain and protect (ROPA update, WA-14 retention).
- **Neutral / tradeoffs:** alert delivery depends on the `staff_alert` template being approved by Meta in each environment; until then the WhatsApp send fails and is logged as `failed`, each level is still claimed once, and staff get in-app alerts only. A failed or missed minute tick delays an escalation by one tick rather than skipping it, because the job compares elapsed minutes, not tick counts.

## Alternatives considered

- **Alternative 1: extend the kitchen socket sound only (no persistence).** Ruled out: it works only while a page is open, has no acknowledge state and cannot escalate.
- **Alternative 2: an external queue and worker (for example Redis with BullMQ) for escalation.** Ruled out: a new runtime dependency and service for a once-a-minute scan the existing scheduler already does; the atomic conditional update gives the same once-per-level guarantee. Revisit if alert volume or multi-region needs grow.
- **Alternative 3: reuse the customer `NotificationService.send` with consent gating.** Ruled out: its consent flags (`whatsappTransactional`, `whatsappMarketing`) are customer concepts; staff alerts need the staff member's own verified number and consent, and mixing them would let a customer consent change silence staff alerts.

## Cross-references

- Implementation plan: `compliance/plans/REQ-122/implementation-plan.md`
- SRS items: REQ-DASH-003, REQ-DASH-004, REQ-DASH-005, REQ-DASH-006, REQ-SETTINGS-006, REQ-AUTHA-008, REQ-WA-014, REQ-WA-015, REQ-WA-005 (updated)
- Risk register: entries opened by `risk-register-keeper` for REQ-122 (see the plan's Risk register entries)
- Related ADRs: ADR-009 (any-of role authorization), ADR-008 (WhatsApp-only sign-in, PIN flow)
- Supersedes / superseded-by: none
