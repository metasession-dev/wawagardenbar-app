---
req: REQ-113
generated_by: requirements-aligner
generated_at: 2026-10-23T23:30:00Z
---

# SRS alignment — REQ-113

## ACs traced

| AC       | SRS item        | Action this cycle                                                                                                                                                   |
| -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1–AC20 | REQ-MENUMGT-011 | added: summary-table row plus Given/When/Then block in `docs/SRS.md`. The operator approved the ID and wording on 2026-10-23, and the `@srs-stub` marker is removed |
| AC6      | REQ-MENUMGT-009 | unchanged (trace-only): the print price fallback mirrors Edit All's unset-value fallback, and Edit All is not modified                                              |
| AC2, AC5 | REQ-MENUMGT-005 | unchanged (trace-only): reads the main-category registry (enabled flag, order) without modifying it                                                                 |

## Notes

- **Implementation matches the SRS block.** The source-of-truth files named in the REQ-MENUMGT-011 row (`app/dashboard/menu/print/page.tsx`, `lib/menu-print/*`, `app/actions/admin/menu-print-actions.ts`) are the files this branch adds. The plan's one deviation is ASCII `...` for clipped titles and `N` for the naira sign, because jsPDF's WinAnsi Helvetica can't render `…` or `₦`. Both are rendering details the SRS prose doesn't specify, so no SRS edit is needed.
- **No stale items.** No existing SRS item's source-of-truth file is modified, apart from the toolbar button added to `app/dashboard/menu/page.tsx`, which REQ-MENUMGT-011 itself covers.
- **SRS drift (advisory, pre-existing on `develop`):** `REQ-ORDMGT-011`, `REQ-ORDMGT-012`, `REQ-ORDMGT-015` and `REQ-ORDMGT-016` have heading blocks but no summary-table row.

**Gap status:** `CLEAN`. Every AC traces to an SRS item.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [ ] Stale items have been brought current. _(N/A — none stale.)_

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
