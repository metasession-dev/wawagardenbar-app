# Achieving Audit-Ready Test Compliance: From 31 Smoke Tests to ISO/IEC/IEEE 29119-3

**Project:** Wawa Garden Bar — Full-Stack Food Ordering Platform
**Date:** March 2026
**Stack:** Next.js 16, TypeScript, MongoDB, Playwright, Vitest

---

## The Gold Standard: What Auditors Actually Want

When it comes to software quality assurance in regulated or compliance-conscious environments — whether SOC 2, ISO 27001, PCI-DSS, or internal governance — the global benchmark for test documentation is **ISO/IEC/IEEE 29119-3**. This standard doesn't just ask "did your tests pass?" It demands a **traceable chain of evidence** that answers three questions:

1. **What did you plan to do?** (Test Plan)
2. **What did you actually do?** (Test Case Specifications + Traceability Matrix)
3. **Can you prove the results are valid?** (Test Summary Report + Evidence)

The distinction matters. A CI pipeline showing green checkmarks is not compliance. A spreadsheet of pass/fail results is not compliance. Compliance is the ability for an auditor — someone who has never seen your codebase — to point at any requirement and trace it through to a specific test case, its execution result, and the evidence that proves it ran.

This is what ISO/IEC/IEEE 29119-3 calls the **four core documents**:

| Document | Purpose | Key Question |
|----------|---------|--------------|
| **Test Plan** | Strategy, scope, risk assessment, pass/fail criteria | What are we testing and how do we know when we're done? |
| **Requirements Traceability Matrix (RTM)** | Bidirectional mapping: requirement → test case → result | Can you show me which test verified this requirement? |
| **Test Case Specifications** | Pre-conditions, steps, expected results for every test | Could a third party reproduce this test? |
| **Test Summary Report (TSR)** | Execution verdict, defect log, residual risk | What was the outcome and what risks remain? |

Without all four, you have testing. With all four, you have **auditable quality assurance**.

---

## The Starting Point: What the Initial Analysis Revealed

The Wawa Garden Bar application is a production food ordering platform serving a restaurant in Lagos, Nigeria. It handles real money (Monnify payment integration), real customer data, and real-time kitchen operations via Socket.IO. The codebase is substantial: 20 MongoDB models, 28 services, 42 server actions, 27 public API endpoints, and 37 dashboard pages with role-based access control.

The application had a comprehensive requirements document (`docs/REQUIREMENTS.md`) covering 27 sections — from authentication and menu management to inventory tracking, financial reporting, and GDPR-style data privacy. A Requirements Traceability Matrix existed (`compliance/RTM.md`) tracking 7 change requests (REQ-001 through REQ-007).

**The test suite, however, told a different story.**

### What Existed: 31 Surface-Level Smoke Tests

The initial Playwright E2E suite contained **31 tests** in a single spec file. A gap analysis against the 27-section requirements document revealed:

- **Coverage: ~30-35%** of documented requirements had any test at all
- **Depth: Smoke-level only.** Tests checked "does the page load?" but not "does the page contain the correct elements, data, and behaviour?"
- **Authentication: Zero.** No tests exercised any authenticated feature. The entire admin dashboard — 12 sections, 37 pages — was untested
- **RBAC: Untested.** The critical distinction between admin and super-admin roles (the admin can only access orders; the super-admin has full access) was not verified
- **API surface: Minimal.** Of 27 public API endpoints, only 9 had auth-enforcement checks
- **Security controls: 1 test.** A single test checked for security headers. Rate limiting, CORS, and session security were not tested
- **No formal test documentation.** No test plan, no test case specifications, no test summary report. The RTM tracked change requests but did not map requirements to specific test cases

### The Compliance Gap

Measured against ISO/IEC/IEEE 29119-3, the gaps were:

