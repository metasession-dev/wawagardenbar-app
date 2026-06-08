# REQ-076 — AI use note

## What the AI did

- Read issue [#332](https://github.com/metasession-dev/wawagardenbar-app/issues/332) and proposed a 5-spec E2E strategy in the issue body before any coding.
- Asked 2 high-stakes decisions up-front via `AskUserQuestion` (report shape + payment/tip handling).
- Implemented across 7 phases: plan → RBAC → service+action → page UI → exports → admin editor → E2E delegated to skill.
- **Invoked the `e2e-test-engineer` skill** for E2E test work via `Skill(name: "e2e-test-engineer", ...)` per `feedback_invoke_e2e_test_engineer` memory + DevAudit-Installer #132 upstream issue. First REQ in this project to honour the contract correctly after two prior violations.
- Authored 6-doc evidence pack + release ticket + implementation plan + SRS REQ-MENUMGT-006 + RTM IN PROGRESS row.
- Validated math via 26 new unit tests; tsc clean; full vitest 1181/4/0.

## Honest framing of limitations

**UI E2E specs pending UAT deploy.** All 4 UI specs depend on the new `/dashboard/reports/by-main-category` route existing on Railway UAT. The route exists only on the local `feat/REQ-076-…` branch. They run only after the PR merges to develop + auto-deploys. Until then the contract is pinned by 26 unit cases.

**Spec 2 (numbers tie-out) dropped due to dynamic-import limitation.** `system-settings-service.ts:421` uses `await import('@/interfaces/main-category.interface')` inside the method body. Playwright's runner doesn't transpile this. Same limitation REQ-070 documented. Production code (Next.js) is unaffected. Math contract pinned by 8 unit-test cases; end-to-end correctness exercised by Spec 1's UI flow.

**Direct API call for `food`** (Spec 4 AC5) pinned via negative dropdown assertion, not direct action invocation. Next.js server actions use a special RSC payload format that's fragile to replicate via raw HTTP. The unit test pins the resolution-table contract directly; the E2E spec verifies the runtime gate via the user-visible UI surface.

**Charts tab deferred to V2.** The aggregate Daily Report has a Charts tab; the per-main page V1 ships tables-only. Charts can land in a follow-up REQ if operator-requested.

**Per-main payment + tip breakdowns NOT included.** Operator-chosen at plan time. Order-level data doesn't cleanly attribute to a single main when an order spans categories. Documented in the page's honesty footer + the test-plan + this note.

**Multi-main order-count caveat.** An order containing food + drinks counts toward BOTH per-main reports' order counts. Sums don't tie out to the aggregate Daily Report's order count by design. Documented in the page's honesty footer + the test-plan.

## What the operator validated

- The 2 plan-time AskUserQuestion choices (Option A page shape + omit payments/tips).
- Will validate at PR review + during the 3-step manual UAT walkthrough (test-scope.md "Manual UAT" section).
- Will confirm at portal UAT review before approving the release PR to main.

## Reproducibility

Unit tests:

```bash
npx vitest run __tests__/lib/permissions.main-category-access.test.ts
npx vitest run __tests__/services/financial-report-service.main-category.test.ts
npx vitest run __tests__/lib/report-export.main-category.test.ts
```

Full vitest:

```bash
npx vitest run
```

Focused E2E against UAT (after UAT auto-deploys this branch):

```bash
BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  MONGODB_URI=$MONGODB_UAT_EXTERNAL_URI \
  MONGODB_DB_NAME=wawagardenbar_uat \
  npx playwright test e2e/admin/by-main-category-report.spec.ts \
                     e2e/admin/by-main-category-report-export.spec.ts \
                     e2e/admin/main-category-report-access-control.spec.ts \
                     e2e/admin/main-category-report-permissions-ui.spec.ts \
                     --project=regression --reporter=list
```

Manual UAT walkthrough — 3 steps in `test-scope.md` under "Manual UAT — required this cycle":

1. Visual styling sanity (5 min)
2. Export readability — open downloaded PDF/Excel/CSV in real apps (5 min)
3. RBAC live walkthrough — flip a permission, login as that admin (5 min)

## Carryover learnings (saved to memory before this cycle)

- `feedback_invoke_e2e_test_engineer` — added before this cycle started; honoured during E2E phase.
- `feedback_pr_title_req_brackets` — `[REQ-076]` brackets in every commit + the PR title.
- `feedback_phase3_release_ticket_mandatory` — release ticket + 6-doc evidence on develop BEFORE the `develop → main` release PR opens.

Per `feedback_no_prod_db_touches`: no production DB writes required. UAT is sufficient for both E2E and the 3-step walkthrough.
