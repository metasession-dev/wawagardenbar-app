# Wawa Garden Bar — Development & Compliance Workflow System

**Standard:** ISO/IEC/IEEE 29119-3:2021 | **Version:** 1.0 | **Date:** 2026-03-15

---

## Document Structure

### Tier 1 — Universal

| Document | Owns |
|----------|------|
| **Test Policy** | Why we test, commitments, AI governance, roles, accountability |
| **Test Strategy** | How we approach testing — methodology, risk classification, security, AI protocol |
| **Test Architecture** | What we build with — tools, patterns, code standards, CI config |
| **Periodic Security Review** | When periodic security activities happen |

### Tier 2 — Project-Specific

| Document | Purpose |
|----------|---------|
| **Project Setup** | One-time: repository, CI, compliance configuration |
| **Test Plan** | Environment, test suites, exit criteria, AI config, evidence |
| **Workflows 0-5** | Operational pipeline procedures |

---

## Pipeline

```
 0. SETUP         One-time: repo, CI, compliance dirs, tooling (0-project-setup.md)
 1. PLAN          Define requirement, classify risk, generate test scope
 2. IMPLEMENT     Code on develop, run all local gates
 3. EVIDENCE      Compile test + security + AI evidence
 4. PR            Create PR → CI runs independent verification automatically
 5. REVIEW        Human reviews code + CI results + evidence
 6. APPROVE       PR approval = formal sign-off
 7. MERGE         Auto-deploy to production
 8. VERIFY        Health + security verification
 9. FINALIZE      RTM closed, release ticket approved
```

## Quick Reference

| Scenario | Workflows |
|----------|-----------|
| New project setup | 0 (once) |
| New feature (tracked) | 1 → 2 → 3 → 4 → (CI + review) → 5 |
| Bug fix / docs / config | 2 → 4 → (CI + review) → 5 |

## Mandatory Gates

| Gate | Local | CI (PR) | Threshold |
|------|-------|---------|-----------|
| TypeScript | Yes | Yes | 0 errors |
| SAST | Yes | Yes | 0 high/critical |
| Dependencies | Yes | Yes | 0 high/critical |
| E2E (Playwright) | All | Unauthenticated subset | All pass |
| Human review | — | PR approved | Approved |

## Risk Levels

| Level | Extra Requirements |
|-------|-------------------|
| Low | Standard gates |
| Medium | + access control + audit log testing |
| High | + pen test consideration + independent review |

AI in Medium/High categories raises risk one level.

## CI/CD

| Trigger | What Runs |
|---------|-----------|
| Push to `develop` | TypeScript + build |
| PR to `main` | TypeScript + SAST + deps + E2E (unauthenticated) |
| Merge to `main` | Auto-deploy to Railway |

CI is the independent verification gate — evidence produced by GitHub, not the developer. See Test Plan for details.

---

## How to Use: Prompt Guide

This system is designed to be driven by prompts to your AI assistant. Each workflow is triggered by giving the AI the right context and instruction. The AI reads the workflow file, follows the steps, and produces the required artifacts.

### Starting a New Project

```
Read 0-project-setup.md and execute the full project setup for Wawa Garden Bar.

The project is a full-stack food and drink ordering platform built with Next.js 16,
TypeScript, MongoDB, and Socket.IO. It's hosted on Railway at
https://wawagardenbar-app-production.up.railway.app. The database is MongoDB 8.

Set up the repository structure, branch protection, CI pipeline, compliance
directories, and create the project Test Plan from the template.
```

### Workflow 1: Planning a New Feature

**Simple feature (likely Low risk):**

```
Read 1-plan-requirement.md and plan a new requirement.

I want to add [describe the feature]. Follow the workflow: determine the next
REQ ID, classify the risk level, add the RTM entry, create the evidence
directory, generate the test scope, and commit.
```

**Feature touching sensitive areas (likely Medium/High):**

```
Read 1-plan-requirement.md and plan a new requirement.

I want to modify the [authentication/payment/user data] system to [describe
the change]. This touches [security-sensitive area] so classify risk
appropriately. Follow the full workflow including the AI use note since
you'll be generating the implementation code.
```

### Workflow 2: Implementation

**Standard implementation:**