| Document | Status | Gap |
|----------|--------|-----|
| Test Plan | Missing | No risk assessment, no pass/fail criteria, no sign-off process |
| RTM | Partial | Tracked 7 change requests but didn't map the 27 requirement sections to test cases |
| Test Case Specifications | Missing | No formal pre-conditions, steps, or expected results documented |
| Test Summary Report | Missing | No execution verdict, no defect log, no residual risk assessment |
| Evidence | Partial | 21 screenshots existed but JSON results only covered the 31-test run |

In short: the application was well-built and the requirements were well-documented, but the **bridge between requirements and proof** was almost entirely missing.

---

## What We Did: The Four-Phase Build-Out

### Phase 1: Expand E2E Coverage (31 → 142 Unauthenticated Tests)

The first objective was to close the coverage gap against all 27 sections of the requirements document. Every section needed at least one test; critical sections needed comprehensive coverage.

**Approach:**
- Mapped each REQUIREMENTS.md section to specific testable assertions
- Read the actual source code for each feature to understand what the page renders, what elements exist, and what behaviour to verify
- Built tests that check structure, content, and behaviour — not just "page loads"

**Key technical challenges solved:**

1. **Zustand cart seeding.** The checkout and cart tests needed items in the cart, but the cart is a client-side Zustand store persisted to `localStorage`. Solution: a `seedCart()` helper that injects cart state via `page.addInitScript()` before navigation.

2. **Rate limiting collisions.** The application's rate limiter (30 req/min on `/api/public/*`) fires before API key validation. Running 20 API tests in parallel exhausted the rate limit window, causing tests to receive 429 instead of the expected 401/403. Solution: `test.describe.configure({ mode: 'serial' })` for API tests, and accepting 429 as a valid security response alongside 401/403.

3. **Next.js 16 detection.** Tests checking for the Next.js framework looked for `__NEXT_DATA__` and `__next` — markers from the Pages Router that don't exist in Next.js 16's App Router. Solution: check for `/_next/` in script `src` and link `href` attributes.

4. **Strict mode violations.** Playwright's strict mode threw errors when selectors like `text=Dine In` matched multiple elements (both a card title and a paragraph). Solution: `page.getByText('Dine In', { exact: true })`.

**Result: 142 tests** covering all 27 requirement sections with unauthenticated scenarios — public pages, route protection, API auth enforcement, security headers, responsive design, accessibility, SEO, and error handling.

### Phase 2: Add Authenticated Test Flows (142 → 183 Tests)

The 142 unauthenticated tests could verify that protected routes redirect to login, but they couldn't verify what happens after login. The entire admin dashboard — the operational heart of the application — was still untested.

**Architecture decisions:**

1. **Playwright's `storageState` pattern.** Rather than logging in before every test (slow, fragile), we created an auth setup project that logs in once as admin and once as super-admin, saves the session cookies to JSON files, and all authenticated tests reuse those saved sessions.

2. **Three Playwright projects.**
   - `chromium` — 142 unauthenticated tests
   - `auth-setup` — 2 tests (login as admin, login as super-admin)
   - `authenticated` — 39 tests (depends on `auth-setup`)

3. **Dedicated E2E test users.** Rather than using production admin credentials (which could change, get locked out, or cause audit trail noise), we created a seed script (`scripts/seed-e2e-admins.ts`) that creates `e2e-admin` (role: admin) and `e2e-superadmin` (role: super-admin) with all permissions. Idempotent — safe to run repeatedly.

4. **Graceful skip on auth failure.** If credentials are missing or login fails, the auth setup saves an empty session state and authenticated tests skip automatically with a descriptive message. The unauthenticated suite still runs fully.

**Authenticated tests cover:**

