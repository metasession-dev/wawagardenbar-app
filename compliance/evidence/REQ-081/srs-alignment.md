---
req: REQ-081
generated_by: requirements-aligner
generated_at: 2026-06-15T07:30:00Z
---

# SRS alignment - REQ-081

## ACs traced

| AC      | SRS item                                                  | Action this cycle                                                                                            |
| ------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| AC1-AC5 | **REQ-ORDMGT-008** (new)                                  | Added express order category cascade and contextual-search item under Order Management.                      |
| AC6-AC7 | **REQ-MENUMGT-007** (new)                                 | Added menu-management category cascade and contextual-search item under Menu Management.                     |
| AC8     | **REQ-INV-018** (new)                                     | Added sellable inventory category cascade and contextual-search item under Inventory Management.             |
| AC9     | **REQ-ORDMGT-008 / REQ-MENUMGT-007 / REQ-INV-018**        | Empty-state behaviour is part of each cascade surface.                                                       |
| AC10    | **REQ-MENUMGT-005** (existing) plus new cascade SRS items | Source-of-truth registry remains REQ-MENUMGT-005; cascade use is captured by the new surface-specific items. |

## Drift detected

**None.** REQ-MENUMGT-005 remains the source of truth for configurable main categories. REQ-081 consumes that registry; it does not change category CRUD semantics.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items (REQ-ORDMGT-008 / REQ-MENUMGT-007 / REQ-INV-018) accurately describe the expected cascade and search behaviour.
- [ ] Stale items: none flagged this cycle.

**Reviewer:** pending
**Date:** 2026-06-15

## Framework attribution

This artefact uploads with `evidence_type=srs_alignment`. It supports requirements traceability for ISO 29119 planning but does not by itself close a framework clause in the portal.

## Refs

- Implementation plan: [`compliance/plans/REQ-081/implementation-plan.md`](../../plans/REQ-081/implementation-plan.md)
- SRS items: [`docs/SRS.md`](../../../docs/SRS.md) — REQ-ORDMGT-008 / REQ-MENUMGT-007 / REQ-INV-018
- Sibling artefacts: [`architecture-decision.md`](./architecture-decision.md), [`risk-assessment.md`](./risk-assessment.md)
