# Release Ticket: REQ-110 — Resolve nodemailer/brace-expansion CVEs; braces stays accepted

**Status:** RELEASED
**Date:** 2026-10-16
**Requirement ID:** REQ-110
**Risk Level:** HIGH
**Issue:** [#910](https://github.com/metasession-dev/wawagardenbar-app/issues/910)
**Implementation branch:** `feat/REQ-110-dependency-cve-remediation`

## Summary

19 npm audit high/critical advisories were tracked in #910 as risk-accepted after an earlier patch-level sweep (REQ-? — the `next`/`sharp`/`source-map-js`/`engine.io` bumps landed via PR #913). Of those 19 (plus 16 pre-existing `brace-expansion` acceptances tracked in #584), this REQ resolves all but one outright:

- `brace-expansion` (`GHSA-mh99-v99m-4gvg`, `GHSA-rgw5-rvv9-x895`, `GHSA-qhr7-859c-m2p7`, `GHSA-6j4f-fj2g-mc7p`) — the `minimatch@3.1.5`/`minimatch@9.0.9` `overrides` were pinned to `brace-expansion` `1.1.16`/`2.1.2` on the assumption the only fix was the API-incompatible `5.x` rewrite. Patched releases exist within the same major lines (`1.1.21`, `2.1.7`) that satisfy minimatch's own declared dependency ranges — no consumer migration needed. Also closes #584.
- `nodemailer` (`GHSA-v53p-9fqp-m79j`, `GHSA-prgh-xp8r-p3m5`) — upgraded `9.1.1` → `10.1.2`. Confirmed via the 10.0.0 changelog/release notes that the only breaking change is a Node ≥20 runtime requirement, already satisfied; no API change affects this project's `createTransport`/`sendMail`/`Transporter` usage in `lib/email.ts`.
- `braces@3.0.3` (`GHSA-vfj7-8cjw-p6xm`) — stays risk-accepted. No patched release exists upstream as of 2026-10-16.

## AI contributors

| Tool        | Version  | Commits                                                                            | Date       |
| ----------- | -------- | ---------------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | single commit on `feat/REQ-110-dependency-cve-remediation` (plan + implementation) | 2026-10-16 |

## Implementation details

- `package.json` — `overrides["minimatch@3.1.5"].brace-expansion` `1.1.16`→`1.1.21`; `overrides["minimatch@9.0.9"].brace-expansion` `2.1.2`→`2.1.7`; `dependencies.nodemailer` `^9.0.1`→`^10.1.2`.
- `package-lock.json` — regenerated via `npm install`.
- `lib/email.ts` — reviewed, no changes needed (no API-surface change for this project's usage).
- `compliance/security/accepted-vulnerabilities.json` — removed 32 resolved `brace-expansion` entries + 2 resolved `nodemailer` entries; only the `braces` entry remains.
- No new SRS items (all 5 ACs `@srs-deferred` — dependency-version/security-ledger facts, not user-observable requirements). No ADR needed (HIGH-risk signal examined and overridden — no structural/architectural change, operator-confirmed). Risk register: `R-036` (ACCEPTED — `braces` ReDoS, no upstream fix, review due 2026-11-15).
- Tests: no new test files — full existing suite re-run to confirm no regression from the `nodemailer` major-version bump.

## Verification

- Unit/integration: 1498 passed, 4 skipped (full suite, unchanged baseline).
- TypeScript/ESLint: 0 errors.
- `npm audit`: 15 high findings remain, all tracing to the single already-accepted `braces` advisory via its transitive consumers.
- `scripts/evaluate-npm-audit.sh`: 1 accepted, 0 unresolved (down from 35 accepted pre-REQ).
- Build: `npm run build` succeeds.
- Full detail: `compliance/evidence/REQ-110/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. HIGH-risk plan-approval checkpoint was passed at Phase 1 (see `compliance/plans/REQ-110/implementation-plan.md` § Sign-off); the operator reviews the PR + performs the portal UAT review before Production approval.
