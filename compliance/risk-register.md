# Risk Register — WGB (wawagardenbar-app)

Accepted residual risks, each with date accepted, rationale, compensating control, and target close. Sits alongside `compliance/RTM.md` (requirements) — this tracks accepted risks. Closed risks move to "Closed" with their resolution.

---

## Open

### R-001 — Pre-onboarding baseline: REQ-038/039/040 + REQ-042/043/044/045 deployed before the DevAudit gated flow

**Accepted:** 2026-05-24 (at DevAudit re-onboarding); **scope expanded** 2026-05-25 to cover a second batch.
**Severity:** Medium aggregate
**Owner:** WGB maintainer

**The gap (batch 1, 2026-05-17):** REQ-038 (#84, MEDIUM), REQ-039 (#88, MEDIUM) and REQ-040 (#89, LOW) — a bundled set — were implemented and **merged to `main` (production) on 2026-05-17**, during the window when WGB's DevAudit integration had been removed. They have repo-side evidence (`compliance/evidence/REQ-038|039|040/`) and release tickets, but **no DevAudit release record, no four-eyes review, and no uploaded gate evidence**.

**The gap (batch 2, 2026-05-23):** REQ-042 (#113, MEDIUM — super-admin tab delete with optional inventory revert), REQ-043 (#114, LOW — delete-dialog radio UX), REQ-044 (#115, MEDIUM — `trackByLocation` inventory routing fix), and REQ-045 (#116, LOW — the release PR bundling the above) were **merged to `main` on 2026-05-23** via release PR #116 (`bba04c8`), still within the pre-re-onboarding window. They had neither repo-side evidence nor release tickets at deploy time — they were authored on the false assumption (stale assistant memory) that the SDLC had been retired permanently. RTM scaffolding has been **backfilled retroactively** on 2026-05-25 (rows added with `PRE-ONBOARDING BASELINE` markers; minimal evidence placeholders).

**Decision:** Grandfather both batches as a pre-onboarding baseline rather than fabricate a retroactive "gated" approval (which would be dishonest — the gate did not run before deploy). RTM rows for all seven REQs are marked `PRE-ONBOARDING BASELINE` referencing this entry.

**Compensating controls:**

1. Code is in `main` and observed in production (batch 1 since 2026-05-17, batch 2 since 2026-05-23) — no incidents attributed.
2. Batch 1 has repo-side evidence; batch 2 has retroactive RTM scaffolding + the PR descriptions themselves (which carry detailed change rationale, test plans, and UAT walk-throughs preserved on GitHub).
3. The DevAudit gated flow (CI gates → UAT four-eyes → prod four-eyes → released) is now active and applies to **every new requirement from REQ-046 onward**. No further work ships ungated. REQ-046 (PR #124, IG-1 cadence schema) is the first post-batch-2 gated REQ.

**Target close:** N/A (historical baseline). Bounded — applies only to REQ-038/039/040 and REQ-042/043/044/045.

---

## Closed

### R-002 — `xlsx` (SheetJS) high advisory — CLOSED (REQ-041, 2026-05-24)

**Original gap (accepted at onboarding 2026-05-24):** `xlsx` `^0.18.5` carried two high CVEs — CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS) — reachable via the expense-import parse path (`XLSX.read` on uploaded files in `app/actions/expenses/csv-import-actions.ts`). No fix exists on the npm registry (SheetJS publishes patched builds only via its CDN), so `npm audit fix` could not resolve it; `xlsx` was whitelisted in `sdlc-config.json` `accepted_dep_risks` to let onboarding proceed.

**Resolution (REQ-041, 2026-05-24):** Pinned `xlsx` to the patched SheetJS CDN build **0.20.3** (≥ 0.19.3 and ≥ 0.20.2, fixing both CVEs) in `package.json`; lockfile refreshed. `npm audit --audit-level=high` now exits 0 — `xlsx` is no longer flagged at any level (7 residual moderate advisories remain, below the `--audit-level=high` gate). `xlsx` removed from `accepted_dep_risks` and `ci.yml` regenerated, so the dependency-audit gate is now fully strict (hard-fails on any unaccepted high/critical). Evidence: `compliance/evidence/REQ-041/`.
