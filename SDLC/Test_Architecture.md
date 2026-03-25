<!-- SDLC source: META-COMPLY/sdlc/files/Test_Architecture.md -->
<!-- SDLC version: sdlc-v1.0.0 -->
<!-- Last synced: 2026-03-25 -->

# Test Architecture

**Document Type:** Architecture Standards | **Version:** 2.0 | **Effective Date:** March 2026 | **Review Cycle:** Annual

**Owner:** Engineering Team | **Approved By:** Engineering Leadership

---

## Purpose

This document defines the technical standards for how Wawa Garden Bar builds and structures test infrastructure. It specifies mandatory tools, frameworks, directory structures, design patterns, code conventions, CI/CD pipeline configuration, environment setup, and artifact storage.

This document answers **"what we build tests with and how we structure the code."** For why we test, see the Test Policy. For how we approach testing methodically, see the Test Strategy.

---

## Scope

These standards apply to all testing within the Wawa Garden Bar platform.

---

## 1. Architectural Principles

### DRY (Don't Repeat Yourself)
- Reusable test utilities and helper functions across suites
- Shared fixtures and base classes
- Centralized configuration management

### Isolation
- Each test runs independently without side effects
- Database state reset between test runs
- Parallel execution enabled without interference

### Speed over Exhaustiveness
- Fast feedback prioritized (unit tests < 30 seconds)
- Parallelization for E2E suites
- Strategic test selection based on code changes

### Traceability
- Tests linked to requirements via REQ-XXX IDs
- Automated requirement-test-result mapping

---

## 2. Test Pyramid Implementation

### Unit Layer (Foundation)

| Attribute | Standard |
|---|---|
| Framework | Vitest 4.x |
| Coverage | Minimum 70% for critical modules |
| Speed | Suite completes in < 30 seconds |
| Scope | Service functions, API route handlers, validation schemas, financial calculations |
| Mocking | External dependencies must be mocked |

### Integration Layer (Middle)

| Attribute | Standard |
|---|---|
| Coverage | Minimum 80% of integration points |
| Scope | MongoDB operations, API contracts, Socket.IO events, webhook handlers |
| Data | MongoDB test database (Docker or CI service container) |

### E2E Layer (Top)

| Attribute | Standard |
|---|---|
| Framework | Playwright 1.57.x |
| Coverage | 100% of critical user paths |
| Test count | 183 tests across 3 projects |
| Browser | Chromium (primary) |
| Projects | chromium (142 unauthenticated), auth-setup (2), authenticated (39) |

---

## 3. Mandatory Tooling

### Test Frameworks

| Purpose | Tool | Version |
|---|---|---|
| Unit testing | Vitest | 4.0.x |
| E2E testing | Playwright | 1.57.x |
| Component testing | React Testing Library | As needed |
| Form validation | Zod (schema testing) | 3.25.x |

### Test Management

| Purpose | Tool |
|---|---|
| CI/CD | GitHub Actions |
| Reporting | Playwright HTML Reporter |
| Artifact storage | GitHub Actions artifacts (90 days) |

### Security Testing

| Purpose | Tool | When |
|---|---|---|
| SAST (static analysis) | Semgrep | Every commit + quarterly |
| SCA (dependency scanning) | npm audit | Every commit + quarterly |
| Dependency updates | Dependabot or manual | Continuous |

### Development Tooling

| Purpose | Tool |
|---|---|
| Git hooks | Husky (recommended) |
| Commit linting | commitlint (Conventional Commits) |
| Code linting | ESLint (Airbnb TypeScript config) |
| Code formatting | Prettier |
| TypeScript | Strict mode (5.6.x) |
| Containerization | Docker (multi-stage build) |

---

## 4. Project Structure

```
wawagardenbar-app/
├── __tests__/                    # Unit tests
│   └── api/                      # API route unit tests
├── e2e/                          # Playwright E2E tests
│   ├── *.spec.ts                 # Test specifications
│   └── (page objects as needed)
├── compliance/                   # Compliance artifacts
│   ├── RTM.md                    # Requirements Traceability Matrix
│   ├── test-plan.md              # Project test plan
│   ├── test-cases.md             # Formal test specifications
│   ├── test-summary-report.md    # Execution results
│   ├── pending-releases/         # Release tickets awaiting approval
│   ├── approved-releases/        # Approved release tickets
│   └── evidence/                 # Per-requirement evidence
│       ├── REQ-XXX/              # Per-requirement bundles
│       └── periodic/             # Periodic review evidence
│           ├── sast-quarterly/
│           ├── dependency-audit/
│           ├── access-control/
│           ├── audit-log/
│           ├── pentest/
│           ├── dr-test/
│           └── third-party/
├── playwright-report/            # Generated Playwright reports
├── test-results/                 # Generated test results
├── playwright.config.ts          # Playwright configuration
└── vitest.config.ts              # Vitest configuration
```

