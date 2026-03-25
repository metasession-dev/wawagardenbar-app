# Release Ticket: REQ-008

## Customer SOPs (Manual + Agentic)

**Requirement ID:** REQ-008  
**Category:** Documentation / Operations  
**Priority:** Medium  
**Status:** TESTED - PENDING SIGN-OFF  
**Date:** 2026-03-13

---

## 1. Summary

Created two new Standard Operating Procedures for customer ordering workflows and updated the operations index to register them:

- **SOP-MANUAL-CUSTOMER-001** — A step-by-step UI guide for customers covering sign-in, menu browsing, all four order types (dine-in, pickup, delivery, pay now), tab management, rewards, and profile management.
- **SOP-AGENTIC-012** — The API counterpart for AI chatbots, WhatsApp bots, and customer-facing agents, providing full REST API integration instructions with curl examples, JavaScript helpers, and end-to-end workflow examples.

## 2. Scope

**Type:** Documentation artifacts only — no code changes.

### SOP-MANUAL-CUSTOMER-001 (312 lines)

| Part | Coverage |
|------|----------|
| 1 | Getting Started (account creation, sign-in, guest access) |
| 2 | Browsing the Menu (categories, search, item details) |
| 3 | Building Your Order (adding items, customizations, portions) |
| 4 | Choosing Order Type (dine-in, pickup, delivery, pay now) |
| 5 | Dine-In Tab Management (open, add to, close) |
| 6 | Checkout and Payment (review, payment methods, confirmation) |
| 7 | Order Tracking (status updates, notifications) |
| 8 | Managing Your Profile and Rewards (profile, rewards, history) |

### SOP-AGENTIC-012 (~780 lines)

| Part | Coverage |
|------|----------|
| Settings | App settings retrieval, fee calculation helper |
| 1 | Browsing the Menu (4 sub-sections, JS helper) |
| 2 | Creating Orders (6 sub-sections, all order types + tab variants) |
| 3 | Tab Management (3 sub-sections, constraint enforcement logic) |
| 4 | Processing Payments (init + verify with polling helper) |
| 5 | Tracking Orders (details, history, status polling) |
| 6 | Rewards and Loyalty (query, validate, redeem) |
| 7 | Customer Profile Lookup (search, profile, order history) |
| Workflows | 4 complete end-to-end flow examples |
| Error Handling | Retry logic, customer-friendly messages, validation |
| Reference | 17-endpoint summary table, troubleshooting |

### README.md Updates

- Added SOP-AGENTIC-012 to agentic SOPs index table
- Added Customer Ordering row to Manual/Agentic SOP Pairs table
- Updated API Consumer role reference to "001 through 012"

## 3. Implementation Details

| Component | File | Description |
|-----------|------|-------------|
| Manual Customer SOP | `docs/operations/SOP-MANUAL-CUSTOMER-ORDERING.md` | 312-line step-by-step customer ordering guide |
| Agentic Customer SOP | `docs/operations/SOP-AGENTIC-CUSTOMER-ORDERING.md` | ~780-line API integration SOP with examples |
| Operations Index | `docs/operations/README.md` | Updated index, pairs table, role reference |

## 4. Methodology

Produced by systematic review of:
- 2 existing agentic SOPs reviewed for format (SOP-AGENTIC-001, SOP-AGENTIC-007)
- 1 existing manual SOP reviewed for format (SOP-MANUAL-WAITER-001)
- Agent Tooling Guide (`docs/api/AGENT-TOOLING-GUIDE.md`) — 17 endpoints verified
- Agent Tooling Flows (`docs/api/AGENT-TOOLING-FLOWS.md`) — workflow patterns referenced
- 4 feature specs reviewed for business rules (checkout-process.txt, tabs-and-orders-system-spec.md, tabs-orders-checkout-processing.txt, pay-now-order-type.md, rewards-system-spec.md)
- REQUIREMENTS.md — order lifecycle, status flow, tab constraints verified
- 7 customer-facing page components verified for feature accuracy

## 5. Test Results

### 5a. Documentation Validation (Static)

| Verification | Result |
|-------------|--------|
| Manual SOP structure (12 sections) | ✅ PASS |
| Agentic SOP structure (13 sections) | ✅ PASS |
| API endpoint accuracy (17/17 endpoints) | ✅ PASS |
| Request/response format accuracy | ✅ PASS |
| curl syntax validity (18 commands) | ✅ PASS |
| JavaScript helper syntax (9 functions) | ✅ PASS |
| Markdown table validity (22 tables) | ✅ PASS |
| Business rule accuracy (7 rules verified) | ✅ PASS |
| Cross-reference integrity (6 references) | ✅ PASS |
| README index consistency | ✅ PASS |

### 5b. Compilation Check

| Check | Result |
|-------|--------|
| TypeScript compilation (`tsc --noEmit`) | ✅ PASS (no source code modified) |

### Evidence Location

| Artifact | Path |
|----------|------|
| Documentation validation report | `compliance/evidence/REQ-008/validation-report.txt` |

## 6. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Documents become stale as API evolves | Low | Cross-referenced to existing agentic SOPs; update when API changes |
| API response examples may drift from reality | Low | Verified against existing SOP examples and Agent Tooling Guide |
| No runtime impact | None | Documentation-only artifacts |

**Overall Risk:** Low — documentation artifacts with no runtime impact.

## 7. Rollback Plan

Remove the two new SOP files and revert README.md changes. No code or runtime impact.

## 8. Dependencies

- **REQ-001** — SOP format and structure conventions
- **REQ-007** — Requirements coverage (order types, tab system, rewards)

---

## Compliance & UAT Sign-off

*This section must be completed by a human reviewer before merging to Production.*

| Role | Name | Date | Status | Signature/Notes |
| :--- | :--- | :--- | :--- | :--- |
| **QA Lead** | | | [ ] PASS / [ ] FAIL | |
| **Product Owner** | | | [ ] PASS / [ ] FAIL | |
| **Security Review** | | | [ ] N/A / [ ] OK | |

> **Audit Note:** This release was assisted by Windsurf Cascade (AI). Both SOPs were generated through systematic review of existing agentic SOPs, the Agent Tooling Guide, feature specifications, and customer-facing page components. All API endpoints, request/response formats, and business rules were verified against source documentation. AI-generated content has been linked to the Requirement Traceability Matrix (RTM).

---

## Audit Trail

| Date | Action | Actor | Notes |
|------|--------|-------|-------|
| 2026-03-13 | Requirement created | AI (Cascade) | Customer SOP documentation request |
| 2026-03-13 | SOP-MANUAL-CUSTOMER-001 created | AI (Cascade) | 312-line manual customer ordering guide |
| 2026-03-13 | SOP-AGENTIC-012 created | AI (Cascade) | ~780-line agentic customer ordering SOP |
| 2026-03-13 | README.md updated | AI (Cascade) | Index, pairs table, role reference |
| 2026-03-13 | Compliance artifacts generated | AI (Cascade) | RTM, evidence, release ticket |
