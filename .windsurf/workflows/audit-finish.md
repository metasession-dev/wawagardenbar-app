---
description: Generate compliance artifacts, update RTM, create release ticket for human sign-off
---

# Audit Finish

**Pipeline Stage:** 3 of 5
**Previous:** `implement-and-test.md`
**Next:** `submit-for-review.md`

This workflow generates the compliance artifacts that bridge implementation to approval. It updates the RTM, saves test evidence, and creates a release ticket that the human reviewer will evaluate during PR review.

## When to Use

- After implementing a tracked requirement (REQ-XXX)
- After significant changes that need audit trail documentation
- Before creating a PR to `main`

**Skip this workflow** for trivial changes (go straight to `submit-for-review.md`).

## Steps

### Step 1: Verify All Tests Pass

```bash
npx playwright test
```

Do not proceed unless all tests pass. The evidence captured must reflect a green suite.

### Step 2: Verify JSDoc Headers

Ensure all modified source files have requirement references:

```bash
# Find files changed since last merge to main
git diff --name-only origin/main...HEAD -- '*.ts' '*.tsx' | head -20
```

Each file should have:
```typescript
/**
 * @requirement REQ-XXX - Brief description
 */
```

### Step 3: Save Test Evidence

```bash
# Ensure latest test results are saved
ls -la compliance/evidence/REQ-XXX/

# Copy relevant evidence (screenshots, JSON results, logs)
cp compliance/evidence/REQ-007/e2e-results.json compliance/evidence/REQ-XXX/
```

For requirement-specific unit tests (Vitest):
```bash
npx vitest run --reporter=verbose 2>&1 | tee compliance/evidence/REQ-XXX/unit-test-results.txt
```

### Step 4: Update RTM Status

Open `compliance/RTM.md` and update the requirement entry in Part B:

```markdown
| REQ-XXX | Description | implementation-files | Test evidence description | TESTED - PENDING SIGN-OFF | Pending | -- |
```

Change status from `DRAFT` or `IN PROGRESS` to `TESTED - PENDING SIGN-OFF`.

### Step 5: Generate Release Ticket

Create `compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md`:

```markdown
# Release Ticket: REQ-XXX — [Title]

**Status:** TESTED - PENDING SIGN-OFF
**Date:** [YYYY-MM-DD]
**Requirement ID:** REQ-XXX
**PR:** [Will be linked when PR is created]

---

## Summary

[1-3 sentence description of what was implemented and why]

## Implementation Details

**Files Modified:**
- `path/to/file1.ts` — [what changed]
- `path/to/file2.tsx` — [what changed]

**Key Decisions:**
- [Any architectural or design decisions made]

## Test Evidence

| Test Type | Count | Passed | Failed | Evidence |
|-----------|-------|--------|--------|----------|
| E2E (Playwright) | 183 | 183 | 0 | `compliance/evidence/REQ-007/e2e-results.json` |
| Unit (Vitest) | [N] | [N] | 0 | `compliance/evidence/REQ-XXX/unit-test-results.txt` |

## Acceptance Criteria

- [x] Criterion 1
- [x] Criterion 2
- [x] All E2E tests passing
- [x] TypeScript compilation clean
- [x] JSDoc requirement headers added

## Risk Assessment

- [Any risks introduced by this change]
- [Any areas that need manual testing]

---

## Reviewer Checklist

The PR reviewer should verify:

- [ ] Code changes match the requirement description
- [ ] Test evidence is present and shows all-pass
- [ ] RTM is updated with correct status
- [ ] No sensitive data in committed files
- [ ] No regressions in existing functionality

---

## Audit Trail

| Date | Action | Actor | Notes |
|------|--------|-------|-------|
| [date] | Requirement created | [who] | [context] |
| [date] | Implementation completed | [who] | [details] |
| [date] | Tests passed | [who] | [test counts] |
| [date] | Submitted for review | [who] | PR #[number] |
```

### Step 6: Commit Compliance Artifacts

```bash
git add compliance/RTM.md
git add compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md
git add compliance/evidence/REQ-XXX/
git commit -m "compliance: [REQ-XXX] artifacts complete - awaiting review"
git push origin develop
```

## Output

- RTM updated with status `TESTED - PENDING SIGN-OFF`
- Release ticket in `compliance/pending-releases/`
- Test evidence saved to `compliance/evidence/REQ-XXX/`
- All artifacts committed and pushed on `develop`

## Next Step

Proceed to `submit-for-review.md` to create the PR.
