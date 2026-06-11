---
req: REQ-077
generated_by: adr-author
generated_at: 2026-06-11T04:30:00Z
---

# Architecture decision — REQ-077

## Outcome

**No ADR needed** — UI-only enhancement on the existing `/dashboard/incidents` page; no architectural significance.

## Detail

### Rationale

UI-only enhancement reusing existing infrastructure (`IncidentEventModel`, `<IncidentRetryButton>`, the page → service → component pattern already used throughout `app/dashboard/**`). No new third-party runtime dependency; no new external service; no new database / cache / queue tier; no schema-level data model change. The 4 in-scope files (`app/dashboard/incidents/page.tsx` + `components/features/admin/incident-row.tsx` + `components/features/admin/incident-details-panel.tsx` + service-method extension) follow the existing pattern — no new architectural pattern introduced.

### Signals examined

| Signal                                                         | Match? | Note                                                                                                                                          |
| -------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| New third-party runtime dependency                             | NO     | Pretty-printing uses native `JSON.stringify(v, null, 2)` in a `<pre>` tag — no library                                                        |
| New external service                                           | NO     | Read-only DB queries to existing Mongo                                                                                                        |
| New database / cache / queue tier                              | NO     | No infrastructure change                                                                                                                      |
| Pattern change spanning >3 files                               | NO     | 4 files touched but they follow the existing page → service → component pattern already used throughout `app/dashboard/**` — no NEW pattern   |
| Schema-level data model change                                 | NO     | `IncidentEventModel` + `OrderModel` schemas unchanged; only the projection extended                                                           |
| Risk classification HIGH or CRITICAL                           | NO     | MEDIUM                                                                                                                                        |
| File-path signal (`adr_author.file_paths_signal_architecture`) | NO     | Touches `services/incident-event-service.ts` (project's `services/`, not `lib/services/`). Config defaults don't match this project's layout. |

Counter-signals confirm: existing-pattern extension, single feature surface (`/dashboard/incidents`), reuses existing `<IncidentRetryButton>` and `IncidentEventModel`.

### Affected files

- `app/dashboard/incidents/page.tsx` (modified)
- `components/features/admin/incident-row.tsx` (new)
- `components/features/admin/incident-details-panel.tsx` (new)
- `services/incident-event-service.ts` (extended with `listWithLinkedOrders()`)

### Cross-references

- SRS items: REQ-INV-014 / 015 / 016 / 017 (new); REQ-INV-013 (existing trace) — see [`srs-alignment.md`](./srs-alignment.md)
- Risk-register entries: R-003 + R-004 — see [`risk-assessment.md`](./risk-assessment.md)

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (no ADR) matches the actual scope of this REQ.
- [ ] The rationale is specific enough that an auditor reading this in 12 months would agree.
- [ ] Signals re-checked against the implementation diff at PR #365 — no architectural surprises landed.

**Reviewer:** ostendo-io
**Date:** 2026-06-11

## Framework attribution

This artefact uploads with `evidence_type=architecture_decision`. Per META-COMPLY's `framework-registry-auditor` v1 review, clause attribution is **orphan-by-design** in v1 — visible in the portal's Documents tab + audit-pack export, but does NOT close any framework clause as COVERED. Phase B will pair the evidence type with `ISO27001.A.8.25` / `SOC2.CC8.1` mapping once the auditor's framework-registry update ships.

## Refs

- Implementation plan: [`compliance/plans/REQ-077/implementation-plan.md`](../../plans/REQ-077/implementation-plan.md) §3
- No `docs/ADR/ADR-NNN-…` file produced this cycle (no-ADR verdict).
