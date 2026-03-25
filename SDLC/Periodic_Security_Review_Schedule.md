<!-- SDLC source: META-COMPLY/sdlc/files/Periodic_Security_Review_Schedule.md -->
<!-- SDLC version: sdlc-v1.0.0 -->
<!-- Last synced: 2026-03-25 -->

# Periodic Security Review Schedule

**Document Type:** Schedule | **Version:** 1.1 | **Effective Date:** March 2026 | **Review Cycle:** Quarterly

**Owner:** Engineering Leadership | **Approved By:** Ade Thompson

---

## Purpose

This document defines the security activities that occur on a schedule rather than per-feature. Per-commit security scanning (SAST and SCA) is defined in the Test Strategy. This document covers the periodic activities: penetration testing, full codebase review, disaster recovery testing, dependency deep audits, and third-party assessments.

---

## Scope

This schedule applies to the Wawa Garden Bar platform and all associated services. Project-specific procedures (URLs, databases, endpoints) are in the Test Plan.

---

## Schedule Overview

| Activity | Frequency | Owner | Evidence Location |
|---|---|---|---|
| Full codebase SAST review | Quarterly | Engineering Lead | `compliance/evidence/periodic/sast-quarterly/` |
| Dependency deep audit | Quarterly | Engineering Lead | `compliance/evidence/periodic/dependency-audit/` |
| Access control review | Quarterly | Engineering Lead | `compliance/evidence/periodic/access-control/` |
| Audit log integrity review | Quarterly | Engineering Lead | `compliance/evidence/periodic/audit-log/` |
| Penetration test | Annually | Third party | `compliance/evidence/periodic/pentest/` |
| Disaster recovery test | Annually | Engineering Lead | `compliance/evidence/periodic/dr-test/` |
| Third-party security assessment | Annually | Third party | `compliance/evidence/periodic/third-party/` |
| AI use policy review | Annually | Engineering Leadership | Test Policy revision history |
| Full compliance document review | Annually | Engineering Leadership | `compliance/` directory |

---

## Quarterly Activities

### Full Codebase SAST Review

**Purpose:** Catch vulnerability patterns spanning multiple changes that per-commit scanning may miss in isolation.

**Procedure:**
1. Run comprehensive SAST with expanded rule sets (including OWASP Top 10) across entire codebase
2. Compare against previous quarter to identify trends
3. Triage all findings by severity
4. Create remediation tickets for high/critical
5. Document accepted risks with justification for medium

**Command:**
```bash
semgrep scan --config auto --config p/security-audit --config p/owasp-top-ten app/ lib/ services/ models/ --json > compliance/evidence/periodic/sast-quarterly/sast-full-$(date -I).json
```

**Exit criteria:** 0 unresolved high/critical. Medium documented with plan or acceptance.

### Dependency Deep Audit

**Purpose:** Go beyond per-commit auditing to review the full tree for unmaintained packages, license issues, and supply chain risks.

**Procedure:**
1. Standard vulnerability check: `npm audit --json`
2. Check for outdated direct dependencies: `npm outdated --json`
3. Review tree for unexpected or unnecessary packages
4. Flag unmaintained dependencies (no updates 12+ months)
5. Verify license compatibility
6. Re-evaluate dependencies originally introduced by AI suggestion

**Key dependencies to audit:**
- `mongoose` (8.x) — database ODM
- `socket.io` (4.8.x) — real-time transport
- `iron-session` (8.x) — session management
- `nodemailer` (6.x) — email delivery
- `bcrypt` (6.x) — password hashing
- `zod` (3.x) — input validation

### Access Control Review

**Purpose:** Verify RBAC is correctly enforced across all protected endpoints.

**Procedure:**
1. Run automated access control E2E tests
2. Manual spot-check of key admin endpoints (`/api/admin/*`)
3. Review public API endpoints (`/api/public/*`) — verify API key authentication
4. Verify 3-role model (customer, admin, super-admin) boundaries
5. Check API key scope enforcement (17 scopes)
6. Review new endpoints added since last quarter

**Endpoints to verify:**
- `/api/admin/*` — admin/super-admin only
- `/api/public/*` — API key required with correct scopes
- `/api/auth/*` — appropriate session handling
- `/api/webhooks/*` — signature validation (Monnify, WhatsApp)
- `/dashboard/*` — authenticated admin only

### Audit Log Integrity Review

**Purpose:** Confirm audit logs are generated correctly, complete, and tamper-resistant.

**Procedure:**
1. Verify all auditable admin actions produce AuditLog entries
2. Confirm entries contain: timestamp, userId, action, resource, IP, userAgent
3. Test that logs cannot be modified by application users
4. Review retention compliance
5. Sample-check entries for completeness

**Auditable actions:** Order management, menu CRUD, inventory changes, user management, settings changes, permission modifications.

---

## Annual Activities

### Penetration Testing

**Scope:**
- External-facing application at production URL
- Public API endpoints (27 endpoints across 10 groups)
- Authentication mechanism (iron-session, passwordless PIN)
- Payment webhook handlers (Monnify)
- Customer ordering flow
- Admin dashboard access controls

**Requirements:** Qualified third party. Black-box by default.

**Remediation SLAs:**

| Severity | Deadline |
|---|---|
| Critical | 7 days |
| High | 30 days |
| Medium | 90 days |
| Low | Next quarterly review |

### Disaster Recovery Test

**Standard scenarios:**
1. **Application failure** — Simulate Railway service restart, verify auto-recovery, record time
2. **Database recovery** — Restore MongoDB from backup, verify data integrity, record data loss window
3. **Full environment rebuild** — Deploy from `main` to fresh Railway environment, identify configuration gaps

**Targets:** RTO: 4 hours | RPO: 24 hours (defined in Test Plan)

### Third-Party Security Assessment

**Scope:** Railway infrastructure config, secrets management, CI/CD security (GitHub Actions), dependency supply chain, AI use policy compliance.

**Required if:** Targeting SOC 2, processing regulated data, or contractually required.

### AI Use Policy Review

**Checklist:**
- Current tools listed in Test Policy?
- Deprecated tools removed?
- Regulatory changes affecting AI use?
- AI-related incidents this year?
- Retention requirements appropriate?
- Regeneration protocol followed consistently?

---

## Unscheduled Triggers

| Event | Triggered Activity |
|---|---|
| Security incident or breach | Full SAST + pen test + access control review |
| Critical CVE in direct dependency | Immediate audit + patch |
| Significant architecture change | Access control review + SAST |
| New AI tool adopted | AI use policy review |
| Regulatory change | Full compliance document review |
| Production rollback | Root cause analysis + relevant review |

---

## Compliance Framework Mapping

| Framework | Control | Covered By |
|---|---|---|
| SOC 2 (CC7.1) | System monitoring | Quarterly SAST + audit log review |
| SOC 2 (CC6.1) | Logical access | Quarterly access control review |
| SOC 2 (CC8.1) | Change management | Per-feature pipeline + quarterly reviews |
| ISO 27001 (A.12.6) | Vulnerability management | SAST + dependency audit (quarterly + per-commit) |
| ISO 27001 (A.17.1) | Business continuity | Annual DR test |
| OWASP | Top 10 coverage | SAST config includes OWASP rules |

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Engineering Leadership | Initial schedule for Wawa Garden Bar |
| 1.1 | March 2026 | Engineering Leadership | Updated document references for clean boundary split |

**Next Review Date:** June 2026 (quarterly)

**Related Documents:** Test Policy, Test Strategy, Test Architecture, Test Plan
