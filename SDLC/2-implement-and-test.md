---
description: Implement changes on develop, run all local gates (tests + security scans), commit with compliance-aware conventions
---

# Implement & Test

**Pipeline Stage:** 2 of 5
**Previous:** `1-plan-requirement.md` (if tracked) or start here for untracked changes
**Next:** `3-compile-evidence.md`
**References:** Test Strategy (security gates, AI methodology), Test Architecture (tooling), Test Plan (exit criteria)

---

## Prerequisites

- On the `develop` branch
- Dev server starts (`npm run dev`)
- MongoDB running locally
- Playwright browsers installed (`npx playwright install chromium`)
- Test data seeded (`npx tsx scripts/seed-e2e-admins.ts`)
- Semgrep installed (`pip install semgrep`)

## Steps

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
```

**2c. Review with the developer:**

The developer confirms the plan before implementation begins. For HIGH risk, this review is especially important — it's cheaper to change the plan than to refactor the code.

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

### Step 4: Review and Update Tests

Before staging, review the test suite to ensure it covers the changes made:

**4a. Check if existing tests need updating:**
```bash
# List test files that may be affected by your changes
git diff --name-only | grep -iE 'spec|test|e2e'

# Check for hardcoded values, route lists, or assertions that reference changed areas
# Example: if you added new routes, check protected route arrays
grep -rn 'protectedRoutes\|const routes' e2e/ __tests__/ --include='*.ts' --include='*.tsx'
```

**4b. Update existing tests if needed:**
- New routes added? → Add them to route protection test arrays
- API response shape changed? → Update assertions
- UI components changed? → Update selectors and expected content
- Business logic changed? → Update unit test expectations

**4c. Write new tests for new functionality:**
- New pages → route protection tests (unauthenticated redirect)
- New API endpoints → auth enforcement tests, response format tests
- New user flows → E2E tests for critical paths
- New business logic → unit tests

**4d. Verify test scope alignment:**
```bash
cat compliance/evidence/REQ-XXX/test-scope.md
# Check: does the test scope list testing items that aren't yet covered?
# If so, write the tests now before proceeding.
```

The goal is that gates (Step 7) run against a test suite that actually covers the changes, not just the pre-existing code.

### Step 5: Stage Selectively

```bash
git diff --name-only
git add app/path/to/file.ts

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
semgrep scan --config auto app/ lib/ services/ models/ --severity ERROR --severity WARNING
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

| Gate | Threshold |
|---|---|
| TypeScript | 0 errors |
| SAST (high/critical) | 0 findings |
| Dependencies (high/critical) | 0 vulnerabilities |
| E2E tests | All 183 pass |
| Severity-1 defects | 0 open |

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

Pushing to `develop` triggers an auto-deploy to UAT (Railway). You can monitor the deployment in the Railway dashboard. UAT will be formally verified in the next workflow stage.

### Step 9: Update Evidence

```bash
git status compliance/evidence/
git add compliance/evidence/
git commit -m "compliance: update test evidence"
git push origin develop
```

## Iteration

Repeat Steps 3-9. Every commit must leave all local gates green. Step 2 (implementation plan) is done once per requirement. Each push auto-deploys to UAT.

## Output

- Code committed and pushed on `develop`
- All local gates passing
- AI use documented (if applicable)
- UAT auto-deployed with latest changes

## Next Step

- **Tracked requirement:** `3-compile-evidence.md`
- **Untracked change:** `4-submit-for-review.md`
