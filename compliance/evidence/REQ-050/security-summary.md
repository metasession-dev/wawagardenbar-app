# Security Summary — REQ-050

**Requirement:** REQ-050 — Expense-restock stock-leak fix for `trackByLocation` inventory
**Date:** 2026-05-28
**Risk Level:** HIGH

## Threat closed

**Silent ledger value-loss for `trackByLocation` inventory items via the expense-restock path.** Pre-REQ-050, every expense restock against a location-tracked item incremented top-level `currentStock` via `$inc` but left `locations[*].currentStock` untouched. The next unrelated `inventory.save()` anywhere in the system (snapshot reconciliation, admin edit, etc.) fired the pre-save hook, which recomputes `currentStock = sum(locations)` — and silently clobbered the restock to zero (or to whatever the locations array still summed to). Operators couldn't trust the displayed stock; real-world reordering and accounting decisions were made against wrong data. Same defect class as REQ-044 / PR #115 (the order path), applied to a code path REQ-044 didn't audit.

## Full STRIDE threat model

See `compliance/evidence/REQ-050/implementation-plan.md` § _Threat model (STRIDE)_ — table covers all six categories. The primary closures:

- **Ledger correctness** — the displayed `currentStock` now matches the audit trail (StockMovement history). Operators can trust the dashboard again.
- **R**epudiation posture — already strong (StockMovement audit trail unchanged). This REQ removes a class of "the system says X but the receipts say Y" disputes that previously had no clean resolution.
- **D**enial of service / concurrent-write race safety — Mongoose's `__v` versioning on the doc-save path provides a stronger race guarantee than the previous `updateOne $inc` (no version check). A concurrent restock loses with `VersionError`, surfacing cleanly via the catch + reversal pass.

## Gate posture

| Gate                               | Result                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Semgrep (SAST, `--severity ERROR`) | **0 findings on REQ-050 code.** 4 pre-existing findings on DevAudit-generated workflow files are unchanged (see REQ-048/049 notes). |
| `npm audit --audit-level=high`     | 0 high/critical.                                                                                                                    |
| TypeScript (`tsc --noEmit`)        | Clean — no `any` introduced.                                                                                                        |
| ESLint                             | 0 errors on changed files.                                                                                                          |

## Code surface

- **No new external attack surface.** No new endpoint, no auth/RBAC change. The expense-link path remains admin-gated upstream by `confirmTransfer` / `updateExpense` callers.
- **No new external npm dependencies.**
- **The reconciliation script is operator-tooled** — must be invoked with a connection URI, defaults to dry-run, requires explicit `--apply` to write. Not part of the runtime; not reachable from the web app.

## Logging discipline

`runReversalPass`'s error swallowing pattern is preserved (best-effort cleanup; logged via `console.error` with the `[expense-inventory-link]` prefix). The new helper throws on the receiving-location-would-go-negative case — surfaced to the caller's try/catch (apply path) or propagated up (reverse path before any StockMovement create, so no orphaned audit row).

## Out of scope (security-relevant, explicit)

- Provider-signature hardening / authn for the webhooks — covered separately by REQ-049.
- Rate-limiting / WAF — platform-level.
- Audit-log integrity beyond StockMovement (e.g. who reconciled when) — could be tightened with a dedicated reconciliation log; not in REQ-050 scope.
