---
description: Create a pull request from develop to main with compliance checklist for human review and approval
---

# Submit for Review

**Pipeline Stage:** 4 of 5
**Previous:** `audit-finish.md` (tracked) or `implement-and-test.md` (untracked)
**Next:** `deploy-main.md` (after PR is approved and merged)

This workflow creates the Pull Request that serves as the **formal approval gate**. The PR reviewer's approval in GitHub IS the compliance sign-off — their name, timestamp, and decision are recorded immutably by GitHub.

## When to Use

- After all changes are committed and pushed on `develop`
- After all tests pass
- After compliance artifacts are generated (for tracked requirements)

## Prerequisites

- All changes committed and pushed on `develop`
- All E2E tests passing (183/183)
- TypeScript compilation clean
- For tracked requirements: RTM updated, release ticket created

## Steps

### Step 1: Verify Develop Is Ready

```bash
# Clean working tree
git status
# Should show: nothing to commit, working tree clean

# On develop branch
git branch --show-current
# Should output: develop

# Up to date with remote
git pull origin develop
```

### Step 2: Review What Will Be in the PR

```bash
# See all commits that will be in the PR
git log origin/main..develop --oneline

# See all files changed
git diff origin/main..develop --stat
```

### Step 3: Create the Pull Request

Use `gh` CLI to create the PR with the compliance checklist:

```bash
gh pr create --base main --head develop --title "type: description" --body "$(cat <<'EOF'
## Summary

[1-3 bullet points describing the changes]

## Requirement Reference

- **REQ-XXX:** [description] (or "No tracked requirement" for untracked changes)

## Test Results

- E2E Tests: 183/183 passed
- TypeScript: 0 errors
- Evidence: `compliance/evidence/REQ-007/e2e-results.json`

## Compliance Artifacts

- [ ] RTM updated (`compliance/RTM.md`)
- [ ] Release ticket created (`compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md`)
- [ ] Test evidence saved (`compliance/evidence/REQ-XXX/`)
- [ ] JSDoc requirement headers in modified files

## Reviewer Checklist

Before approving, verify:

- [ ] Code changes are correct and complete
- [ ] Test evidence shows all tests passing
- [ ] No sensitive data committed (`.env`, credentials, API keys)
- [ ] RTM status is `TESTED - PENDING SIGN-OFF`
- [ ] Release ticket accurately describes the changes
- [ ] No regressions introduced

## How to Approve

1. Review the code changes in the **Files changed** tab
2. Review compliance artifacts in `compliance/` directory
3. If satisfied, click **Approve** in the review
4. The PR will be merged to `main`, triggering Railway auto-deploy

---

> **Audit Note:** This PR was assisted by AI. All changes have been verified against the Requirements Traceability Matrix and tested with the full E2E suite.
EOF
)"
```

For untracked changes (no REQ), simplify the body:

```bash
gh pr create --base main --head develop --title "type: description" --body "$(cat <<'EOF'
## Summary

[1-3 bullet points]

## Test Results

- E2E Tests: 183/183 passed
- TypeScript: 0 errors

## Reviewer Checklist

- [ ] Code changes are correct
- [ ] No sensitive data committed
- [ ] No regressions introduced
EOF
)"
```

### Step 4: Link PR to Release Ticket (Tracked Requirements Only)

Update the release ticket with the PR number:

```bash
# Get the PR number
gh pr list --head develop --json number --jq '.[0].number'
```

Edit `compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md` and add the PR link:

```markdown
**PR:** #[number] — https://github.com/ostendo-io/wawagardenbar-app/pull/[number]
```

Commit and push:
```bash
git add compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md
git commit -m "compliance: [REQ-XXX] link PR #[number] to release ticket"
git push origin develop
```

### Step 5: Wait for Review

The PR is now in the reviewer's hands. They will:

1. **Review code** in the Files changed tab
2. **Review compliance artifacts** (RTM, release ticket, evidence)
3. **Comment** if changes are needed
4. **Request changes** if something is wrong (you fix and push to develop, the PR updates automatically)
5. **Approve** when satisfied

### Step 6: Handle Review Feedback

If the reviewer requests changes:

```bash
# Make the requested changes
git add <changed-files>
git commit -m "fix: address review feedback - [description]"

# Re-run tests
npx playwright test

# Push (PR updates automatically)
git push origin develop
```

## What the Reviewer's Approval Means

When a reviewer clicks **Approve** in GitHub:
- Their GitHub username is recorded
- The timestamp is recorded
- Their approval comment (if any) is recorded
- This is **immutable** — it cannot be edited or deleted after the fact
- This constitutes the formal sign-off for compliance purposes

## Output

- Pull request created on GitHub: `develop` → `main`
- Compliance checklist in PR description
- Release ticket linked to PR (tracked requirements)
- Immutable audit trail when approved

## Next Step

After the reviewer approves the PR, proceed to `deploy-main.md` to merge and deploy.
