---
req: REQ-098
generated_by: requirements-aligner
generated_at: 2026-08-03T00:00:00Z
---

# SRS alignment — REQ-098

## ACs traced

| AC          | SRS item                    | Action this cycle                                                                                                                                         |
| ----------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1         | REQ-TABMGT-007              | added (new) — schema substrate for the write-off journey, folded into AC2's stub                                                                          |
| AC2         | REQ-TABMGT-007              | added (new) — write-off service method + audit log                                                                                                        |
| AC2 (audit) | REQ-AUDIT-001               | unchanged (existing) — general "admin actions appear in audit log" already covers a new `tab.write_off` action instance                                   |
| AC3         | REQ-TABMGT-007              | added (new) — RBAC gate covered as a Given/When/Then bullet in the same entry                                                                             |
| AC4         | REQ-TABMGT-007              | added (new) — UI dialog covered as a Given/When/Then bullet in the same entry                                                                             |
| AC5         | REQ-TABMGT-008; REQ-INV-019 | added (new) — tabs-list visibility flag (REQ-TABMGT-008) + incident scan (REQ-INV-019)                                                                    |
| AC6         | REQ-REPORT-006              | added (new) — written-off report section                                                                                                                  |
| AC7         | `@srs-deferred`             | one-time production remediation script, not a recurring system behaviour — verified via the script's own dry-run output + a fixture test, not SRS-tracked |

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been written as canonical Given/When/Then prose directly (`docs/SRS.md` Feature Areas 11, 15, 17) rather than left as stubs, given the HIGH-risk plan-approval checkpoint already provided an operator review point.
- [x] Stale items — none; no existing SRS item required updating for this REQ.

**Reviewer:** william@ostendo.io
**Date:** 2026-08-03
