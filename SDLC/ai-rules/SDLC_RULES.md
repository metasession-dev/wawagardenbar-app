<!-- SDLC source: META-COMPLY/sdlc/ai-rules/SDLC_RULES.md -->
<!-- SDLC version: sdlc-v1.0.0 -->
<!-- Last synced: 2026-03-25 -->

# SDLC Compliance Rules for AI Assistants

These rules enforce the Metasession SDLC process. They MUST be followed for every code change. These rules OVERRIDE default behaviour.

## SDLC Workflow Files

This project contains detailed SDLC workflow files in its `SDLC/` directory (copied from META-COMPLY during project setup). **You MUST read the relevant workflow file before executing each stage.** The summaries in this document are not a substitute for the full workflow — they are guardrails. The workflow files contain exact commands, templates, checklists, and edge cases.

| Stage | File to read | When |
|-------|-------------|------|
| 0 | `SDLC/0-project-setup.md` | One-time project initialisation |
| 1 | `SDLC/1-plan-requirement.md` | Before implementing any tracked change |
| 2 | `SDLC/2-implement-and-test.md` | During coding and testing |
| 3 | `SDLC/3-compile-evidence.md` | After implementation, before PR |
| 4 | `SDLC/4-submit-for-review.md` | Creating the PR to main |
| 5 | `SDLC/5-deploy-main.md` | After PR approval, deploying |

Tier 1 reference docs (Test_Policy.md, Test_Strategy.md, Test_Architecture.md, Periodic_Security_Review_Schedule.md) may also be in `SDLC/` or in the META-COMPLY repository.

## CRITICAL: Before Writing Any Code

Before implementing ANY change (feature, fix, refactor, or enhancement), you MUST complete these checks:

### 1. Identify the GitHub Issue

Ask the user: **"Which GitHub Issue is this for?"**

- If the user provides an issue number (e.g., `#123`): fetch it with `gh issue view 123` to get context, labels, and description.
- If the user describes work without an issue: ask **"Is there a GitHub Issue for this, or should we create one?"** Create one with `gh issue create` if needed.
- If the user says it's trivial (typo, formatting, dependency bump): proceed without an issue or requirement, but still use conventional commit format.

### 2. Determine if this change needs a requirement

- If the issue is non-trivial (not a typo/formatting/dependency bump): it needs a requirement.
- If a REQ-XXX already exists for this issue: verify it exists in `compliance/RTM.md` before proceeding.
- If no requirement exists yet: **STOP coding and run the planning workflow first** (see "Planning a Requirement" below).
- If the user is unsure: assume it needs a requirement if it touches security, auth, payments, user-facing features, API changes, or data handling. Use issue labels to help classify.

### 3. Verify the requirement is planned

Before writing code for a tracked requirement, check that these exist:
- Entry in `compliance/RTM.md` with status `DRAFT` or higher
- Directory `compliance/evidence/REQ-XXX/` exists
- File `compliance/evidence/REQ-XXX/test-scope.md` exists

If any are missing, tell the user: **"REQ-XXX hasn't been fully planned yet. Let's complete the planning step first."** Then follow "Planning a Requirement" below.

### 4. Verify you're on the correct branch

```bash
git branch --show-current
```

All implementation work MUST happen on `develop`. If on a different branch, ask the user before switching.

---

## Planning a Requirement

When a new requirement is needed, guide the user through these steps. Do NOT skip any.

### Step 1: Confirm the GitHub Issue

If not already identified in the pre-coding checks:

```bash
gh issue view NNN
```

If no issue exists, create one:

```bash
gh issue create --title "[title]" --body "[description]" --label "[labels]"
```

Use the issue title, description, and labels to inform the requirement description and risk classification below.

### Step 2: Get the next requirement ID

```bash
grep -oP 'REQ-\d+' compliance/RTM.md | sort -t- -k2 -n | tail -1
```

The next ID is one higher.

### Step 3: Classify risk

Ask the user to classify risk, using issue labels as a starting point:

| Risk | Criteria |
|------|----------|
| LOW | Internal tools, no regulated data, no auth changes |
| MEDIUM | Touches PII, user-facing features, API changes, new dependencies |
| HIGH | Security, payments, RBAC, data handling, authentication |

