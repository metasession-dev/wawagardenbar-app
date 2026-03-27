---
description: Compile test, security, and AI evidence, update RTM, create release ticket for review
---

# Compile Evidence

**Pipeline Stage:** 3 of 5
**Previous:** `2-implement-and-test.md`
**Next:** `4-submit-for-review.md`
**References:** Test Strategy (`sdlc/files/Test_Strategy.md` in META-COMPLY) (evidence requirements), Test Architecture (tooling), Test Plan (artifact structure)

---

## When to Use

- After implementing a tracked requirement (REQ-XXX)
- After significant changes needing audit trail
- Before creating a PR to `main`

**Skip** for trivial changes — go straight to `4-submit-for-review.md`.

## Evidence Storage Rule

**Markdown stays in git. Binary and JSON evidence goes to META-COMPLY.**

| Artifact                                             | Store in    | Why                                                           |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| `compliance/RTM.md`                                  | Git         | Source of truth, version history, PR-reviewable               |
| `compliance/evidence/REQ-XXX/test-scope.md`          | Git         | Planning artifact, reviewed in PRs                            |
| `compliance/evidence/REQ-XXX/implementation-plan.md` | Git         | Design decisions artifact (MEDIUM/HIGH risk), reviewed in PRs |
| `compliance/evidence/REQ-XXX/ai-use-note.md`         | Git         | Small markdown, needs PR review                               |
| `compliance/evidence/REQ-XXX/ai-prompts.md`          | Git         | Small markdown, needs PR review                               |
| `compliance/evidence/REQ-XXX/security-summary.md`    | Git         | Small markdown, needs PR review                               |
| `compliance/pending-releases/RELEASE-TICKET-*.md`    | Git         | Reviewed and moved to approved-releases                       |
| E2E results (JSON)                                   | META-COMPLY | Large, bloats git history                                     |
| Screenshots (PNG/JPG)                                | META-COMPLY | Binary, bloats git history                                    |
| SAST results (JSON)                                  | META-COMPLY | Large JSON, bloats git history                                |
| Dependency audit (JSON)                              | META-COMPLY | Large JSON, bloats git history                                |
| Unit test output (TXT)                               | META-COMPLY | Verbose output, bloats git history                            |
| Test reports (HTML)                                  | META-COMPLY | Binary, bloats git history                                    |

## Steps

### Step 0: Confirm CI Is Green

Before compiling evidence, verify the latest CI run on `develop` passed:

```bash
gh run list --branch develop --limit 1
```

**Do NOT proceed** if CI is failing or was cancelled. Evidence must reflect a green pipeline. If CI failed, return to `2-implement-and-test.md` and fix the issue first.

For MEDIUM/HIGH risk with AI involvement, also verify:

```bash
# AI prompt log must exist and be non-empty
test -s compliance/evidence/REQ-XXX/ai-prompts.md && echo "OK" || echo "MISSING — create ai-prompts.md before proceeding"
```

---

### Step 1: Verify All Local Gates Pass

```bash
npx tsc --noEmit
semgrep scan --config auto [SOURCE_DIR]/ --severity ERROR --severity WARNING
npm audit --audit-level=high
npx playwright test
```

All must pass. Evidence must reflect a green suite.

### Step 2: Verify JSDoc Headers

```bash
git diff --name-only origin/main...HEAD -- '*.ts' '*.tsx' | head -20
```

Each modified file should have `@requirement REQ-XXX` header.

### Step 3: Upload Test Evidence to META-COMPLY

Upload evidence to META-COMPLY so reviewers can access full test results (Playwright reports, SAST scans, dependency audits) without needing GitHub Checks tab access. This is the primary way reviewers verify test evidence.

The upload script is available in the META-COMPLY repository at `scripts/upload-evidence.sh`.

```bash
# Ensure META-COMPLY environment variables are set
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Upload E2E results
./scripts/upload-evidence.sh [PROJECT_SLUG] REQ-XXX e2e_result [E2E_RESULTS_PATH] \
  --git-sha "$(git rev-parse HEAD)" \
  --branch "$(git branch --show-current)"

# Upload unit test results
npm test -- --verbose 2>&1 | tee /tmp/unit-test-results.txt
./scripts/upload-evidence.sh [PROJECT_SLUG] REQ-XXX test_report /tmp/unit-test-results.txt \
  --git-sha "$(git rev-parse HEAD)"
```

**Alternative (git-based):** If not using META-COMPLY, save evidence locally:

```bash
cp [E2E_RESULTS_PATH] compliance/evidence/REQ-XXX/
npm test -- --verbose 2>&1 | tee compliance/evidence/REQ-XXX/unit-test-results.txt
```

### Step 4: Upload Security Evidence

