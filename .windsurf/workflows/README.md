# Wawa Garden Bar — Development & Compliance Workflow System

**Standard:** ISO/IEC/IEEE 29119-3:2021 (Test Documentation)
**Version:** 2.0
**Date:** March 7, 2026

---

## Workflow Pipeline

Every change follows this pipeline. No shortcuts — the chain is the compliance guarantee.

```
 1. PLAN          Define the requirement (REQ-XXX) in RTM
                  ↓
 2. IMPLEMENT     Code on develop branch, commit with REQ reference
                  ↓
 3. TEST          Run full Playwright suite (183 tests), fix failures
                  ↓
 4. EVIDENCE      Generate compliance artifacts (RTM update, evidence, release ticket)
                  ↓
 5. PR            Create PR: develop → main with compliance checklist
                  ↓
 6. REVIEW        Human reviews code + artifacts, comments, requests changes
                  ↓
 7. APPROVE       Human approves PR in GitHub (this IS the sign-off)
                  ↓
 8. MERGE         Merge PR to main (triggers Railway auto-deploy)
                  ↓
 9. VERIFY        Health check production, sync branches
```

## Workflow Files

| # | Workflow | File | When to Use |
|---|----------|------|-------------|
| 1 | **Plan** | `plan-requirement.md` | Starting new work — creates REQ-XXX in RTM |
| 2 | **Implement & Test** | `implement-and-test.md` | Coding, committing, running tests on develop |
| 3 | **Compliance Artifacts** | `audit-finish.md` | Generating release ticket and updating RTM |
| 4 | **Submit for Review** | `submit-for-review.md` | Creating PR with compliance checklist |
| 5 | **Deploy** | `deploy-main.md` | Post-approval: merge, deploy, verify, sync |

## Quick Reference: Which Workflow Do I Use?

| Scenario | Workflows to Run |
|----------|-----------------|
| New feature with REQ tracking | 1 → 2 → 3 → 4 → (human review) → 5 |
| Bug fix (no REQ) | 2 → 4 → (human review) → 5 |
| Documentation update | 2 → 4 → (human review) → 5 |
| Hotfix (urgent production fix) | 2 → 4 → (human review) → 5 |
| Compliance-only update (RTM, evidence) | 2 → 4 → (human review) → 5 |

## The Approval Gate

**The GitHub Pull Request IS the formal sign-off.** When a reviewer approves a PR:
- Their name, timestamp, and approval are recorded immutably in GitHub
- This replaces paper sign-off tables for routine changes
- For tracked requirements (REQ-XXX), the release ticket in `compliance/pending-releases/` provides the formal audit artifact
- After merge, the release ticket moves to `compliance/approved-releases/`

## CI/CD Integration

| Trigger | Action |
|---------|--------|
| Push to `develop` | GitHub Actions runs TypeScript check + Docker build |
| PR to `main` | GitHub Actions runs E2E tests (142 unauthenticated) |
| Merge to `main` | Railway auto-deploys from main branch |

## Compliance Documents

| Document | Location | Updated By |
|----------|----------|------------|
| Test Plan | `compliance/test-plan.md` | Quarterly review |
| RTM | `compliance/RTM.md` | Every requirement change |
| Test Cases | `compliance/test-cases.md` | When tests are added/modified |
| Test Summary Report | `compliance/test-summary-report.md` | Each release cycle |
| Requirements | `docs/REQUIREMENTS.md` | When features are added/changed |
