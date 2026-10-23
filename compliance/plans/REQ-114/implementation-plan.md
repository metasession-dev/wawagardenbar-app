---
title: 'Implementation plan — REQ-114'
requirement_id: 'REQ-114'
risk_class: 'MEDIUM'
change_type: 'fix'
authored_by: 'sdlc-implementer (AI-assisted)'
authored_at: '2026-10-23'
---

# Implementation plan — REQ-114

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | Explicit "no new personal data processing" callout.        |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | Explicit "no AI in scope" callout (not applicable).        |

**Source:** issue [#956](https://github.com/metasession-dev/wawagardenbar-app/issues/956). Operator chose to fix GHSA-mrhx-c7xc-m3w5 by upgrading (rather than risk-accepting) on 2026-10-23, and confirmed risk class MEDIUM.

## 1. Goal + acceptance criteria

- **Goal:** Clear the high-severity zod advisory GHSA-mrhx-c7xc-m3w5 ("Zod can exhaust memory while validating oversized constrained collections", all `zod <4.6.6`) by upgrading `zod` 3 → 4 and `@hookform/resolvers` to a zod-4-capable major, with no change to how any form or server action validates input or reports errors.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                          | SRS item it traces to                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Given the repo on `develop`, When CI's `Quality Gates` dependency-audit step (`scripts/evaluate-npm-audit.sh`) runs, Then GHSA-mrhx-c7xc-m3w5 is no longer reported and the gate passes.                                                                                             | `@srs-deferred: supply-chain control enforced by CI (scripts/evaluate-npm-audit.sh + compliance/security/accepted-vulnerabilities.json), not product behaviour` |
| AC2 | Given any existing zod-validated form or server action (login, checkout, tab checkout, profile, address, expenses, cash deposit, settings, rewards, API keys, data deletion, communication forms), When a user submits valid input, Then it is accepted and saved exactly as before. | Existing items, trace-only (see table below)                                                                                                                    |
| AC3 | Given any existing zod-validated form or server action, When a user submits invalid or missing input, Then it is rejected and the same field-level error message is shown as before the upgrade.                                                                                     | Existing items, trace-only (see table below)                                                                                                                    |
| AC4 | Given the existing unit and E2E suites, When they run after the upgrade, Then they pass with no assertion weakened, skipped or removed.                                                                                                                                              | `@srs-deferred: test-suite integrity (process), not product behaviour`                                                                                          |

### SRS items proposed/touched

_Populated by `requirements-aligner` (Stage 1, 2026-10-23)._

| AC       | SRS item                                                                                                                                                                                                                          | Status                 | Notes                                                                                                                                                                                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1      | —                                                                                                                                                                                                                                 | `@srs-deferred`        | No SRS item covers dependency/supply-chain security; this is a CI control (the `Quality Gates` dependency-audit step), not product behaviour. If the operator wants it in the SRS, the next free ID is **REQ-SEC-005**.                                                                                     |
| AC2, AC3 | REQ-AUTHC-001, REQ-AUTHC-003, REQ-ORDER-004, REQ-FIN-004, REQ-FIN-008, REQ-REWMGT-001, REQ-REWMGT-002, REQ-SETTINGS-003, REQ-SETTINGS-004, REQ-PRIVACY-001, REQ-API-001, REQ-API-002, REQ-MENUMGT-007, REQ-MENUMGT-010 (existing) | unchanged (trace-only) | Surfaces whose validation runs on zod and is touched by the migration. The behaviour each item describes must not change; no SRS prose edits. Surfaces with no SRS item of their own (profile/address forms, admin settings forms, communication forms) are covered by the same behaviour-preservation ACs. |
| AC4      | —                                                                                                                                                                                                                                 | `@srs-deferred`        | Test-suite integrity is a process property, not product behaviour.                                                                                                                                                                                                                                          |

**SRS drift found (advisory, pre-existing on `develop`):** `REQ-ORDMGT-011`, `REQ-ORDMGT-012`, `REQ-ORDMGT-015`, `REQ-ORDMGT-016` have heading blocks but no summary-table row (also reported on REQ-113).

**Stage 1 gate:** advisory. Every AC traces to an existing SRS item or carries `@srs-deferred`; no new stubs, so no SRS edit is needed before Phase 2.

## 2. Scope

- **In scope:**
  - `package.json` / `package-lock.json`: `zod` `^3.25.76` → `^4.6.7`; `@hookform/resolvers` `^3.10.0` → `^5.9.2` (smallest major supporting zod 4; peer `zod: ^3.25.0 || ^4.0.0`, `react-hook-form: ^7.55.0`, ours is `^7.66`). 6.0.0 is not taken: a new major with no benefit for this fix.
  - Code migrations required by zod 4, sized by a trial install (34 type errors in 19 of the 41 files importing zod):
    - **A — `ZodError.errors` → `.issues`** (5 sites): `app/actions/admin/reward-rules-actions.ts`, `app/actions/profile/profile-actions.ts`. Same issue objects; renamed in v4.
    - **B — error-customisation params** (≈15 sites): `required_error` / `invalid_type_error` / `errorMap` on `z.enum`, `z.literal`, `z.date`, `z.number` in the checkout, tab checkout, rewards issue, units, data deletion and finance forms. Migrate to v4's `error` param, preserving semantics exactly: where v3 used `required_error` (fires only when input is `undefined`), use `error: (iss) => (iss.input === undefined ? '<same message>' : undefined)` so other issues keep their previous message.
    - **D — resolver input/output typing** (≈14 sites, 5 forms: API keys, expense categories, notification settings, reward rule, address): schemas with `.default()`/optional fields now infer distinct input and output types; type `useForm` with the schema's input/output types. Type-level only.
  - **Default-message audit (AC3):** zod 4 changes default error text, so a schema that relied on a default message (no custom message) would show different copy. Audit every validator in user-facing schemas that has no custom message; where the v4 default differs from v3's, pin the v3 message explicitly. Also check behaviour changes that compile cleanly: stricter `.email()`/`.url()` checks, `.default()` inside `.optional()`, `z.number()` rejecting `Infinity`, `.strict()`/`.passthrough()` handling.
- **Out of scope:** refactoring schemas, changing validation rules or error copy beyond what the migration needs, `@hookform/resolvers` 6.x, other `npm audit` moderates (not gating), REQ-113 (#954, rebased on top after this lands).

### Surface inventory

| Surface                                  | URL / file                                                                                                                                             | Status                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Customer checkout / tab checkout         | `components/features/checkout/customer-checkout-form.tsx`, `app/(customer)/orders/tabs/[tabId]/checkout/page.tsx`                                      | In scope (group B)                                       |
| Login (customer, admin), guest checkout  | `components/shared/auth/*`, `components/features/admin/admin-login-form.tsx`                                                                           | In scope (audit only — no type errors)                   |
| Profile, addresses, preferences          | `app/actions/profile/profile-actions.ts`, `components/features/profile/*`, `lib/validation/profile.ts`                                                 | In scope (A, D, audit)                                   |
| Expenses, cash deposit, pending groups   | `components/features/finance/*`                                                                                                                        | In scope (B)                                             |
| Admin settings forms                     | `components/features/admin/{notification,payment,expense-categories,menu-categories,units-of-measurement,pricing-windows,settings}-form.tsx`, API keys | In scope (B, D, audit)                                   |
| Rewards                                  | `app/actions/admin/reward-rules-actions.ts`, `components/features/admin/rewards/*`, `app/dashboard/rewards/issue/page.tsx`                             | In scope (A, B, D)                                       |
| Data deletion (public)                   | `app/(public)/data-deletion/data-deletion-form.tsx`                                                                                                    | In scope (B)                                             |
| Menu admin actions, REQ-113 print action | `app/actions/admin/menu-actions.ts`                                                                                                                    | Already works — no v4-incompatible API used (audit only) |

## 3. Architecture decisions

> _Populated by the `adr-author` skill at Stage 1._

- **No ADR needed (candidate verdict — operator to confirm)** — Security-forced version migration of two existing dependencies (`zod` 3 → 4, `@hookform/resolvers` 3 → 5). The app keeps the same validation architecture (zod schemas, `zodResolver` in react-hook-form forms, `safeParse` in server actions); only call shapes change (`ZodError.errors` → `.issues`, `required_error`/`errorMap` → `error`, form input/output typing). No new dependency, service, data tier or schema; no file-path signals. The package versions and this plan are the record of the decision.
  - _Signals examined (adr-author, 2026-10-23):_ new dependency — none (both already present); external service — none; data tier — none; schema — none; risk — MEDIUM; file-path signals — none; dependency bump — **major with API changes** (edge); pattern change across >3 files — mechanical API migration across ~19 files, same patterns kept (edge). Verdict marked ambiguous and surfaced to the operator; an ADR will be drafted if the operator asks for one (as on REQ-113).

## 4. E2E test coverage

Pending `e2e-test-engineer` (Phase 2). Expected: no new spec. The existing regression suite already drives these forms, and the behaviour must not change. `e2e-test-engineer` decides and records it.

## 5. Threat model + security considerations

| Threat                                                                                                               | Likelihood | Impact | Mitigation                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Memory exhaustion via oversized constrained collections (GHSA-mrhx-c7xc-m3w5) in server-side zod validation          | Low        | Medium | Upgrade to `zod@4.6.7` (patched ≥ 4.6.6). This REQ is the mitigation.                                                                                                           |
| Silent validation regression: a v4 behaviour change lets invalid input through (e.g. on checkout or profile actions) | Low        | High   | Type-check catches API breaks; default-message/behaviour audit (§2); full unit suite + full E2E regression; server-action schema tests assert rejection of invalid input (AC3). |
| Silent validation regression: valid input now rejected (stricter `.email()`/`.url()`), blocking login or checkout    | Low        | High   | Audit every `.email()`/`.url()` use; add unit tests with the input shapes the app accepts today; E2E login/checkout flows in the regression run.                                |
| Supply-chain risk of two new major versions                                                                          | Low        | Medium | Both are the same maintained packages already in the tree; lockfile pinned; `npm audit` gate re-run.                                                                            |

**Secrets / credentials:** None.

**Dependencies introduced:** None new; two existing dependencies change major version (`zod` 4.6.7, `@hookform/resolvers` 5.9.2).

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md` (drafted by `risk-register-keeper`, 2026-10-23; operator owns the final wording and residual ratings):

- **R-038 — `zod@3.25.76` memory-exhaustion advisory GHSA-mrhx-c7xc-m3w5** — Status: OPEN; becomes MITIGATED when this REQ merges with the dependency-audit gate green.
- **R-039 — Validation behaviour change from the zod 3 → 4 major upgrade** — Status: OPEN; operator moves it to MITIGATED at Stage 3 if the planned controls (type-check, semantics-preserving migration, default-message audit, new message tests, full regression) are demonstrated. Also covers the minor supply-chain concern of two major bumps.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** no new processing. The upgrade changes the validation library under existing forms that already handle personal data (name, email, phone, address, login credentials). No new fields, purposes, storage or retention. The upgrade must keep the data minimisation that today's validation rules enforce (AC2/AC3). ROPA / DPIA: N/A.

## 7. AI / model considerations (EU AI Act Art. 11)

N/A — this REQ does not introduce or change AI behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the REQ-114 merge (restores `zod` 3.25.76 / `@hookform/resolvers` 3.10.0 and the v3 call sites). Reverting re-exposes the advisory and re-blocks the audit gate.
- **Data implications of rollback:** None. Validation only; nothing is written in a new shape.
- **Notification path if rollback during a release:** Operator; affected staff/customers see no difference.

## 9. Verification

- **Unit + integration:** full Vitest suite (no assertion weakened); new tests pinning v3-era error messages and accept/reject behaviour for the server-action schemas changed in group A/B and every `.email()`/`.url()` schema found by the audit.
- **E2E coverage:** full Playwright regression (login, checkout, profile, expenses, settings flows are already covered).
- **Dependency gate:** `scripts/evaluate-npm-audit.sh` locally, then CI.
- **Manual smoke after deploy:** submit one valid and one invalid entry on customer checkout, login, profile address and an expense; confirm the same messages as before.
- **Monitoring / alerting:** none added.

## 10. Sign-off

- **Plan reviewer (eng):** _pending_ (MEDIUM — passes Phase 1 automatically; operator reviews at UAT)
- **Plan reviewer (security / DPO):** N/A — no new personal-data processing.
- **Plan approved by operator:** risk class MEDIUM and the fix-not-accept route confirmed by William, 2026-10-23.

## Upload path

This file lives at `compliance/plans/REQ-114/implementation-plan.md`. At Phase 3 the `sdlc-implementer` skill copies it to `compliance/evidence/REQ-114/implementation-plan.md`, and the next push to `develop` uploads it via `compliance-evidence.yml`.