```bash
# Generate evidence files
semgrep scan --config auto [SOURCE_DIR]/ --json > /tmp/sast-results.json 2>&1
npm audit --json > /tmp/dependency-audit.json 2>&1

# Upload to META-COMPLY
./scripts/upload-evidence.sh [PROJECT_SLUG] REQ-XXX audit_log /tmp/sast-results.json \
  --git-sha "$(git rev-parse HEAD)"
./scripts/upload-evidence.sh [PROJECT_SLUG] REQ-XXX audit_log /tmp/dependency-audit.json \
  --git-sha "$(git rev-parse HEAD)"
```

Create a security summary (keep in git — this is a compliance document, not binary evidence):

```bash
cat > compliance/evidence/REQ-XXX/security-summary.md << EOF
## Security Evidence Summary — REQ-XXX
**Date:** $(date -I)
**SAST Tool:** Semgrep (auto config)
**SAST High/Critical Findings:** 0
**Dependency Audit High/Critical:** 0
Evidence uploaded to META-COMPLY project: [PROJECT_SLUG]
EOF
```

For Medium/High risk, add access control and audit log verification to the security summary.

### Step 5: Save AI Evidence (If Applicable)

Verify `ai-use-note.md` and `ai-prompts.md` exist (if AI was used). If missing:

```bash
cat > compliance/evidence/REQ-XXX/ai-use-note.md << 'EOF'
# AI Use Record — REQ-XXX
**AI Tool:** [tool name]
**Code Generated By AI:** [list files]
**Human Reviewer:** [name]
**Review Date:** [date]
**Regenerations:** [none / list]
EOF
```

### Step 6: Verify Test Scope and Implementation Plan

Review `compliance/evidence/REQ-XXX/test-scope.md` (created during PLAN stage). Confirm all testing items have been addressed:

```bash
cat compliance/evidence/REQ-XXX/test-scope.md
# Check: are all [ ] items now [x]?
# If not, complete the outstanding items before proceeding
```

For MEDIUM/HIGH risk, verify the implementation plan exists and matches what was built:

```bash
cat compliance/evidence/REQ-XXX/implementation-plan.md
# Check: does the plan match the actual implementation?
# If the approach changed during development, update the plan to reflect what was actually built.
```

### Step 7: Update RTM

Open `compliance/RTM.md`, Part B. Update status:

```markdown
| REQ-XXX | Description | [RISK] | implementation-files | evidence | TESTED - PENDING SIGN-OFF | Pending | -- |
```

### Step 8: Generate Release Ticket

Create `compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md`:

```markdown
# Release Ticket: REQ-XXX — [Title]

**Status:** TESTED - PENDING SIGN-OFF
**Date:** [YYYY-MM-DD]
**Requirement ID:** REQ-XXX
**Risk Level:** [LOW / MEDIUM / HIGH]
**PR:** [Will be linked when PR is created]

---

## Summary

[1-3 sentences]

## AI Involvement

- **AI Tool Used:** [tool / none]
- **AI-Generated Files:** [list, or "none"]
- **Human Reviewer of AI Code:** [name]
- **Components Regenerated:** [none / list]

## Implementation Details

**Files Modified:**

- `path/to/file1.ts` — [what changed]

**Dependencies Added/Changed:**

- [package@version — purpose — vulnerability status]
- [or "No dependency changes"]

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                          |
| ---------------- | ----- | ------ | ------ | ------------------------------------------ |
| E2E (Playwright) | [N]   | [N]    | 0      | META-COMPLY portal: [PROJECT_SLUG]/REQ-XXX |
| Unit             | [N]   | [N]    | 0      | META-COMPLY portal: [PROJECT_SLUG]/REQ-XXX |

## Security Evidence

| Check            | Result          | Evidence Location                                      |
| ---------------- | --------------- | ------------------------------------------------------ |
| SAST             | 0 high/critical | META-COMPLY portal: [PROJECT_SLUG]/REQ-XXX             |
| Dependency Audit | 0 high/critical | META-COMPLY portal: [PROJECT_SLUG]/REQ-XXX             |
| Access Control   | [PASS/N/A]      | Git: `compliance/evidence/REQ-XXX/security-summary.md` |
| Audit Log        | [PASS/N/A]      | Git: `compliance/evidence/REQ-XXX/security-summary.md` |

## Acceptance Criteria

- [x] [From test-scope.md]
- [x] All E2E tests passing
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean
- [x] AI use documented (if applicable)

## Risk Assessment

- [Any risks introduced]
- [New dependencies and trust assessment]

---

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed (if applicable)
- [ ] No hallucinated dependencies

---

## Audit Trail

| Date   | Action                   | Actor      | Notes                             |
| ------ | ------------------------ | ---------- | --------------------------------- |
| [date] | Requirement created      | [who]      | Risk: [level]                     |
| [date] | Implementation completed | [who]      | [details]                         |
| [date] | AI code reviewed         | [reviewer] | [files]                           |
| [date] | Tests passed             | [who]      | E2E + SAST: clean                 |
| [date] | UAT verification passed  | [who]      | Health + smoke + feature verified |
| [date] | Submitted for review     | [who]      | PR #[number]                      |
```

### Step 9: Commit Compliance Docs (do NOT push yet)

