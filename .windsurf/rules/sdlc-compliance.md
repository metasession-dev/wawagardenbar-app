---
trigger: always_on
---

## SDLC Compliance Process (MANDATORY)

This project follows the Metasession SDLC framework. These rules are MANDATORY and OVERRIDE default behaviour.

### SDLC Workflow Files

Detailed workflow instructions are in this project's `SDLC/` directory. Read the relevant workflow file before executing each stage:

- Stage 0: `SDLC/0-project-setup.md` — One-time project initialisation
- Stage 1: `SDLC/1-plan-requirement.md` — Starting a new feature or tracked change
- Stage 2: `SDLC/2-implement-and-test.md` — Writing and testing code
- Stage 3: `SDLC/3-compile-evidence.md` — After implementation, before PR
- Stage 4: `SDLC/4-submit-for-review.md` — Creating the PR to main
- Stage 5: `SDLC/5-deploy-main.md` — After PR approval, deploying to production

When a workflow step requires detailed commands or templates, read the full workflow file rather than relying on the summary below.

### Before ANY Code Change

1. Ask: "Which requirement (REQ-XXX) is this for?" before writing code.
2. If new requirement needed: read `SDLC/1-plan-requirement.md` and follow it BEFORE implementing.
3. If trivial (typo/formatting): proceed without requirement but use conventional commit format.
4. Verify `develop` branch: `git branch --show-current` — never implement on `main`.

### Requirement Planning (do this BEFORE coding)

Read `SDLC/1-plan-requirement.md` for full details. Summary:

1. Get next ID: `grep -oP 'REQ-\d+' compliance/RTM.md | sort -t- -k2 -n | tail -1`
2. Classify risk: LOW (internal, no auth) / MEDIUM (PII, user-facing, APIs) / HIGH (security, payments, RBAC). AI involvement raises risk by one level.
3. Add to `compliance/RTM.md` Part B: `| REQ-XXX | [desc] | [RISK] | TBD | TBD | DRAFT | -- | -- |`
4. Create `compliance/evidence/REQ-XXX/test-scope.md` with acceptance criteria.
5. Create `compliance/evidence/REQ-XXX/ai-use-note.md` if AI is involved.
6. Commit plan: `compliance: [REQ-XXX] define requirement and test scope`

### During Implementation

Read `SDLC/2-implement-and-test.md` for full details. Summary:

- **MEDIUM/HIGH risk:** Create `compliance/evidence/REQ-XXX/implementation-plan.md` before coding — document approach, files, architecture decisions. Commit the plan first.
- Every commit: conventional format with `Ref: REQ-XXX` and `Co-Authored-By` for AI.
- Add `@requirement REQ-XXX` JSDoc headers to modified files.
- Log AI prompts in `compliance/evidence/REQ-XXX/ai-prompts.md` for MEDIUM/HIGH risk.
- **Before staging:** review and update existing tests, write new tests for new functionality, verify test scope coverage. Gates must run against a test suite that covers the changes.

### Before Pushing

Run ALL gates — every one must pass:
```
npx tsc --noEmit                                      # 0 errors
semgrep scan --config auto app/ lib/ services/ models/ # 0 new findings above baseline
npm audit --audit-level=high                           # 0 unaccepted vulnerabilities
npx playwright test                                    # all pass
```

### Evidence Storage Rule

Markdown stays in git. Binary/JSON evidence goes to META-COMPLY portal.

Upload to META-COMPLY (NEVER commit to git):
- E2E results (JSON), screenshots (PNG/JPG), SAST results (JSON), dependency audit (JSON), unit test output (TXT), test reports (HTML)

```
./scripts/upload-evidence.sh wawagardenbar-app REQ-XXX [type] [file]
```

Keep in git (small markdown, needs PR review):
- compliance/RTM.md, test-scope.md, security-summary.md, ai-use-note.md, ai-prompts.md, release tickets

### After Implementation

Read `SDLC/3-compile-evidence.md` for full details, including release ticket template. Summary:

1. Upload binary/JSON evidence to META-COMPLY portal
2. Create `compliance/evidence/REQ-XXX/security-summary.md` (in git)
3. Update RTM status to `TESTED - PENDING SIGN-OFF`
4. Create `compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md` (use template from workflow file)
5. **Verify on UAT** — wait for Railway auto-deploy from `develop`, then run health check, smoke test, and feature-specific verification. Record results in `security-summary.md`. Do NOT create a PR until UAT is green.
6. Commit compliance markdown ONLY (never binary/JSON evidence)

### Environments

| Environment | Branch | URL | Auto-deploy |
|-------------|--------|-----|-------------|
| UAT | `develop` | https://wawagardenbar-app-uat.up.railway.app | Yes |
| Production | `main` | https://wawagardenbar-app-production-45c8.up.railway.app | Yes |

### Review Policy (Risk-Tiered)

- **LOW risk:** CI provides independent verification. Self-merge is permitted after all CI checks pass.
- **MEDIUM/HIGH risk:** A second human reviewer MUST approve before merge. Self-merge is NOT permitted.

### Rules (NEVER break these)

- NEVER code without a requirement entry for tracked changes
- NEVER push without all four gates passing
- NEVER self-merge a MEDIUM or HIGH risk PR — a second human reviewer MUST approve
- NEVER use `--no-verify` to skip hooks
- NEVER commit secrets (.env, credentials, API keys)
- NEVER commit binary/JSON evidence to git — upload to META-COMPLY instead
- NEVER push directly to main — always develop → PR → main
- NEVER skip Co-Authored-By when AI generates code
- NEVER create a PR to main without UAT verification passing first
- ALWAYS commit compliance markdown to git (RTM, test-scope, implementation-plan, security-summary, release tickets)
- ALWAYS use merge commits (not squash) for develop → main
