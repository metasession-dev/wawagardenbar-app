---
description: Implement changes on develop, run tests, commit with compliance-aware conventions
---

# Implement & Test

**Pipeline Stage:** 2 of 5
**Previous:** `plan-requirement.md` (if tracked) or start here for untracked changes
**Next:** `audit-finish.md`

This workflow covers the development loop: code, commit, test, fix, repeat. No code leaves `develop` without passing the test gate.

## Prerequisites

- On the `develop` branch
- Dev server can start (`npm run dev`)
- MongoDB running locally (port 27017)
- Playwright browsers installed (`npx playwright install chromium`)
- E2E test users seeded (`npx tsx scripts/seed-e2e-admins.ts`)

## Steps

### Step 1: Verify Branch

```bash
git branch --show-current
# Must output: develop
```

If not on develop: `git checkout develop && git pull origin develop`

### Step 2: Implement the Change

Write your code. For tracked requirements, add JSDoc headers to modified files:

```typescript
/**
 * @requirement REQ-XXX - Brief description
 */
```

### Step 3: Stage Changes Selectively

**Never use `git add .`** — always stage specific files.

```bash
# Review what changed
git diff --name-only

# Stage specific files
git add src/path/to/file.ts components/path/to/component.tsx

# Safety check — ensure nothing sensitive is staged
git diff --cached --name-only | grep -iE '\.env|secret|credential|\.auth|\.pem'
# Must return nothing. If it matches, unstage: git reset HEAD <file>
```

### Step 4: Commit

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

- Key change 1
- Key change 2

Ref: REQ-XXX

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Commit types:** `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `compliance`, `security`

Include `Ref: REQ-XXX` when the change relates to a tracked requirement.
Include `Co-Authored-By` when AI assisted with the implementation.

### Step 5: Run Tests (Mandatory Gate)

```bash
# TypeScript compilation
npx tsc --noEmit

# Full E2E suite (183 tests across 3 projects)
npx playwright test
```

**Exit criteria** (from `compliance/test-plan.md`):

| Criterion | Threshold |
|-----------|-----------|
| TypeScript compilation | 0 errors |
| E2E critical-path tests | 100% pass |
| Severity-1 defects | 0 open |

**If tests fail:**

```bash
# Run only the failing test to debug
npx playwright test -g "exact test name"

# Fix the code or the test
git add <fixed-files>

# If you haven't pushed yet, amend the commit
git commit --amend

# If you already pushed, create a new fix commit
git commit -m "fix: resolve test failure in [area]"

# Re-run the full suite
npx playwright test
```

**If authenticated tests skip:** Acceptable if E2E credentials aren't configured. Note in the commit message.

### Step 6: Push to Remote

```bash
git push origin develop
```

If rejected (someone else pushed):
```bash
git pull --rebase origin develop
npx playwright test    # Re-run tests after rebase
git push origin develop
```

### Step 7: Update Evidence (If Tests Generated New Results)

```bash
# Check if Playwright updated the results JSON
git status compliance/evidence/

# If changed, commit the evidence
git add compliance/evidence/REQ-007/e2e-results.json
git add compliance/evidence/REQ-007/e2e-test-results.txt
git commit -m "compliance: update E2E test evidence"
git push origin develop
```

## Iteration

Repeat Steps 2-7 as needed. Each commit on `develop` should leave the test suite green. If you break tests, fix them before the next commit.

## Output

- Code committed and pushed on `develop`
- All 183 E2E tests passing
- TypeScript compilation clean
- Test evidence updated

## Next Step

- **Tracked requirement (REQ-XXX):** Proceed to `audit-finish.md`
- **Untracked change:** Proceed to `submit-for-review.md`