Commit compliance documents locally but **do not push**. UAT verification (Step 10) runs against the deployment from the prior push. Pushing here would trigger a redundant CI run. We batch everything into a single push after UAT verification.

If using META-COMPLY, commit only compliance documents (RTM, release ticket, test scope, AI notes, security summary). Binary evidence (JSON results, screenshots) is stored in META-COMPLY, not git.

```bash
# META-COMPLY projects — commit compliance docs only (no push)
git add compliance/RTM.md compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md \
  compliance/evidence/REQ-XXX/test-scope.md \
  compliance/evidence/REQ-XXX/implementation-plan.md \
  compliance/evidence/REQ-XXX/ai-use-note.md \
  compliance/evidence/REQ-XXX/security-summary.md
git commit -m "compliance: [REQ-XXX] evidence compiled - awaiting review"
```

If NOT using META-COMPLY (git-based evidence):

```bash
git add compliance/RTM.md compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md compliance/evidence/REQ-XXX/
git commit -m "compliance: [REQ-XXX] evidence compiled - awaiting review"
```

### Step 10: UAT Verification and META-COMPLY Approval (MANDATORY)

The develop branch auto-deploys to UAT. CI has already uploaded all gate evidence to META-COMPLY. **Wait for the deployment to complete**, then verify the change works in the UAT environment before creating a PR.

#### WAIT CHECKPOINT: Confirm CI + Deployment Complete

Before UAT verification, confirm BOTH CI and deployment are complete:

```bash
# Confirm CI passed
gh run list --branch develop --limit 1

# Confirm UAT deployment is live (check hosting platform dashboard)
curl -s [UAT_URL]/[HEALTH_ENDPOINT]
# Expected: success response
```

**Do NOT proceed** with UAT verification until both CI is green and the deployment is live. Testing against a stale deployment produces invalid evidence.

#### 10a. Wait for UAT deployment

Monitor in the hosting platform dashboard or wait for the build to complete.

#### 10b. Health check

```bash
curl -s [UAT_URL]/[HEALTH_ENDPOINT]
# Expected: success response
```

#### 10c. Smoke test

```bash
# Homepage loads
curl -s -o /dev/null -w "%{http_code}" [UAT_URL]/
# Expected: 200

# A key endpoint responds correctly
curl -s -o /dev/null -w "%{http_code}" [UAT_URL]/[PUBLIC_ENDPOINT]
```

#### 10d. Feature-specific verification

Manually verify the specific feature or fix you implemented works on UAT. This catches environment-specific issues (env vars, database differences, build behavior) that local testing cannot.

#### 10e. Record UAT results

```bash
cat >> compliance/evidence/REQ-XXX/security-summary.md << EOF

## UAT Verification — $(date -I)
- UAT Health check: PASS
- UAT Smoke test: PASS
- Feature verification: PASS — [brief description of what was verified]
- UAT URL: [UAT_URL]
EOF

git add compliance/evidence/REQ-XXX/security-summary.md
git commit -m "compliance: [REQ-XXX] UAT verification passed"
```

**If UAT verification fails:** Fix the issue on `develop`, re-run local gates, push again, and repeat UAT verification. Do NOT proceed to creating a PR until UAT is green.

**If no UAT environment:** Skip Step 10 entirely.

### Step 11: Push All Compliance Commits

Now push all batched commits (evidence + UAT results) in a single push. This triggers one CI run instead of multiple.

```bash
git push origin develop
```

Wait for CI to pass before proceeding to `4-submit-for-review.md`.

## META-COMPLY CI Integration

Projects using META-COMPLY can automate evidence upload via the reusable GitHub Actions workflow. After CI tests pass, evidence is uploaded to the centralized portal where auditors can browse it.

### CI Workflow Setup

Add this job to your CI pipeline (after E2E tests pass):

```yaml
upload-evidence:
  needs: [e2e-tests]
  uses: metasession-dev/META-COMPLY/.github/workflows/upload-evidence.yml@main
  with:
    project-slug: your-project-slug
    release-version: v1.0.0
    environment: uat
  secrets:
    SUPABASE_URL: ${{ secrets.META_COMPLY_SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.META_COMPLY_SERVICE_ROLE_KEY }}
```

This automatically uploads:

- Compliance source documents (RTM, test plan, test cases, test summary report) as read-only snapshots
- Each upload tagged with git SHA and CI run ID for traceability

The source of truth for compliance documents remains in git. META-COMPLY holds read-only snapshots so auditors see the full compliance picture in one place.

## Output

- RTM: `TESTED - PENDING SIGN-OFF`
- Release ticket in `compliance/pending-releases/`
- Test + security + AI evidence uploaded to META-COMPLY (or in `compliance/evidence/REQ-XXX/` if git-based)
- Compliance documents (test scope, AI notes, security summary) committed to git
- Test scope fully addressed
- UAT verification passed and recorded
- META-COMPLY UAT release approved (required before PR to main)

## Next Step

Proceed to `4-submit-for-review.md`.
