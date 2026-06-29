# Release Ticket: REQ-080 - Resolve high-severity dependency audit findings

**Status:** RELEASED
**Date:** 2026-06-14
**Requirement ID:** REQ-080
**Risk Level:** HIGH
**GitHub Issue:** [#380](https://github.com/metasession-dev/wawagardenbar-app/issues/380)
**Integration PR:** [#381](https://github.com/metasession-dev/wawagardenbar-app/pull/381)
**DevAudit Release:** `REQ-080`

---

## Summary

REQ-080 clears the high-severity dependency audit blocker that prevented CI from reaching E2E and build after REQ-079. The remediation is lockfile-only and keeps application behavior unchanged.

## AI Involvement

- **AI Tool Used:** OpenAI Codex
- **AI-Generated Files:** `package-lock.json` update under npm tooling control and compliance evidence files
- **Human Reviewer of AI Code:** pending PR #381 review
- **Components Regenerated:** npm lockfile dependency graph

## Implementation Details

**Files Modified:**

- `package-lock.json` - updated transitive tooling dependency graph to clear the high-severity `esbuild` advisory path.
- `compliance/RTM.md` - added and updated REQ-080 traceability.
- `compliance/evidence/REQ-080/*` - planning and evidence artifacts.

**Dependencies Added/Changed:**

- `esbuild` path remediated through lockfile update.
- `tsx` and `vite` transitive path updated by `npm audit fix --package-lock-only`.
- No `package.json` dependency range changes.

## Test Evidence

| Test Type                      |              Count |                 Passed | Failed | Evidence Location                |
| ------------------------------ | -----------------: | ---------------------: | -----: | -------------------------------- |
| Unit (Vitest)                  |               1236 | 1232 passed, 4 skipped |      0 | CI and DevAudit release evidence |
| E2E (Playwright smoke project) |           CI suite |                   PASS |      0 | CI and DevAudit release evidence |
| Dependency audit               | high/critical gate |                   PASS |      0 | CI and DevAudit release evidence |
| Build                          |   production build |                   PASS |      0 | CI and DevAudit release evidence |

## Security Evidence

| Check            | Result          | Evidence Location                                 |
| ---------------- | --------------- | ------------------------------------------------- |
| SAST             | PASS            | CI and DevAudit release evidence                  |
| Dependency Audit | 0 high/critical | CI and DevAudit release evidence                  |
| Access Control   | N/A             | `compliance/evidence/REQ-080/security-summary.md` |
| Audit Log        | N/A             | `compliance/evidence/REQ-080/security-summary.md` |

## Acceptance Criteria

- [x] High-severity audit findings are resolved.
- [x] TypeScript and SAST remain green.
- [x] CI proceeds past dependency audit into E2E/build.
- [x] Diff stays minimal for the dependency remediation.
- [x] Full E2E gate passed in CI.
- [x] AI use documented.

## Risk Assessment

High risk due dependency graph changes. Risk is mitigated by a lockfile-only remediation, no application code changes, successful local gates, successful CI Quality Gates, and required second human reviewer approval before merge.

Known residual: moderate `postcss` advisory remains with no npm fix available. It is below the high/critical gate and outside REQ-080 scope.

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                                         |
| ---- | ---------------- | ------ | -------- | --------------------------------------------- |
| -    | None             | -      | No       | No migration or post-deploy command required. |

## Reviewer Checklist

- [ ] Code matches requirement.
- [ ] Test evidence present and all-pass.
- [ ] Security evidence present and clean.
- [ ] Test scope fully addressed.
- [ ] RTM correct status and risk.
- [ ] No sensitive data committed.
- [ ] No regressions.
- [ ] AI code reviewed.
- [ ] No hallucinated dependencies.
- [ ] Post-deploy actions documented or confirmed none required.

## Audit Trail

| Date       | Action                   | Actor                         | Notes                                                        |
| ---------- | ------------------------ | ----------------------------- | ------------------------------------------------------------ |
| 2026-06-14 | Requirement created      | OpenAI Codex                  | REQ-080 planned from issue #380.                             |
| 2026-06-14 | Implementation completed | OpenAI Codex                  | Lockfile-only remediation committed on combined branch.      |
| 2026-06-14 | Tests passed             | OpenAI Codex / GitHub Actions | CI run 27493387752 passed Quality Gates and Upload Evidence. |
| 2026-06-14 | Submitted for review     | OpenAI Codex                  | PR #381 opened to `develop`.                                 |
