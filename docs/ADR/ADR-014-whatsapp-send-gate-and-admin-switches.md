---
adr_id: 'ADR-014'
status: 'Proposed'
date: '2026-11-25'
authored_by: 'adr-author (Claude) for operator'
related_reqs: ['REQ-125']
supersedes: []
superseded_by: null
---

# ADR-014: One gate in the WhatsApp send path for admin notification switches

## Status

**Proposed** (DRAFT; flips to _Accepted_ when the operator approves the plan that references it)

## Context

WhatsApp messages are sent from several places: `NotificationService.send` (customer messages, consent-gated), `staff-notification-service` (staff alerts, direct `WhatsAppService.sendMessage`), and `whatsapp-inbound-service` (welcome and account-recovery templates, and free-form replies). Admins have no way to turn off an individual notification type (REQ-125, #1082). Checking a flag in each caller would miss any sender added later (WA-11 and WA-13 add more), and a wrong check on the sign-in PIN would lock every customer out because sign-in is WhatsApp-only (REQ-WA-001).

## Decision

Enforce the switches in the shared send path, keyed by template name:

- `WhatsAppService.sendMessage` checks a catalogue (`lib/whatsapp-notification-catalogue.ts`) and the stored switches before sending. A switched-off template (or any template while the master switch is off) returns `{ success: false, errorCode: 'SUPPRESSED_ADMIN_DISABLED' }` without calling Meta. The free-form support reply in `NotificationService.send` applies the same check by `templateKey`.
- The catalogue is a code constant: for each switchable notification a key, group, template names, and the three required label texts (purpose, why it matters, if switched off). Locked templates (`verification_pin`, plus the refund and cancellation messages when WA-11 adds them) are on an explicit always-on list and the gate returns before reading settings for them.
- Switch state lives in system settings (`whatsapp-notification-switches`) with change history, read through a short-lived in-process cache invalidated on save. Missing document means every switch is on. A settings read failure means send (fail open).
- Free-form replies to a message the customer has just sent (STOP/START confirmations, order link, status acknowledgement) are not gated; they are service replies inside the 24-hour window.
- A suppressed send is recorded in `NotificationLog` with `errorCode: suppressed_admin_disabled`, the same pattern as `held_template_pending`, so it is distinguishable from a failure.

## Consequences

- **Good:** one enforcement point, so new senders are covered automatically; the PIN cannot be gated by a UI or settings mistake; suppressed is visible in the log and countable by WA-14; no migration and no new dependency.
- **Bad:** the gate adds a settings read to every template send (mitigated by the cache); a stale cache can delay a switch by up to the TTL on other instances; the catalogue must be kept in step with `TEMPLATE_CATEGORIES` (enforced by a unit test).
- **Neutral / tradeoffs:** a suppressed WhatsApp attempt falls through to email or SMS when the caller supplied them, as a consent-off attempt does; inbound free-form replies are outside the switches by design.

## Alternatives considered

- **Alternative 1: A flag check in each caller** — ruled out: misses future and direct senders, and a wrong check on the PIN would lock customers out.
- **Alternative 2: Gate only in `NotificationService.send`** — ruled out: staff alerts and inbound templates call `WhatsAppService.sendMessage` directly and would bypass it.
- **Alternative 3: Per-environment config via environment variables** — ruled out: needs a deploy to change and gives no audit trail or admin UI.
- **Alternative 4: Store the catalogue texts in the database** — ruled out: the wording is reviewed with the plan and must change with the code that introduces a template.

## Cross-references

- Implementation plan: `compliance/plans/REQ-125/implementation-plan.md`
- SRS items: REQ-WA-016 (new), REQ-SETTINGS-007 (new); related REQ-WA-006, REQ-SETTINGS-006
- Risk register: see `compliance/evidence/REQ-125/risk-assessment.md` (RISK-NNN entries recorded by `risk-register-keeper`)
- Related ADRs: ADR-011 (staff notification subsystem; staff alerts go through the same gate)
