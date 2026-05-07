# AI Prompt Log — REQ-035

**Requirement:** REQ-035 — Tip recording at express checkout + tips breakdown in Daily Financial Report
**Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**Risk Level:** HIGH (2 reviewers + AI-prompts artefact required)
**AI tool:** Claude Code with Opus 4.7 (1M-context)
**Date:** 2026-05-07

---

## Session structure

The work was carried out in two phases of a single Claude Code session:

1. **Plan-mode requirements gathering.** The user described the feature in natural language. The assistant ran two parallel `Explore` sub-agents to map the express + close-tab payment flow and the Daily Financial Report's `paymentBreakdown` shape. Two design questions surfaced:
   - Tip method coupling: same as bill payment method, or independently selectable?
   - Tab tips: one tip per partial-payment row, or one tip per tab?
     The user answered both via `AskUserQuestion`: tip method **independent** of bill method; **one tip per partial-payment row**.
2. **Implementation.** Approved implementation plan executed in the order specified in `implementation-plan.md`. TDD discipline: tests authored before each piece of production code.

---

## Key prompts (verbatim from the user)

> "we need to be able to record tips as part of the payment process for express and quick actions. in the Daily Financial Report below revenue by method there needs to be section for tips recieved and how the tip was received i.e. as cash/POS/Transfer"

> "approved" — explicit go-ahead after the implementation plan was filed.

The user's other inputs during this REQ were short course corrections (e.g. asking the assistant to file the GitHub issue first, asking for the SDLC scaffold, confirming the design choices via `AskUserQuestion`). No prompt-injection content; no automated agent-to-agent loops.

---

## AI-generated artefacts

Every file in this PR's diff was AI-generated and human-reviewed. The new files:

- `interfaces/payment-method.interface.ts` — first-class enum exports (extracted from inline string literals).
- `lib/tip-aggregation.ts` — pure helpers + types.
- `__tests__/lib/tip-aggregation.test.ts` (12 tests) — TDD-first.
- `__tests__/services/order-service.tip.test.ts` (5 tests).
- `__tests__/services/tab-service.tip.test.ts` (5 tests).
- `__tests__/services/financial-report-service.tip.test.ts` (4 tests, including AC6 regression).
- `components/features/orders/tip-input-row.tsx` — reusable input.
- `components/features/reports/tips-section.tsx` — Daily Report card grid.
- `scripts/backfill-tip-payment-method.ts` — idempotent backfill.
- `e2e/orders/express-tip-capture.spec.ts`, `e2e/orders/close-tab-tip-capture.spec.ts`.

All SDLC artefacts (`test-scope.md`, `test-plan.md`, `implementation-plan.md`, this file, `security-summary.md`, `test-execution-summary.md`, `uat-checklist.md`, `ai-use-note.md`, the release ticket).

Modified files: `models/order-model.ts`, `models/tab-model.ts`, `interfaces/order.interface.ts`, `interfaces/tab.interface.ts`, `services/order-service.ts`, `services/tab-service.ts`, `services/financial-report-service.ts`, `app/actions/admin/express-actions.ts`, `app/actions/tabs/tab-actions.ts`, `app/dashboard/orders/express/create-order/page.tsx`, `app/dashboard/reports/daily/daily-report-client.tsx`, `components/features/admin/tabs/admin-pay-tab-dialog.tsx`, `lib/report-export.ts`, `compliance/RTM.md`, `package.json`, `package-lock.json`.

---

## Areas requiring extra human-reviewer scrutiny

Per HIGH-risk policy, two human reviewers are required. The following decisions are **judgement calls** that warrant explicit reviewer review beyond the line-by-line diff:

1. **Closing-payment-as-partial-payment-row in `completeTabPaymentManually`.** REQ-035 changes a tab that's closed in one shot from "no `partialPayments[]` rows, only tab-level fields" to "one closing partial-payment row + tab-level fields". The math in the daily-report's double-count guard (REQ-013) was analysed and confirmed to produce the same net `paymentBreakdown.total`, but reviewers should confirm no other consumer (admin UI, refund logic, audit query) depends on `partialPayments` being empty for one-shot tabs.

2. **Tab orders skip Order.tipAmount aggregation.** In `services/financial-report-service.ts`, the daily-summary order loop only attributes `Order.tipAmount` to `tipsBreakdown` for non-tab orders (`!order.tabId`). Tab orders' tips are sourced from the tab's partial-payment subdocs only. This avoids a double-count when REQ-035-era code persists tips on the closing partial AND any other code path persists them on the order. Reviewers should confirm no current code path persists tab order tips both ways.

3. **Independent tip method UI affordance.** The Express create-order modal's `<TipInputRow>` lets staff override the tip method to differ from the bill method. The user explicitly chose this design (vs. coupling to `paymentMethod`). Reviewers should validate the UX copy ("Tip recorded as X regardless of bill payment method.") matches the operational reality the user intends.

4. **Mongoose 8.23.1 bump.** The `^8.7.0` semver range already permits 8.23.x, so this is technically a non-breaking patch+minor bump within REQ-035. Reviewers should still confirm by running the full vitest + playwright suite locally on their branch checkout.

---

## What the AI did NOT do

- Did not bypass any pre-commit hook or git verification.
- Did not write or modify CI workflow YAML.
- Did not auto-merge any PR.
- Did not run any production-touching command without explicit user confirmation (no production backfill executed during REQ-035 implementation; that step is documented in the release ticket as a post-deploy human action).
