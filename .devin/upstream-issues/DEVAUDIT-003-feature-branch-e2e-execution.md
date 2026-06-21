# DEVAUDIT-003: Feature Branch In-Scope E2E Test Execution Mode

**Status:** Draft - Ready for upstream submission  
**Target Repository:** `metasession-dev/DevAudit-Installer`  
**Priority:** High  
**Related:** DEVAUDIT-001, DEVAUDIT-002, REQ-081 post-mortem

---

## Problem Statement

The three-tier E2E testing model (smoke → critical → regression) has a gap: **feature-specific E2E tests are not executed during feature branch development**, leading to bugs being discovered only after merge to `main`.

### Real-World Impact: REQ-081

- Feature branch `feat/REQ-081-category-cascade` merged to `develop` via PR #389
- Follow-up PRs #390, #391, #392 (AC11 cross-category search) merged to `develop`
- All CI green on `develop` (smoke tier only)
- Production PR #393 to `main` triggered full regression suite
- **E2E test `menu-category-cascade.spec.ts` failed** — bug discovered at release gate

### Root Cause

| Tier       | Location           | Runs On                 | REQ-081 Test Included?       |
| ---------- | ------------------ | ----------------------- | ---------------------------- |
| smoke      | `e2e/smoke/`       | every `develop` push    | ❌ no                        |
| critical   | `e2e/critical/`    | PR to `main`            | ❌ no (wrong classification) |
| regression | `e2e/**/*.spec.ts` | push to `main`, nightly | ✅ yes — **too late**        |

The `e2e-test-engineer` skill correctly classified `menu-category-cascade.spec.ts` as **regression tier** (Should-priority, not headline flow), but this meant it never ran during feature development.

---

## Proposed Solution: Option A

### Feature Branch In-Scope Test Execution Mode

Add a **fourth execution context** that runs feature-specific E2E tests on feature branch PRs to `develop`, without promoting them to critical tier permanently.

### Implementation Plan

#### 1. Test File Annotation (Existing)

Tests already declare their requirement:

```typescript
/**
 * @requirement REQ-081 - Main-category to sub-category cascade
 */
```

#### 2. New CI Workflow: `feature-e2e.yml`

```yaml
name: Feature In-Scope E2E Tests

on:
  pull_request:
    branches: [develop]
    paths:
      - 'app/**'
      - 'components/**'
      - 'services/**'
      - 'models/**'
      - 'e2e/**'

jobs:
  detect-req:
    name: Detect REQ from Branch Name
    runs-on: ubuntu-latest
    outputs:
      req_id: ${{ steps.detect.outputs.req_id }}
      has_tests: ${{ steps.detect.outputs.has_tests }}
    steps:
      - uses: actions/checkout@v4

      - name: Parse REQ from branch name
        id: detect
        run: |
          BRANCH="${{ github.head_ref }}"
          # Match feat/REQ-XXX or feature/REQ-XXX patterns
          if [[ $BRANCH =~ (REQ-[0-9]+) ]]; then
            REQ_ID="${BASH_REMATCH[1]}"
            echo "req_id=$REQ_ID" >> $GITHUB_OUTPUT
            
            # Check if any E2E specs are tagged with this REQ
            MATCHES=$(grep -r "@requirement $REQ_ID" e2e/ --include="*.spec.ts" -l || true)
            if [ -n "$MATCHES" ]; then
              echo "has_tests=true" >> $GITHUB_OUTPUT
              echo "specs<<EOF" >> $GITHUB_OUTPUT
              echo "$MATCHES" >> $GITHUB_OUTPUT
              echo "EOF" >> $GITHUB_OUTPUT
            else
              echo "has_tests=false" >> $GITHUB_OUTPUT
            fi
          else
            echo "req_id=none" >> $GITHUB_OUTPUT
            echo "has_tests=false" >> $GITHUB_OUTPUT
          fi

  run-feature-e2e:
    name: Run In-Scope E2E Tests
    needs: detect-req
    if: needs.detect-req.outputs.has_tests == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Start services
        run: |
          # MongoDB service from ci.yml pattern
          docker run -d -p 27017:27017 --name mongo mongo:6

      - name: Seed test data
        run: npx tsx scripts/seed-e2e-admins.ts

      - name: Run in-scope E2E tests
        run: |
          REQ_ID="${{ needs.detect-req.outputs.req_id }}"
          echo "Running tests for $REQ_ID"
          npx playwright test --grep "$REQ_ID" --project=regression

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: feature-e2e-results-${{ needs.detect-req.outputs.req_id }}
          path: |
            playwright-report/
            test-results/
          retention-days: 30
```

