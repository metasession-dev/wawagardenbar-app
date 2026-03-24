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

### Step 1: Identify the GitHub Issue

Every tracked change starts from a GitHub Issue. The issue provides the *what* and *why*; the RTM provides the compliance audit trail.

- If the user references an issue number (e.g., `#123`): fetch it with `gh issue view 123`.
- If the user describes work without an issue: ask **"Is there a GitHub Issue for this, or should we create one?"**
  - To create one: `gh issue create --title "[title]" --body "[description]" --label "[labels]"`

### Step 2: Determine the Next Requirement ID

```bash
# Find the highest existing REQ number
grep -oP 'REQ-\d+' compliance/RTM.md | sort -t- -k2 -n | tail -1
```

The next ID is one higher (e.g., if the last is REQ-008, use REQ-009).

### Step 3: Add Entry to RTM

Open `compliance/RTM.md` and add a new entry in **Part B: Change Request Traceability**:

```markdown
| REQ-XXX | #NNN | [LOW/MEDIUM/HIGH] | compliance/evidence/REQ-XXX/ | DRAFT | -- | -- |
```

### Step 4: Create Evidence Directory

```bash
mkdir -p compliance/evidence/REQ-XXX
```

### Step 5: Update Requirements Document (If Applicable)

If the requirement adds or modifies a feature documented in `docs/REQUIREMENTS.md`, update that document to reflect the intended change. This establishes the "what should it do" before "what did we build."

### Step 6: Commit the Plan

```bash
git add compliance/RTM.md compliance/evidence/REQ-XXX docs/REQUIREMENTS.md
git commit -m "compliance: [REQ-XXX] define requirement - [brief description]"
```

## Output

- GitHub Issue `#NNN` identified or created as the origin of the change
- REQ-XXX entry in RTM with status `DRAFT`, risk classification, and issue reference
- Empty evidence directory ready for test artifacts
- Requirements document updated (if applicable)
- Commit on `develop` establishing the requirement before implementation

## Next Step

Proceed to `implement-and-test.md` to build and test the feature.
