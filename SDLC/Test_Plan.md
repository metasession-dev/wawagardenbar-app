# Test Plan — Wawa Garden Bar

**Document Type:** Test Plan (Project-Specific) | **Version:** 1.0 | **Effective Date:** March 2026

**Project:** Wawa Garden Bar | **Repository:** `ostendo-io/wawagardenbar-app`

**Parent Documents:** Test Policy, Test Strategy, Test Architecture (all Tier 1)

---

## Purpose

This Test Plan defines project-specific testing details for Wawa Garden Bar. It implements the universal standards from Tier 1 with concrete environment details, test suites, entry/exit criteria, and compliance artifacts.

---

## Project Overview

| Attribute | Value |
|---|---|
| Application | Wawa Garden Bar — full-stack food and drink ordering platform |
| Stack | TypeScript 5.6, Next.js 16, React 19, MongoDB 8, Socket.IO 4.8, Zustand 5 |
| Hosting | Railway (auto-deploy from `main`) |
| Production URL | `https://wawagardenbar-app-production.up.railway.app` |
| Health Endpoint | `GET /api/health` (returns status, service, version, uptime) |
| Database | MongoDB 8 (Railway, `directConnection: true`, private network) |
| Runtime | `node_modules/.bin/tsx server.ts` (custom HTTP server for Socket.IO) |
| Build | Multi-stage Dockerfile (deps → builder → prod-deps → runner) |
| Region | Lagos, Nigeria | Currency: Nigerian Naira (NGN) |

---

## Branching Strategy

Trunk-based with develop branch:

- **`main`** — Production. Auto-deploys to Railway. PR approval + all checks required.
- **`develop`** — Working branch. All implementation here. Permanent, never deleted.
- Merge commits (not squash) for `develop` → `main` to preserve audit history.

---

## Test Suites

### E2E Tests (Playwright)

| Attribute | Value |
|---|---|
| Framework | Playwright 1.57.0 |
| Test count | 183 tests across 3 projects |
| Unauthenticated (CI) | 142 (chromium project — run in CI on PR to main) |
| Auth setup | 2 (admin/super-admin login) |
| Authenticated (local only) | 39 (require admin credentials) |
| Browser | Chromium |
| Pass rate | 100% (183/183) |
| Config | `playwright.config.ts` — screenshots on, video on first-retry |
| Prerequisite | `npx tsx scripts/seed-e2e-admins.ts` |

### Unit Tests (Vitest)

| Attribute | Value |
|---|---|
| Framework | Vitest 4.0.18 |
| Coverage target | 70% for critical modules |
| Run command | `npx vitest run` |
| Key suites | REQ-005 tab support (26 tests), REQ-006 tab/menu lookup (27 tests) |

### TypeScript Compilation

```bash
npx tsc --noEmit   # 0 errors required
```

### SAST Scanning

| Attribute | Value |
|---|---|
| Tool | Semgrep |
| Config | auto |
| Scan scope | `app/`, `lib/`, `services/`, `models/` |

```bash
semgrep scan --config auto app/ lib/ services/ models/ --severity ERROR --severity WARNING
```

### Dependency Auditing

```bash
npm audit --audit-level=high
```

---

## Entry and Exit Criteria

### Entry

- On `develop`, up to date with remote
- Dev server starts (`npm run dev`)
- MongoDB running locally (or via Docker)
- Playwright browsers installed (`npx playwright install chromium`)
- Test data seeded (`npx tsx scripts/seed-e2e-admins.ts`)

### Exit (Before PR)

| Gate | Local | CI (PR) | Threshold |
|---|---|---|---|
| TypeScript | Yes | Yes | 0 errors |
| SAST (high/critical) | Yes | Yes | 0 findings |
| Dependencies (high/critical) | Yes | Yes | 0 vulnerabilities |
| E2E tests | 183/183 | 142/142 | All pass |
| Severity-1 defects | — | — | 0 open |
| Human review | — | PR approved | Approved |

Additional for Medium/High risk:

| Gate | Threshold |
|---|---|
| Access control tests | RBAC endpoints return correct 401/403 |
| Audit log tests | Admin actions produce AuditLog entries |

---

## CI/CD

### Pipeline Configuration

| Trigger | What Runs | Independent Evidence |
|---|---|---|
| Push to `develop` | TypeScript check + build | Compilation clean |
| PR to `main` | TypeScript + SAST + dependency audit + E2E (unauthenticated) | All gates independently verified by GitHub |
| Merge to `main` | Auto-deploy to Railway | Deployment triggered |

### Workflow Files

| Workflow | File | Purpose |
|---|---|---|
| Test on PR | `.github/workflows/test-on-pr.yml` | E2E tests, TypeScript check on PR to main |
| Build & Publish | `.github/workflows/build-and-publish.yml` | Docker build, publish to GHCR |

### Evidence Model

**Local evidence** (in `compliance/evidence/REQ-XXX/`) — comprehensive, developer-produced, covers all tests. Committed to repository.

**CI evidence** (in GitHub Actions logs + artifacts) — independent, GitHub-produced, covers unauthenticated subset. Tamper-resistant.

