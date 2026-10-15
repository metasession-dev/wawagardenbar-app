---
req: REQ-109
generated_by: e2e-test-engineer
generated_at: 2026-09-30T02:00:00Z
e2e_required: true
spec_path: e2e/critical/csr-order-tab-parity-req109.spec.ts
---

# E2E scope decision — REQ-109

## Outcome

**E2E required — covered.** This REQ changes a UI surface (`app/dashboard/orders/page.tsx`) and RBAC behaviour reachable only through the browser (staff dashboard, Express flow, tab/order detail pages) — a full E2E pass was necessary and was run locally against a disposable MongoDB + dev server.

## Detail

- **`e2e_required`:** `true`.
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/authenticated.spec.ts` (updated), `e2e/critical/csr-order-tab-parity-req109.spec.ts` (new), `e2e/critical/daily-report-payments.spec.ts` (updated — unrelated UI-dependency fix surfaced during verification, not new AC coverage).
- **ACs covered:** AC1–AC7 via the specs above. AC8 verified by inspection (no code touched `/menu`/`/checkout`).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