```
Read 2-implement-and-test.md and implement REQ-XXX.

Refer to the test scope in compliance/evidence/REQ-XXX/test-scope.md for
what needs to be tested. Implement the feature, add JSDoc headers, run all
local gates (TypeScript, SAST, dependency audit, E2E tests), and push to develop.
```

**Resuming after a break:**

```
Read 2-implement-and-test.md. I'm continuing work on REQ-XXX.

Check the current state: verify we're on develop, review what's been done so
far, check what items remain in the test scope, and continue implementation.
Run all gates before pushing.
```

**Fixing a failing gate:**

```
Read 2-implement-and-test.md. The SAST scan found issues after my last commit.

Review the findings, fix the legitimate issues, document any false positives
in compliance/evidence/REQ-XXX/sast-review.md, and re-run all gates.
```

### Workflow 3: Compiling Evidence

**After implementation is complete:**

```
Read 3-compile-evidence.md and compile all evidence for REQ-XXX.

Verify all gates pass, save test evidence, save security evidence (SAST +
dependency audit), verify AI use documentation is complete, check that all
test scope items are addressed, update the RTM, generate the release ticket,
and commit everything.
```

### Workflow 4: Submitting for Review

**Creating the PR:**

```
Read 4-submit-for-review.md and create the PR for REQ-XXX.

Verify develop is ready, review what will be in the PR, create it with the
full compliance checklist, and link it to the release ticket. Then check
that CI starts running.
```

**After CI fails on the PR:**

```
Read 4-submit-for-review.md, Step 4 (Wait for CI). CI failed on the PR.

Check which job failed using gh pr checks, diagnose the issue, fix it,
re-run local gates to confirm, and push so CI re-runs.
```

**After reviewer requests changes:**

```
Read 4-submit-for-review.md, Step 7 (Handle Feedback). The reviewer
requested changes: [describe the feedback].

Make the requested changes, re-run all local gates, update security evidence
if needed, and push to develop.
```

### Workflow 5: Deploying

**After PR is approved:**

```
Read 5-deploy-main.md and deploy REQ-XXX.

Merge the PR, sync branches, verify the deployment (health check, smoke test,
security verification), finalize the compliance artifacts (move release ticket,
update RTM, add audit trail entries), and do the final sync.
```

**If deployment fails:**

```
Read 5-deploy-main.md, Rollback section. The deployment is failing.

[Describe the symptoms]. Execute the rollback procedure and document it in
the release ticket audit trail.
```

### Untracked Changes (No REQ — Bug Fixes, Docs, Config)

**Quick fix:**

```
Read 2-implement-and-test.md. I need to fix a bug: [describe the bug].

This doesn't need a tracked requirement. Implement the fix, run all local gates,
commit, and push. Then read 4-submit-for-review.md and create a PR with the
simplified untracked changes template.
```

### Periodic Security Reviews

**Quarterly review:**

```
Read the Periodic Security Review Schedule and execute the quarterly review
for this project.

Run the full codebase SAST scan, dependency deep audit, access control review,
and audit log integrity check. Save all evidence to the periodic directories.
```

**Annual penetration test prep:**

```
Read the Periodic Security Review Schedule, annual penetration testing section.

Prepare the scope document for the pen tester based on our project's Test Plan.
List the target URLs, API endpoints, authentication mechanism, and any specific
areas of concern.
```

### Tips for Effective Prompts

**Always reference the workflow file.** Starting with "Read [workflow].md" ensures the AI follows the documented process rather than improvising.

**Provide context the AI needs.** The AI knows the workflow steps but doesn't know what you're building unless you tell it. Describe the feature, the area of the codebase, and any constraints.

**Let the AI classify risk.** Don't pre-classify unless you're certain. The AI applies the risk matrix from the Test Strategy consistently. If you disagree with its classification, discuss it — the human always has final say.

**Chain workflows naturally.** You don't need to complete one workflow in a single prompt. Break long sessions across multiple prompts. The compliance artifacts (RTM, evidence directory, test scope) maintain state between sessions.

**Use "continue" for long workflows.** Implementation (workflow 2) often spans multiple sessions:

```
Continue with REQ-XXX. Where did we leave off? Check the test scope
and resume from there.
```

**For the full pipeline in one session** (small features):

```
Read the workflow files 1 through 5. I want to implement [small feature].

Run through the entire pipeline: plan the requirement, implement it, compile
evidence, create the PR, and after approval, deploy. This is a straightforward
change so it should be Low risk.
```
