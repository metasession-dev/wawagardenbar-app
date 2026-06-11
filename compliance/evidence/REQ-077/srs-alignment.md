---
req: REQ-077
generated_by: requirements-aligner
generated_at: 2026-06-11T04:30:00Z
---

# SRS alignment — REQ-077

## ACs traced

| AC                   | SRS item                                 | Action this cycle                                                                                                                          |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1                  | **REQ-INV-014** (new)                    | added — Incidents queue row expansion UX. Stub authored under Feature Area 14 (INV) for operator to refine.                                |
| AC2                  | **REQ-INV-015** (new — merged with AC3)  | added — Incident details panel: errorDetails + Order snapshot. AC2 covers errorDetails / timestamps / entityId half.                       |
| AC3                  | **REQ-INV-015** (same — merged with AC2) | added — same item. AC3 covers the Order-snapshot half of the same panel.                                                                   |
| AC4 (retry button)   | **REQ-INV-013** (existing — trace-only)  | unchanged — Retry-now remediation behaviour pinned at REQ-INV-013; this REQ relocates the existing button into a new container, no drift.  |
| AC4 (status history) | **REQ-INV-016** (new)                    | added — Stale-paid-order: status-history trail. Stub authored under Feature Area 14 (INV).                                                 |
| AC5                  | `@srs-deferred: implementation-detail`   | not added — non-functional ("how the same observable outcome from AC1-AC4 is delivered, not WHAT the user sees"). Deferred with rationale. |
| AC6                  | **REQ-INV-017** (new)                    | added — Incidents URL state: filter + expanded-row hash. Stub authored under Feature Area 14 (INV).                                        |

## Drift detected

**None.** REQ-INV-012's existing source-of-truth (`app/dashboard/incidents/page.tsx`) is touched in this REQ but the existing AC ("IncidentEvents render newest-first with kind-filter chips and Retry-now buttons") remains valid — REQ-077 _adds_ expansion to those rows without changing the listing semantics. **REQ-INV-012 is NOT stale.**

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items (REQ-INV-014 / 015 / 016 / 017) have been reviewed; the agent-authored Given/When/Then stubs accurately describe the behaviour I expect.
- [ ] Stale items: none flagged this cycle.
- [ ] `@srs-deferred` annotation on AC5 is defensible: server-render-vs-client-render is an implementation property of how AC1-AC4 are delivered, not a user-observable behaviour in its own right.

**Reviewer:** ostendo-io
**Date:** 2026-06-11

## Framework attribution

This artefact uploads with `evidence_type=srs_alignment`. Per META-COMPLY's `framework-registry-auditor` v1 review, clause attribution is **orphan-by-design** in v1 — visible in the portal's Documents tab + audit-pack export, but does NOT close any framework clause as COVERED. Phase B will pair the evidence type with `ISO29119.3.4` (Test Plan — requirements traceability) attribution once the auditor's framework-registry mapping ships.

## Refs

- Implementation plan: [`compliance/plans/REQ-077/implementation-plan.md`](../../plans/REQ-077/implementation-plan.md)
- SRS items: [`docs/SRS.md`](../../../docs/SRS.md) — Feature Area 14 (INV) — REQ-INV-014 / 015 / 016 / 017
- Sibling artefacts: [`architecture-decision.md`](./architecture-decision.md), [`risk-assessment.md`](./risk-assessment.md)
