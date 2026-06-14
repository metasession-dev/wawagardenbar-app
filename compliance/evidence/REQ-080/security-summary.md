# REQ-080 - Security summary

**Requirement ID:** REQ-080
**Risk:** HIGH
**Date:** 2026-06-14

## Scope

REQ-080 resolves high-severity dependency audit findings by updating the lockfile-only dependency graph. The implementation changes `package-lock.json` and does not modify application runtime behavior.

Key remediation path:

- Clears the high-severity `esbuild` advisory chain surfaced through tooling dependencies.
- Updates transitive tooling packages selected by `npm audit fix --package-lock-only`, including the affected `tsx` / `vite` / `esbuild` path.
- Leaves `package.json` dependency ranges unchanged.

## Threat model

| Threat                 | Surface examined                                        | Verdict                                                                                                                     |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Spoofing               | No identity/auth code touched.                          | N/A                                                                                                                         |
| Tampering              | Dependency graph integrity and package lock resolution. | Mitigated by committing `package-lock.json`, reinstalling with `npm ci`, and passing CI Quality Gates.                      |
| Repudiation            | Audit remediation evidence and CI logs.                 | Mitigated by Git history, PR #381, and CI run 27493387752.                                                                  |
| Information disclosure | Vulnerable dependency advisories.                       | High-severity path remediated. Remaining moderate `postcss` advisory has no npm fix available and is outside REQ-080 scope. |
| Denial of service      | Tooling updates could break build/test execution.       | Mitigated by lint, typecheck, unit, build, and CI E2E passing.                                                              |
| Elevation of privilege | No privilege checks touched.                            | N/A                                                                                                                         |

## Dependency audit

`npm audit --audit-level=high` passes locally and CI Dependency Audit passes.

Known residual:

- Moderate `postcss` advisory through `next` / `nuqs` remains. npm reports no fix available. This is below the high/critical gate and is not addressed by REQ-080.

## SAST

No source code changed for REQ-080. CI SAST passed in run 27493387752.

## Access control and audit logging

Access control: N/A - no auth or RBAC code changed.

Audit logging: N/A - no application audit events changed.

## Framework attribution

| Clause                                    | Coverage                                                              |
| ----------------------------------------- | --------------------------------------------------------------------- |
| ISO 27001 A.8.25 Secure SDLC              | Dependency audit blocker remediated and verified by CI Quality Gates. |
| GDPR Art. 25 Data protection by design    | N/A - no personal-data processing changed.                            |
| EU AI Act Art. 11 Technical documentation | AI use recorded in `ai-use-note.md` and `ai-prompts.md`.              |
| ISO 29119 Section 3.4 Test Plan           | Covered via `test-plan.md` and this test execution summary.           |

## Risk register

No new risk-register entry required for the lockfile remediation. Residual moderate vulnerability is documented above and remains visible in audit output.

## Sign-off

- **Author:** OpenAI Codex - 2026-06-14
- **Reviewer:** pending human review on PR #381
