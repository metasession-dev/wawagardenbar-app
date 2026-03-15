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

When you create the PR, two things happen in parallel:

1. **CI runs automatically** — GitHub Actions executes the independent verification gates (TypeScript, SAST, dependency audit, E2E). This produces tamper-resistant evidence that the code passes gates, verified by GitHub's infrastructure.

2. **Human reviewer is notified** — They review the code, the CI results, and the compliance evidence you compiled. They cannot approve until CI passes (branch protection enforces this).

---

## Prerequisites

- All changes committed and pushed on `develop`
- All local gates passing
- For tracked requirements: RTM updated, release ticket created, evidence saved

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
- E2E Tests: 183/183 passed (full suite)
- TypeScript: 0 errors
- SAST: 0 high/critical findings
- Dependency Audit: 0 high/critical vulnerabilities
- Evidence: `compliance/evidence/REQ-XXX/`

## CI Results (Independent Verification)
CI runs automatically on this PR. The following gates must pass before merge:
- [ ] TypeScript check (CI)
- [ ] SAST scan (CI)
- [ ] Dependency audit (CI)
- [ ] E2E tests — unauthenticated subset (CI)

## AI Involvement
- **AI Tool:** [tool / none]
- **AI-Generated Code:** [list files, or "none"]
- **Components Regenerated:** [none / list]
- **AI Prompts Retained:** [yes / N/A]

## Dependency Changes
- [package@version — purpose, or "No new dependencies"]

## Compliance Artifacts
- [ ] RTM updated with risk level
- [ ] Test scope addressed (all items in test-scope.md completed)
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
- [ ] Test scope document exists in evidence directory
- [ ] Risk classification is appropriate (not under-classified)
- [ ] Testing depth matches risk level
- [ ] All items in test scope addressed

**Security**
- [ ] SAST: 0 unresolved high/critical (verify CI result)
- [ ] Dependencies verified (real, current, no CVEs)
- [ ] Access control changes tested (if applicable)

**AI Review** (if AI code present)
- [ ] AI code reviewed for correctness
- [ ] No insecure defaults or injection vulnerabilities
- [ ] No hardcoded credentials or test data
- [ ] Regenerated components fully retested

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
- E2E: all pass, TypeScript: clean, SAST: clean, Dependencies: clean

## CI Verification
- [ ] TypeScript (CI)
- [ ] SAST (CI)
- [ ] Dependency audit (CI)
- [ ] E2E tests (CI)

## Reviewer Checklist
- [ ] Code correct, no sensitive data, no regressions
- [ ] SAST clean, no hallucinated dependencies
- [ ] AI code reviewed (if applicable)
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

### Step 6: Wait for Review

The reviewer sees:
1. **CI results** — independent pass/fail from GitHub (green checks)
2. **Code changes** — in the Files changed tab
3. **Compliance evidence** — in the compliance/ directory
4. **Test scope** — in compliance/evidence/REQ-XXX/test-scope.md

### Step 7: Handle Feedback

```bash
git add <changed-files>
git commit -m "fix: address review feedback - [description]"

# Re-run local gates
# Push — CI re-runs automatically
git push origin develop
```

## What Approval Means

The GitHub PR approval is the formal sign-off. Two independent verification sources:
1. **CI** — GitHub confirms gates passed (tamper-resistant)
2. **Human reviewer** — Confirms code quality, security, compliance, test scope (judgment-based)

Both are recorded immutably in GitHub.

## Output

- PR created: `develop` → `main`
- CI independent verification running (or passed)
- Compliance checklist in PR description
- Immutable audit trail when approved

## Next Step

After CI passes and reviewer approves, proceed to `5-deploy-main.md`.
