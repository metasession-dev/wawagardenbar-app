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

### Step 2: Implement the Change

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

### Step 3: Stage Selectively

```bash
git diff --name-only
git add app/path/to/file.ts

# Safety check — no secrets staged
git diff --cached --name-only | grep -iE '\.env|secret|credential|\.auth|\.pem'
# Must return nothing
```

### Step 4: Commit

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

### Step 5: Run All Local Gates (Mandatory)

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

### Step 6: Push

```bash
git push origin develop
```

If rejected:
```bash
git pull --rebase origin develop
# Re-run ALL local gates after rebase
git push origin develop
```

### Step 7: Update Evidence

```bash
git status compliance/evidence/
git add compliance/evidence/
git commit -m "compliance: update test evidence"
git push origin develop
```

## Iteration

Repeat Steps 2-7. Every commit must leave all local gates green.

## Output

- Code committed and pushed on `develop`
- All local gates passing
- AI use documented (if applicable)

## Next Step

- **Tracked requirement:** `3-compile-evidence.md`
- **Untracked change:** `4-submit-for-review.md`
