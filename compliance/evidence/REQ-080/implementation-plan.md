# Implementation Plan - REQ-080

**Requirement:** REQ-080
**GitHub Issue:** [#380](https://github.com/metasession-dev/wawagardenbar-app/issues/380)
**Risk Level:** HIGH
**Date:** 2026-06-14

## Approach

Resolve the high-severity dependency audit failure separately from REQ-079 by updating only the vulnerable dependency chain needed to make `npm audit --audit-level=high` pass. Keep the change focused on dependency metadata (`package.json` / `package-lock.json`) unless verification proves a configuration adjustment is required.

## Files to Create

- `compliance/evidence/REQ-080/implementation-plan.md` - this plan.
- `compliance/evidence/REQ-080/test-scope.md` - acceptance criteria and risk-based testing scope.
- `compliance/evidence/REQ-080/test-plan.md` - command-level verification plan.
- `compliance/evidence/REQ-080/ai-use-note.md` - AI assistance note.

## Files to Modify

- `compliance/RTM.md` - add REQ-080 traceability row.
- `package.json` - only if direct dependency version ranges must be updated to clear high-severity audit findings.
- `package-lock.json` - expected lockfile update from npm dependency resolution.

## Architecture Decisions

No ADR needed - this is a dependency security remediation using existing package-manager resolution. No new subsystem, database, queue, external service, or cross-cutting architecture pattern is introduced.

## Dependencies

No new packages are planned. Existing package versions may be raised within compatible ranges or to patched releases as required by `npm audit`.

## Risks / Considerations

- Dependency updates may pull transitive changes that affect dev/build/test tooling.
- `@vitejs/plugin-react`, `vite`, `tsx`, and `esbuild` sit on the toolchain path, so TypeScript, Vitest, lint, build, and CI E2E must verify no regression.
- Moderate advisories with no available fix may remain, but the acceptance criterion is zero high-severity findings for `npm audit --audit-level=high`.
- The change must stay separate from REQ-079's script fix even though REQ-079's CI exposed the audit failure.

## Post-Deploy Actions

None. This is a dependency metadata/tooling update with no runtime migration or data migration.