Tell the user: **"If AI is generating code for MEDIUM or HIGH risk areas, the risk level is raised by one level."**

### Step 4: Add RTM entry

Add to `compliance/RTM.md` Part B. The issue provides full context; the RTM is a traceability index.

```markdown
| REQ-XXX | #NNN | [LOW/MEDIUM/HIGH] | compliance/evidence/REQ-XXX/ | DRAFT | -- | -- |
```

### Step 5: Create evidence directory and test scope

```bash
mkdir -p compliance/evidence/REQ-XXX
```

Create `compliance/evidence/REQ-XXX/test-scope.md` with acceptance criteria based on risk level. Ask the user what the acceptance criteria are.

### Step 6: Document AI involvement (if applicable)

Create `compliance/evidence/REQ-XXX/ai-use-note.md`:

```markdown
AI Tool: [tool name]
Risk Classification Impact: [original risk] → [adjusted risk if AI involved]
Areas of AI involvement: [list]
```

### Step 7: Commit the plan

```bash
git add compliance/RTM.md compliance/evidence/REQ-XXX/
git commit -m "compliance: [REQ-XXX] define requirement and test scope - [description]

Ref: REQ-XXX

Co-Authored-By: [AI tool tag]"
```

**Only after this commit should implementation begin.**

---

## Implementation Plan (MEDIUM/HIGH Risk — Before Coding)

For MEDIUM and HIGH risk requirements, create an implementation plan before writing code. This documents design decisions and file structure — evidence that architecture was deliberate.

**Skip this for LOW risk** — proceed directly to implementation.

1. Explore the codebase to understand existing patterns relevant to the change
2. Create `compliance/evidence/REQ-XXX/implementation-plan.md` with:
   - Approach (1-3 sentences)
   - Files to create and modify (with purpose)
   - Architecture decisions and rationale
   - Dependencies (new packages or "None")
   - Risks / considerations
3. Review the plan with the developer before proceeding
4. Commit the plan

Tell the user: **"This is MEDIUM/HIGH risk. Let me create an implementation plan before we start coding."**

```bash
git add compliance/evidence/REQ-XXX/implementation-plan.md
git commit -m "chore(compliance): [REQ-XXX] implementation plan

Ref: REQ-XXX

Co-Authored-By: [AI tool tag]"
```

---

## During Implementation

### Commit format

Every commit MUST follow this format:

```
type(scope): description

- Key change 1
- Key change 2

Ref: REQ-XXX

Co-Authored-By: [AI tool] <noreply@provider.com>
```

- `type`: feat, fix, refactor, test, docs, compliance
- `Ref: REQ-XXX` is REQUIRED for tracked changes
- `Co-Authored-By` is REQUIRED when AI generates code

### JSDoc headers

Every new or significantly modified file must include:

```typescript
/**
 * @requirement REQ-XXX - Brief description
 */
```

### AI-generated code logging

When generating code for MEDIUM or HIGH risk requirements, append to `compliance/evidence/REQ-XXX/ai-prompts.md`:

```markdown
## [Date]
Prompt: [summary of what was asked]
Files: [list of files generated/modified]
Regenerated: [yes/no — if yes, full retest required]
```

### Test review and update

Before staging changes, review the test suite to ensure it covers the implementation:

1. **Check existing tests:** Do any existing tests reference changed areas (routes, API shapes, selectors, assertions)? Update them if so.
2. **Write new tests:** New pages need route protection tests. New API endpoints need auth enforcement tests. New user flows need E2E tests. New business logic needs unit tests.
3. **Verify test scope:** Check `compliance/evidence/REQ-XXX/test-scope.md` — does it list testing items that aren't yet covered? Write the tests before proceeding.

Tell the user: **"Before staging, let me review the test suite to make sure it covers the changes we just made."**

Gates must run against a test suite that actually covers the new code. A green gate on an unchanged test suite is a false signal.

---

## Before Pushing Code

Before pushing to `develop`, ALL of these gates must pass:

