# Test Scope — REQ-093

**Requirement:** Fix `compliance-evidence.yml` to upload `compliance/security-summary-<version>.md` housekeeping security summary files to the portal.

**Risk:** LOW — CI infrastructure change only; no application code, no user-facing behaviour, no auth, no payments.

**AI involvement:** Yes — Cascade generated the workflow patch.

## Acceptance Criteria

| # | Criterion | Test type |
|---|-----------|-----------|
| AC1 | After merging a housekeeping release stub PR, `compliance-evidence.yml` uploads `compliance/security-summary-<version>.md` as `security_summary` evidence against the correct versioned release | CI log inspection |
| AC2 | The upload targets the version extracted from the filename (e.g. `security-summary-v2026.07.14.md` → release `v2026.07.14`) | CI log inspection |
| AC3 | Commit convention validator accepts all commits with `Ref: REQ-093` trailer | CI green |
| AC4 | All historical `compliance/security-summary-*.md` files at project root are uploaded (backfill) | CI log inspection |

## Out of scope

- Application runtime behaviour
- Per-REQ `compliance/evidence/REQ-*/security-summary.md` upload (already handled by existing per-REQ loop)
