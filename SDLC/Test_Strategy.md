# Test Strategy

**Document Type:** Strategy | **Version:** 3.0 | **Effective Date:** March 2026 | **Review Cycle:** Annual

**Owner:** QA / Engineering Team | **Approved By:** Engineering Leadership

---

## Purpose

This Test Strategy defines the methodological approach to testing for Wawa Garden Bar. It establishes how we plan, execute, and evaluate testing — the testing levels, security methodology, AI testing protocol, defect lifecycle, traceability approach, risk classification, and evidence requirements.

This document answers **"how we approach testing."** For why we test and what we commit to, see the Test Policy. For specific tools, patterns, and code standards, see the Test Architecture.

---

## Scope

This strategy applies to all testing activities for the Wawa Garden Bar platform — the Next.js frontend, API routes, Socket.IO real-time layer, MongoDB data layer, and third-party integrations.

Project-specific details (environment URLs, test counts, infrastructure) are defined in the Test Plan.

---

## Testing Levels

### Unit Testing

Tests individual functions, methods, and components in isolation. Executed by developers during development. External dependencies (APIs, databases, file system) are mocked. Automated in CI/CD.

**Key areas:** Service layer functions (28 services), API route handlers, Zod validation schemas, financial calculations (profitability, tab totals), idempotency key generation.

### Integration Testing

Validates interactions between system components — API contracts, service integrations, and data flows. Focuses on boundaries between modules and third-party services.

**Key areas:** MongoDB operations via Mongoose models (20 models), Monnify payment webhooks, Africa's Talking SMS delivery, WhatsApp Cloud API messaging, Socket.IO event propagation.

### System Testing (E2E)

End-to-end validation of complete user workflows from UI to database. Automated using Playwright. Covers 100% of critical user paths.

**Key areas:** Customer ordering flow (browse → cart → checkout → payment → tracking), admin order management, kitchen display system, inventory management, tab lifecycle (open → settle → close).

### Acceptance Testing

Validates that requirements and acceptance criteria are met from a business perspective. Conducted against the production or UAT environment.

**Key areas:** Order types (dine-in, pickup, delivery, pay-now), payment completion, real-time kitchen updates, financial reporting accuracy.

### Security Testing

A layered approach combining per-commit automated scanning with periodic manual assessment. See Section: Security Testing Methodology.

### Performance Testing

Load testing, stress testing, and scalability validation. Baselines established for concurrent ordering scenarios. Executed before major releases or infrastructure changes.

**Key areas:** Concurrent order placement, Socket.IO connection scaling, MongoDB query performance under load, payment webhook throughput.

### Verification and Validation (V&V)

**Verification** — "Did we build the system correctly?" Unit tests, integration tests, security scans, type checking. Automated and continuous.

**Validation** — "Did we build the correct system?" Acceptance testing against business requirements. End-to-end user workflow testing. Stakeholder sign-off confirms the system meets intent.

Both are required before any release.

---

## Security Testing Methodology

### Per-Commit Gates (Mandatory for All Changes)

Every push to `develop` triggers the full CI pipeline. All gates run on both develop pushes and PRs to main. Gate results are auto-uploaded to META-COMPLY (environment=uat) on develop pushes. Every code change must pass these automated gates:

**Static Application Security Testing (SAST)** — Scans source code for vulnerability patterns including injection, insecure defaults, and improper error handling. Exit criteria: 0 high/critical findings.

**Dependency and Supply Chain Scanning (SCA)** — Audits all direct and transitive dependencies for known CVEs. Flags outdated, unmaintained, or fabricated packages. Exit criteria: 0 high/critical vulnerabilities.

**Type Checking and Linting** — Strict mode TypeScript compilation and ESLint. Exit criteria: 0 errors.

### Per-Release Security Activities

**Access Control Testing** — Verifies RBAC across all protected endpoints. Tests that unauthenticated requests are rejected and role boundaries enforced (customer vs admin vs super-admin). Required for releases touching authentication, authorization, or API endpoints.

**Audit Log Verification** — Confirms auditable admin actions produce AuditLog entries with timestamp, userId, action, resource, IP, and userAgent. Required for releases touching auditable functionality.

**Post-Deploy Security Verification** — Access control spot-check in production, security header verification (X-Frame-Options, X-Content-Type-Options, Referrer-Policy), confirmation that no debug information is exposed.

### Periodic Security Activities

Defined in the Periodic Security Review Schedule:

| Activity | Frequency |
|---|---|
| Full codebase SAST review | Quarterly |
| Dependency deep audit | Quarterly |
| Access control review | Quarterly |
| Audit log integrity review | Quarterly |
| Penetration testing (third party) | Annually |
| Disaster recovery test | Annually |
| Third-party security assessment | Annually |

### Remediation SLAs

| Severity | Per-Commit Gate | Periodic Finding |
|---|---|---|
| Critical | Block merge, fix immediately | 7 days |
| High | Block merge, fix immediately | 30 days |
| Medium | Document and plan remediation | 90 days |
| Low | Track for next review | Next quarterly review |

---

## AI-Assisted Development Testing Methodology

### Risk Classification for AI-Generated Code

| Code Category | Base Risk | AI Adjustment |
|---|---|---|
| Dashboard UI, internal tools | Low | Remains Low |
| Menu management, inventory, rewards, customer features | Medium | Remains Medium |
| Auth (iron-session), payments (Monnify), RBAC, PII, audit logging | High | Remains High |
| Any of the above with AI regeneration | Any | Raise by one level |

### Mandatory Human Review Process

| Risk Level | Reviewer | Focus |
|---|---|---|
| Low | Any team member with domain knowledge | Functional correctness, obvious security issues |
| Medium | Developer experienced in affected area | Above + security implications, dependency validation |
| High | Senior developer + security-aware review | Above + independent verification, threat modeling |