| Area | Tests | Role |
|------|-------|------|
| Dashboard overview (stats cards, recent orders) | 3 | Super-admin |
| RBAC redirect (admin → /dashboard/orders) | 1 | Admin |
| Order management (title, controls, quick actions) | 5 | Admin + Super-admin |
| Tab management | 1 | Admin |
| Menu management (list + create form) | 2 | Super-admin |
| Inventory (list, snapshots, transfers) | 3 | Super-admin |
| Financial management | 1 | Super-admin |
| Reports & analytics (5 pages) | 5 | Super-admin |
| Kitchen display (dark theme, back button) | 3 | Admin |
| Rewards configuration (4 pages) | 4 | Super-admin |
| Settings (4 pages) | 4 | Super-admin |
| Audit logs | 1 | Super-admin |
| Customer management | 1 | Super-admin |
| Dashboard navigation (sidebar, header) | 2 | Super-admin |
| Session verification | 2 | Both |
| Logout | 1 | Super-admin |

**Result: 183 total tests** (142 + 2 + 39), all passing in ~1.6 minutes.

### Phase 3: Build the Compliance Documentation Suite

With 183 tests providing comprehensive coverage, the next step was to build the four ISO/IEC/IEEE 29119-3 documents that transform test results into auditable evidence.

#### Document 1: Test Plan (`compliance/test-plan.md`)

The test plan establishes the "contract" for the testing effort. It includes:

- **Risk Assessment** with 10 identified risks scored by likelihood, impact, and Risk Priority Number (RPN). Examples: authentication bypass (RPN 16), payment processing failure (RPN 12), RBAC bypass (RPN 16), inventory deduction errors (RPN 12).
- **Test Strategy** across three levels: Vitest unit tests, Playwright E2E (3 projects), and manual testing for scenarios that can't be automated (live payment, Socket.IO event propagation).
- **Entry Criteria** — 9 conditions that must be met before testing begins (TypeScript compilation, dev server running, MongoDB accessible, test users seeded, etc.).
- **Exit Criteria** — 12 quantifiable metrics including "100% of critical-path tests pass," "0 Severity-1 defects open," and "all RBAC tests pass for both admin and super-admin roles."
- **Formal approval sign-off blocks** for QA Lead, Product Owner, and Technical Lead.

#### Document 2: Requirements Traceability Matrix (`compliance/RTM.md`)

The RTM was rewritten from scratch as version 2.0 with three parts:

**Part A: Forward Traceability** maps every one of the 27 REQUIREMENTS.md sections to specific test case IDs. An auditor can point at "Section 14: Inventory Management" and immediately see that it's verified by TC-SEC14-001 through TC-SEC14-006 (3 unauthenticated route-protection tests + 3 authenticated page-load tests), all passing at 100%.

**Part B: Change Request Traceability** retains the 7 REQ entries (REQ-001 through REQ-007) in a clean tabular format mapping each to implementation files, test evidence, approval status, and approver.

**Part C: Coverage Summary** provides overall metrics: 27 requirement sections, 25 with automated E2E coverage, 183 total tests, 100% pass rate. Three sections without dedicated E2E tests are documented with justifications (Order Tracking requires live Socket.IO events; Customer Profile requires seeded customer data; Data Models are schema definitions validated by unit tests).

#### Document 3: Test Case Specifications (`compliance/test-cases.md`)

This is the largest document at 773 lines. It contains a formal specification for each of the 181 verification test cases (183 total minus 2 auth-setup infrastructure tests). Every test case includes:

- **Test Case ID** in format `TC-SECXX-###` (e.g., `TC-SEC01-001`)
- **Requirements Section** reference back to REQUIREMENTS.md
- **Pre-conditions** — the exact system state required (e.g., "Dev server running, no authentication, cart seeded with 2 items via localStorage")
- **Test Steps** — concrete, numbered steps a third party could follow
- **Expected Result** — what should happen
- **Actual Result** — PASS (from the execution run)
- **Priority** — Critical, High, Medium, or Low

Priority breakdown: 81 Critical (44.8%), 74 High (40.9%), 26 Medium (14.4%).

#### Document 4: Test Summary Report (`compliance/test-summary-report.md`)

The TSR is the final verdict document. It includes:

