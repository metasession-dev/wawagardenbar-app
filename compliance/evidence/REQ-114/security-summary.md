# Security Evidence Summary — REQ-114

**Date:** 2026-10-23

| Control                                     | Result | Evidence                                                                                                                                                                                                                                                     |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency audit (the reason for this REQ)  | PASS   | `scripts/evaluate-npm-audit.sh` on `npm audit --json`: `0 accepted, 0 unresolved`. Before: `Unaccepted high risk: GHSA-mrhx-c7xc-m3w5 (zod@3.25.76)`. Fixed by upgrade (`zod` 4.6.7 ≥ patched 4.6.6); no exception added to `accepted-vulnerabilities.json`. |
| SAST                                        | PASS   | `npx tsc --noEmit` 0 errors; `npm run lint` 0 errors (999 pre-existing warnings, unchanged); CI Quality Gates also runs semgrep.                                                                                                                             |
| Input validation preserved                  | PASS   | Accept/reject behaviour and messages verified against zod 3.25.76 (39/40 message cases identical; 21 emails + 12 URLs identical). The one change, `±Infinity` now rejected, is stricter, not looser. No validator loosened.                                  |
| Server-side validation intact               | PASS   | Server actions still parse before touching services; `__tests__/actions/zod4-action-errors.test.ts` asserts invalid input returns the pre-upgrade message and never reaches `ProfileService`/`RewardsService`.                                               |
| New dependencies / secrets / external calls | PASS   | None. Two existing packages change major version (`zod`, `@hookform/resolvers`, same maintainers, lockfile-pinned). No secrets, credentials or new network calls.                                                                                            |

## Data handling

No new personal-data field, category, purpose or retention. The upgrade changes the validation library under existing forms that already handle personal data (name, email, phone, address, credentials), and keeps the same validation rules, so the data minimisation those rules enforce is unchanged (see implementation plan §6).

## Post-deploy controls

- No migration and no schema change.
- Reversible via `git revert` of the REQ-114 merge (re-exposes the advisory and re-blocks the audit gate).
- Re-run of CI's dependency-audit gate on `develop` after merge confirms the advisory is cleared there.

## Bundled Release Context

- **Core tracked release:** `REQ-114`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` — `ff2171b` (DevAudit template sync, PR #955), `208f3da` (next 16.4.2 / dompurify 3.4.17 audit bump, PR #952), `4ee226e` (gitignore playwright-report shards, PR #951), `055ddb4` (REQ-112/REQ-111 close-out, PR #950). See `compliance/pending-releases/BUNDLED-CHANGES-REQ-114.md`.
- **Why bundled here:** REQ-114 is the next tracked release after those housekeeping merges landed on `develop`; housekeeping registers no release of its own and is absorbed by the next tracked one.
- **Evidence impact:** Evidence ownership remains on each source; nothing is relabelled as produced by REQ-114.
- **Reviewer impact:** UAT/Production approval scope covers REQ-114 plus the four housekeeping commits listed.
- **Security / risk impact:** `208f3da` is itself a security-motivated dependency bump (audit gate) already reviewed in PR #952; the template sync changes CI workflows (reviewed in PR #955). No additional risk from bundling.
- **Reference:** commit range `origin/main..HEAD`
