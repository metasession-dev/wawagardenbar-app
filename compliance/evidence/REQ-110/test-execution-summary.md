# Test Execution Summary — REQ-110

**Date:** 2026-10-16
**Implementation branch:** `feat/REQ-110-dependency-cve-remediation`

## Test design

**Layers planned:** Unit/integration regression + security-ledger gate, per HIGH-risk depth (`Test_Policy.md`). No E2E — this REQ has no UI-facing surface (`@e2e-deferred`, see implementation plan §4).

**Layers covered:** Unit/integration regression ✓ (full suite re-run, no new tests needed — no call-site change required in `lib/email.ts`). Security-ledger gate ✓ (`scripts/evaluate-npm-audit.sh`, the authoritative CI gate for this class of change).

**Exemptions:**

- E2E — `NOT_NEEDED`: no UI-facing files touched (`package.json`, `package-lock.json`, `compliance/security/accepted-vulnerabilities.json` only).
- Visual regression — `NOT_NEEDED`: same reason.
- Manual smoke — planned post-deploy per the implementation plan's §9 Verification: trigger one real email-sending flow against the UAT SMTP config to confirm delivery, since automated tests mock the transport.

**Skill invocation:** `e2e-test-engineer` not invoked — no UI-facing files in the diff (Phase 2 step 3 gate). `requirements-aligner`, `adr-author`, `risk-register-keeper` invoked during Phase 1 (see implementation plan §§ SRS items / 3 / 5).

## Gate results

| Gate                            | Result | Details                                                                                                                                                                                         |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                      | PASS   | `npx tsc --noEmit` — 0 errors (confirms no `nodemailer` 10.x call-site breakage)                                                                                                                |
| ESLint                          | PASS   | 0 errors; 999 pre-existing `no-console` warnings (unchanged baseline)                                                                                                                           |
| Unit — full suite               | PASS   | 1498 passed, 4 skipped (170 files) — `npx vitest run`, unchanged from pre-REQ baseline                                                                                                          |
| npm audit (raw)                 | PASS   | 23 vulnerabilities (8 moderate, 15 high) remain, all tracing to the single already-accepted `braces` advisory via its transitive consumers (chokidar/fast-glob/tailwindcss/eslint-config chain) |
| `scripts/evaluate-npm-audit.sh` | PASS   | 1 accepted (`braces`), 0 unresolved — down from 35 accepted pre-REQ                                                                                                                             |
| Build                           | PASS   | `npm run build` succeeds                                                                                                                                                                        |

## Test executions

| Source  | SDLC stage       | Execution | Kind                    | Outcome | Workflow / run                       | Related evidence                                        | Date       |
| ------- | ---------------- | --------- | ----------------------- | ------- | ------------------------------------ | ------------------------------------------------------- | ---------- |
| REQ-110 | 2 implement/test | #1        | unit (local)            | passed  | `npx vitest run`                     | Full suite, 1498 passed / 4 skipped, unchanged baseline | 2026-10-16 |
| REQ-110 | 2 implement/test | #2        | security-ledger (local) | passed  | `bash scripts/evaluate-npm-audit.sh` | 1 accepted, 0 unresolved                                | 2026-10-16 |

## Test plan coverage

| Acceptance criterion                                         | Status | Test                                                                                    |
| ------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------- |
| AC1 — brace-expansion overrides resolve 4 GHSA advisories    | PASS   | `npm audit --json` (no brace-expansion in high/critical list) + `evaluate-npm-audit.sh` |
| AC2 — nodemailer upgraded, resolves 2 GHSA advisories        | PASS   | `npm audit --json` (no nodemailer in high/critical list) + `evaluate-npm-audit.sh`      |
| AC3 — `sendEmail()`/`lib/email.ts` behaviour unchanged       | PASS   | `npx tsc --noEmit` clean; `npx vitest run` unchanged (1498/4)                           |
| AC4 — `braces@3.0.3` re-verified still unresolved upstream   | PASS   | `npm view braces versions` — latest is still `3.0.3`                                    |
| AC5 — `accepted-vulnerabilities.json` reduced to 1 exception | PASS   | Diff of the file; `evaluate-npm-audit.sh` (1 accepted, 0 unresolved)                    |

## Accepted skips

None.

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-110/`
- CI run: pending — this run's local verification is the authoritative pre-PR evidence; CI on the integration PR will re-confirm.
