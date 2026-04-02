---
description: Merge approved PR, verify deployment including security checks, sync branches, finalize compliance
---

# Deploy to Production

**Pipeline Stage:** 5 of 5
**Previous:** `4-submit-for-review.md` (after PR approved and CI passed)
**References:** Test Plan (post-deploy verification, DR targets), Test Strategy (`sdlc/files/Test_Strategy.md` in META-COMPLY)

---

## Prerequisites

- All CI checks passed (enforced by branch protection)
- **LOW risk:** Self-merged after CI passed
- **MEDIUM/HIGH risk:** PR approved by a second human reviewer, no unresolved review comments
- UAT verification passed (completed in workflow 3, recorded in evidence)
- META-COMPLY UAT approval granted (verified by CI check on PR)

## Steps

### Step 1: Merge the PR

**Option A: GitHub CLI (Preferred)**

```bash
gh pr list --head develop --json number --jq '.[0].number'
gh pr merge [PR-NUMBER] --merge --delete-branch=false
```

**Option B: GitHub Web UI**

1. Open PR → **Merge pull request** → "Create a merge commit" → **Confirm merge**

**Do NOT delete `develop`** — it's the permanent working branch.

### Step 2: Sync Branches

```bash
git checkout main && git pull origin main
git checkout develop && git pull origin develop
git merge main --no-edit && git push origin develop
```

### Step 3: Verify Production Deployment

Wait for auto-deploy to complete, then:

```bash
# Health check
curl -s [PRODUCTION_URL]/[HEALTH_ENDPOINT]
# Expected: success response
```

If it fails, check hosting platform logs. See deployment reference doc for troubleshooting.

### Step 3a: Run Post-Deploy Actions (if any)

Check the release ticket's **Post-Deploy Actions** section. If actions are listed:

1. Run each action in order against the **production** environment
2. Verify each completes successfully before proceeding
3. Record results in the release ticket's Audit Trail

```bash
# Example: data migration
npx tsx scripts/backfill-x.ts "[PROD_CONNECTION_STRING]"
# Verify: check output for success, record row counts
```

If the release ticket says "No post-deploy actions required", skip to Step 4.

> **Important:** Run post-deploy actions BEFORE smoke tests. Smoke tests should verify the application works with the migration applied.

### Production Verification Policy

Production verification is **read-only and non-destructive**. It confirms the deployment succeeded and the application is accessible. It does NOT exercise application logic.

| Allowed (read-only)          | NOT allowed (destructive)       |
| ---------------------------- | ------------------------------- |
| Health checks (HTTP GET)     | E2E tests (Playwright)          |
| Public endpoint status codes | Database operations             |
| Security header inspection   | API mutations (POST/PUT/DELETE) |
| Auth redirect verification   | Test data creation              |
| Smoke test (homepage loads)  | Authenticated flows             |

E2E tests run on `develop` (CI) and UAT — never production. The `post-deploy-prod.yml` workflow automates the read-only checks below.

### Step 4: Production Smoke Test

```bash
curl -s [PRODUCTION_URL]/[PUBLIC_ENDPOINT] | head -c 200
curl -s -o /dev/null -w "%{http_code}" [PRODUCTION_URL]/
# Expected: 200
```

### Step 5: Production Security Verification

```bash
# Access control
curl -s -o /dev/null -w "%{http_code}" [PRODUCTION_URL]/[ADMIN_ENDPOINT]
# Expected: 401 or 403

# Security headers
curl -s -I [PRODUCTION_URL]/ | grep -iE 'x-frame-options|x-content-type|strict-transport|content-security'

# No stack traces
curl -s [PRODUCTION_URL]/[NONEXISTENT_ENDPOINT]
# Expected: generic error
```

Record results:

```bash
cat >> compliance/evidence/REQ-XXX/security-summary.md << EOF

## Production Post-Deploy Verification — $(date -I)
- PROD Health check: PASS
- PROD Admin auth check: PASS
- PROD Security headers: PASS
- PROD No stack traces: PASS
- PROD URL: [PRODUCTION_URL]
EOF
```

### Step 6: Finalize Compliance (Tracked Requirements Only)

```bash
mv compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md compliance/approved-releases/
```

Update `compliance/RTM.md`:

```markdown
| REQ-XXX | Description | [RISK] | files | evidence | APPROVED - DEPLOYED | [Reviewer] | [Date] |
```

Add audit trail to release ticket:

```markdown
| [date] | UAT verification passed | [who] | Health + smoke + feature verified on UAT |
| [date] | PR approved | [reviewer] | PR #[number] |
| [date] | CI verification | GitHub Actions | All gates passed independently |
| [date] | Deployed to production | System | Auto-deploy from main |
| [date] | PROD post-deploy verification | [who] | Health + security checks passed on PROD |
```

```bash
git add compliance/RTM.md compliance/approved-releases/ compliance/evidence/REQ-XXX/
git rm compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md 2>/dev/null
git commit -m "compliance: [REQ-XXX] approved and deployed - PR #[number]"
git push origin develop
```

### Step 7: Close the GitHub Issue

If the requirement was linked to a GitHub Issue, close it with a reference to the PR:

```bash
gh issue close [ISSUE-NUMBER] --comment "Implemented in PR #[PR-NUMBER] (REQ-XXX). [Brief summary of what was delivered]."
```

This is the final traceability link: Issue → Requirement → PR → Deployment → Issue closed.

### Step 8: Final Sync

```bash
git checkout main && git merge develop --no-edit && git push origin main
git checkout develop
```

## Rollback

1. **Hosting dashboard:** Redeploy previous version
2. **Git:** `git checkout main && git revert HEAD --no-edit && git push origin main`
3. **Document:** Add rollback entry to release ticket audit trail

### Environment Summary

If the project uses separate UAT and Production environments:

| Environment | Branch    | Auto-deploy | Purpose                                                                                       |
| ----------- | --------- | ----------- | --------------------------------------------------------------------------------------------- |
| UAT         | `develop` | Yes         | Pre-PR verification — CI evidence uploaded to META-COMPLY, reviewed and approved before PR    |
| Production  | `main`    | Yes         | Live deployment after PR approval — post-deploy evidence captured and uploaded to META-COMPLY |

UAT verification and META-COMPLY approval are completed in workflow 3 before the PR is created. After merge to main, the post-deploy workflow runs smoke tests against production, uploads evidence to META-COMPLY (environment=production), and marks the release as `released`.

### Automated Post-Deploy Workflow

If your project has `post-deploy-prod.yml` (template in `sdlc/files/ci/`), Steps 3-5 are handled automatically by CI after merge. The workflow:

1. Waits for deployment to propagate
2. Runs production smoke tests (health check, key endpoints)
3. Uploads production evidence to META-COMPLY with `--environment production`
4. Marks the release as `released` in META-COMPLY

Manual verification (Step 5: security checks) is still recommended for MEDIUM/HIGH risk releases.

---

## Output

- PR merged, production deployment verified
- Production security verification passed
- Branches synced
- Release ticket finalized
- RTM: `APPROVED - DEPLOYED`

## Pipeline Complete

```
Requirement (RTM + Risk)
  → Test Scope (planned before implementation)
    → AI Use Documented
      → Implementation (develop)
        → Local Gates (SAST + deps + E2E — comprehensive)
          → Evidence Compiled
            → UAT Verification (auto-deployed from develop)
              → PR Created → CI Gates (independent verification)
                → Review (LOW: self-merge | MEDIUM/HIGH: second reviewer)
                  → PROD Deployment (auto-deploy from main)
                    → PROD Verification (health + security)
                      → Finalization (RTM closed)
```
