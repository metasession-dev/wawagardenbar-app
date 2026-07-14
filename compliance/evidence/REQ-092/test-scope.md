# Test Scope — REQ-092

**Issue:** [#485](https://github.com/metasession-dev/wawagardenbar-app/issues/485)
**Risk class:** LOW
**Date:** 2026-07-13

## Acceptance criteria

| AC | Description | SRS-ID | Risk | Verification method |
|----|-------------|--------|------|---------------------|
| AC1 | `express order shows items on landing...` test passes consistently in CI without timing out on the item click | REQ-TEST-001 @srs-deferred | LOW | E2E regression |
| AC2 | Hard `waitForTimeout` waits replaced with Playwright `toBeVisible` assertions before item clicks | REQ-TEST-001 @srs-deferred | LOW | Code review |
| AC3 | All other tests in `menu-category-cascade.spec.ts` continue to pass | REQ-TEST-001 @srs-deferred | LOW | E2E regression |
| AC4 | No application code (`app/`, `lib/`, `services/`, `models/`) modified | N/A | LOW | Diff review |
