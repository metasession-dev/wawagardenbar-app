---
req: REQ-098
generated_by: adr-author
generated_at: 2026-08-03T00:00:00Z
---

# Architecture decision — REQ-098

## Outcome

**Produced ADR-003:** Tab/Order write-off state uses a nested `writeOff` subdocument, not flat fields (`docs/ADR/ADR-003-write-off-subdocument-shape.md`)

## Detail

- **ADR file:** `docs/ADR/ADR-003-write-off-subdocument-shape.md`
- **Status:** Accepted (operator-confirmed during plan APPROVAL)
- **Summary:** Both `Tab` and `Order` gain a single embedded `writeOff` subdocument (`{amount, reason, writtenOffBy, writtenOffAt}`) rather than a flat 3/4-field triplet matching the codebase's existing `isDeleted`/`reconciled` convention — following the issue's explicit AC2 spec.
- **Affected files:** `models/tab-model.ts`, `models/order-model.ts`, `interfaces/tab.interface.ts`, `interfaces/order.interface.ts`, `services/tab-service.ts` (pattern-change signal, >5 files) at HIGH risk class (both independently ADR-triggering signals).
- **Cross-references:** SRS items REQ-TABMGT-007/008, REQ-INV-019, REQ-REPORT-006; risk register R-019–R-022.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR) matches the actual scope of this REQ.
- [x] The file at `docs/ADR/ADR-003-write-off-subdocument-shape.md` reflects canonical prose and status is Accepted.

**Reviewer:** william@ostendo.io
**Date:** 2026-08-03
