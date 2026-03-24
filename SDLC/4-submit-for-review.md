---
description: Create a PR from develop to main — triggers CI independent verification and human review
---

# Submit for Review

**Pipeline Stage:** 4 of 5
**Previous:** `3-compile-evidence.md` (tracked) or `2-implement-and-test.md` (untracked)
**Next:** `5-deploy-main.md` (after PR approved)
**References:** Test Policy (approval gate, AI governance), Test Strategy (reviewer requirements)

---

## What Happens at This Stage

When you create the PR, CI runs automatically — GitHub Actions executes the independent verification gates (TypeScript, SAST, dependency audit, E2E). This produces tamper-resistant evidence that the code passes gates, verified by GitHub's infrastructure.

What happens next depends on the risk level of the requirements in the PR:

- **LOW risk:** CI provides independent verification. After CI passes, the developer may self-merge.
- **MEDIUM/HIGH risk:** A second human reviewer is notified. They review the code, CI results, and compliance evidence. They cannot approve until CI passes. The developer may NOT self-merge.

If a PR contains requirements at multiple risk levels, the highest risk level determines the review requirement.

---

## Prerequisites

- All changes committed and pushed on `develop`
- All local gates passing
- **UAT verification passed** (health check, smoke test, feature verification — recorded in evidence)
- For tracked requirements: RTM updated, release ticket created, evidence saved
- **Know the risk level** of the requirement(s) — this determines whether a second reviewer is required

## Steps

### Step 1: Verify Develop Is Ready

```bash
git status                    # Clean working tree
git branch --show-current     # develop
git pull origin develop       # Up to date
```

### Step 2: Review PR Contents

```bash
git log origin/main..develop --oneline
git diff origin/main..develop --stat
git diff origin/main..develop -- package.json | grep '^\+'
```

### Step 3: Create the PR

**For tracked requirements:**

```bash
gh pr create --base main --head develop --title "type: description" --body "$(cat <<'EOF'
## Summary
[1-3 bullet points]

## Requirement Reference
- **REQ-XXX:** [description]
- **Risk Level:** [LOW / MEDIUM / HIGH]

## Test Results (Local — Comprehensive)

| Gate | Result | Details |
|------|--------|---------|
| E2E Tests | [N]/[N] passed | Spec files: [list spec files that ran] |
| TypeScript | 0 errors | `npx tsc --noEmit` |
| SAST | 0 high/critical | [N] rules scanned, [N] files |
| Dependency Audit | 0 unaccepted | [note any accepted risks] |

**E2E spec files executed:**
- `e2e/[spec-file].spec.ts` — [N] tests ([brief description])
- [list all spec files that ran]

**Evidence location:** `compliance/evidence/REQ-XXX/`

## UAT Verification
- UAT Health check: PASS
- UAT Smoke test: PASS
- UAT Feature verification: PASS — [what was verified]
- UAT URL: https://wawagardenbar-app-uat.up.railway.app

## CI Results (Independent Verification)
CI runs automatically on this PR. The following gates must pass before merge:
- [ ] TypeScript check (CI)
- [ ] SAST scan (CI)
- [ ] Dependency audit (CI)
- [ ] E2E tests — unauthenticated subset (CI)

### Where to Find Test Results
| Source | Location | What It Shows |
|--------|----------|---------------|
| **CI status** | Green/red icons on PR commits | Pass/fail for each gate (independent, tamper-resistant) |
| **CI E2E comment** | PR comments (automated) | E2E pass/fail with commit SHA |
| **META-COMPLY evidence** | [View evidence on META-COMPLY](https://meta-comply-production.up.railway.app/projects/wawagardenbar-app/requirements/REQ-XXX) | Playwright report, SAST results, dependency audit |
| **Security summary** | `compliance/evidence/REQ-XXX/security-summary.md` (in PR files) | Developer's local gate results + UAT verification |
| **Test scope** | `compliance/evidence/REQ-XXX/test-scope.md` (in PR files) | What was planned to be tested (cross-reference with results) |
| **Test changes** | PR description ("Test Changes" section) + PR files | Which test files were added/modified and what they cover |

## AI Involvement
- **AI Tool:** [tool / none]
- **AI-Generated Code:** [list files, or "none"]
- **Components Regenerated:** [none / list]
- **AI Prompts Retained:** [yes / N/A]

## Test Changes
- **Tests added:** [list new test files or "none"]
- **Tests updated:** [list modified test files or "none"]
- **Test locations:** [e.g. `e2e/requirements-verification.spec.ts`, `__tests__/...`]
- **What's covered:** [brief description of what the new/updated tests verify]
- **What's NOT covered and why:** [any gaps and justification, or "Full coverage"]

## Dependency Changes
- [package@version — purpose, or "No new dependencies"]

## Compliance Artifacts
- [ ] RTM updated with risk level
- [ ] Test scope addressed (all items in test-scope.md completed)
- [ ] Implementation plan present and matches implementation (MEDIUM/HIGH risk)
- [ ] Release ticket created
- [ ] Test evidence saved
- [ ] Security evidence saved
- [ ] AI use documented

## Reviewer Checklist

**Code Quality**
- [ ] Changes correct and complete
- [ ] No sensitive data committed
- [ ] No regressions

**Test Scope Verification**
- [ ] Test scope document exists (`compliance/evidence/REQ-XXX/test-scope.md`)
- [ ] Risk classification is appropriate (not under-classified)
- [ ] Testing depth matches risk level
- [ ] All items in test scope addressed
- [ ] New/updated test files listed in PR description ("Test Changes" section)
- [ ] Review the test files — verify tests actually exercise the new functionality (not just passing on unchanged code)
- [ ] New routes/pages have route protection tests
- [ ] New API endpoints have auth enforcement tests

**Security**
- [ ] SAST: 0 unresolved high/critical (verify CI result)
- [ ] Dependencies verified (real, current, no CVEs)
- [ ] Access control changes tested (if applicable)

**AI Review** (if AI code present)
- [ ] AI code reviewed for correctness
- [ ] No insecure defaults or injection vulnerabilities
- [ ] No hardcoded credentials or test data
- [ ] Regenerated components fully retested

**UAT**
- [ ] UAT verification results recorded in evidence
- [ ] Feature works correctly on UAT environment

**Compliance**
- [ ] RTM status: TESTED - PENDING SIGN-OFF
- [ ] Release ticket accurate
- [ ] Security evidence present and clean

> **Audit Note:** AI-assisted PR. Verified locally (comprehensive) and by CI (independent). See Test Plan for evidence model.
EOF
)"
```

