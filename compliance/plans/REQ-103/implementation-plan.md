---
title: 'Implementation plan — REQ-103'
requirement_id: 'REQ-103'
risk_class: 'HIGH'
change_type: 'fix'
authored_by: 'sdlc-implementer (agent)'
authored_at: '2026-09-08'
---

# Implementation plan — REQ-103

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

| Clause                                                    | What this plan must contain                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | See §1 Acceptance criteria + §9 Verification.                                |
| **ISO 27001 A.8.25** Secure development life cycle        | See §5 Threat model — this REQ is entirely an authorization-gate correction. |
| **GDPR Art. 25** Data protection by design and by default | N/A — no personal data introduced or restructured; see §6.                   |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A — no AI/model behaviour; see §7.                                         |

## 1. Goal + acceptance criteria

- **Goal:** Admins granted the `menuManagement` permission can save "Edit All" row edits and Pricing Window changes, exactly as the permission's UI description already promises — without gaining any capability beyond menu/pricing management.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                  | SRS item it traces to                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| AC1 | Given an `admin` with `permissions.menuManagement = true`, When they open `/dashboard/menu/edit-all` and change a non-price field (e.g. category) and save, Then the save succeeds and the row reflects the change.          | REQ-MENUMGT-009 (existing — stale, update needed)                         |
| AC2 | Given the same admin, When they change a price field (default/show/happy-hour price) on Edit All and save, Then the save succeeds and a new `PriceHistory` snapshot is recorded (same as AC1's row save — one action).       | REQ-MENUMGT-009 (existing — stale, update needed)                         |
| AC3 | Given the same admin, When they open `/dashboard/menu/pricing-windows`, change the Show Price Window or Happy Hour Window, and save, Then the save succeeds and the new window is persisted and reflected on reload.         | REQ-MENUMGT-010 (existing — stale, update needed)                         |
| AC4 | Given the same admin, When they use the single-item Price Management form and save a price change, Then the save succeeds (parity with AC2).                                                                                 | REQ-MENUMGT-008 (existing — stale, update needed)                         |
| AC5 | Given an `admin` **without** `menuManagement` permission, When they attempt any of the three saves above (via UI or direct action/API call), Then the save is rejected with a permission error — access is not over-widened. | REQ-MENUMGT-008/009/010 (existing — negative-case addendum)               |
| AC6 | Given any authenticated admin, When the Pricing Window save action is invoked, Then it can only ever change `showPriceWindow` / `happyHourWindow` — no other `Settings` field is reachable through this path.                | REQ-MENUMGT-010 (existing — unchanged, already documents this constraint) |

## SRS items proposed/touched

| AC       | SRS item                   | Status                                       | Notes                                                                                                                                                                                                                                                                                |
| -------- | -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1, AC2 | REQ-MENUMGT-009 (existing) | stale — update needed                        | Currently scoped to "a super-admin clicks Edit All" only; must broaden to admin-with-`menuManagement` as an equally valid actor.                                                                                                                                                     |
| AC3, AC6 | REQ-MENUMGT-010 (existing) | stale — update needed (AC3); unchanged (AC6) | Currently scoped to "a super-admin ... Pricing Windows" only; broaden the actor. The existing "without touching any other settings" sentence already covers AC6 — no change needed there.                                                                                            |
| AC4      | REQ-MENUMGT-008 (existing) | stale — update needed                        | This item's third bullet currently _documents the bug as intended behaviour_: "Given a non-super-admin session, When they attempt the update action, Then the request is rejected." Must flip to: super-admin OR `menuManagement`-permitted admin succeeds; anyone else is rejected. |
| AC5      | REQ-MENUMGT-008/009/010    | negative-case addendum                       | Each of the three items above should gain (or keep) an explicit negative bullet: an admin without `menuManagement` is still rejected.                                                                                                                                                |

**Operator action required before plan approval:** edit the three `docs/SRS.md` items above (REQ-MENUMGT-008, -009, -010) to replace their super-admin-only actor language with "super-admin or an admin with `permissions.menuManagement = true`", and confirm each retains an explicit negative bullet for the without-permission case. No new SRS-IDs are needed — this REQ is entirely a drift-correction on existing items whose prose currently encodes the bug as spec.

## 2. Scope

- **In scope:**
  - `lib/auth-middleware.ts` — new non-redirecting `hasSessionPermission(session, permission)` helper for use inside server actions (mirrors `requirePermission`'s super-admin-bypass logic without redirecting).
  - `app/actions/admin/menu-actions.ts` — `updateMenuItemRowAction`: replace the hard-coded `role !== 'super-admin'` gate with the permission check.
  - `app/actions/admin/menu-actions.ts` — new `updatePricingWindowsAction` server action, gated by the same permission check, updating only `showPriceWindow` / `happyHourWindow` via `SettingsService.updateSettings`.
  - `app/actions/admin/price-management-actions.ts` — `updateMenuItemPriceAction`: same gate replacement (issue's "related tech debt," folded in since it's the identical pattern and the issue explicitly calls it out as in-scope-if-included).
  - `components/features/admin/pricing-windows-form.tsx` — call `updatePricingWindowsAction` instead of `fetch('/api/settings', { method: 'PUT' })`.

- **Out of scope:**
  - `app/api/settings/route.ts` PUT handler — left untouched (still super-admin-only); it also guards unrelated settings (business hours, fees, delivery config) that are genuinely out of `menuManagement`'s scope. Loosening it wholesale was explicitly rejected by the issue's own proposed resolution.
  - `lib/permissions.ts` `dashboardSections.menu` — investigated and found to be **dead code**: nothing in the codebase calls `canAccessDashboardSection('menu', …)` or reads `dashboardSections.menu`. The actual sidebar filter is `components/features/admin/dashboard-nav.tsx`'s `navItems` array, which already lists Menu with `roles: ['admin', 'super-admin']` and `permission: 'menuManagement'` — i.e. the sidebar bug described in the issue's "related tech debt" item 2 does not reproduce; a `menuManagement`-permitted `admin` already sees "Menu" in the sidebar today. No change needed here — see Surface inventory below.

### Surface inventory

| Surface                                                  | URL / file                                                                               | Status                                                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Edit All row save (non-price fields)                     | `/dashboard/menu/edit-all` — `app/actions/admin/menu-actions.ts`                         | In scope                                                                                                                    |
| Edit All row save (price fields)                         | `/dashboard/menu/edit-all` — `app/actions/admin/menu-actions.ts`                         | In scope                                                                                                                    |
| Pricing Window save                                      | `/dashboard/menu/pricing-windows` — `components/features/admin/pricing-windows-form.tsx` | In scope — new dedicated server action replacing the generic settings PUT                                                   |
| Single-item Price Management save                        | `app/actions/admin/price-management-actions.ts`                                          | In scope                                                                                                                    |
| Sidebar "Menu" link visibility for menuManagement admins | `components/features/admin/dashboard-nav.tsx`                                            | Already works — `permission: 'menuManagement'` + `roles: ['admin','super-admin']` already gate this correctly               |
| Page-level route access (`/dashboard/menu/*`)            | `app/dashboard/menu/layout.tsx`                                                          | Already works — `requirePermission('menuManagement')`, not touched by this REQ                                              |
| Generic `/api/settings` PUT (business hours, fees, etc.) | `app/api/settings/route.ts`                                                              | Out of scope (waived) — remains super-admin-only; unrelated settings fields must not be exposed to `menuManagement` holders |

## 3. Architecture decisions

- **No ADR needed** — evaluated against the decision tree (`adr-author`): no new third-party dependency, external service, database/cache/queue tier, or schema-level data model change; no pattern change spanning >3 files (3 of the 4 touched files are near-identical replacements of one existing gate pattern — `role !== 'super-admin'` → `hasSessionPermission(session, 'menuManagement')` — with the 4th being a client-form call-site swap). The risk classification is HIGH (authz/RBAC + pricing surface), which the decision tree flags as an operator-confirm signal, not an automatic ADR trigger; the HIGH rating here reflects the _blast radius of getting an existing, already-established permission model wrong_, not the introduction of a new architectural pattern. `IAdminPermissions.menuManagement` and the `requirePermission()`/permission-check convention already exist and are unchanged by this REQ — this fix makes 3 additional call sites consistent with a pattern the codebase already committed to.

## 4. E2E test coverage

- **Spec(s):** `e2e/admin/menu-edit-all.spec.ts` (AC1/AC2 new `adminTest` describe; AC5 new top-level `csrTest`), `e2e/admin/pricing-windows.spec.ts` (AC3 new `adminTest`; AC5 new top-level `csrTest`).
- **ACs covered:** AC1, AC2, AC3 (positive, via a `menuManagement`-permitted admin fixture — `.auth/admin.json`); AC5 (page-level defense-in-depth, via a no-permission fixture — `.auth/csr.json`). AC4 and AC6 are unit-only — see `compliance/evidence/REQ-103/e2e-scope-decision.md` for the full rationale, including why AC5's actual save-action gate is proven at the unit level (a session blocked at the page layer never reaches the save form).

## 5. Threat model + security considerations

| Threat                                                                                                                                                                 | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New `hasSessionPermission` helper implemented incorrectly, silently granting `menuManagement` holders access to unrelated actions if reused carelessly elsewhere later | Low        | Medium | Helper is narrowly scoped (single permission key in, boolean out), unit-tested directly, and only wired into the 3 call sites this REQ touches.                                                                                                                     |
| `updatePricingWindowsAction` accepts more than `showPriceWindow`/`happyHourWindow` and becomes a backdoor to the generic settings surface                              | Low        | High   | New action's input type is a narrow interface (`{ showPriceWindow, happyHourWindow }` only); `SettingsService.updateSettings` is called with exactly that object, not the raw form payload passthrough. AC6 + a negative test assert no other field can ride along. |
| Regression: a `menuManagement`-permitted admin who should be blocked (e.g. permission revoked mid-session) still succeeds due to stale session data                    | Low        | Medium | Same session-freshness assumption already relied on by every other permission gate in the app (`requirePermission`); not a new risk introduced by this REQ.                                                                                                         |
| Over-widening: fix accidentally drops the check entirely instead of switching from role- to permission-based                                                           | Low        | High   | AC5 + explicit unit + e2e negative tests: an admin _without_ `menuManagement` must still be rejected on all three save paths.                                                                                                                                       |

**Secrets / credentials:** None handled by this REQ.

**Dependencies introduced:** None.

### Risk register entries

This REQ opens / touches the following entries in `compliance/risk-register.md`:

- **R-028 — Menu/pricing save actions widen from super-admin-only to menuManagement-permission-holders** — Status: OPEN. Opened by `risk-register-keeper`. Covers the risk of implementing this authorization-gate correction incorrectly (either still-blocking or over-widening). Operator signs off the residual rating (low × medium) before plan APPROVAL.
- **R-026 — Bulk "Edit All" page broadens blast radius of a compromised/careless super-admin session (REQ-102)** — Status: OPEN, **updated** by this REQ. This REQ's fix widens R-026's actor pool from "super-admin only" to "super-admin or menuManagement-permitted admin" — the register entry has been revised to reflect this (residual likelihood raised from low to low-medium; existing mitigations still apply). Operator confirms the revised rating.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No. N/A — this REQ only changes an authorization check on menu/pricing save actions; no new personal-data field is read, written, or exposed.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No. N/A — this REQ does not introduce or change AI behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit — the change is additive/substitutive on 4 files with no schema or migration involved.
- **Data implications of rollback:** None. No new persisted fields; `showPriceWindow`/`happyHourWindow` already exist in the `Settings` schema and are already written by the pre-existing generic PUT path.
- **Notification path if rollback during a release:** Standard incident/rollback comms per the project's existing on-call practice — no bespoke path needed since no data migration is involved.

## 9. Verification

- **Unit + integration tests:**
  - `hasSessionPermission` helper — super-admin bypass, permission-true pass, permission-false/missing reject, no-session reject.
  - `updateMenuItemRowAction` — menuManagement-permitted admin can save non-price and price fields; admin without the permission is rejected; super-admin still works (regression).
  - `updateMenuItemPriceAction` — same coverage as above for the single-item form.
  - `updatePricingWindowsAction` — menuManagement-permitted admin can update the windows; admin without the permission is rejected; only the two window fields are ever passed to `SettingsService.updateSettings` (no passthrough of arbitrary fields).
- **E2E coverage:** see §4 — `e2e-test-engineer` to add/extend coverage for the Edit All and Pricing Window save flows under a `menuManagement`-only admin fixture, plus a negative case for an admin lacking the permission.
- **Manual smoke after deploy:** log in as a `menuManagement`-only test admin in production; verify Edit All save (price + non-price) and Pricing Window save both succeed; verify sidebar shows Menu; verify an admin without the permission is still blocked.
- **Monitoring / alerting:** none added — existing audit log (`AuditLogService`) already captures these save actions; no new dashboard needed.

## 10. Sign-off

- **Plan reviewer (eng):** REPLACE — name + date
- **Plan reviewer (security / DPO):** REPLACE — HIGH risk / authz change, security reviewer sign-off required before merge
- **Plan approved by operator:** REPLACE — name + date

## Upload path

This file lives at `compliance/plans/REQ-103/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.

Verify the upload at `https://devaudit.ai/projects/wgb/releases/REQ-103` — the "Evidence by requirement" list should show this plan tagged with `category=planning`.
