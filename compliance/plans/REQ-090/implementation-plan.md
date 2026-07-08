---
title: "Implementation plan — REQ-090"
requirement_id: "REQ-090"
risk_class: "LOW"
change_type: "fix"
authored_by: "Claude"
authored_at: "2026-07-08"
---

# Implementation plan — REQ-090

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

| Clause | Status |
| --- | --- |
| ISO 29119 §3.4 Test Plan | AC table + test-plan below |
| ISO 27001 A.8.25 Secure development life cycle | No new auth/data surface — bug fix only |
| GDPR Art. 25 Data protection by design | N/A — no personal-data change |
| EU AI Act Art. 11 Technical documentation | N/A — no AI/model change |

## 1. Goal + acceptance criteria

- **Goal:** Fix E2E critical-tier regression blockers discovered on `develop` (PR #462) so the release PR can pass CI.

| AC | Description | SRS item |
| --- | --- | --- |
| AC1 | `getOrdersAction` serialises orders that lack an `updatedAt` field without throwing `TypeError: Cannot read properties of undefined (reading 'toISOString')`. | `@srs-deferred: internal serialization hardening` |
| AC2 | `/dashboard/orders` renders the "Create Tab" card without a React hydration mismatch between server and client. | `@srs-deferred: hydration compatibility` |

## 2. Scope

- **In scope:**
  - `app/actions/admin/order-management-actions.ts` — harden date serialization.
  - `components/features/admin/tabs/create-tab-dialog.tsx` — review trigger element to avoid nested interactive/hydration mismatch.
  - `app/dashboard/orders/page.tsx` — review how `CreateTabDialog` is composed inside the grid/Link.
- **Out of scope:** Any new behaviour or UI changes beyond making existing behaviour stable under E2E.

### Surface inventory

| Surface | URL / file | Status |
| --- | --- | --- |
| Admin orders list | `/dashboard/orders` | In scope — hydration fix |
| Admin order data fetch | `app/actions/admin/order-management-actions.ts` | In scope — null-safe date |

## 3. Architecture decisions

- **No ADR needed** — internal bug fix; no new dependencies, external services, or structural patterns.

## 4. Threat model + security considerations

No new threat surface. Changes are defensive (null-safe date access) and presentation-layer (hydration stability).

### Risk register entries

- @risk-deferred: LOW-risk bug fix with no register-worthy risk.

## 5. Data protection (GDPR Art. 25)

N/A — this REQ does not process personal data beyond what the existing order-management action already handles.

## 6. AI / model considerations (EU AI Act Art. 11)

N/A — this REQ does not introduce or change AI behaviour.

## 7. Rollback plan

- **Reversible via:** git revert.
- **Data implications:** None — only hardens field access.
- **Notification path:** Standard CI failure channel.

## 8. Verification

- **Unit + integration tests:** Existing tests should continue to pass; no new tests added because fix is covered by existing E2E critical suite.
- **E2E coverage:** Critical-tier suite (`npx playwright test --project=critical`) must pass locally before push.
- **Manual smoke after deploy:** Open `/dashboard/orders` as admin and verify no console hydration errors.

## 9. Sign-off

- **Plan reviewer (eng):** REPLACE
- **Plan reviewer (security / DPO):** N/A
- **Plan approved by operator:** REPLACE

## Upload path

This file lives at `compliance/plans/REQ-090/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
