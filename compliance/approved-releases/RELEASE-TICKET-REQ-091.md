# Release Ticket — REQ-091

## Requirement

REQ-091: Stabilize REQ-084 AC12 E2E smoke test against nondeterministic menu seed data.

## Change Summary

- Updated `e2e/smoke/req-084-checkout-separation.spec.ts`:
  - AC12 now seeds a deterministic in-stock menu item.
  - Locates the seeded card via `data-testid` instead of clicking the first card.
  - Cleans up the seeded item after the test.
  - Added `kind: 'menu-item'` and `mainCategory: 'food'` to the `seedMenuItem()` helper so the seeded item matches customer-menu queries.

## Risk

LOW — test-only change. No application code, API, schema, auth, payment, or PII changes.

## Evidence

- `compliance/evidence/REQ-091/test-scope.md`
- `compliance/evidence/REQ-091/ai-use-note.md`
- `compliance/evidence/REQ-091/security-summary.md`
- CI Quality Gates passed on PR #479.

## Verification

- [x] TypeScript Check passed
- [x] ESLint 0 errors
- [x] SAST scan at baseline
- [x] Dependency audit at baseline
- [x] E2E tests passed on PR

## Sign-off

| Role | Name | Date |
| ---- | ---- | ---- |
| Implementer | AI (Cascade) | 2026-07-13 |
| Reviewer | TBD | |
| Approver | TBD | |

## Release PR

- Integration PR: #479 → develop
- Release PR: TBD (develop → main)
