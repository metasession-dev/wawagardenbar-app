---
req: REQ-111
generated_by: adr-author
generated_at: 2026-10-20T07:49:00Z
---

# Architecture decision — REQ-111

## Outcome

**No ADR needed** — routing-logic addition inside an existing service, following an existing dispatch precedent.

## Detail

- **Rationale:** 3-file pattern extension (`services/whatsapp-inbound-service.ts`, `models/incoming-message-model.ts`, `lib/whatsapp-inbound-templates.ts`) inside `WhatsAppInboundService`, following the same direct-`WhatsAppService`-call dispatch pattern the existing `opt_out` branch already established. No new third-party dependency, no new external service, no new database/cache/queue tier, no schema-level data-model change (an added enum value, not a new relationship).
- **Signals examined:**
  - New third-party runtime dependency — No.
  - New external service — No.
  - New database/cache/queue tier — No.
  - Pattern change spanning > 3 files — No (3 files, one of them a documentation-only map entry).
  - Schema-level data model change — No (enum value addition only).
  - Risk classification HIGH/CRITICAL — No (MEDIUM).
  - File-path signal (`sdlc-config.json:adr_author.file_paths_signal_architecture` — `lib/services/`, `lib/repositories/`, `prisma/schema.prisma`, `infra/`) — No match (touched files are `services/`, `models/`, `lib/whatsapp-inbound-templates.ts`, none under the configured signal paths).

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (no-ADR) matches the actual scope of this REQ.
- [x] N/A — no ADR file to flip to Accepted.
- [x] The rationale is specific enough that an auditor reading this in 12 months would agree — the decision-tree signals examined are itemized above with pass/fail for each.

**Reviewer:** sdlc-implementer (agent) — william@ostendo.io, pending final operator review at Phase 4
**Date:** 2026-10-20
