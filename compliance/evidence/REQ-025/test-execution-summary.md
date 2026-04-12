# Test Execution Summary — REQ-025

**Date:** 2026-04-12
**Executed by:** William / Cascade
**Branch:** develop (commit 3137626)
**CI Run:** #51 (ID 24301252401) — https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24301252401

## Unit Tests

| Suite                                                 | Tests   | Passed  | Failed | Duration  |
| ----------------------------------------------------- | ------- | ------- | ------ | --------- |
| `__tests__/lib/business-date.test.ts`                 | 14      | 14      | 0      | <1s       |
| `__tests__/reports/business-date-attribution.test.ts` | 7       | 7       | 0      | <1s       |
| All other suites (regression)                         | 228     | 228     | 0      | ~1s       |
| **Total**                                             | **249** | **249** | **0**  | **1.23s** |

## E2E Tests

Registered in `playwright.config.ts` under `business-day-cutoff` project.
Run against UAT (https://wawagardenbar-app-uat.up.railway.app) — all 6 tests passed.

Local runs blocked by EMFILE (too many open file descriptors) on dev machine — CI used instead.

## Gate Summary

| Gate             | Command                                       | Result                                    |
| ---------------- | --------------------------------------------- | ----------------------------------------- |
| TypeScript       | `npx tsc --noEmit`                            | ✅ 0 errors                               |
| SAST             | `semgrep scan --config auto` on REQ-025 files | ✅ 0 findings                             |
| Dependency audit | `npm audit --audit-level=high`                | ✅ 0 unaccepted (next upgraded to 16.2.3) |
| Unit tests       | `npx vitest run`                              | ✅ 249/249                                |
| CI pipeline      | GitHub Actions                                | ✅ Green                                  |
