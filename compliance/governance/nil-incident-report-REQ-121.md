---
incident_id: 'NIL-REQ-121'
incident_kind: 'no_incidents_attestation'
source_release: 'REQ-121'
semantic_id: 'NIL-REQ-121'
severity: 'N/A'
detected_at: '2026-11-17'
resolved_at: 'N/A'
status: 'nil'
---

# Nil Incident Report — REQ-121 (bundle with REQ-122)

## Attestation

No `incident`-labelled issue was opened or closed during the REQ-121 and REQ-122 implementation and test cycle. Defects found by the first real end-to-end runs were fixed on the same branch before any push, and never reached a shared environment: a tipped customer order could not be created (the order model requires a tip method), the first-name field flashed then disappeared, a malformed staff alert number was stored as `+080...`, and the new staff components used a toast library with no mounted toaster. Each is recorded in `compliance/evidence/REQ-121/test-execution-summary.md` and the plan deviations, and pinned by unit tests.

## Scope

- **Release:** REQ-121 (co-tracked: REQ-122)
- **Test cycles:** local Vitest full suite (2129 passed); local Playwright new specs; local Playwright `smoke` + `critical` tiers (569 passed, 2 test-side failures fixed and re-run green)
- **Defects filed:** 0 incidents; five follow-up issues (#1042 to #1046) for findings outside this scope
- **Incidents reported:** 0

## Framework attribution

- [x] `ISO29119.3.5.4` — Test incident report (nil report for this release cycle)

## Sign-off

| Role             | Name                           | Date    |
| ---------------- | ------------------------------ | ------- |
| Test lead        | Pending independent UAT review | Pending |
| Engineering lead | Pending operator review        | Pending |