**Every reviewer checks AI-generated code for:**

1. **Correctness** — Does it do what it claims?
2. **Security** — Injection vulnerabilities, insecure defaults, improper error handling?
3. **Dependencies** — All imports real, current, vulnerability-free?
4. **Hardcoded values** — Test data, placeholder credentials, debug flags?
5. **Consistency** — Follows project conventions?

### Regeneration Protocol

When a developer regenerates a component from scratch:

1. Document the regeneration — which component, when, why
2. Full retest of the regenerated component
3. Retest all dependent components
4. Do not assume equivalence

### AI Documentation Requirements

| Risk Level | Commit Tag | Evidence | Prompts |
|---|---|---|---|
| Low | `Co-Authored-By` tag | Not required | Not required |
| Medium | `Co-Authored-By` tag | Summary of generation | Summary of prompts |
| High | `Co-Authored-By` tag | Detailed AI record | Detailed prompts and outputs |

---

## Risk-Based Testing Approach

### Classification

**High Risk** — Payment processing (Monnify webhooks, transaction creation), authentication (iron-session, passwordless PIN flow), RBAC (admin permissions, API key scopes), customer PII handling, audit logging, order financial calculations (totals, profitability), idempotency key generation.

**Medium Risk** — New features (menu CRUD, inventory snapshots, rewards/loyalty), Socket.IO real-time updates, third-party integrations (SMS, WhatsApp, email), kitchen display, reporting/analytics, tab management.

**Low Risk** — UI styling, configuration, documentation, internal dashboard cosmetics.

### Testing Depth by Risk Level

| Activity | Low | Medium | High |
|---|---|---|---|
| Unit tests | Required | Required | Required |
| Integration tests | As applicable | Required | Required |
| E2E tests | Critical paths | Full coverage | Full coverage |
| SAST scan | Required | Required | Required |
| Dependency audit | Required | Required | Required |
| Access control testing | If applicable | Required | Required |
| Audit log testing | If applicable | Required | Required |
| Performance testing | Not required | If applicable | Required |
| Penetration testing | Not required | Not required | Consider |
| Independent review | Not required | Not required | Required |

---

## Defect Management

### Severity Classification

- **Critical** — System unusable, data loss, security breach, payment failure. Fix immediately.
- **Major** — Major feature broken (ordering, kitchen display), no workaround. Fix within sprint.
- **Minor** — Minor issue, workaround exists. Prioritize in backlog.

### Lifecycle

1. **Detection** — Test failure or manual report
2. **Triage** — Severity and priority assigned
3. **Fix** — Developer implements on develop branch
4. **Verification** — QA validates fix
5. **Closure** — Evidence recorded, audit trail complete
6. **Traceability** — Commit references issue ID

---

## Requirements Traceability

Every requirement is traceable through: Requirement → Test Cases → Test Results → Code Commits → PR Review → Deployment.

- Requirements tracked with REQ-XXX IDs
- Test specifications tagged with requirement IDs
- Commit messages reference requirement/issue IDs
- Pull requests link commits to requirements
- Traceability matrix maintained in `compliance/RTM.md`

---

## Git Workflow and Change Control

### Branching Strategy

- **`main`** — Production. Auto-deploys to Railway. PR approval + all checks required. Never commit directly.
- **`develop`** — Working branch. All implementation here. Permanent, never deleted.
- Merge commits (not squash) for `develop` → `main` to preserve audit history.

### Change Control Process

1. **Implement** — Code on develop with requirement references
2. **Local gates** — TypeScript, ESLint, SAST, dependency audit, E2E tests
3. **Push to develop** — Triggers full CI pipeline (all gates), evidence auto-uploaded to META-COMPLY, auto-deploys to UAT
4. **UAT review** — Review evidence in META-COMPLY, approve UAT release
5. **PR to main** — CI re-runs gates independently, META-COMPLY UAT approval check verified
6. **Review** — Human reviews code, security, AI involvement, compliance artifacts
7. **Approve** — Immutable record of reviewer identity and timestamp
8. **Merge** — Triggers Railway production deployment
9. **Post-deploy** — Smoke tests against production, evidence uploaded to META-COMPLY (environment=production)
10. **Prod review** — Approve production release in META-COMPLY

### Commit Standards

Conventional Commits format: `type(scope): description`

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert, compliance, security

AI-assisted commits include: `Co-Authored-By: [Tool] <noreply@provider.com>`
Tracked requirements include: `Ref: REQ-XXX`

---

## Evidence Requirements

### By Phase

**Planning** — Requirements with acceptance criteria, risk classification, AI use intent.

**Development** — PR with code review (four-eyes principle), commit messages with traceability, `Co-Authored-By` tags, SAST and dependency scan results.

**Testing** — Test execution logs with timestamps, security scan evidence, screenshot/video capture for failures, AI review documentation.

**Release** — Completion report with Go/No-Go recommendation, security evidence summary, sign-off from approver.

### Retention

- CI/CD artifacts: 90 days (GitHub Actions default)
- Long-term storage: minimum 3 years for compliance
- All evidence tagged with release version

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Engineering Team | Initial creation for Wawa Garden Bar |
| 2.0 | March 2026 | Engineering Team | Added AI methodology, security methodology, V&V |
| 3.0 | March 2026 | Engineering Team | Clean boundary split — moved specific tools, code patterns, CI config to Test Architecture. Strategy now owns methodology only. Added META-COMPLY CI integration references. |

**Next Review Date:** March 2027

**Related Documents:** Test Policy, Test Architecture, Periodic Security Review Schedule, Test Plan

---

**Strategy Status:** Approved | **Effective Date:** March 2026
