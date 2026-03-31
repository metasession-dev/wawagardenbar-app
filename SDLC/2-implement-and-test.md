---
description: Implement changes on develop, run all local gates (tests + security scans), commit with compliance-aware conventions
---

# Implement & Test

**Pipeline Stage:** 2 of 5
**Previous:** `1-plan-requirement.md` (if tracked) or start here for untracked changes
**Next:** `3-compile-evidence.md`
**References:** Test Strategy (`sdlc/files/Test_Strategy.md` in META-COMPLY) (security gates, AI methodology), Test Architecture (tooling), Test Plan (exit criteria)

---

## Prerequisites

- On the `develop` branch
- Dev server starts
- Database running locally
- Playwright browsers installed
- Test data seeded
- Semgrep installed

## Steps

### Step 0: Validate Planning Artifacts (Tracked Requirements)

Before writing any code, verify that the planning stage is complete:

```bash
# For tracked requirements — BOTH test scope AND test plan MUST exist
ls compliance/evidence/REQ-XXX/test-scope.md
ls compliance/evidence/REQ-XXX/test-plan.md
```

**If either file does not exist:** STOP. Run `1-plan-requirement.md` first. Do NOT proceed to implementation without a committed test scope and test plan.

For MEDIUM/HIGH risk, also verify:

```bash
# Risk classification and RTM entry exist
grep 'REQ-XXX' compliance/RTM.md
# Implementation plan must exist
ls compliance/evidence/REQ-XXX/implementation-plan.md
```

---

### Step 1: Verify Branch

```bash
git branch --show-current
# Must output: develop
```

If not: `git checkout develop && git pull origin develop`

### Step 2: Implementation Plan (MEDIUM/HIGH Risk — Required)

For MEDIUM and HIGH risk requirements, create an implementation plan before writing code. This documents the design decisions, file structure, and approach — evidence that architecture was deliberate, not accidental.

**Skip this step** for LOW risk requirements — proceed directly to Step 3.

**2a. Explore the codebase:**

- Understand existing patterns, models, services, and API routes relevant to the change
- Identify files that will be created, modified, or affected

**2b. Create the implementation plan:**

Create `compliance/evidence/REQ-XXX/implementation-plan.md`:

```markdown
# Implementation Plan — REQ-XXX

**Requirement:** REQ-XXX
**GitHub Issue:** #NNN
**Risk Level:** [MEDIUM / HIGH]
**Date:** [YYYY-MM-DD]

## Approach

[1-3 sentences describing the overall approach]

## Files to Create

- `path/to/new-file.ts` — [purpose]

## Files to Modify

- `path/to/existing-file.ts` — [what changes and why]

## Architecture Decisions

- [Key decision 1 and rationale]
- [Key decision 2 and rationale]

## Dependencies

- [New packages needed, or "None"]

## Risks / Considerations

- [Anything that could go wrong or needs special attention]

## Post-Deploy Actions

- [Data migrations, backfill scripts, schema changes — or "None"]
- [If any: create script in `scripts/`, document exact command and target environment]
```

**2c. WAIT CHECKPOINT: Implementation Plan Review**

**Present the implementation plan to the developer.** Summarize:

- Approach and rationale
- Files to create/modify
- Architecture decisions
- Risks and dependencies

**Do NOT proceed to Step 3** until the developer explicitly approves the plan. If the developer requests changes, update `implementation-plan.md` and re-present. For HIGH risk, this review is especially important — it's cheaper to change the plan than to refactor the code.

**2d. Commit the plan:**

```bash
git add compliance/evidence/REQ-XXX/implementation-plan.md
git commit -m "chore(compliance): [REQ-XXX] implementation plan

Ref: REQ-XXX

Co-Authored-By: [AI tool tag]"
```

### Step 3: Implement the Change

Write your code. For tracked requirements, add JSDoc headers:

```typescript
/**
 * @requirement REQ-XXX - Brief description
 */
```

**If AI is generating code (Medium/High risk):**

```bash
echo "Prompt summary: [what you asked AI to generate]" >> compliance/evidence/REQ-XXX/ai-prompts.md
echo "Files generated: [list]" >> compliance/evidence/REQ-XXX/ai-prompts.md
echo "Date: $(date -I)" >> compliance/evidence/REQ-XXX/ai-prompts.md
```

**If AI regenerates a component** (from scratch, not incremental edit):

```bash
echo "REGENERATION: [component] regenerated on $(date -I). Full retest required." >> compliance/evidence/REQ-XXX/ai-prompts.md
```

Per Test Strategy: regeneration triggers full retest.

**MEDIUM/HIGH risk — AI prompt logging checkpoint:** Before committing AI-generated code, verify that `ai-prompts.md` has been updated with the prompt summary and files generated. If missing, create it now — this is a required artifact for MEDIUM/HIGH risk requirements with AI involvement.

