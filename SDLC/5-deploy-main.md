---
description: Merge approved PR, verify deployment including security checks, sync branches, finalize compliance
---
<!-- SDLC source: META-COMPLY/sdlc/files/5-deploy-main.md -->
<!-- SDLC version: sdlc-v1.0.0 -->
<!-- Last synced: 2026-03-25 -->

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

Wait for Railway auto-deploy to complete (~2-3 minutes), then:

```bash
# Health check
curl -s https://wawagardenbar-app-production-45c8.up.railway.app/api/health
# Expected: {"status":"ok", ...}
```

If it fails, check Railway logs: `railway logs -n 20`

### Step 4: Production Smoke Test

```bash
# Homepage
curl -s -o /dev/null -w "%{http_code}" https://wawagardenbar-app-production-45c8.up.railway.app/
# Expected: 200

# Public menu endpoint
curl -s https://wawagardenbar-app-production-45c8.up.railway.app/api/public/menu | head -c 200
```

### Step 5: Production Security Verification

```bash
# Access control — admin endpoint without auth
curl -s -o /dev/null -w "%{http_code}" https://wawagardenbar-app-production-45c8.up.railway.app/api/admin/orders
# Expected: 401 or 403

# Security headers
curl -s -I https://wawagardenbar-app-production-45c8.up.railway.app/ | grep -iE 'x-frame-options|x-content-type|referrer-policy'

# No stack traces on invalid endpoint
curl -s https://wawagardenbar-app-production-45c8.up.railway.app/api/nonexistent
# Expected: generic error, NOT stack trace
```

Record results:
```bash
cat >> compliance/evidence/REQ-XXX/security-summary.md << EOF

## Production Post-Deploy Verification — $(date -I)
- PROD Health check: PASS
- PROD Admin auth check: PASS
- PROD Security headers: PASS
- PROD No stack traces: PASS
- PROD URL: https://wawagardenbar-app-production-45c8.up.railway.app
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
| [date] | Deployed to production | Railway | Auto-deploy from main |
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

### Environment Summary

| Environment | Branch | URL | Auto-deploy | Evidence |
|-------------|--------|-----|-------------|----------|
| UAT | `develop` | https://wawagardenbar-app-uat.up.railway.app | Yes | CI evidence uploaded to META-COMPLY, reviewed and approved before PR |
| Production | `main` | https://wawagardenbar-app-production-45c8.up.railway.app | Yes | Post-deploy evidence captured and uploaded to META-COMPLY |

UAT verification and META-COMPLY approval are completed in workflow 3 before the PR is created. After merge to main, the post-deploy workflow runs smoke tests against production, uploads evidence to META-COMPLY (environment=production), and submits the release for production review.

---

## Rollback

1. **Railway dashboard:** Redeploy previous version
2. **Git:** `git checkout main && git revert HEAD --no-edit && git push origin main`
3. **Document:** Add rollback entry to release ticket audit trail

## Output

- PR merged, Railway deployment verified
- Security verification passed
- Branches synced
- Release ticket finalized in `compliance/approved-releases/`
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
