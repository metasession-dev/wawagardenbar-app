---
description: Merge approved PR to main, verify Railway deployment, sync branches, finalize compliance artifacts
---

# Deploy to Main

**Pipeline Stage:** 5 of 5
**Previous:** `submit-for-review.md` (after PR is approved)

This workflow merges the approved PR, verifies the production deployment, syncs branches, and finalizes compliance artifacts. It is the last step in the pipeline.

## Prerequisites

- PR from `develop` to `main` has been **approved** by a reviewer in GitHub
- All CI checks passed (if configured)
- No unresolved review comments

## Steps

### Step 1: Merge the PR

**Option A: Merge via GitHub CLI (Preferred)**

```bash
# Get the PR number
gh pr list --head develop --json number --jq '.[0].number'

# Merge the PR (creates a merge commit)
gh pr merge [PR-NUMBER] --merge --delete-branch=false
```

**Option B: Merge via GitHub Web UI**

1. Open the PR on GitHub
2. Click **Merge pull request**
3. Use "Create a merge commit" (not squash or rebase — preserves full commit history for audit)
4. Click **Confirm merge**

**Do NOT delete the develop branch** — it's your permanent working branch.

### Step 2: Sync Local Branches

```bash
# Update main locally
git checkout main
git pull origin main

# Switch back to develop and sync
git checkout develop
git pull origin develop
git merge main --no-edit
git push origin develop
```

This ensures `develop` has the merge commit and stays in sync with `main`.

### Step 3: Verify Railway Deployment

Railway auto-deploys when `main` is pushed. Wait 3-5 minutes for the build, then verify:

```bash
# Health check
curl -s https://wawagardenbar-app-production.up.railway.app/api/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":...}
```

If the health check fails:

```bash
# Check Railway logs
railway logs -n 50

# Common issues:
# - MongoDB connection: check MONGODB_URI env var
# - Build failure: check TypeScript compilation
# - Missing env vars: railway variables
```

### Step 4: Post-Deploy Smoke Test

Quick manual verification in production:

```bash
# Public menu loads
curl -s https://wawagardenbar-app-production.up.railway.app/api/public/menu | head -c 200

# Home page loads
curl -s -o /dev/null -w "%{http_code}" https://wawagardenbar-app-production.up.railway.app/
# Should return: 200
```

### Step 5: Finalize Compliance Artifacts (Tracked Requirements Only)

After successful deployment, update the compliance records:

```bash
# Move release ticket from pending to approved
mv compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md compliance/approved-releases/

# Update RTM status
# Change: TESTED - PENDING SIGN-OFF → APPROVED - DEPLOYED
# Add approver name and date from the PR approval
```

Edit `compliance/RTM.md` Part B entry:

```markdown
| REQ-XXX | Description | files | evidence | APPROVED - DEPLOYED | [Reviewer Name] | [Date] |
```

Add audit trail entry to the release ticket:

```markdown
| [date] | PR approved | [reviewer] | PR #[number] approved in GitHub |
| [date] | Deployed to production | System | Railway auto-deploy from main |
| [date] | Post-deploy verification | [who] | Health check passed |
```

Commit:

```bash
git add compliance/RTM.md compliance/approved-releases/
git rm compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md 2>/dev/null
git commit -m "compliance: [REQ-XXX] approved and deployed - PR #[number]"
git push origin develop
```

### Step 6: Sync Final State

```bash
# Merge the compliance finalization to main
git checkout main
git merge develop --no-edit
git push origin main

# Return to develop
git checkout develop
```

## Database Migrations (If Required)

If the deployment includes schema changes, run migrations **before** the merge:

```bash
# Get Railway MongoDB public URL
railway service MongoDB
railway variables --json | grep MONGO_PUBLIC_URL

# Run migration
MONGODB_URI="mongodb://..." MONGODB_DB_NAME="wawagardenbar" npx tsx scripts/your-migration.ts

# Switch back to app service
railway service wawagardenbar-app
```

Then proceed with Step 1 (merge PR).

## Rollback

If the deployment causes issues:

1. **Railway dashboard:** Click on the previous deployment and redeploy it
2. **Git revert:** Create a revert commit on main:
   ```bash
   git checkout main
   git revert HEAD --no-edit
   git push origin main
   ```
3. **Document the rollback** in the release ticket audit trail

## Output

- PR merged to `main`
- Railway deployment successful and verified
- `develop` and `main` branches in sync
- Release ticket moved to `compliance/approved-releases/` (tracked requirements)
- RTM updated with `APPROVED - DEPLOYED` status and approver name

## Pipeline Complete

The change is now in production with a complete audit trail:

```
Requirement (RTM)
  → Implementation (commits on develop)
    → Tests (183 E2E, evidence in compliance/evidence/)
      → Compliance Artifacts (release ticket, RTM update)
        → PR Review (GitHub: code review + approval)
          → Deployment (Railway auto-deploy from main)
            → Verification (health check + smoke test)
              → Finalization (release ticket approved, RTM closed)
```
