# Test Scope - REQ-079

**Risk Level:** LOW
**Requirement:** Fix local verification scripts after DevAudit sync.
**GitHub Issue:** [#377](https://github.com/metasession-dev/wawagardenbar-app/issues/377)
**Date:** 2026-06-13

## Test Approach

This is an internal tooling and verification-path change. It does not change application runtime behavior, user-facing surfaces, authentication, authorization, payments, financial calculations, or data handling.

Standard gates apply, with targeted verification of the exact local command that failed in the issue.

## In Scope

- `package.json` scripts for lint and unit-test verification.
- Local ESLint invocation compatibility with the repository's current legacy `.eslintrc.json` configuration.
- Lockfile-consistent dependency install state before validating lint, because the current `node_modules` contains invalid `eslint@9.39.4` while the repository range is `^8.57.1`.
- Verification that `npm run lint && npx tsc --noEmit && npm test` is the supported local verification command for this branch.

## Out of Scope

- Migrating to ESLint 9 flat config.
- Changing application source code.
- Adding or changing production dependencies.
- Changing Next.js, TypeScript, Vitest, or Playwright versions.
- Modifying CI workflows unless local verification reveals a direct mismatch with the script names.

## Acceptance Criteria

- [ ] AC1: Given a lockfile-consistent install, when the operator runs `npm run lint`, then the command runs ESLint directly and no longer fails with the unsupported `next lint` project-directory error.
- [ ] AC2: Given the repository test suite, when the operator runs `npm test`, then the Vitest suite runs via the package script.
- [ ] AC3: Given a lockfile-consistent install, when the operator runs `npm run lint && npx tsc --noEmit && npm test`, then lint, typecheck, and unit tests execute in sequence as the supported local verification path.
- [ ] AC4: Given the repository still uses `.eslintrc.json`, when dependencies are restored from `package-lock.json`, then ESLint resolves to a compatible 8.x install rather than an ESLint 9 flat-config-only install.

## Risk-Based Depth

LOW risk. Targeted script validation plus the universal local gates are sufficient. Full E2E is not load-bearing for this script-only fix, but remains part of the broader project gate policy before push/PR if the environment is available.