#### 3. Alternative: Makefile/Script Approach

For projects without GitHub Actions, provide a portable script:

```bash
#!/bin/bash
# scripts/run-feature-e2e.sh

BRANCH=$(git branch --show-current)
REQ_ID=$(echo "$BRANCH" | grep -oE 'REQ-[0-9]+')

if [ -z "$REQ_ID" ]; then
  echo "No REQ detected in branch name: $BRANCH"
  exit 0
fi

echo "Detected $REQ_ID in branch name"
echo "Finding E2E specs tagged with $REQ_ID..."

SPECS=$(grep -r "@requirement $REQ_ID" e2e/ --include="*.spec.ts" -l)

if [ -z "$SPECS" ]; then
  echo "No E2E specs found for $REQ_ID"
  exit 0
fi

echo "Running in-scope tests:"
echo "$SPECS"
npx playwright test --grep "$REQ_ID" --project=regression
```

#### 4. SDLC Integration

Update `SDLC/2-implement-and-test.md`:

````markdown
### Step X: Run In-Scope E2E Tests (Feature Branch)

Before merging feature branch to `develop`, verify all E2E tests tagged with your REQ pass:

```bash
# Option 1: Auto-detect from branch name
./scripts/run-feature-e2e.sh

# Option 2: Manual grep
npx playwright test --grep "REQ-XXX" --project=regression
```
````

The CI will also run these tests on your PR to `develop` if the branch name contains `REQ-XXX`.

````

#### 5. e2e-test-engineer Skill Update

**Phase 3b — Feature Branch Execution Classification:**

When classifying a new spec, the skill should:

1. Determine final tier (smoke/critical/regression)
2. **Add execution note:**
   - If final tier is `regression` → "Will run on feature branch via `--grep REQ-XXX`"
   - If final tier is `critical` → "Will run on PR to main (already covered)"
3. Verify branch naming guidance includes REQ reference

**Phase 6 — Verification:**

```bash
# Before final report, run:
./scripts/run-feature-e2e.sh

# Confirm all ACs have passing E2E proof before merge to develop
````

---

## Acceptance Criteria

1. CI workflow `feature-e2e.yml` created that:
   - Triggers on PRs to `develop` with `feat/REQ-XXX` or `feature/REQ-XXX` branch names
   - Parses `@requirement REQ-XXX` tags from E2E spec files
   - Runs only in-scope tests via `--grep REQ-XXX` or spec list
   - Uploads results as artifacts

2. Shell script `run-feature-e2e.sh` provided for local verification

3. `e2e-test-engineer` skill updated to:
   - Explain feature branch execution in Phase 3b
   - Include verification step in Phase 6
   - Recommend branch naming with REQ reference

4. SDLC documentation updated:
   - `2-implement-and-test.md`: Add feature E2E step
   - `submit-for-review.md`: Verify feature tests passed

5. Template `ci.yml` or standalone `feature-e2e.yml` generated by `devaudit update`

---

## Open Questions

1. **Scope:** Should this run on ALL PRs to develop, or only those with `REQ-` in branch name?
2. **Path filtering:** Should we limit to PRs that touch `app/**` or `e2e/**` only?
3. **Parallelism:** Should feature E2E run in parallel with smoke, or block merge?
4. **Evidence:** Should feature E2E results upload to portal as `test_report` evidence?

---

## Worked Example: REQ-081

**Branch:** `feat/REQ-081-category-cascade`

**E2E Spec:** `e2e/menu-category-cascade.spec.ts`

```typescript
/**
 * @requirement REQ-081 - Main-category to sub-category cascade
 */
```

**CI Flow:**

1. PR #389 opened: `feat/REQ-081-category-cascade` → `develop`
2. `feature-e2e.yml` detects `REQ-081` in branch name
3. Finds `e2e/menu-category-cascade.spec.ts` via `@requirement REQ-081`
4. Runs: `npx playwright test --grep "REQ-081" --project=regression`
5. **Bug discovered** — test fails, PR blocked from merge
6. Fix applied on feature branch, test passes
7. Merge to develop with confidence

**Result:** Bug caught before `develop`, not after `main`.

---

## Related Issues

- #172: Portal-managed reviewer checklist (complementary process improvement)
- #173: AI contributor tracking (improves traceability)
- REQ-081 post-mortem: This issue addresses the testing gap that allowed AC11 bugs to reach `main`

---

_Documented by: OpenAI Codex_  
_Date: 2026-06-17_  
_Session: cascade-13654549920348561833_  
_Context: REQ-081 E2E testing gap post-mortem_
