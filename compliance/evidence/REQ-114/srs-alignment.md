---
req: REQ-114
generated_by: requirements-aligner
generated_at: 2026-10-23T22:50:00Z
---

# SRS alignment — REQ-114

## ACs traced

| AC  | SRS item                                                                                                                                                                                                               | Action this cycle                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | —                                                                                                                                                                                                                      | `@srs-deferred: supply-chain control enforced by CI (scripts/evaluate-npm-audit.sh + compliance/security/accepted-vulnerabilities.json), not product behaviour` — next free ID if wanted: REQ-SEC-005 |
| AC2 | REQ-AUTHC-001, REQ-AUTHC-003, REQ-ORDER-004, REQ-FIN-004, REQ-FIN-008, REQ-REWMGT-001, REQ-REWMGT-002, REQ-SETTINGS-003, REQ-SETTINGS-004, REQ-PRIVACY-001, REQ-API-001, REQ-API-002, REQ-MENUMGT-007, REQ-MENUMGT-010 | unchanged (trace-only) — behaviour preserved; no SRS prose edit                                                                                                                                       |
| AC3 | Same items as AC2                                                                                                                                                                                                      | unchanged (trace-only) — same rejection messages preserved; no SRS prose edit                                                                                                                         |
| AC4 | —                                                                                                                                                                                                                      | `@srs-deferred: test-suite integrity (process), not product behaviour`                                                                                                                                |

## Notes

- **No new SRS items, no stale items.** The upgrade preserves every behaviour the traced items describe. The one behaviour change, `z.number()` now rejecting `±Infinity` (plan § Plan deviation item 3), touches no SRS item: none specifies acceptance of non-finite numbers.
- **SRS drift (advisory, pre-existing on `develop`):** `REQ-ORDMGT-011`, `REQ-ORDMGT-012`, `REQ-ORDMGT-015`, `REQ-ORDMGT-016` have heading blocks but no summary-table row.

**Gap status:** `CLEAN` — every AC traces to an existing SRS item or carries `@srs-deferred`.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items have been edited from stubs to canonical Given/When/Then prose. _(N/A — none added.)_
- [ ] Stale items have been brought current. _(N/A — none stale.)_

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
