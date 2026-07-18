# Security Evidence Summary — REQ-094

**Date:** 2026-07-18

| Control              | Result | Evidence                                                                                                                                     |
| -------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| SAST                 | PASS   | Quality Gates run 29645454045 completed successfully.                                                                                        |
| Dependency audit     | PASS   | Quality Gates run 29645454045 completed successfully.                                                                                        |
| Report authorisation | PASS   | Existing admin/super-admin action and API guards remain unchanged; scoped regression requires authenticated admin state.                     |
| Migration safety     | PASS   | `backfill-order-category-attribution.ts` defaults to dry-run, is additive/idempotent, and records `legacy_current_menu_fallback` provenance. |
| Historical integrity | PASS   | New orders persist immutable sale-time taxonomy; reports prefer it over current menu metadata.                                               |

## Post-deploy controls

- Run `npx tsx scripts/backfill-order-category-attribution.ts --dry-run` against production first and retain the emitted counts in the release record.
- An independent reviewer must approve the counts before `--apply` is used.
- Re-run the same command after apply; `ordersUpdated` must be zero or be investigated before marking the release complete.
- Verify the UAT/prod report smoke against a known WAT-boundary order and a reclassified menu item.
