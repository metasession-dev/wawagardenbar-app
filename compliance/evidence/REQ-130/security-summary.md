# Security Evidence Summary — REQ-130

**Date:** 2026-11-27
**Risk class:** LOW

| Control                              | Result            | Evidence                                                                                                                                                                  |
| ------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                     | PASS              | `npm audit --omit=dev --audit-level=high`: no high or critical findings; nothing added or changed                                                                         |
| SAST                                 | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` runs in CI                                                                                              |
| Menu entry matches the page's access | PASS              | The menu, the Support layout and the proxy route table use one role list (`lib/dashboard-section-roles.ts`); a kitchen-only member and a customer are refused (unit, e2e) |
| New dependencies / external calls    | PASS              | None                                                                                                                                                                      |

## Data handling

No personal data is read, stored or sent by this change.

## Post-deploy controls

- Revert the merge to roll back; the new collection and values are additive.

## Bundled Release Context

- **Core tracked release:** `REQ-129`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (the docs note on Paystack keys, PR #1104); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-129.md`
- **Why bundled here:** REQ-129 (WA-13, MEDIUM) and REQ-130 (#1087, LOW) were declared as one bundle at planning time by the operator; both add one entry to `components/features/admin/dashboard-nav.tsx` (the overlap was accepted) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-129, and covers both.
- **Reviewer impact:** approval covers REQ-129 and its co-tracked member REQ-130 (the bundle runs at MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-85 to R-87 in `compliance/risk-register.md` (REQ-130 opens none).
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa13-bookings-support-link`