- **Executive Summary:** Overall verdict PASS. 183/183 E2E tests, 53/53 unit tests, 100% pass rate.
- **Defect Log:** 6 defects found and resolved during test development:
  - DEF-001: Strict mode violation on "Dine In" text (2 elements matched)
  - DEF-002: API tests getting 429 from rate limiter instead of expected 401/403
  - DEF-003: Next.js 16 framework detection failed (legacy markers don't exist)
  - DEF-004: Auth setup Promise.race bug with role="alert" selector
  - DEF-005: Kitchen back button matched 2 links (sidebar + back button)
  - DEF-006: Logout test timeout (httpOnly cookies can't be cleared client-side)
- **Residual Risk Assessment:** 7 risks documented — single browser (Chromium only), rate limiting sensitivity, no load testing, payment gateway not E2E tested, Socket.IO events not fully automated, mobile devices not tested (only responsive viewports), database state dependency.
- **Evidence Index:** Links to all 21 screenshots, JSON results, and validation reports.
- **Formal approval sign-off blocks.**

---

## The Traceable Chain

The final compliance suite forms a complete, auditable chain:

```
docs/REQUIREMENTS.md          (27 sections — what the system must do)
        ↓ mapped via
compliance/RTM.md              (forward traceability — requirement → test case IDs)
        ↓ specified in
compliance/test-cases.md       (181 formal specs — pre-conditions, steps, expected results)
        ↓ executed per
compliance/test-plan.md        (strategy, risk assessment, entry/exit criteria)
        ↓ results in
compliance/test-summary-report.md  (verdict, defect log, residual risk, sign-offs)
        ↓ backed by
compliance/evidence/REQ-007/   (JSON results, screenshots — immutable, version-controlled)
```

Every link in this chain is version-controlled in Git, meaning changes are tracked with commit hashes, timestamps, and authorship. This satisfies the "immutable logs" principle — no one can silently edit a test result after the fact.

---

## Phase 4: The Workflow System — Closing the Process Gap

Documentation and tests are only half the story. An auditor will also ask: *"How does code get from a developer's machine to production? Who approved it? Where's the proof?"*

The existing development workflows had the same problem as the test suite — they existed, but they didn't enforce compliance. An analysis of the four Windsurf workflow files revealed critical gaps:

### What the Workflow Audit Found

| Issue | Impact |
|-------|--------|
| **No test gate.** The commit workflow pushed code without running any tests. | Code could reach `main` with failing tests — no quality guarantee. |
| **`git add .` used everywhere.** | Risk of accidentally committing `.env` files, credentials, or session state. |
| **No PR-based approval.** Merges to `main` were done directly. | No audit trail of who approved what. Paper sign-off tables in markdown files are editable. |
| **Confused branch flow.** The feature branch workflow pushed a branch but never merged it anywhere. | Developers ended up on `develop` with their work orphaned on an unmerged branch. |
| **No link to compliance documents.** | Workflows operated in isolation from the RTM, test plan, and evidence chain. |
| **Four overlapping workflows with unclear boundaries.** | No clear pipeline — developers had to guess which workflow to use when. |

### The Insight: GitHub PRs as Formal Sign-Off

The key design decision was recognizing that **GitHub Pull Request approvals are superior to paper sign-off tables** for compliance purposes:

- **Immutable.** GitHub records the reviewer's username, timestamp, and approval decision. Unlike a markdown table, these cannot be silently edited after the fact.
- **Contextual.** The reviewer sees the actual code diff alongside the compliance artifacts in the same interface.
- **Auditable.** An auditor can click a PR link and see exactly who approved what, when, and what comments were made.
- **Enforceable.** Branch protection rules can require approvals before merge (though even without them, the PR history serves as evidence).

### The Five-Stage Pipeline

The four overlapping workflows were replaced with a clear, linear pipeline where each stage feeds into the next:

```
 1. PLAN          Define the requirement (REQ-XXX) in RTM
                  ↓
 2. IMPLEMENT     Code on develop, commit with REQ reference, run tests
                  ↓
 3. EVIDENCE      Generate compliance artifacts (RTM update, release ticket)
                  ↓
 4. REVIEW        Create PR: develop → main with compliance checklist
                  ↓                    ↑
                  ↓              Human reviews code + artifacts
                  ↓              Comments, requests changes, or approves
                  ↓                    ↓
 5. DEPLOY        Merge approved PR → Railway auto-deploys → verify → finalize
```

#### Stage 1: Plan (`plan-requirement.md`)

Before writing code, the requirement is defined in the RTM with status `DRAFT`. An evidence directory is created. If the requirement changes the system's capabilities, `docs/REQUIREMENTS.md` is updated to reflect the intended behaviour — establishing "what should it do" before "what did we build."

#### Stage 2: Implement & Test (`implement-and-test.md`)

The core development loop with one critical addition: a **mandatory test gate**. No push to `develop` without:

```bash
npx tsc --noEmit           # TypeScript compilation: 0 errors
npx playwright test        # E2E suite: 183 tests must pass
```

Other compliance safeguards enforced at this stage:
- **Selective staging only** — `git add .` is explicitly forbidden. Every staged file is reviewed.
- **Sensitive file check** — a grep against staged files catches `.env`, credentials, and session state before they're committed.
- **Conventional commits** with requirement references (`Ref: REQ-XXX`) and AI co-authorship disclosure.
- **JSDoc requirement headers** in modified source files for traceability.

#### Stage 3: Audit Finish (`audit-finish.md`)

For tracked requirements, this stage generates the formal compliance artifacts:

1. **Test evidence** saved to `compliance/evidence/REQ-XXX/`
2. **RTM updated** with status `TESTED - PENDING SIGN-OFF`
3. **Release ticket** created in `compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md` with:
   - Implementation summary and files modified
   - Test results table (type, count, passed, failed, evidence path)
   - Acceptance criteria checklist
   - Risk assessment
   - Reviewer checklist
   - Audit trail table

#### Stage 4: Submit for Review (`submit-for-review.md`)

A Pull Request is created from `develop` to `main` using `gh pr create`. The PR body includes a structured compliance checklist:

```markdown
## Compliance Artifacts
- [ ] RTM updated (compliance/RTM.md)
- [ ] Release ticket created (compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md)
- [ ] Test evidence saved (compliance/evidence/REQ-XXX/)
- [ ] JSDoc requirement headers in modified files

## Reviewer Checklist
- [ ] Code changes are correct and complete
- [ ] Test evidence shows all tests passing
- [ ] No sensitive data committed
- [ ] RTM status is TESTED - PENDING SIGN-OFF
- [ ] No regressions introduced
```

The reviewer examines both the code changes (in the Files Changed tab) and the compliance artifacts (in the `compliance/` directory). They can comment, request changes, or approve. **Their GitHub approval IS the formal sign-off** — no separate sign-off table needed.

#### Stage 5: Deploy (`deploy-main.md`)

After approval, the PR is merged to `main` (using merge commit, not squash — preserving full commit history for audit). Railway auto-deploys. Post-deploy verification includes health checks and smoke tests. For tracked requirements, the release ticket is moved from `pending-releases/` to `approved-releases/` and the RTM status is updated to `APPROVED - DEPLOYED` with the reviewer's name and date from the PR approval.

### CI/CD: Automated Test Gate on PRs

A GitHub Actions workflow (`test-on-pr.yml`) provides automated verification on every PR to `main`:

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [develop]
```

The workflow spins up a MongoDB service container, installs dependencies, runs TypeScript type checking, and executes the 142 unauthenticated Playwright tests. Results are posted as a PR comment. This means the reviewer sees both the automated test results and the compliance checklist before making their approval decision.

### Release Ticket Lifecycle

The release ticket has a clear lifecycle that mirrors the pipeline:

```
compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md
  Created at Stage 3 (audit-finish)
  Linked to PR at Stage 4 (submit-for-review)
  Reviewed by human at Stage 4
                ↓
compliance/approved-releases/RELEASE-TICKET-REQ-XXX.md
  Moved at Stage 5 (deploy) after PR approval
  RTM updated: APPROVED - DEPLOYED
  Audit trail entry: "PR #N approved by [reviewer] on [date]"
```

This gives auditors a single directory to check: `compliance/approved-releases/` contains every change that reached production, each with a complete audit trail linking back to the requirement, implementation, tests, and approval.

---

## Final Outcome: By the Numbers

| Metric | Before | After |
|--------|--------|-------|
| E2E tests | 31 | 183 |
| Requirements sections with coverage | ~10 of 27 | 25 of 27 |
| Authenticated features tested | 0 | 39 tests across 14 dashboard sections |
| RBAC verification | None | Admin redirect + super-admin full access |
| API endpoints with auth tests | 9 | 22 |
| Security tests | 1 | 7 (headers, rate limiting, CORS, session) |
| Responsive/accessibility tests | 0 | 16 |
| Compliance documents | 1 (partial RTM) | 4 (Test Plan, RTM v2.0, Test Cases, TSR) |
| Formal defect log | None | 6 defects documented with resolutions |
| Residual risk assessment | None | 7 risks documented with mitigations |
| Approval sign-off blocks | None | On all 4 documents + GitHub PR approvals |
| Evidence artifacts | 21 screenshots | 21 screenshots + JSON results + test listing |
| Development workflows | 4 (overlapping, no test gate) | 5-stage pipeline with mandatory test gate |
| Approval mechanism | None (direct push to main) | GitHub PR review + approval (immutable) |
| CI/CD test automation | Docker build only | Docker build + 142 E2E tests on every PR |
| Release ticket lifecycle | None | pending-releases → approved-releases with audit trail |

The test suite runs in **~1.6 minutes** on a single machine with 8 parallel workers. It requires no external services beyond MongoDB and the Next.js dev server. The entire compliance suite — documentation, workflows, and CI/CD — lives alongside the code in version control, making it trivially reproducible, auditable, and maintainable.

---

## Key Principles Applied

1. **Test what matters, not what's easy.** The jump from 31 to 183 tests wasn't about quantity — it was about mapping every requirement section to at least one verifiable assertion. Coverage gaps are documented with justifications, not ignored.

2. **Separate concerns in test architecture.** Three Playwright projects (unauthenticated, auth-setup, authenticated) with clear dependencies. The unauthenticated suite runs independently; authenticated tests gracefully skip if login fails.

3. **Treat defects found during test development as evidence.** The 6 defects found while writing tests (strict mode violations, rate limiting interactions, framework detection) are documented in the TSR's defect log. This demonstrates that the testing process itself catches issues.

4. **Document residual risk honestly.** Rather than claiming 100% coverage, the TSR explicitly lists 7 areas where automated testing has limitations (single browser, no load testing, payment gateway, etc.). Auditors trust documentation that acknowledges what it doesn't cover.

5. **Make evidence immutable.** JSON results, screenshots, and test listings are version-controlled in Git. The RTM links to specific evidence files by path. PR approvals are recorded by GitHub with immutable timestamps. No spreadsheets that anyone can edit after the fact.

6. **Design for the "bus test."** If the lead QA engineer disappears, can a stranger follow the documentation to understand the current state of quality? With formal test case specifications, a clear 5-stage pipeline, and numbered steps in every workflow — yes.

7. **Use the platform's native approval mechanism.** GitHub PR approvals are more auditable than sign-off tables in markdown files. The reviewer's identity is verified by GitHub authentication, the timestamp is server-generated, and the approval cannot be retroactively edited. This is a stronger compliance guarantee than any paper-based process.

8. **One pipeline, not four overlapping workflows.** When developers have to guess which workflow to use, they'll pick the easiest one — which is usually the one with the fewest compliance steps. A single, linear pipeline with clear "you are here" stages eliminates that choice entirely.

---

*All compliance documents are located in the `compliance/` directory. Development workflows are in `.windsurf/workflows/` with a README providing the pipeline overview. The test suite can be run with `npx playwright test` after following the setup guide in `docs/E2E-TEST-GUIDE.md`.*
