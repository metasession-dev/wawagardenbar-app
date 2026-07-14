# Release Ticket — REQ-092

## Requirement

REQ-092: Fix post-merge E2E regression — `menu-category-cascade.spec.ts` timing out on `[aria-disabled="false"]` selector in CI.

## Change Summary

- Updated `e2e/menu-category-cascade.spec.ts` (4 lines):
  - Replaced 2× `waitForTimeout(400)` hard waits with `expect(locator).toBeVisible()` assertions after search fill and after search clear.
  - Added 2× `toBeVisible` guards immediately before `[aria-disabled="false"]` click operations (lines 95, 116).
  - Root cause: hard-coded 400ms wait insufficient in slow CI after a 23-minute regression run; Playwright timed out at 30s.

## Risk

LOW — test-only change. No application code, API, schema, auth, payment, or PII changes.

## Evidence

- `compliance/evidence/REQ-092/test-scope.md`
- `compliance/evidence/REQ-092/test-plan.md`
- `compliance/evidence/REQ-092/security-summary.md`
- `compliance/plans/REQ-092/implementation-plan.md`
- CI Quality Gates passed on PR #487.

## Verification

- [x] TypeScript Check passed (0 errors)
- [x] ESLint 0 errors
- [x] SAST scan — no new findings (test-only change, scope `app/ lib/ services/ models/`)
- [x] Dependency audit at baseline (no deps changed)
- [x] CI Quality Gates passed on PR #487

## Sign-off

| Role | Name | Date |
| ---- | ---- | ---- |
| Implementer | AI (Cascade) | 2026-07-13 |
| Reviewer | TBD | |
| Approver | TBD | |

## Release PR

- Integration PR: [#487](https://github.com/metasession-dev/wawagardenbar-app/pull/487) → develop
- Release PR: TBD (develop → main)