**For untracked changes:**

```bash
gh pr create --base main --head develop --title "type: description" --body "$(cat <<'EOF'
## Summary
[1-3 bullet points]

## Test Results (Local)
- E2E: [N]/[N] passed, TypeScript: 0 errors, SAST: clean, Dependencies: clean
- Spec files: [list spec files that ran]

## Test Changes
- **Tests added/updated:** [list or "none"]
- **What's covered:** [brief description]

## UAT Verification
- UAT Health check: PASS
- UAT Smoke test: PASS
- UAT Feature verification: PASS — [what was verified]

## CI Verification
- [ ] TypeScript (CI)
- [ ] SAST (CI)
- [ ] Dependency audit (CI)
- [ ] E2E tests (CI)

CI pass/fail visible on PR commit status icons. Full test evidence available on [META-COMPLY](https://meta-comply-production.up.railway.app/projects/wawagardenbar-app).

## Reviewer Checklist
- [ ] Code correct, no sensitive data, no regressions
- [ ] SAST clean, no hallucinated dependencies
- [ ] AI code reviewed (if applicable)
- [ ] Tests reviewed — verify they cover the changes (not just passing on unchanged code)
- [ ] Testing depth appropriate for the change
EOF
)"
```

### Step 4: Wait for CI

```bash
# Watch CI status
gh pr checks

# Or view in GitHub web UI — checks tab on the PR
```

CI must pass before the reviewer can approve. If CI fails:

```bash
# Check which job failed
gh pr checks

# Fix the issue locally
git add <fixed-files>
git commit -m "fix: resolve CI failure - [description]"

# Re-run local gates to confirm
npx tsc --noEmit && semgrep scan --config auto app/ lib/ services/ models/ --severity ERROR --severity WARNING && npm audit --audit-level=high && npx playwright test

# Push — CI re-runs automatically
git push origin develop
```

### Step 5: Link PR to Release Ticket (Tracked Only)

```bash
gh pr list --head develop --json number --jq '.[0].number'
```

Add to release ticket and push:
```bash
# Edit RELEASE-TICKET-REQ-XXX.md to add PR link
git add compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md
git commit -m "compliance: [REQ-XXX] link PR #[number]"
git push origin develop
```

### Step 6: Wait for CI and Review

**For LOW risk (self-merge permitted):**

```bash
gh pr checks
# Once all checks pass, merge
gh pr merge [PR-NUMBER] --merge --delete-branch=false
```

**For MEDIUM/HIGH risk (second reviewer required):**

The reviewer sees:
1. **CI results** — independent pass/fail from GitHub (green checks)
2. **Code changes** — in the Files changed tab
3. **Test changes** — in the PR description ("Test Changes" section) and in the Files changed tab (look for `e2e/`, `__tests__/`, `*.spec.ts`, `*.test.ts` files)
4. **Compliance evidence** — in the compliance/ directory
5. **Test scope** — in compliance/evidence/REQ-XXX/test-scope.md
5. **Implementation plan** — in compliance/evidence/REQ-XXX/implementation-plan.md (MEDIUM/HIGH risk)

The developer may NOT merge until the reviewer approves.

### Step 7: Handle Feedback (MEDIUM/HIGH risk only)

```bash
git add <changed-files>
git commit -m "fix: address review feedback - [description]"

# Re-run local gates
# Push — CI re-runs automatically
git push origin develop
```

## What Approval Means

The verification model is risk-tiered to satisfy separation of duties (ISO 27001 A.5.3, SOC 2 CC6.1/CC8.1):

**LOW risk — CI-verified self-merge:**
1. **CI** — GitHub confirms gates passed (tamper-resistant, independent)
2. **Developer** — Confirms code quality and compliance (author verification)

**MEDIUM/HIGH risk — second human reviewer required:**
1. **CI** — GitHub confirms gates passed (tamper-resistant, independent)
2. **Human reviewer** — Confirms code quality, security, compliance, test scope (judgment-based, independent)

Both are recorded immutably in GitHub.

## Output

- PR created: `develop` → `main`
- CI independent verification running (or passed)
- Compliance checklist in PR description
- For MEDIUM/HIGH: second reviewer approval recorded
- Immutable audit trail

## Next Step

After CI passes (and reviewer approves for MEDIUM/HIGH risk), proceed to `5-deploy-main.md`.
