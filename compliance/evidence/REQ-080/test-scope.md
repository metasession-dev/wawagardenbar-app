# Test Scope - REQ-080

**Risk Level:** HIGH
**Requirement:** Resolve high-severity dependency audit findings.
**GitHub Issue:** [#380](https://github.com/metasession-dev/wawagardenbar-app/issues/380)
**Date:** 2026-06-14

## Test Approach

This is a dependency security remediation. Testing must prove both the security gate outcome and that the updated toolchain still supports the project's normal verification path.

## In Scope

- `npm audit --audit-level=high` must pass.
- Dependency changes required to clear the high-severity `esbuild` advisory chain.
- Toolchain compatibility for TypeScript, ESLint, Vitest, Next build, and CI E2E.
- CI execution on branch `fix/REQ-080-dependency-audit`.

## Out of Scope

- Application feature changes.
- ESLint 9 flat-config migration unless npm resolution makes it unavoidable.
- Broad framework upgrades unrelated to the high-severity audit findings.
- Moderate advisories with no available fix, unless npm can safely resolve them as part of the same minimal update.

## Acceptance Criteria

- [ ] AC1: Given the dependency update is applied, when CI runs `npm audit --audit-level=high`, then the dependency audit gate passes with zero high-severity vulnerabilities.
- [ ] AC2: Given the updated dependency tree, when CI runs TypeScript and SAST, then both gates pass.
- [ ] AC3: Given dependency audit no longer blocks the pipeline, when CI continues past audit, then E2E and build gates execute instead of being skipped by the audit failure.
- [ ] AC4: Given this is a security dependency remediation, when reviewing the diff, then changes are limited to `package.json`, `package-lock.json`, RTM, and REQ-080 evidence markdown unless a documented verification issue requires otherwise.

## Risk-Based Depth

HIGH risk due to high-severity dependency advisories in the build/test toolchain. Required evidence: local targeted audit/type/test checks where practical, plus GitHub Actions CI for authoritative gate execution.
