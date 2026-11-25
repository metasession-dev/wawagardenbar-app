---
req: REQ-125
generated_by: adr-author
generated_at: 2026-11-25T05:20:00Z
---

# Architecture decision — REQ-125

## Outcome

**Produced ADR-014:** One gate in the WhatsApp send path for admin notification switches (`docs/ADR/ADR-014-whatsapp-send-gate-and-admin-switches.md`)

## Detail

- **ADR file:** `docs/ADR/ADR-014-whatsapp-send-gate-and-admin-switches.md`
- **Status:** Accepted on plan approval (2026-11-25)
- **Summary:** switches are enforced by one gate in `WhatsAppService.sendMessage` and the free-form support reply path, keyed by template name, with a code-level always-on list for the sign-in PIN, settings in system settings with a short cache, fail-open on a settings read error, and a `suppressed_admin_disabled` log code.
- **Affected files:** `lib/whatsapp.ts`, `services/notification-service.ts`, `services/system-settings-service.ts`, `lib/whatsapp-send-gate.ts`, `lib/whatsapp-notification-catalogue.ts`, the settings UI and actions.
- **Cross-references:** REQ-WA-016, REQ-SETTINGS-007, R-77, R-78.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [x] If ADR: the file at `docs/ADR/` is edited from stub to canonical prose and status is Accepted.
- [~] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-25

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-25; recorded by the agent from the operator's explicit reply._