```bash
# TypeScript — 0 errors required
npx tsc --noEmit

# SAST — 0 high/critical findings required
semgrep scan --config auto src/ --severity ERROR --severity WARNING

# Dependency audit — 0 high/critical vulnerabilities required
npm audit --audit-level=high

# E2E tests — all must pass
npx playwright test
```

If any gate fails, fix the issue before pushing. Do NOT use `--no-verify` to skip hooks.

Tell the user: **"All four compliance gates must pass before pushing. Let me run them."**

---

## After Implementation is Complete

When the user says implementation is done, or when all acceptance criteria from test-scope.md are met, guide them through evidence compilation:

### Step 1: Verify all gates pass (run them again)

### Step 2: Upload binary/JSON evidence to META-COMPLY

**Markdown stays in git. Binary and JSON evidence goes to META-COMPLY.**

Upload these to META-COMPLY (NEVER commit to git):
- E2E results (JSON)
- Screenshots (PNG/JPG)
- SAST results (JSON)
- Dependency audit results (JSON)
- Unit test output (TXT)
- Test reports (HTML)

```bash
# Upload E2E results
./scripts/upload-evidence.sh [PROJECT_SLUG] REQ-XXX e2e_result /tmp/e2e-results.json

# Upload SAST results
semgrep scan --config auto src/ --json > /tmp/sast-results.json
./scripts/upload-evidence.sh [PROJECT_SLUG] REQ-XXX audit_log /tmp/sast-results.json

# Upload dependency audit
npm audit --json > /tmp/dependency-audit.json
./scripts/upload-evidence.sh [PROJECT_SLUG] REQ-XXX audit_log /tmp/dependency-audit.json

# Upload unit test output
npm test -- --verbose 2>&1 | tee /tmp/unit-test-results.txt
./scripts/upload-evidence.sh [PROJECT_SLUG] REQ-XXX test_report /tmp/unit-test-results.txt
```

The upload script is from the META-COMPLY repository at `scripts/upload-evidence.sh`.

### Step 3: Create markdown evidence in git

These stay in git (small, reviewable, need version history):

Create `compliance/evidence/REQ-XXX/security-summary.md`:

```markdown
SAST scan: 0 findings
Dependency audit: 0 vulnerabilities
Evidence uploaded to META-COMPLY project: [PROJECT_SLUG]
```

Verify these also exist in git:
- `compliance/evidence/REQ-XXX/test-scope.md` (from planning)
- `compliance/evidence/REQ-XXX/implementation-plan.md` (MEDIUM/HIGH risk — from implementation plan step)
- `compliance/evidence/REQ-XXX/ai-use-note.md` (if AI was used)
- `compliance/evidence/REQ-XXX/ai-prompts.md` (if AI was used, MEDIUM/HIGH risk)

### Step 4: Update RTM status

Change the requirement status from `DRAFT` or `IN PROGRESS` to `TESTED - PENDING SIGN-OFF` in `compliance/RTM.md`.

### Step 5: Create release ticket

Create `compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md` with:
- Summary of changes
- Test changes (which test files were added/modified, what they cover, any gaps)
- Test evidence table (reference META-COMPLY portal for binary evidence)
- Security evidence (reference `security-summary.md` in git)
- AI involvement summary
- Audit trail

When creating the PR, include:
- A **"Test Changes"** section listing test files added/modified, what they cover, and what's NOT covered
- A **"Where to Find Test Results"** section pointing reviewers to: CI status icons on commits, automated E2E comment, META-COMPLY portal link, and compliance evidence files in the PR

### Step 6: Commit compliance markdown only

```bash
# ONLY commit markdown — binary/JSON evidence is in META-COMPLY
git add compliance/RTM.md \
  compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md \
  compliance/evidence/REQ-XXX/test-scope.md \
  compliance/evidence/REQ-XXX/implementation-plan.md \
  compliance/evidence/REQ-XXX/security-summary.md \
  compliance/evidence/REQ-XXX/ai-use-note.md \
  compliance/evidence/REQ-XXX/ai-prompts.md
git commit -m "compliance: [REQ-XXX] evidence compiled - awaiting review

Ref: REQ-XXX

Co-Authored-By: [AI tool tag]"
```

