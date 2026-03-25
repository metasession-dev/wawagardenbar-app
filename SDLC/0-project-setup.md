---
description: One-time project setup — configure repository, CI pipeline, compliance structure, and tooling before workflows can run
---
<!-- SDLC source: META-COMPLY/sdlc/files/0-project-setup.md -->
<!-- SDLC version: sdlc-v1.0.0 -->
<!-- Last synced: 2026-03-25 -->

# Project Setup Guide

**Document Type:** Setup Guide | **Run Once:** At project start, before any workflow is executed

**Parent Documents:** Test Policy, Test Strategy, Test Architecture (all Tier 1, in META-COMPLY/sdlc/files/)

---

## Purpose

This guide configures the Wawa Garden Bar project so that the five pipeline workflows can run correctly. It sets up the repository structure, branch protection, CI pipeline (the independent verification gate), compliance directories, and local tooling.

**Run this guide once when starting a new project.** The pipeline workflows (1-5) assume this setup is complete.

---

## Prerequisites

- GitHub repository created (`metasession-dev/wawagardenbar-app`)
- Railway configured (metasession-dev Pro account) with auto-deploy from `main` (production) and `develop` (UAT)
- Local development environment working (app builds and runs)
- Node.js 20+ and npm installed
- GitHub CLI (`gh`) installed and authenticated

---

## Step 1: Branch Structure

```bash
# Ensure main exists and is up to date
git checkout main
git pull origin main

# Create develop branch
git checkout -b develop
git push origin develop
```

**Branch roles:**
- `main` — Production. Auto-deploys to Railway. Never commit directly.
- `develop` — All work happens here. Permanent, never deleted.

**Status:** Already configured. Both branches exist.

---

## Step 2: Branch Protection Rules

Configure in GitHub → Settings → Branches → Branch protection rules:

**`main` branch:**
- [x] Require a pull request before merging
- [x] Require approvals: 1
- [x] Require status checks to pass before merging
  - Required checks: `typecheck`, `sast`, `dependency-audit`, `e2e-tests`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

**`develop` branch (optional but recommended):**
- [x] Require status checks to pass (push-to-develop checks)

---

## Step 3: Compliance Directory Structure

```bash
# Create compliance directories
mkdir -p compliance/evidence/periodic/{sast-quarterly,dependency-audit,access-control,audit-log,pentest,dr-test,third-party}
mkdir -p compliance/pending-releases
mkdir -p compliance/approved-releases

# Commit
git add compliance/
git commit -m "compliance: initialize compliance directory structure"
git push origin develop
```

**Status:** Partially configured. `compliance/` exists with RTM, test-plan, test-cases, and evidence directories for REQ-001 through REQ-008.

---

## Step 4: CI Pipeline Configuration

This is the **independent verification gate**. Tests run locally during development (comprehensive, all tests). Tests run in CI during PR review (independent, tamper-resistant evidence produced by GitHub).

### What CI Must Run

| Pipeline | Trigger | Jobs | Purpose |
|---|---|---|---|
| Develop CI | Push to `develop` | TypeScript + SAST + dep audit + E2E + build | Full gates + evidence upload to META-COMPLY |
| PR CI | PR to `main` | TypeScript + SAST + dep audit + E2E + build | Independent re-verification |
| UAT Approval | PR to `main` | META-COMPLY UAT approval check | Hard gate — release must be UAT-approved |
| Post-Deploy | Push to `main` | Smoke tests + E2E + evidence upload | Production evidence capture |
| Deploy | Merge to `main` | Auto-deploy to Railway | Production release |

### Workflow Files

