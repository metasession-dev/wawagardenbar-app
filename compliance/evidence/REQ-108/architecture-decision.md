---
req: REQ-108
generated_by: adr-author
generated_at: 2026-09-22T11:32:00Z
---

# Architecture decision — REQ-108

## Outcome

**No ADR needed** — confirmed with operator at Phase 1 plan approval. HIGH risk classification here is financial-domain (payment-status correctness), not architectural-complexity; the change is a small 2-file fix plus a one-time migration script.

## Detail

- **Rationale:** Bug fix touching two files (`services/tab-service.ts`, `app/actions/admin/order-management-actions.ts`) — no new dependency, no new database/cache/queue tier, no external service, and the pattern change (a single chokepoint gaining a `$set` call, plus a second independent existence check) does not span more than 3 files. `scripts/backfill-order-tabid.ts` is a one-time migration script, not a structural/architectural change.
- **Signals examined** (per the decision tree):
  - New third-party runtime dependency — no.
  - New external service — no.
  - New database/cache/queue tier — no.
  - Pattern change spanning >3 files — no (2 files).
  - Schema-level data model change — no (`Order.tabId` already existed on the schema; this REQ makes an existing field reliably set, not a new field).
  - Risk classification HIGH — yes, but the risk driver is financial-correctness (payment-status), not architectural significance; operator confirmed this at Phase 1.
  - File-path signal (`sdlc-config.json:adr_author.file_paths_signal_architecture`) — `services/tab-service.ts` is under `services/`, not in the configured signal list (`lib/services/`, `lib/repositories/`, `prisma/schema.prisma`, `infra/`); this project uses `services/` at the repo root, not `lib/services/`, so no match.
  - Bug fix touching ≤3 files in `app/`/`lib/`-equivalent surfaces — yes, matches the no-ADR heuristic.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (no-ADR) matches the actual scope of this REQ.
- [x] The rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** operator (william@ostendo.io)
**Date:** 2026-09-22
