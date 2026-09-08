---
req: REQ-103
generated_by: adr-author
generated_at: 2026-09-08T20:51:00Z
---

# Architecture decision — REQ-103

## Outcome

**No ADR needed** — this is a scoped authorization-gate parity fix that reuses the existing `IAdminPermissions`/`menuManagement` permission model already established in the codebase.

## Detail

- **Rationale:** No new third-party dependency, external service, database/cache/queue tier, or schema-level data model change. No pattern change spanning >3 files — 3 of the 4 touched files (`app/actions/admin/menu-actions.ts`, `app/actions/admin/price-management-actions.ts`, and the new action in `menu-actions.ts`) are near-identical replacements of one existing gate pattern (`role !== 'super-admin'` → `hasSessionPermission(session, 'menuManagement')`); the 4th (`components/features/admin/pricing-windows-form.tsx`) is a client-form call-site swap. `IAdminPermissions.menuManagement` and the `requirePermission()`/permission-check convention already existed and are unchanged by this REQ.
- **Signals examined:**
  - New third-party dependency — no.
  - New external service — no.
  - New database/cache/queue tier — no.
  - Pattern change spanning >3 files — no (repeated application of one pre-existing pattern).
  - Schema-level data model change — no.
  - Risk classification HIGH — yes, but per the decision tree this is an operator-confirm signal reflecting _blast radius of getting an existing permission model wrong_, not the introduction of a new architectural pattern; confirmed no-ADR.
  - File-path signal (`sdlc-config.json:adr_author.file_paths_signal_architecture`) — none of the touched paths match configured architecture-signal prefixes.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (no-ADR) matches the actual scope of this REQ.
- [ ] The rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