| File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/test-on-pr.yml` | PR to main, push to develop | TypeScript check, SAST scan, dependency audit, E2E tests, build check |
| `.github/workflows/check-uat-approval.yml` | PR to main | META-COMPLY UAT approval gate |
| `.github/workflows/post-deploy-prod.yml` | Push to main | Post-production evidence capture |

**Status:** All gates now run on both develop push and PR to main. Evidence auto-uploads to META-COMPLY on develop push with release/environment=uat tagging. UAT approval gate and post-deploy production evidence workflows added.

### After CI Is Configured

```
Developer Machine (comprehensive)          GitHub Actions (independent)
─────────────────────────────────          ──────────────────────────────
TypeScript check ──────────────────────→   TypeScript check
SAST scan (Semgrep) ───────────────────→   SAST scan (Semgrep)
Dependency audit ──────────────────────→   Dependency audit
E2E tests (ALL — 183) ────────────────→   E2E tests (unauthenticated — 142)
E2E tests (authenticated — local only)     ✗ (credentials not in CI)
Post-deploy verification (local only)      ✗ (runs after merge)

Evidence → compliance/evidence/REQ-XXX/    Evidence → GitHub Actions logs + artifacts
(comprehensive, developer-produced)        (independent, tamper-resistant)
```

---

## Step 5: Local Tooling Setup

```bash
# SAST
pip install semgrep

# Verify
semgrep --version
npm audit --help

# Playwright
npx playwright install chromium

# Seed test data
npx tsx scripts/seed-e2e-admins.ts
```

---

## Step 6: Create Project Test Plan

The Test Plan (`SDLC/Test_Plan.md`) is already created with:

- [x] Project name and repository
- [x] Stack and hosting details
- [x] Production URL and health endpoint
- [x] Database configuration
- [x] Test suite counts and framework
- [x] Entry/exit criteria with actual thresholds
- [x] AI tool permissions
- [x] Disaster recovery targets (RTO/RPO)
- [x] Penetration test scope

---

## Step 7: Verify Everything Works

Run through the complete pipeline once with a small test change:

```bash
# 1. Plan (workflow 1)
# Create a test requirement in RTM

# 2. Implement (workflow 2)
# Make a small change, run all local gates

# 3. Compile evidence (workflow 3)
# Generate compliance artifacts

# 4. Submit for review (workflow 4)
# Create PR — verify all CI checks run and pass

# 5. Deploy (workflow 5)
# Merge, verify deployment, finalize compliance
```

---

## Setup Checklist

| Step | Status |
|---|---|
| Repository created (`metasession-dev/wawagardenbar-app`) | [x] |
| `develop` branch created | [x] |
| Railway project created (metasession-dev Pro account) | [x] |
| Production environment configured (auto-deploy from `main`) | [x] |
| UAT environment configured (auto-deploy from `develop`) | [x] |
| Production MongoDB populated from backup | [x] |
| UAT MongoDB populated from backup | [x] |
| Compliance directories created | [x] Complete — including periodic evidence subdirs |
| RTM initialized | [x] REQ-001 through REQ-008 |
| CI workflow files created | [x] test-on-pr.yml, check-uat-approval.yml, post-deploy-prod.yml |
| CI: SAST + dep audit jobs added to test-on-pr.yml | [x] Added typecheck, sast, dependency-audit, e2e-tests jobs |
| **Branch protection configured on `main`** | **[ ] REQUIRED — not yet configured** |
| **Required status checks added to branch protection** | **[ ] REQUIRED — depends on CI jobs** |
| Local tooling installed (Semgrep, Playwright, Husky, Commitlint) | [x] Semgrep 1.155.0, Playwright, Husky + commitlint installed |
| CLAUDE.md with SDLC enforcement rules | [x] AI assistant enforces SDLC process |
| META-COMPLY evidence upload in CI | [x] upload-evidence job in test-on-pr.yml |
| UAT approval gate configured (`check-uat-approval.yml`) | [x] |
| Post-deploy production evidence configured (`post-deploy-prod.yml`) | [x] |
| Project Test Plan created | [x] |
| End-to-end pipeline verified with test change | [x] PR #1 — all 4 CI gates passed, merged, deployed |

---

## What Happens Next

With setup complete, all development follows the five pipeline workflows:

```
1-plan-requirement.md       → Define requirement, classify risk, generate test scope
2-implement-and-test.md     → Code, commit, run all local gates, auto-deploy to UAT
3-compile-evidence.md       → Gather evidence, verify on UAT, create release ticket
4-submit-for-review.md      → Create PR (CI runs independent verification)
5-deploy-main.md            → Merge, deploy, verify, finalize
```
