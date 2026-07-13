# REQ-091 AI Use Note

## Requirement

Stabilize the REQ-084 AC12 E2E smoke test against nondeterministic menu seed data.

## AI Involvement

- **Tool:** Cascade (AI coding assistant)
- **Role:** Triage, root-cause analysis, test-fix implementation, and SDLC orchestration.
- **Scope:** Test-only change in `e2e/smoke/req-084-checkout-separation.spec.ts`.

## What the AI did

1. Investigated the failing CI run and identified the failing test and assertion.
2. Reviewed the menu item card and detail modal components to determine why the dialog's "Add to Cart" button was not visible.
3. Determined that the test clicked the first menu card, which is nondeterministic; when the first item is out of stock, the modal does not open.
4. Created GitHub issue #478 and REQ-091.
5. Implemented a deterministic seed-and-locate strategy in AC12.
6. Ran local lint and TypeScript gates.

## Human Oversight

- The operator requested the triage and fix.
- The operator will review the PR before merge.
