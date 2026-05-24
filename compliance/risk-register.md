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

### R-002 — `xlsx` (SheetJS) high advisory accepted for the dependency-audit gate

**Accepted:** 2026-05-24 (at DevAudit re-onboarding)
**Severity:** High (1 advisory)
**Owner:** WGB maintainer
**Target close:** a dedicated dependency-hardening REQ

**The gap:** `npm audit` reports 1 high advisory on `xlsx` (SheetJS) — prototype-pollution / ReDoS. There is no fix on the npm registry (recent SheetJS builds are published only via the SheetJS CDN), so `npm audit fix` cannot resolve it. To let the strict dependency-audit gate pass at onboarding, `xlsx` is whitelisted in `sdlc-config.json` `accepted_dep_risks`.

**Compensating controls:** SAST (Semgrep) continues to gate at baseline 0; `npm audit` still runs and uploads results to DevAudit as evidence — only the fail-the-build is relaxed for `xlsx`.

**Resolution path:** A follow-up REQ to migrate to the SheetJS CDN build (or replace `xlsx`), after which `xlsx` is removed from `accepted_dep_risks` and the gate goes fully strict.

---

## Closed

_None yet._
