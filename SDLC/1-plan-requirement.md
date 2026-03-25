---
description: Define a new requirement in the RTM, classify risk, generate test scope, and prepare for implementation
---
<!-- SDLC source: META-COMPLY/sdlc/files/1-plan-requirement.md -->
<!-- SDLC version: sdlc-v1.0.0 -->
<!-- Last synced: 2026-03-25 -->

# Plan Requirement

**Pipeline Stage:** 1 of 5
**Next:** `2-implement-and-test.md`
**References:** Test Policy (risk classification, AI governance), Test Strategy (risk matrix, testing depth, AI documentation)

---

## When to Use

- Starting a new feature, enhancement, or significant change
- Work that needs formal traceability (security, payments, RBAC, data handling)
- Any change a stakeholder or auditor might ask "was this tested?"

**Skip this workflow** for trivial changes (typo fixes, formatting, dependency bumps) — go straight to `2-implement-and-test.md`.

## Steps

### Step 1: Identify the GitHub Issue

Every tracked change starts from a GitHub Issue. The issue provides the *what* and *why*; the RTM provides the compliance audit trail.

- If the user references an issue number (e.g., `#123`): fetch its title, description, and labels using `gh issue view 123`.
- If the user describes work without an issue: ask **"Is there a GitHub Issue for this, or should we create one?"**
  - To create one: `gh issue create --title "[title]" --body "[description]" --label "[labels]"`
- Use issue labels to inform risk classification in Step 3 (e.g., `security`, `user-facing`, `internal`).

### Step 2: Determine the Next Requirement ID

```bash
grep -oP 'REQ-\d+' compliance/RTM.md | sort -t- -k2 -n | tail -1
```

The next ID is one higher (e.g., if the last is REQ-008, use REQ-009).

### Step 3: Classify Risk Level

| Risk Level | Criteria | Wawa Garden Bar Examples |
|---|---|---|
| **Low** | Internal tools, no regulated data, no auth changes | Dashboard UI tweaks, documentation, config changes |
| **Medium** | Touches PII, user-facing features, API changes, new dependencies | Menu management, inventory, rewards/loyalty, kitchen display, Socket.IO features |
| **High** | Security, payments, RBAC, data handling, authentication | Iron-session auth, Monnify payments, RBAC permissions, API key scopes, audit logging, customer PII |

AI involvement raises risk by one level when touching Medium or High categories. See Test Policy for the full risk matrix.

### Step 4: Add Entry to RTM

Open `compliance/RTM.md`, Part B. The issue provides full context; the RTM is a traceability index, not a content store.

```markdown
| REQ-XXX | #NNN | [LOW/MEDIUM/HIGH] | compliance/evidence/REQ-XXX/ | DRAFT | -- | -- |
```

The auditor reads one row and follows the links: Issue for context and rationale, evidence directory for test artifacts, PR for code changes.

### Step 5: Create Evidence Directory

```bash
mkdir -p compliance/evidence/REQ-XXX
```

### Step 6: Generate Test Scope

Create a test scope document proportional to the assessed risk level. This must exist **before implementation begins**.

**For LOW risk:**

```bash
cat > compliance/evidence/REQ-XXX/test-scope.md << 'EOF'
# Test Scope — REQ-XXX

**Risk Level:** LOW
**Requirement:** [Brief description]
**GitHub Issue:** #NNN
**Date:** [YYYY-MM-DD]

## Test Approach

Standard gates apply. No additional testing beyond universal exit criteria.

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all 183 tests pass
- CI independent verification: all PR checks pass
- Human code review via PR

## Acceptance Criteria

- [x] [Criterion 1 — what "done" looks like]
- [x] [Criterion 2]
EOF
```

**For MEDIUM risk:**

```bash
cat > compliance/evidence/REQ-XXX/test-scope.md << 'EOF'
# Test Scope — REQ-XXX

**Risk Level:** MEDIUM
**Requirement:** [Brief description]
**GitHub Issue:** #NNN
**Date:** [YYYY-MM-DD]

## Test Approach

Standard gates plus targeted verification.

**Universal gates (mandatory — verified locally AND in CI):**
- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass (183 local, 142 unauthenticated in CI)
- Human code review via PR

**Additional testing required by risk level:**
- [ ] Access control: [which endpoints/roles need verification]
- [ ] Audit logging: [which admin actions must produce AuditLog entries]
- [ ] Dependency review: [if new packages, verify real/current/no CVEs]
- [ ] Socket.IO events: [if real-time features affected]

## Validation Approach

- [e.g., "Verify menu item CRUD works end-to-end"]
- [e.g., "Confirm inventory snapshot approval workflow"]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] All additional testing items above pass
EOF
```

**For HIGH risk:**

```bash
cat > compliance/evidence/REQ-XXX/test-scope.md << 'EOF'
# Test Scope — REQ-XXX

**Risk Level:** HIGH
**Requirement:** [Brief description]
**GitHub Issue:** #NNN
**Date:** [YYYY-MM-DD]

## Test Approach

Full verification and validation per Test Strategy high-risk requirements.

**Universal gates (mandatory — verified locally AND in CI):**
- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Security testing (mandatory for HIGH):**
- [ ] Access control: [specific endpoints, roles, expected 401/403 behaviors]
- [ ] Audit logging: [specific admin actions that must produce entries]
- [ ] Input validation: [boundary/injection testing — Zod schemas, MongoDB queries]
- [ ] Error handling: [verify no sensitive data in error responses]

**Additional high-risk testing:**
- [ ] Independent review: [who will provide secondary review]
- [ ] Penetration testing consideration: [warranted? justification]
- [ ] Performance impact: [Socket.IO, MongoDB query, payment webhook concerns]
- [ ] Regression scope: [areas needing manual verification beyond E2E]

## Validation Approach

- [Specific user workflow to test end-to-end]
- [Business rule to validate — e.g., payment reconciliation]
- [Stakeholder sign-off needed? From whom?]

## AI Involvement (if applicable)

- AI tool: [tool name / none]
- Code categories AI will generate: [list]
- Elevated review required for: [security-sensitive files]
- Regeneration protocol: [will any components be regenerated?]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] All security testing items pass
- [ ] All validation items confirmed
- [ ] Independent review completed (if required)
EOF
```

### Step 7: Update Requirements Document (If Applicable)

If the requirement modifies a documented feature, update `docs/REQUIREMENTS.md` to reflect the intended change.

### Step 8: Document AI Use Intent (If Applicable)

If AI will generate code (Medium/High risk):

```bash
cat > compliance/evidence/REQ-XXX/ai-use-note.md << 'EOF'
# AI Use Record — REQ-XXX

**AI Tool:** [tool name]
**Planned AI Use:** [implementation / test generation / both / none]
**Risk Classification Impact:** [note if risk was raised due to AI involvement]
EOF
```

For Low risk, the `Co-Authored-By` commit tag is sufficient.

### Step 9: Commit

```bash
git add compliance/RTM.md compliance/evidence/REQ-XXX docs/REQUIREMENTS.md
git commit -m "compliance: [REQ-XXX] define requirement and test scope - [description] [RISK: LOW/MEDIUM/HIGH]

Ref: REQ-XXX
Closes: #NNN"
```

## Output

- GitHub Issue `#NNN` identified or created as the origin of the change
- REQ-XXX in RTM with `DRAFT`, risk classification, and issue reference
- Evidence directory with test scope (exists before implementation)
- AI use note (if applicable)

## Next Step

Proceed to `2-implement-and-test.md`. Refer back to `test-scope.md` during implementation.
