---
description: Define a new requirement in the RTM and prepare for implementation
---

# Plan Requirement

**Pipeline Stage:** 1 of 5
**Next:** `implement-and-test.md`

This workflow creates a tracked requirement before implementation begins. It establishes the audit trail from the start — not after the fact.

## When to Use

- Starting a new feature, enhancement, or significant change
- Work that needs formal traceability (security, payments, RBAC, data handling)
- Any change a stakeholder or auditor might ask "was this tested?"

**Skip this workflow** for trivial changes (typo fixes, formatting, dependency bumps) — go straight to `implement-and-test.md`.

## Steps

### Step 1: Determine the Next Requirement ID

```bash
# Find the highest existing REQ number
grep -oP 'REQ-\d+' compliance/RTM.md | sort -t- -k2 -n | tail -1
```

The next ID is one higher (e.g., if the last is REQ-007, use REQ-008).

### Step 2: Add Entry to RTM

Open `compliance/RTM.md` and add a new entry in **Part B: Change Request Traceability**:

```markdown
| REQ-XXX | [Brief description] | TBD | TBD | DRAFT | -- | -- |
```

### Step 3: Create Evidence Directory

```bash
mkdir -p compliance/evidence/REQ-XXX
```

### Step 4: Update Requirements Document (If Applicable)

If the requirement adds or modifies a feature documented in `docs/REQUIREMENTS.md`, update that document to reflect the intended change. This establishes the "what should it do" before "what did we build."

### Step 5: Commit the Plan

```bash
git add compliance/RTM.md compliance/evidence/REQ-XXX docs/REQUIREMENTS.md
git commit -m "compliance: [REQ-XXX] define requirement - [brief description]"
```

## Output

- REQ-XXX entry in RTM with status `DRAFT`
- Empty evidence directory ready for test artifacts
- Requirements document updated (if applicable)
- Commit on `develop` establishing the requirement before implementation

## Next Step

Proceed to `implement-and-test.md` to build and test the feature.
