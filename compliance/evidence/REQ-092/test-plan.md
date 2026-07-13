# Test Plan — REQ-092

**Issue:** [#485](https://github.com/metasession-dev/wawagardenbar-app/issues/485)
**Risk class:** LOW
**Date:** 2026-07-13

## Test files

| Test file | Type | ACs covered |
|-----------|------|-------------|
| `e2e/menu-category-cascade.spec.ts` | E2E regression | AC1, AC2, AC3 |

## AC coverage

| AC | Test file | Test name | Type |
|----|-----------|-----------|------|
| AC1 | `e2e/menu-category-cascade.spec.ts` | `express order shows items on landing grouped by category, search filters items, and cart persists across category changes` | E2E |
| AC2 | `e2e/menu-category-cascade.spec.ts` | Code review of locator changes | Code review |
| AC3 | `e2e/menu-category-cascade.spec.ts` | All tests in describe block | E2E |
| AC4 | N/A | Diff: no `app/`, `lib/`, `services/`, `models/` files changed | Diff review |