### Step 4: Implement Test Plan

Follow the test plan (`compliance/evidence/REQ-XXX/test-plan.md`) created during Stage 1:

**4a. Review the test plan:**

```bash
cat compliance/evidence/REQ-XXX/test-plan.md
```

**4b. Add new tests** listed in the "Tests to Add" section:

- New pages → route protection tests (unauthenticated redirect)
- New API endpoints → auth enforcement tests, response format tests
- New user flows → E2E tests for critical paths
- New business logic → unit tests

**4c. Update existing tests** listed in the "Tests to Update" section:

- New routes added? → Add them to route protection test arrays
- API response shape changed? → Update assertions
- UI components changed? → Update selectors and expected content
- Business logic changed? → Update unit test expectations

**4d. Remove obsolete tests** listed in the "Tests to Remove" section (if any). Each removal must have a justification in the test plan.

**4e. Verify test plan coverage:**

```bash
cat compliance/evidence/REQ-XXX/test-plan.md
# Check: have all items in "Tests to Add" been implemented?
# Check: have all items in "Tests to Update" been addressed?
# Check: does the functional test mapping cover all acceptance criteria?
```

The goal is that gates (Step 7) run against a test suite that covers the test plan, not just the pre-existing code.

### Step 5: Stage Selectively

```bash
git diff --name-only
git add src/path/to/file.ts

# Safety check — no secrets staged
git diff --cached --name-only | grep -iE '\.env|secret|credential|\.auth|\.pem'
# Must return nothing
```

### Step 6: Commit

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

- Key change 1
- Key change 2

Ref: REQ-XXX

Co-Authored-By: [AI Tool Name] <noreply@provider.com>
EOF
)"
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `compliance`, `security`

### Step 7: Run All Local Gates (Mandatory)

#### Gate 1: TypeScript

```bash
npx tsc --noEmit
```

#### Gate 2: Security (SAST + Dependencies)

```bash
semgrep scan --config auto [SOURCE_DIR]/ --severity ERROR --severity WARNING
npm audit --audit-level=high
```

If new dependencies added:

```bash
git diff origin/main -- package.json package-lock.json | grep '^\+'
npm audit
# Verify: real packages? Current versions? No CVEs? AI hallucinations?
```

#### Gate 3: E2E Tests

```bash
npx playwright test
```

#### Exit Criteria

| Gate                         | Threshold         |
| ---------------------------- | ----------------- |
| TypeScript                   | 0 errors          |
| SAST (high/critical)         | 0 findings        |
| Dependencies (high/critical) | 0 vulnerabilities |
| E2E tests                    | All pass          |
| Severity-1 defects           | 0 open            |

For Medium/High risk, also verify access control and audit log tests pass (see Test Plan and test-scope.md).

**If SAST finds issues:**

```bash
echo "SAST finding: [rule-id] in [file] — [fixed/false-positive: reason]" >> compliance/evidence/REQ-XXX/sast-review.md
```

### Step 8: Push

```bash
git push origin develop
```

If rejected:

```bash
git pull --rebase origin develop
# Re-run ALL local gates after rebase
git push origin develop
```

Pushing to `develop` triggers the full CI pipeline (TypeScript, SAST, dependency audit, E2E, build). All gate results are automatically uploaded to META-COMPLY tagged with the release version and `environment=uat`. The develop branch auto-deploys to the UAT environment (Railway staging). UAT will be formally reviewed and approved in META-COMPLY before a PR to main can be created.

### WAIT CHECKPOINT: Confirm CI Green

After pushing, wait for CI to complete before proceeding:

```bash
gh run list --branch develop --limit 1
# Or watch in real time:
gh run watch
```

**Do NOT proceed** until CI is green. If CI fails, diagnose the failure, fix locally, re-run all local gates, and push again. Do not push repeatedly hoping CI will pass — fix the root cause.

### Step 9: Update Evidence

```bash
git status compliance/evidence/
git add compliance/evidence/
git commit -m "compliance: update test evidence"
git push origin develop
```

## Iteration

Repeat Steps 3-9. Every commit must leave all local gates green. Step 2 (implementation plan) is done once per requirement. Each push triggers full CI and auto-deploys to UAT.

## Output

- Code committed and pushed on `develop`
- All CI gates passing (TypeScript, SAST, dep audit, E2E, build)
- Evidence auto-uploaded to META-COMPLY (environment=uat)
- AI use documented (if applicable)
- UAT auto-deployed with latest changes

## Next Step

- **Tracked requirement:** `3-compile-evidence.md`
- **Untracked change:** `4-submit-for-review.md`
