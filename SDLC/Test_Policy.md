# Test Policy

**Document Type:** Policy | **Version:** 1.0 | **Effective Date:** March 2026 | **Review Cycle:** Annual

**Owner:** Engineering Leadership | **Approved By:** Ade Thompson (Super Admin)

---

## Purpose

This Test Policy establishes the organizational commitment to quality assurance and testing excellence for the Wawa Garden Bar platform. It defines our philosophy, principles, accountability standards, and governance for all testing activities — including AI-assisted development.

This policy answers **"why we test"** and **"what we commit to."** For how we approach testing methodically, see the Test Strategy. For what tools and patterns we use, see the Test Architecture.

---

## Scope

This policy applies to:

- The Wawa Garden Bar ordering platform and all associated services
- All team members involved in software development, quality assurance, and product delivery
- All code regardless of authorship — human-written, AI-generated, or AI-assisted

---

## Testing Philosophy

**Core Principle:** We test to ensure zero critical defects reach production and to maintain the trust of our customers, staff, and business partners.

- **Quality is non-negotiable** — Testing is an integral part of our definition of done
- **Prevention over detection** — We invest in early testing, automation, and continuous quality practices
- **Risk-based approach** — Testing resources are allocated based on business risk, compliance requirements, and customer impact
- **Continuous improvement** — We regularly review and enhance our testing practices
- **Compliance-first mindset** — All testing activities support ISO 27001, GDPR, and regulatory compliance objectives
- **Accountability regardless of authorship** — The human who commits code is responsible for it, whether they wrote it manually or generated it with AI

---

## Strategic Alignment

**Operational Excellence & Compliance** — Testing provides documented evidence for audits, demonstrates adherence to secure SDLC practices, and produces automated audit trails.

**Customer Trust** — The platform handles payments (Monnify), personal data, and real-time ordering. Rigorous testing ensures the ordering experience is reliable and secure.

**Business Continuity** — Wawa Garden Bar depends on the platform for daily operations (dine-in, pickup, delivery, bar tabs). Downtime directly impacts revenue.

---

## Organizational Commitments

### What Every Release Must Include

1. **Test planning** — Documented scope, resources, entry/exit criteria, and risks
2. **Test design** — Test cases with traceability to requirements
3. **Test execution** — Recorded evidence with timestamps, results, and responsible parties
4. **Security scanning** — Static analysis and dependency auditing on every change
5. **Defect management** — All defects tracked with severity and closure verification
6. **Test reporting** — Completion reports with pass/fail metrics and release recommendations

### Compliance Framework

Testing practices conform to:

- **ISO/IEC 29119-3** — Software testing documentation
- **ISO 27001** — Information security management
- **GDPR** — Data protection and privacy (customer PII, order history)
- Industry best practices for agile testing and DevOps

### Periodic Security Commitments

Beyond per-change scanning:

- **Quarterly:** Full codebase security review, dependency deep audit, access control review, audit log integrity check
- **Annually:** Penetration testing by qualified third party, disaster recovery testing, third-party security assessment, AI use policy review

Specific schedules and procedures are defined in the Periodic Security Review Schedule.

---

## AI-Assisted Development Governance

### Policy Statement

We embrace AI as a development tool while recognizing that AI-generated code introduces specific compliance risks requiring explicit controls. AI assistance does not reduce testing requirements — it increases them.

### The Risk Profile

AI-generated code presents risks distinct from human-authored code:

- **Confident incorrectness** — Plausible-looking code with subtle logic errors or security flaws
- **Hallucinated dependencies** — Fabricated, outdated, or vulnerable packages
- **Non-determinism** — The same prompt may produce different code on different runs
- **Training data contamination** — Reproduction of insecure patterns
- **No inherent audit trail** — No default record of what was asked or generated

### Mandatory Controls

1. **Human review as a formal compliance gate** — Every AI-generated piece of code must be reviewed by a qualified human before entering the test pipeline
2. **Automated security scanning on every commit** — AI-generated code must pass the same SAST and dependency scanning gates as human-authored code
3. **Dependency and supply chain verification** — All dependencies in AI-assisted changes must be verified as real, current, and vulnerability-free
4. **Regeneration triggers full retest** — If a developer regenerates a component from scratch, that triggers full retest of the component and dependents
5. **Documentation proportional to risk** — AI tool permissions, review requirements, and prompt/output retention based on risk level

