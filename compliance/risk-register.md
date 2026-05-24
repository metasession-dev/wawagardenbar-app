# Risk Register — WGB (wawagardenbar-app)

Accepted residual risks, each with date accepted, rationale, compensating control, and target close. Sits alongside `compliance/RTM.md` (requirements) — this tracks accepted risks. Closed risks move to "Closed" with their resolution.

---

## Open

### R-001 — Pre-onboarding baseline: REQ-038/039/040 deployed before the DevAudit gated flow

**Accepted:** 2026-05-24 (at DevAudit re-onboarding)
**Severity:** Medium aggregate (2 × MEDIUM + 1 × LOW)
**Owner:** WGB maintainer

**The gap:** REQ-038 (#84, MEDIUM), REQ-039 (#88, MEDIUM) and REQ-040 (#89, LOW) — a bundled set — were implemented and **merged to `main` (production) on 2026-05-17**, during the window when WGB's DevAudit integration had been removed. They therefore have repo-side evidence (`compliance/evidence/REQ-038|039|040/`) and release tickets, but **no DevAudit release record, no four-eyes review, and no uploaded gate evidence**. The deploy was not gated by the SDLC pipeline.

**Decision:** Grandfather them as a **pre-onboarding baseline** rather than fabricate a retroactive "gated" approval (which would be dishonest — the gate did not run before deploy). RTM rows for these three are marked `PRE-ONBOARDING BASELINE` referencing this entry.

**Compensating controls:**

1. Code is in `main` and observed in production since 2026-05-17 (no incidents attributed).
2. Repo-side evidence (test-scope/plan, release tickets) exists for traceability.
3. The DevAudit gated flow (CI gates → UAT four-eyes → prod four-eyes → released) is now active and **applies to every requirement from REQ-041 onward**. No further work ships ungated.

**Target close:** N/A (historical baseline). Bounded — applies only to REQ-038/039/040.

---

## Closed

### R-002 — `xlsx` (SheetJS) high advisory — CLOSED (REQ-041, 2026-05-24)

**Original gap (accepted at onboarding 2026-05-24):** `xlsx` `^0.18.5` carried two high CVEs — CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS) — reachable via the expense-import parse path (`XLSX.read` on uploaded files in `app/actions/expenses/csv-import-actions.ts`). No fix exists on the npm registry (SheetJS publishes patched builds only via its CDN), so `npm audit fix` could not resolve it; `xlsx` was whitelisted in `sdlc-config.json` `accepted_dep_risks` to let onboarding proceed.

**Resolution (REQ-041, 2026-05-24):** Pinned `xlsx` to the patched SheetJS CDN build **0.20.3** (≥ 0.19.3 and ≥ 0.20.2, fixing both CVEs) in `package.json`; lockfile refreshed. `npm audit --audit-level=high` now exits 0 — `xlsx` is no longer flagged at any level (7 residual moderate advisories remain, below the `--audit-level=high` gate). `xlsx` removed from `accepted_dep_risks` and `ci.yml` regenerated, so the dependency-audit gate is now fully strict (hard-fails on any unaccepted high/critical). Evidence: `compliance/evidence/REQ-041/`.