---

## 5. Design Patterns

### Page Object Model (Recommended for E2E)

- Page classes for reusable UI interactions
- Locators defined as class properties
- Methods for user interactions
- No assertions in page objects — assertions belong in test files

### Test Data Management

| Test Level | Data Strategy |
|---|---|
| Unit | Mocked data |
| Integration | Test database (MongoDB) |
| E2E (local) | Seeded test data (`scripts/seed-e2e-admins.ts`, `scripts/seed-test-data.ts`) |
| E2E (CI) | MongoDB service container + seed scripts |

### GDPR Compliance

- No production PII in non-production environments
- Synthetic data for all test scenarios
- Data masking when copying production data for UAT
- Automatic cleanup after execution

---

## 6. CI/CD Pipeline Standards

### GitHub Actions Workflows

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| Test on PR | `test-on-pr.yml` | PR to main, push to develop | E2E tests, TypeScript check |
| Build & Publish | `build-and-publish.yml` | Push to main/develop, tags | Docker build, GHCR publish |

### Pipeline Stages (PR to main)

| Stage | Purpose | Exit Criteria |
|---|---|---|
| TypeScript Check | Strict compilation | 0 errors |
| SAST Scan | Static security analysis | 0 high/critical findings |
| Dependency Audit | Supply chain security | 0 high/critical vulnerabilities |
| Seed Test Data | Database preparation | Seeds complete |
| E2E Tests | Functional validation | All tests pass |
| Build | Production build verification | Succeeds |

### Git Hooks Configuration

**Pre-commit:**
- ESLint on staged files
- TypeScript compilation check
- Blocks commit on failure

**Commit-msg:**
- Conventional Commits format validation
- Required format: `type(scope): description`

---

## 7. Artifact Storage

| Artifact | Storage | Retention |
|---|---|---|
| Playwright reports (HTML) | GitHub Actions artifacts | 90 days |
| Screenshots | GitHub Actions artifacts | 90 days |
| Videos | GitHub Actions artifacts | 90 days |
| SAST evidence (JSON) | `compliance/evidence/` | 3 years minimum |
| Dependency audits | `compliance/evidence/` | 3 years minimum |

### Flakiness Handling

- Retry strategy: 1 retry in CI (Playwright config), 0 locally
- Video captured on first retry for debugging
- Screenshots captured on test completion
- Flaky tests addressed immediately or disabled with documented justification

---

## 8. File Naming & Code Style

### Naming Conventions

| File Type | Pattern | Example |
|---|---|---|
| Unit tests | `*.test.ts` | `tab-support.test.ts` |
| E2E tests | `*.spec.ts` | `customer-ordering.spec.ts` |
| Page objects | `*Page.ts` (PascalCase) | `MenuPage.ts` |

### Code Style

- Descriptive test names (sentences, not code identifiers)
- Arrange-Act-Assert pattern
- Maximum 1 assertion concept per test
- No test interdependencies
- Test code maintained to same quality standards as product code

### ESLint Configuration

Extends: `eslint:recommended`, `plugin:@typescript-eslint/recommended`, Airbnb TypeScript

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## 9. Environment Configuration

### Environment Files

```
.env.local              # Local development (not committed)
.env.test               # Test environment (committed, no secrets)
.env.example            # Template for developers (committed)
.env.local.example      # Local config template (committed)
```

### Secret Management

- All secrets in Railway environment variables (production) and GitHub Actions Secrets (CI)
- No secrets committed to version control
- Separate secrets per environment (production vs UAT)
- `.env.local` in `.gitignore`

### Containerization

- Docker multi-stage build (deps → builder → prod-deps → runner)
- `docker-compose.yml` for local development
- `docker-compose.prod.yml` for production-like local testing
- `docker-compose.migration.yml` for database migrations
- Health checks via `/api/health` endpoint

---

## 10. Coverage & Quality Thresholds

| Metric | Target |
|---|---|
| Unit test coverage (critical modules) | 70% minimum |
| Integration point coverage | 80% minimum |
| Critical user path E2E coverage | 100% |
| Security scan (high/critical) | 0 findings |
| E2E pass rate | 100% (currently 183/183) |

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Engineering Team | Initial creation for Wawa Garden Bar |
| 2.0 | March 2026 | Engineering Team | Clean boundary split — removed compliance/governance content (now in Policy), removed methodology content (now in Strategy). Architecture now owns tools, patterns, code standards, CI config only. Added security tooling table. |

**Next Review Date:** March 2027

**Related Documents:** Test Policy, Test Strategy, Periodic Security Review Schedule, Test Plan

---

**Architecture Status:** Approved | **Effective Date:** March 2026