### Permitted AI Tools

| Tool | Permitted Use | Restrictions |
|---|---|---|
| Claude (Anthropic) — Opus 4.6, Sonnet 4.6 | Code generation, test generation, documentation, review assistance | No deployment without human review |
| GitHub Copilot | Inline code suggestions | Same review requirements as any AI-generated code |

Adding a new tool requires Engineering Leadership approval.

### What AI May and May Not Generate

**Permitted (with mandatory human review):** Application logic, UI components, test code, database queries, migration scripts, documentation, configuration, utility functions.

**Requires elevated review (senior developer + security):** Authentication/authorization logic (iron-session, RBAC), payment processing (Monnify webhooks, transaction handling), data validation for user input, API security middleware, database schema changes affecting PII.

**Prohibited (must be human-authored):** Security credentials or secrets, production environment configuration values, compliance policy documents.

### Accountability

The human who commits AI-generated code is accountable for its correctness, security, and compliance. The PR reviewer who approves it shares accountability. "The AI wrote it" is not an acceptable explanation.

---

## Risk-Based Testing

Testing effort is prioritized by risk level:

**High Priority** — Payment processing (Monnify), authentication (iron-session, passwordless PIN), RBAC (admin/super-admin/customer), customer PII, audit logging, order financial calculations, API security middleware.

**Medium Priority** — New features (menu management, inventory, rewards), Socket.IO real-time updates, third-party integrations (Africa's Talking SMS, WhatsApp Cloud API, Zoho email), kitchen display system.

**Low Priority** — Minor UI updates, configuration changes, documentation, internal dashboard styling.

AI involvement in Medium or High categories raises risk by one level.

---

## Roles & Responsibilities

### Engineering Leadership
- Approve and maintain this policy
- Allocate testing resources
- Review metrics and drive improvement
- Approve AI tool additions

### Developers
- Write unit tests for all changes
- Execute local testing before committing (including security scans)
- Fix identified defects
- Review and take accountability for all AI-generated code committed
- Document AI use per project requirements

### Business Stakeholders (Ade Thompson)
- Define clear acceptance criteria
- Participate in test planning and risk assessment
- Sign off on release readiness

---

## Metrics & Continuous Improvement

Tracked metrics:

- **Test coverage** — Percentage of requirements with associated tests
- **Automation rate** — Automated vs. manual tests
- **Defect escape rate** — Production defects not caught during testing
- **Pass/fail trends** — Historical results over time
- **Security findings** — SAST and dependency findings per release
- **AI code review rate** — AI-generated code formally reviewed before merge

Quarterly reviews assess trends and identify improvements.

---

## Compliance & Audit Support

All test artifacts must be:

- **Traceable** — Linked to requirements, user stories, or risk assessments
- **Timestamped** — With date, time, and responsible party
- **Retained** — Minimum 3 years for compliance reviews
- **Accessible** — Retrievable within 24 hours for audit requests

---

## Policy Exceptions

Exceptions require:

1. Written justification with risk assessment
2. Documented risk acceptance by Engineering Leadership
3. Compensating controls to mitigate risk
4. Time-bound with defined remediation date

Exceptions to AI governance controls are not permitted for High risk changes.

---

## Document Hierarchy

```
Test Policy (this document)
  → WHY we test, WHAT we commit to, WHO is responsible

Test Strategy
  → HOW we approach testing methodically

Test Architecture
  → WHAT we build tests with, HOW we structure the code

Periodic Security Review Schedule
  → WHEN periodic security activities happen

Test Plan (project-specific)
  → WHERE and WHEN for Wawa Garden Bar specifically
```

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Engineering Leadership | Initial creation for Wawa Garden Bar |

**Next Review Date:** March 2027

**Related Documents:** Test Strategy, Test Architecture, Periodic Security Review Schedule, Test Plan

---

**Policy Status:** Approved | **Effective Date:** March 2026
