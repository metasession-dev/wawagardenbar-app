# REQ-076 — AI prompts captured

## Cycle entry

After REQ-075's release PR merged, the operator asked: _"I need 'main category' specific reports that replicate the daily report feature what would that look like?"_

That triggered an exploration of the daily report surfaces (data + UI + export + RBAC). Three design options were presented:

- Option A: New sibling page with selector (chosen)
- Option B: Daily report becomes dynamic per registry (rejected — breaking change to PDF/Excel/CSV consumers)
- Option C: Side-by-side comparison page (rejected — doesn't replicate the daily report 1:1)

Mid-discussion the operator added: _"I also need to provide 'Main Category' specific reports to specific users"_

That extended the design to include a per-user permission field — same pattern as REQ-034's `kitchenManagement` and REQ-066's `incidentsAccess`, but with a multi-value array instead of a boolean.

## Plan-time decisions confirmed via AskUserQuestion

1. **Per-main page with selector** (vs modify-daily / vs comparison page) — Operator: Option A
2. **Omit payments + tips from per-main** (vs pro-rate / vs include order-level) — Operator: omit

## E2E delegation contract honoured

After the prior REQ-075 cycle violated `sdlc-implementer`'s "MUST invoke `e2e-test-engineer`" contract (twice — REQ-075 ship + REQ-076 planning), the operator filed [DevAudit-Installer#132](https://github.com/metasession-dev/DevAudit-Installer/issues/132) upstream and saved a memory: `feedback_invoke_e2e_test_engineer`.

This cycle invoked the skill correctly. The agent declared delegation upfront ("Delegating e2e test work to e2e-test-engineer") then called `Skill(name: "e2e-test-engineer", args: <change summary>)`. The skill ran its own 6-phase workflow (orient → understand change → design scenarios → reconcile → implement → execute) and reported back with 4 specs authored + 1 dropped due to a runtime limitation.

## In-cycle scope decisions

**Decision 1**: Per-user permission field is **additive**, not restrictive. `undefined` → back-compat see-all; `[]` → deny-all; subset → restrict. This makes the rollout safe: existing admin users keep working without explicit migration; only newly-created admins (or admins explicitly edited post-REQ) get the restrictive default.

**Decision 2**: Super-admin **always** bypasses the per-main check. Even if `mainCategoryReportAccess: []` is explicitly set on a super-admin, they still see all mains. This is a deliberate safety guard against operator lockout. Pinned by unit test.

**Decision 3**: The `'Forbidden: not authorized for this main category'` error string is **literal** — pinned by the unit test resolution-table assertion. Any future refactor of the action error path will break the test, surfacing the contract change.

**Decision 4**: The E2E spec for the direct-API-call negative test (AC5) pins the contract via the **negative dropdown assertion** rather than directly invoking the server action. Next.js server actions use a special RSC payload format that's fragile to replicate. The unit test's resolution-table assertion is the contract pin; the E2E spec verifies the runtime gate via the user-visible UI surface.

**Decision 5**: Numbers tie-out E2E spec (Spec 2 in the original sketch) was dropped to a dynamic-import limitation. `system-settings-service.ts:421` uses `await import('@/interfaces/main-category.interface')` inside the method body. Playwright's runner doesn't transpile this. Production code (Next.js) is unaffected. The math contract is pinned by 8 unit-test cases; end-to-end correctness is exercised by Spec 1's UI flow.

**Decision 6**: Synthetic past date 2020-01-01 for all E2E seed data. Guarantees zero collision with real UAT data; numbers are deterministic to the seed.

**Decision 7**: `orderNumber` uniqueness — caught mid-execution. The orders collection has a unique index on `orderNumber` (12-char cap). My initial seed truncated to 12 chars and collapsed all 4 orders to the same key. Fix: use a compact run-id (`EQ${base36-timestamp}${zero-padded-index}`) to guarantee uniqueness across the spec's 4 orders.

## Decisions NOT made by AI

- **Option A vs B vs C** at design time: operator chose via AskUserQuestion.
- **Omit payments+tips** vs pro-rate vs order-level: operator chose via AskUserQuestion.
- **Maximum E2E, minimum UAT** strategy direction: operator explicit.
- `[REQ-076]` square-brackets convention: operator-enforced via memory.

## AI tool

- **Tool:** Claude Opus 4.7 via Claude Code (CLI).
- **Sub-skill invoked:** `e2e-test-engineer` (4 specs authored via the skill's 6-phase workflow).
- **Scope:** 1 new interface field + 1 new service method + 1 new server action + 1 new helper + 3 sibling export functions + 1 new admin form component + 1 new page (server+client) + edits to 4 existing files + 1 new E2E seed helper + 4 new E2E specs + 3 unit-test files (26 cases) + 6-doc evidence pack + release ticket + implementation plan + SRS + RTM.
- **Verification:** tsc 0 errors; full vitest 1181 pass / 4 skip / 0 fail (+27 new); UI E2E specs pending UAT auto-deploy.
