---
description: Finalize task with traceability, automated testing, and human sign-off block
---

# Audit-Finish Workflow

This workflow formalizes the **Human-in-the-Loop** requirement for compliance and audit purposes. It ensures that while AI handles implementation and testing, a human authorizes the release.

## Workflow Steps

### 1. Traceability
- Identify or create a Requirement ID (e.g., `REQ-XXX`) in `/compliance/RTM.md`
- If RTM doesn't exist, create it with proper structure
- Link the requirement to the feature/change being implemented

### 2. Implementation Verification
- Ensure all relevant code files have JSDoc headers linking to Requirement IDs
- Format: `@requirement REQ-XXX - [Brief description]`
- Verify SOLID principles compliance
- Verify security best practices compliance

### 3. Test Execution
- Generate or run Vitest unit tests for business logic
- Generate or run Playwright E2E tests for user flows
- Save test artifacts (screenshots, videos, reports) to `/compliance/evidence/REQ-XXX/`
- Ensure all tests pass before proceeding

### 4. Audit Artifact Generation
- Update `/compliance/RTM.md` status to `TESTED - PENDING SIGN-OFF`
- Generate `RELEASE-TICKET-REQ-XXX.md` in `/compliance/pending-releases/`
- Include:
  - Requirement summary
  - Implementation details
  - Test results summary
  - Links to test evidence
  - Human sign-off table

### 5. Automated Sign-off Block
- Append standardized sign-off table to release ticket
- Include roles: QA Lead, Product Owner, Security Review
- Add audit note about AI assistance and verification

### 6. Git Commit
- Commit message format: `compliance: [REQ-XXX] feature complete - awaiting UAT sign-off`
- Include all code changes, tests, and compliance artifacts
- Tag commit with requirement ID for traceability

## Sign-off Template

The following template is automatically appended to each release ticket:

```markdown
---
## 🛡️ Compliance & UAT Sign-off
*This section must be completed by a human reviewer before merging to Production.*

| Role | Name | Date | Status | Signature/Notes |
| :--- | :--- | :--- | :--- | :--- |
| **QA Lead** | [Name] | [YYYY-MM-DD] | [ ] PASS / [ ] FAIL | |
| **Product Owner** | [Name] | [YYYY-MM-DD] | [ ] PASS / [ ] FAIL | |
| **Security Review** | [Name] | [YYYY-MM-DD] | [ ] N/A / [ ] OK | |

> **Audit Note:** This release was assisted by Windsurf Cascade (AI). All AI-generated logic has been verified against the Requirement Traceability Matrix (RTM).
---
```

## Usage Example

```
User: /audit-finish the new Stripe integration. ID: REQ-402
```

Windsurf will:
1. Update RTM with REQ-402
2. Verify JSDoc headers in code
3. Run all relevant tests
4. Capture test evidence
5. Generate release ticket with sign-off table
6. Commit with proper message

Human reviewer then:
1. Opens `/compliance/pending-releases/RELEASE-TICKET-REQ-402.md`
2. Reviews test results and evidence
3. Fills in sign-off table with name, date, and status
4. Commits the signed-off ticket
5. Merges to production

## Audit Benefits

- **Separation of Concerns**: AI handles implementation, human makes final decision
- **Immutable Evidence**: Git-tracked sign-offs with timestamps
- **Zero Friction**: All compliance work stays in IDE
- **Clear Accountability**: Every release has named approvers
- **Regulatory Compliance**: Meets SOC 2, ISO 27001, GDPR requirements

## Directory Structure

```
/compliance/
├── RTM.md                          # Requirements Traceability Matrix
├── pending-releases/               # Release tickets awaiting sign-off
│   ├── RELEASE-TICKET-REQ-101.md
│   ├── RELEASE-TICKET-REQ-102.md
│   └── ...
├── approved-releases/              # Signed-off releases (moved after approval)
│   └── ...
└── evidence/                       # Test artifacts and screenshots
    ├── REQ-101/
    │   ├── unit-tests.xml
    │   ├── e2e-results.json
    │   ├── screenshot-1.png
    │   └── video-1.webm
    └── REQ-102/
        └── ...
```

## Compliance Checklist

Before marking a release ticket as complete:

- [ ] Requirement ID exists in RTM
- [ ] Code has JSDoc headers with requirement links
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Test evidence saved to `/compliance/evidence/`
- [ ] Release ticket generated
- [ ] Sign-off table included
- [ ] RTM status updated to "TESTED - PENDING SIGN-OFF"
- [ ] Git commit includes all artifacts
- [ ] Human reviewer has been notified

## Post-Approval Process

After human sign-off:

1. Move release ticket from `pending-releases/` to `approved-releases/`
2. Update RTM status to `APPROVED - DEPLOYED`
3. Tag the commit with version number
4. Deploy to production
5. Archive test evidence (retain for audit period)
