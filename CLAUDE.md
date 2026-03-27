# Wawa Garden Bar — CLAUDE.md

## Repository Overview

Wawa Garden Bar is a Next.js web application for a restaurant/bar with online ordering, menu management, admin dashboard, and loyalty rewards. Stack: Next.js (App Router), TypeScript, MongoDB, TailwindCSS, Socket.IO.

## Build & Run Commands

```bash
npm install              # Install dependencies
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Vitest unit tests
npx playwright test      # E2E tests (Playwright)
```

## Key Directories

```
app/                     # Next.js App Router pages + API routes
components/              # React components
lib/                     # Utilities, MongoDB client
models/                  # Mongoose models
services/                # Business logic
interfaces/              # TypeScript interfaces
e2e/                     # Playwright E2E tests
compliance/              # RTM, evidence, release tickets
SDLC/                    # SDLC workflow templates
```

## SDLC Compliance Process (MANDATORY)

This project follows the Metasession SDLC framework. These rules are MANDATORY and OVERRIDE default behaviour.

### SDLC Workflow Files

Detailed workflow instructions are in this project's `SDLC/` directory. **Read the relevant workflow file before executing each stage:**

| Stage | File                           | When to read                             |
| ----- | ------------------------------ | ---------------------------------------- |
| 0     | `SDLC/0-project-setup.md`      | One-time project initialisation          |
| 1     | `SDLC/1-plan-requirement.md`   | Starting a new feature or tracked change |
| 2     | `SDLC/2-implement-and-test.md` | Writing and testing code                 |
| 3     | `SDLC/3-compile-evidence.md`   | After implementation, before PR          |
| 4     | `SDLC/4-submit-for-review.md`  | Creating the PR to main                  |
| 5     | `SDLC/5-deploy-main.md`        | After PR approval, deploying             |

When a workflow step requires detailed commands or templates, **read the full workflow file** rather than relying on the summary below. The files contain exact commands, templates, and checklists.

Tier 1 reference documents (policy, strategy, architecture) are also in `SDLC/` if present, or in the META-COMPLY repository at `sdlc/files/`.

### Before ANY Code Change

1. Ask: **"Which GitHub Issue is this for?"** before writing code. Fetch it with `gh issue view NNN`.
2. If no issue exists: ask if one should be created. Create with `gh issue create` if needed.
3. If new requirement needed: **read `SDLC/1-plan-requirement.md`** and follow it to create RTM entry (with issue reference), evidence directory, and test-scope.md BEFORE implementing.
4. If trivial (typo/formatting): proceed without requirement but use conventional commit format.
5. Verify `develop` branch: `git branch --show-current` — never implement on `main`.

### Requirement Planning (do this BEFORE coding)

**Read `SDLC/1-plan-requirement.md` for full details.** Summary:

1. Confirm GitHub Issue `#NNN` exists (create if needed via `gh issue create`).
2. Get next REQ ID: `grep -oP 'REQ-\d+' compliance/RTM.md | sort -t- -k2 -n | tail -1`
3. Classify risk (use issue labels as input): LOW (internal, no auth) / MEDIUM (PII, user-facing, APIs) / HIGH (security, payments, RBAC). AI involvement raises risk by one level.
4. Add to `compliance/RTM.md` Part B: `| REQ-XXX | #NNN | [RISK] | compliance/evidence/REQ-XXX/ | DRAFT | -- | -- |`
5. Create `compliance/evidence/REQ-XXX/test-scope.md` with acceptance criteria.
6. **WAIT CHECKPOINT:** Present the test scope to the developer. Do NOT proceed until confirmed.
7. Create `compliance/evidence/REQ-XXX/ai-use-note.md` if AI is involved.
8. Commit plan: `compliance: [REQ-XXX] define requirement and test scope`

### During Implementation

**Read `SDLC/2-implement-and-test.md` for full details.** Summary:

- **Before coding:** Verify `compliance/evidence/REQ-XXX/test-scope.md` exists. If missing, STOP and run planning workflow first.
- **MEDIUM/HIGH risk:** Create `compliance/evidence/REQ-XXX/implementation-plan.md` before coding — document approach, files, architecture decisions. **WAIT CHECKPOINT:** Present the plan to the developer. Do NOT code until approved. Commit the plan first.
- Every commit: conventional format with `Ref: REQ-XXX` and `Co-Authored-By` for AI.
- Add `@requirement REQ-XXX` JSDoc headers to modified files.
- Log AI prompts in `compliance/evidence/REQ-XXX/ai-prompts.md` for MEDIUM/HIGH risk. Verify `ai-prompts.md` is updated before committing AI-generated code.
- **Before staging:** review and update existing tests, write new tests for new functionality, verify test scope coverage. Gates must run against a test suite that covers the changes.

