# Test Plan — REQ-093

**Issue:** [#496](https://github.com/metasession-dev/wawagardenbar-app/pull/496)
**Risk class:** LOW
**Date:** 2026-07-14

## Test files

| Test file | Type | ACs covered |
|-----------|------|-------------|
| `.github/workflows/compliance-evidence.yml` | Workflow review + CI log inspection | AC1, AC2, AC4 |
| `scripts/validate-commit-convention.sh` | Existing CI validation | AC3 |

## AC coverage

| AC | Test file | Test name | Type |
|----|-----------|-----------|------|
| AC1 | `.github/workflows/compliance-evidence.yml` | Review root-level `compliance/security-summary-*.md` upload loop and confirm upload in CI log | Workflow review + CI log |
| AC2 | `.github/workflows/compliance-evidence.yml` | Review filename-to-version extraction and confirm target release in CI log | Workflow review + CI log |
| AC3 | `scripts/validate-commit-convention.sh` | PR commits with `Ref: REQ-093` pass Compliance Validation | CI validation |
| AC4 | `.github/workflows/compliance-evidence.yml` | Review glob loop over all matching root-level security summaries and confirm backfill behavior in CI log | Workflow review + CI log |
