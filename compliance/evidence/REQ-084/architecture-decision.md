---
req: REQ-084
generated_by: adr-author
generated_at: 2026-06-24T11:57:00Z
---

# Architecture decision — REQ-084

## Outcome

**No ADR needed** — Refactor separating existing checkout logic into two distinct components (customer vs admin). No new dependencies, no new database/cache/queue, no new external services. Pattern change is limited to removing admin branches from a shared component and extending an existing admin-only action with additional parameters. The architectural boundary between customer (Monnify) and admin (manual payment) already exists in the codebase; this REQ enforces it rather than creating it.

## Detail

- **Rationale:** Refactor separating existing checkout logic into two distinct components (customer vs admin). No new dependencies, no new database/cache/queue, no new external services. Pattern change is limited to removing admin branches from a shared component and extending an existing admin-only action with additional parameters. The architectural boundary between customer (Monnify) and admin (manual payment) already exists in the codebase; this REQ enforces it rather than creating it.
- **Signals examined:**
  - New third-party runtime dependency? **No** — no new packages added.
  - New external service? **No** — Monnify already integrated, no new SaaS.
  - New database/cache/queue tier? **No** — same MongoDB, no new stores.
  - Pattern change spanning > 3 files? **No** — the rename + branch removal touches 4 files but is a mechanical refactor, not a pattern change (same component structure, fewer branches).
  - Schema-level data model change? **No** — no Mongoose schema changes.
  - Risk classification HIGH or CRITICAL? **No** — MEDIUM risk.
  - File-path signal (`lib/services/`, `lib/repositories/`, `infra/`)? **No** — changes are in `components/features/` and `app/actions/`.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (no-ADR) matches the actual scope of this REQ.
- [ ] The rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** TBD
**Date:** 2026-06-24
