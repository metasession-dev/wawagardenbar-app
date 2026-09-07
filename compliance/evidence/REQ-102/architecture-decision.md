---
req: REQ-102
generated_by: adr-author
generated_at: 2026-09-04T22:05:00Z
---

# Architecture decision — REQ-102

## Outcome

**Produced ADR-004:** Centralize time-window price precedence in a single resolver function (`docs/ADR/ADR-004-time-window-price-precedence.md`)

## Detail

- **ADR file:** `docs/ADR/ADR-004-time-window-price-precedence.md`
- **Status:** Accepted (confirmed at plan APPROVAL)
- **Summary:** Precedence (happy-hour > show > default) is resolved by one function, `SettingsService.resolveActivePriceField()`, consumed identically by the order reconciler, the public menu API, and the bulk-edit page's read path, rather than each consumer re-implementing the comparison.
- **Affected files:** Risk classification HIGH (per `Test_Policy.md` §Risk-Based Testing — core revenue capability) triggered the verdict, combined with the decision being consumed at three structurally different call sites (`lib/order-line-totals.ts`, `services/category-service.ts`, the bulk-edit page).
- **Cross-references:** SRS items REQ-ORDER-006, REQ-MENU-008, REQ-MENUMGT-008, REQ-SETTINGS-001; risk register R-024 (precedence-bug risk, directly mitigated by this decision).

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR-004) matches the actual scope of this REQ.
- [x] `docs/ADR/ADR-004-time-window-price-precedence.md` is authored to canonical prose (not a stub) and status is Accepted.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