Both required. Local proves comprehensive testing. CI proves it independently.

---

## AI Use — Project Configuration

| Tool | Permitted Use |
|---|---|
| Claude (Anthropic) — Opus 4.6, Sonnet 4.6 | Code generation, test generation, documentation, review |
| GitHub Copilot | Inline code suggestions |

Documentation requirements:

| Risk | Commit | Evidence | Prompts |
|---|---|---|---|
| Low | `Co-Authored-By` tag | Not required | Not required |
| Medium | Same | Summary in evidence dir | Summary |
| High | Same | Detailed record | Detailed |

Elevated review required for: authentication (iron-session, passwordless PIN), payment processing (Monnify webhooks, transaction handling), RBAC (admin permissions, API key scopes), customer PII handling, audit logging, database schema changes.

---

## Requirements Traceability

**Format:** `compliance/RTM.md`, Part B:

```markdown
| REQ-XXX | Description | Risk | Files | Evidence | Status | Approver | Date |
```

**Status lifecycle:** DRAFT → IN PROGRESS → TESTED - PENDING SIGN-OFF → APPROVED - DEPLOYED

**Current requirements:** REQ-001 through REQ-008 tracked (5 pending sign-off, 2 approved and deployed, 1 awaiting review).

**JSDoc headers:** `@requirement REQ-XXX - Brief description` in modified source files.

---

## Compliance Artifacts

```
compliance/
├── RTM.md
├── test-plan.md
├── test-cases.md                  (181 formal test specifications)
├── test-summary-report.md
├── pending-releases/
│   └── RELEASE-TICKET-REQ-XXX.md
├── approved-releases/
│   └── RELEASE-TICKET-REQ-XXX.md
└── evidence/
    ├── REQ-XXX/
    │   ├── test-scope.md
    │   ├── e2e-results.json
    │   ├── sast-results.json
    │   ├── dependency-audit.json
    │   ├── security-summary.md
    │   ├── ai-use-note.md
    │   └── ai-prompts.md
    └── periodic/
        ├── sast-quarterly/
        ├── dependency-audit/
        ├── access-control/
        ├── audit-log/
        ├── pentest/
        ├── dr-test/
        └── third-party/
```

---

## Post-Deploy Verification

```bash
# Health check
curl -s https://wawagardenbar-app-production.up.railway.app/api/health

# Smoke test — public menu
curl -s -o /dev/null -w "%{http_code}" https://wawagardenbar-app-production.up.railway.app/
# Expected: 200

# Security verification — admin endpoint
curl -s -o /dev/null -w "%{http_code}" https://wawagardenbar-app-production.up.railway.app/api/admin/orders
# Expected: 401 or 403

# Security headers
curl -s -I https://wawagardenbar-app-production.up.railway.app/ | grep -iE 'x-frame-options|x-content-type|referrer-policy'

# No stack traces
curl -s https://wawagardenbar-app-production.up.railway.app/api/nonexistent
# Expected: generic error, NOT stack trace
```

---

## Disaster Recovery

| Metric | Target |
|---|---|
| RTO | 4 hours |
| RPO | 24 hours |

Recovery procedures:
1. **Application failure:** Redeploy previous version from Railway dashboard
2. **Database recovery:** Restore MongoDB from Railway backup
3. **Full rebuild:** Deploy from `main` to fresh Railway environment, reconfigure env vars

---

## Periodic Review — Project Procedures

Per the Periodic Security Review Schedule:

```bash
# Quarterly SAST
semgrep scan --config auto --config p/security-audit --config p/owasp-top-ten app/ lib/ services/ models/ --json > compliance/evidence/periodic/sast-quarterly/sast-full-$(date -I).json

# Quarterly dependencies
npm audit --json > compliance/evidence/periodic/dependency-audit/npm-audit-$(date -I).json
npm outdated --json > compliance/evidence/periodic/dependency-audit/outdated-$(date -I).json

# Quarterly access control
npx playwright test --grep "access control\|unauthorized\|forbidden\|RBAC"
```

Annual pen test scope: `https://wawagardenbar-app-production.up.railway.app`, 27 public API endpoints across 10 groups, iron-session authentication, Monnify payment webhooks, customer ordering flow, admin RBAC (3 roles, 7 permission groups, 17 API key scopes).

---

## Workflow Files

| # | File | Purpose |
|---|---|---|
| 0 | `0-project-setup.md` | One-time: repository, CI, compliance setup |
| 1 | `1-plan-requirement.md` | Create REQ, classify risk, generate test scope |
| 2 | `2-implement-and-test.md` | Code, commit, run all local gates |
| 3 | `3-compile-evidence.md` | Gather test + security + AI evidence |
| 4 | `4-submit-for-review.md` | Create PR (triggers CI independent verification) |
| 5 | `5-deploy-main.md` | Merge, deploy, verify, finalize |

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Engineering Team | Initial plan for Wawa Garden Bar |

**Parent Documents:** Test Policy, Test Strategy, Test Architecture, Periodic Security Review Schedule