### Before Pushing

Run ALL gates — every one must pass:

```bash
npx tsc --noEmit                                      # 0 errors
semgrep scan --config auto app/ lib/ services/ models/ # 0 new findings above baseline
npm audit --audit-level=high                           # 0 unaccepted vulnerabilities
npx playwright test                                    # all pass
```

### After Pushing: WAIT — Confirm CI Green

```bash
gh run list --branch develop --limit 1
```

Do NOT proceed to evidence compilation or PR creation until CI is green. If CI fails, fix locally and re-push.

### Evidence Storage Rule

**Markdown stays in git. Binary/JSON evidence goes to META-COMPLY portal.**

Upload to META-COMPLY (NEVER commit to git):

- E2E results (JSON), screenshots (PNG/JPG), SAST results (JSON), dependency audit (JSON), unit test output (TXT), test reports (HTML)

```bash
./scripts/upload-evidence.sh wawagardenbar-app REQ-XXX [type] [file]
```

Keep in git (small markdown, needs PR review):

- `compliance/RTM.md`, `test-scope.md`, `security-summary.md`, `ai-use-note.md`, `ai-prompts.md`, release tickets

### After Implementation

**Read `SDLC/3-compile-evidence.md` for full details, including release ticket template.** Summary:

1. Confirm CI is green before compiling evidence: `gh run list --branch develop --limit 1`
2. Upload binary/JSON evidence to META-COMPLY portal
3. Create `compliance/evidence/REQ-XXX/security-summary.md` (in git)
4. Update RTM status to `TESTED - PENDING SIGN-OFF`
5. Create `compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md` (use template from workflow file)
6. **WAIT CHECKPOINT:** Confirm CI + UAT deployment complete before UAT verification. Do NOT test against a stale deployment.
7. Commit compliance markdown locally (do NOT push yet — batch with UAT results):

```bash
git add compliance/RTM.md compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md \
  compliance/evidence/REQ-XXX/test-scope.md \
  compliance/evidence/REQ-XXX/security-summary.md \
  compliance/evidence/REQ-XXX/ai-use-note.md
git commit -m "compliance: [REQ-XXX] evidence compiled - awaiting review"
```

8. **Verify on UAT** (if configured) — health check, smoke test, feature verification. Record in `security-summary.md`. Commit locally. Do NOT create a PR until UAT is green.
9. **Push all compliance commits** in a single push: `git push origin develop`

### Pre-Flight Checklist (Before Creating PR)

Before creating a PR, verify ALL of the following:

- [ ] CI green on develop (not stale): `gh run list --branch develop --limit 1`
- [ ] Working tree clean: `git status`
- [ ] UAT verification passed (if configured)
- [ ] For tracked requirements: test-scope.md complete, implementation-plan.md exists (MEDIUM/HIGH), RTM is `TESTED - PENDING SIGN-OFF`, release ticket created, evidence uploaded

If any item fails, resolve it before proceeding. Read `SDLC/4-submit-for-review.md` for full PR creation steps.

### Review Policy (Risk-Tiered)

- **LOW risk:** CI provides independent verification. Self-merge is permitted after all CI checks pass.
- **MEDIUM/HIGH risk:** A second human reviewer MUST approve before merge. Self-merge is NOT permitted.

### Rules (NEVER break these)

- NEVER code without a GitHub Issue and requirement entry for tracked changes
- NEVER push without all four gates passing
- NEVER self-merge a MEDIUM or HIGH risk PR — a second human reviewer MUST approve
- NEVER use `--no-verify` to skip hooks
- NEVER commit secrets (.env, credentials, API keys)
- NEVER commit binary/JSON evidence to git — upload to META-COMPLY instead
- NEVER create a PR to main without UAT verification passing first (if UAT configured)
- NEVER push directly to main — always develop → PR → main
- NEVER skip Co-Authored-By when AI generates code
- NEVER proceed past a WAIT CHECKPOINT without developer confirmation
- ALWAYS commit compliance markdown to git (RTM, test-scope, implementation-plan, security-summary, release tickets)
- ALWAYS use merge commits (not squash) for develop → main
