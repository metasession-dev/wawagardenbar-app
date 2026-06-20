# Release Ticket: REQ-079 - Restore package verification scripts

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-06-14
**Requirement ID:** REQ-079
**Risk Level:** LOW
**GitHub Issue:** [#377](https://github.com/metasession-dev/wawagardenbar-app/issues/377)
**Integration PR:** [#381](https://github.com/metasession-dev/wawagardenbar-app/pull/381)
**DevAudit Release:** `REQ-079`

---

## Summary

REQ-079 restores supported local verification scripts after the DevAudit sync changed the expected command set. `npm run lint` now invokes ESLint directly and `npm test` now invokes Vitest.

## AI Involvement

- **AI Tool Used:** OpenAI Codex
- **AI-Generated Files:** `package.json` script change and compliance evidence files
- **Human Reviewer of AI Code:** pending PR #381 review
- **Components Regenerated:** none

## Implementation Details

**Files Modified:**

- `package.json` - replaced unsupported `next lint` usage with direct ESLint invocation and added the `npm test` script for Vitest.
- `compliance/RTM.md` - added and updated REQ-079 traceability.
- `compliance/evidence/REQ-079/*` - planning and evidence artifacts.

**Dependencies Added/Changed:**

- No dependency changes in REQ-079.

## Test Evidence

| Test Type                      |    Count |                 Passed | Failed | Evidence Location                |
| ------------------------------ | -------: | ---------------------: | -----: | -------------------------------- |
| Unit (Vitest)                  |     1236 | 1232 passed, 4 skipped |      0 | CI and DevAudit release evidence |
| E2E (Playwright smoke project) | CI suite |                   PASS |      0 | CI and DevAudit release evidence |
| Script verification            |    4 ACs |                      4 |      0 | `test-execution-summary.md`      |

## Security Evidence

| Check            | Result                                            | Evidence Location                                 |
| ---------------- | ------------------------------------------------- | ------------------------------------------------- |
| SAST             | PASS                                              | CI and DevAudit release evidence                  |
| Dependency Audit | PASS for high/critical after combined REQ-080 fix | CI and DevAudit release evidence                  |
| Access Control   | N/A                                               | `compliance/evidence/REQ-079/security-summary.md` |
| Audit Log        | N/A                                               | `compliance/evidence/REQ-079/security-summary.md` |

## Acceptance Criteria

- [x] `npm run lint` runs ESLint directly and avoids the removed `next lint` path.
- [x] `npm test` runs the Vitest suite.
- [x] `npm run lint && npx tsc --noEmit && npm test` is the supported local verification command.
- [x] ESLint install/config is coherent with legacy `.eslintrc.json`.
- [x] TypeScript clean.
- [x] SAST clean.
- [x] Dependency audit clean for high/critical findings in the combined release.
- [x] Full E2E gate passed in CI.
- [x] AI use documented.

## Risk Assessment

Low risk. The change affects developer/CI command wiring only. No runtime app behavior or data-handling code changed.

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                           |
| ---- | ---------------- | ------ | -------- | ------------------------------- |
| -    | None             | -      | No       | No post-deploy action required. |

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
| 2026-06-13 | Requirement created      | OpenAI Codex                  | REQ-079 planned from issue #377.                             |
| 2026-06-14 | Implementation completed | OpenAI Codex                  | Script fix committed on combined branch.                     |
| 2026-06-14 | Tests passed             | OpenAI Codex / GitHub Actions | CI run 27493387752 passed Quality Gates and Upload Evidence. |
| 2026-06-14 | Submitted for review     | OpenAI Codex                  | PR #381 opened to `develop`.                                 |
