# Security Summary — REQ-051

**Requirement:** REQ-051 — DFR aggregation queries by business-day range, not calendar-day range
**Risk Level:** HIGH (financial reporting)
**Date:** 2026-05-30

## STRIDE (per implementation-plan.md)

| Category                | Risk                                                                                                                                                                                                                              | Mitigation                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** (Spoofing)        | N/A — no auth surface change. Existing admin/super-admin gating on the report endpoint unchanged.                                                                                                                                 | —                                                                                                                                                          |
| **T** (Tampering)       | N/A — query-only change, no data mutation.                                                                                                                                                                                        | —                                                                                                                                                          |
| **R** (Repudiation)     | N/A — no audit log change.                                                                                                                                                                                                        | —                                                                                                                                                          |
| **I** (Info disclosure) | Could the new range expose data that wasn't visible before? **No** — the change re-buckets which orders count for _today's report_, not _who can see them_. Authenticated admins are already authorised to see every report date. | Unit tests cover the boundary at the cutoff (08+09 in `business-date.test.ts`); integration tests verify the `$or` branch keying (`business-day.test.ts`). |
| **D** (DoS)             | Same index (`businessDate`), same query shape, same row volume. No new round-trips beyond the existing `getBusinessDayCutoff()` fetch (which the order-create flow already does).                                                 | —                                                                                                                                                          |
| **E** (Elevation)       | N/A — no role/permission change.                                                                                                                                                                                                  | —                                                                                                                                                          |

## Gate results

- `semgrep scan --severity ERROR` — 0 new findings on REQ-051 code (4 pre-existing on DevAudit-generated workflow files unchanged; same status as REQ-048/049/050).
- `npm audit --audit-level=high` — 0 high/critical (7 residual moderate; below gate).

## Notes

- The new awaited `SystemSettingsService.getBusinessDayCutoff()` fetch reads a system-settings document that's controlled by super-admin via `/dashboard/settings`. There's no untrusted input path into the cutoff value.
- The fallback on invalid cutoff (`'15:00'`) matches the existing `deriveBusinessDate` behaviour (REQ-025) — no behaviour drift on malformed settings.