**NEVER `git add` JSON, TXT, HTML, PNG, or JPG evidence files. They belong in META-COMPLY.**

### Step 7: UAT Verification (if UAT configured)

If the project has a UAT environment that auto-deploys from `develop`, verify the change works on UAT before creating a PR:

1. Wait for UAT deployment to complete
2. Run health check against UAT URL
3. Run smoke test (homepage, key endpoint)
4. Manually verify the specific feature/fix works on UAT
5. Record results in `compliance/evidence/REQ-XXX/security-summary.md`

```bash
cat >> compliance/evidence/REQ-XXX/security-summary.md << EOF

## UAT Verification — $(date -I)
- UAT Health check: PASS
- UAT Smoke test: PASS
- Feature verification: PASS — [what was verified]
- UAT URL: [UAT_URL]
EOF

git add compliance/evidence/REQ-XXX/security-summary.md
git commit -m "compliance: [REQ-XXX] UAT verification passed

Ref: REQ-XXX

Co-Authored-By: [AI tool tag]"
```

**If UAT fails:** Fix on `develop`, re-run local gates, push, and repeat. Do NOT create a PR until UAT is green.

Tell the user: **"UAT verification passed. Next step: create a PR from develop to main."**

### Step 8: Tell the user what's next

**"Evidence is compiled. Markdown artifacts are in git, binary evidence is in META-COMPLY. UAT verified. Next step: create a PR from develop to main using the submit-for-review workflow."**

---

## After Deployment: Close the GitHub Issue

After the PR is merged, production is verified, and compliance artifacts are finalized, close the GitHub Issue:

```bash
gh issue close [ISSUE-NUMBER] --comment "Implemented in PR #[PR-NUMBER] (REQ-XXX). [Brief summary]."
```

This completes the traceability chain: **Issue → Requirement → PR → Deployment → Issue closed.**

Tell the user: **"REQ-XXX is complete. Let me close the GitHub Issue."**

---

## Review Policy (Risk-Tiered)

Review requirements are determined by the risk classification in the RTM:

- **LOW risk:** CI provides independent verification. Self-merge is permitted after all CI checks pass.
- **MEDIUM/HIGH risk:** A second human reviewer MUST approve before merge. Self-merge is NOT permitted.

When creating a PR, check the risk level of the requirement(s) included. If any requirement is MEDIUM or HIGH, the entire PR requires a second reviewer. This satisfies separation of duties requirements (ISO 27001 A.5.3, SOC 2 CC6.1/CC8.1) where they apply, while avoiding unnecessary bottlenecks on low-risk changes.

Tell the user: **"This PR includes [RISK LEVEL] requirements. [A second reviewer is required / Self-merge is permitted after CI passes]."**

## Rules You Must NEVER Break

1. **NEVER implement a tracked change without a GitHub Issue and requirement entry in RTM.md** — issue first, plan second, code third.
2. **NEVER commit without running all four gates** (TypeScript, SAST, dependency audit, E2E).
3. **NEVER self-merge a MEDIUM or HIGH risk PR** — a second human reviewer MUST approve before merge.
4. **NEVER use `--no-verify`** to skip git hooks.
5. **NEVER commit secrets** (.env, credentials, API keys) — warn the user if you detect them staged.
6. **NEVER create a PR to `main` without UAT verification passing first** (if UAT environment is configured).
7. **NEVER push directly to `main`** — all changes go through `develop` → PR → `main`.
8. **NEVER skip the `Co-Authored-By` tag** when AI generates code.
9. **NEVER amend published commits** — create new commits to preserve audit trail.
10. **NEVER commit binary or JSON evidence to git** (JSON, TXT, HTML, PNG, JPG) — upload to META-COMPLY portal instead.
11. **ALWAYS ask which GitHub Issue a change is for** before writing code.
12. **ALWAYS create evidence artifacts** before marking work as complete.
13. **ALWAYS use merge commits** (not squash) for `develop` → `main` to preserve audit history.
14. **ALWAYS commit compliance markdown to git** (RTM, test-scope, implementation-plan, security-summary, ai-use-note, release tickets).
