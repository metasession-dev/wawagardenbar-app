---
title: 'Implementation plan — REQ-109'
requirement_id: 'REQ-109'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'agent'
authored_at: '2026-09-29'
---

# Implementation plan — REQ-109

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one.                                   |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations (auth, data handling, dependencies, secrets).    |
| **GDPR Art. 25** Data protection by design and by default | Per-purpose data flows; minimisation; lawful basis; retention.                               |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | When the REQ touches AI / model behaviour: model provenance, prompt sources, oversight path. |

## 1. Goal + acceptance criteria

- **Goal:** Remove the "Quick Actions" section from the staff orders dashboard (`/dashboard/orders`) for every staff role, and widen `csr`'s server-side permissions on tab/order-management actions to match `admin`/`super-admin` so "Admin Order Management" actually functions for `csr`.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                              | SRS item it traces to                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| AC1 | Given a `csr`, `admin`, or `super-admin` user is logged in, When they open `/dashboard/orders`, Then the "Quick Actions" heading and its three cards (Open a Order, Open a New Tab, Add to Existing Tab) are not present anywhere on the page.           | REQ-ORDMGT-010 (updated — drift)                                                    |
| AC2 | Given a `csr` user is logged in, When they open `/dashboard/orders`, Then the "Admin Order Management" heading and its four cards (Create a new Tab, Create a new Order, Close a Tab, Inventory Summary) are visible, same as for `admin`/`super-admin`. | REQ-ORDMGT-010 (updated — drift)                                                    |
| AC3 | Given a `csr` user, When they use "Create a new Tab" (Express flow) to open a tab for a table, Then the tab is created successfully (no "Unauthorized" error) and appears in the tabs list.                                                              | REQ-TABMGT-010 (new)                                                                |
| AC4 | Given a `csr` user, When they use "Create a new Order" (Express flow) against an open tab, Then the order is added successfully.                                                                                                                         | REQ-ORDMGT-018 (new)                                                                |
| AC5 | Given a `csr` user, When they use "Close a Tab" (Express flow) to close and pay an open tab, Then the tab closes successfully and payment is recorded.                                                                                                   | REQ-TABMGT-010 (new)                                                                |
| AC6 | Given a `csr` user, When they cancel an order, delete an order, or write off a tab from `/dashboard/orders`, Then the action succeeds (previously returned "Unauthorized").                                                                              | REQ-ORDMGT-018 (new, order part) / REQ-TABMGT-007 (updated — drift, write-off part) |
| AC7 | Given a `csr` or `admin` user (not `super-admin`), When they attempt `deleteTabAction` with `superAdminOverride: true`, Then the action is rejected — only `super-admin` may use the override path.                                                      | REQ-TABMGT-004 (existing, unchanged) / REQ-TABMGT-010 (new, cross-ref)              |
| AC8 | Given a customer (no staff role) is logged in or a guest, When they browse `/menu` and complete checkout via `/checkout`, Then the order/tab is created successfully as before, with no tab-opening or add-to-tab UI ever presented to them.             | REQ-ORDER-002 / REQ-CHECKOUT-007 (existing, unchanged)                              |

## SRS items proposed/touched

| AC                    | SRS item                        | Status          | Notes                                                                                                                                                            |
| --------------------- | ------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1, AC2              | REQ-ORDMGT-010                  | updated (drift) | Behaviour text rewritten: no more separate "Quick Actions" section; explicitly staff-role-agnostic (csr/admin/super-admin) visibility of Admin Order Management. |
| AC3, AC5, AC7         | REQ-TABMGT-010 (new)            | added           | csr parity across general tab-management actions in `tab-actions.ts`; explicitly cross-refs REQ-TABMGT-004's unaffected `superAdminOverride`.                    |
| AC4, AC6 (order part) | REQ-ORDMGT-018 (new)            | added           | csr parity across order-management actions (create/cancel/delete order, notes, reconciliation) and the Express flow's `requireAdminSession`.                     |
| AC6 (write-off part)  | REQ-TABMGT-007                  | updated (drift) | Existing item's own AC explicitly said non-admin/super-admin staff are refused write-off — REQ-109 changes this; rewritten to admit `csr`.                       |
| AC7                   | REQ-TABMGT-004                  | unchanged       | Confirms the existing super-admin-only override AC still holds; no edit needed, used as a regression check.                                                      |
| AC8                   | REQ-ORDER-002, REQ-CHECKOUT-007 | unchanged       | Customer checkout flow is untouched by this REQ; existing items still apply.                                                                                     |

No table/heading drift found in `docs/SRS.md` for the ORDMGT or TABMGT prefixes (both representations agreed at max ORDMGT-017 / TABMGT-009 before this cycle's additions).

## 2. Scope

- **In scope:**
  - `app/dashboard/orders/page.tsx` — delete the "Quick Actions" block and its now-unused imports.
  - `app/actions/admin/express-actions.ts` — widen `requireAdminSession()`'s allowed roles to include `csr`.
  - `app/actions/tabs/tab-actions.ts` — widen the allowed-role list to include `csr` in: `listOpenTabsAction`, `getDashboardFilteredTabsAction`, `recordPartialPaymentAction`, `completeTabPaymentManuallyAction`, `closeTabAction`, `createAdminTabAction`, `deleteTabAction` (general check only), `writeOffTabAction`, `updateTabNameAction`, `toggleTabReconciliationAction`.
  - `app/actions/admin/order-management-actions.ts` — widen the allowed-role list to include `csr` in: `getOrdersAction`, `getOrderDetailsAction`, `updateOrderStatusAction`, `batchUpdateOrdersAction`, `cancelOrderAction`, `deleteOrderAction`, `addOrderNoteAction`, `toggleOrderReconciliationAction`.
  - `e2e/authenticated.spec.ts` — replace the single combined assertion with role-specific coverage.
  - **(Added — see Plan deviation below)** `app/dashboard/orders/tabs/[tabId]/page.tsx`, `app/dashboard/orders/tabs/[tabId]/checkout/page.tsx`, `app/dashboard/orders/inventory-summary/page.tsx`, `app/dashboard/orders/inventory-updates/page.tsx` — page-level role gates widened to include `csr`.
  - **(Added)** `app/actions/inventory/snapshot-actions.ts` — widen the general-tier snapshot functions actually used by the Inventory Summary flow (`generateSnapshotDataAction`, `submitSnapshotAction`, `getSnapshotHistoryAction`, `checkExistingSnapshotAction`, `resubmitSnapshotAction`) to include `csr`. The separate approval-tier functions (`getPendingSnapshotsAction`, `getSnapshotDetailsAction`, `approveSnapshotAction`, `rejectSnapshotAction`, `updateSnapshotItemsAction`) are untouched — `super-admin`-only, a distinct reconciliation-approval capability unrelated to this REQ.
  - **(Added)** `components/features/admin/tabs/create-tab-dialog.tsx` — deleted; fully orphaned once its only usage (Quick Actions' "Open a New Tab") was removed.
  - **(Added)** `e2e/critical/daily-report-payments.spec.ts` — its two tab-creation helpers depended on the deleted Quick Actions "Open a New Tab" dialog; replaced with the Express create-tab flow (same underlying action, different UI entry point).

- **Out of scope:**
  - `deleteTabAction`'s `superAdminOverride` path — stays `super-admin`-only (verified by AC7, not modified).
  - `kitchen-staff` role permissions on `order-management-actions.ts` — untouched.
  - Any customer-facing UI change — verified as already-working (AC8), no code change.
  - Any change to the Analytics card's `isSuperAdmin`-only gate.

### Surface inventory (HIGH risk — required)

| Surface                                   | URL / file                                                             | Status                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Staff orders dashboard — Quick Actions    | `/dashboard/orders` — `app/dashboard/orders/page.tsx`                  | In scope — section deleted                                               |
| Staff orders dashboard — Admin Order Mgmt | `/dashboard/orders` — `app/dashboard/orders/page.tsx`                  | In scope — no UI change, but backing actions widened to `csr`            |
| Express create-tab/create-order/close-tab | `/dashboard/orders/express/*` — `app/actions/admin/express-actions.ts` | In scope — role guard widened                                            |
| Tab management actions                    | `app/actions/tabs/tab-actions.ts`                                      | In scope — role guards widened (except `superAdminOverride`)             |
| Order management actions                  | `app/actions/admin/order-management-actions.ts`                        | In scope — role guards widened                                           |
| Customer ordering/checkout                | `/menu` → `/checkout` — `app/menu/page.tsx`, `app/checkout/page.tsx`   | Already works — no tab-management UI exposed; verified, no change needed |

## Plan deviation

Discovered during Phase 2 implementation and local E2E verification — **implementation deviation** (the ACs were correct; additional files were needed to actually satisfy them, not new behaviour):

1. **Page-level role gates missed in the original file list.** AC2 says "Admin Order Management renders and fully functions for `csr`" — the Admin Order Management section's "Inventory Summary" card and the tab detail/checkout pages it and the Express flow link to each carry their **own** page-level `redirect()` role gate (separate from the server-action checks), which still excluded `csr`:
   - `app/dashboard/orders/tabs/[tabId]/page.tsx` (tab detail — Write Off / Delete Tab / Edit Tab Name live here)
   - `app/dashboard/orders/tabs/[tabId]/checkout/page.tsx` (admin tab checkout/manual payment)
   - `app/dashboard/orders/inventory-summary/page.tsx`
   - `app/dashboard/orders/inventory-updates/page.tsx`

   Without widening these, `csr` could open `/dashboard/orders` and see every button, but many would silently redirect them to `/dashboard` before ever reaching the server action — the exact "visible but broken" bug class this REQ exists to fix, just one layer up from where the original plan looked. Caught by a genuine local E2E failure (the `csr` write-off test hit a redirect, not the write-off dialog) rather than by static review — logged here as a process note for future REQs touching page-level RBAC: check the page component's own gate, not just the server actions it calls.

2. **`app/actions/inventory/snapshot-actions.ts` needed the same treatment.** The Inventory Summary flow calls 5 of this file's functions (`generateSnapshotDataAction`, `submitSnapshotAction`, `getSnapshotHistoryAction`, `checkExistingSnapshotAction`, `resubmitSnapshotAction`) — all now widened to `csr`, matching the existing `admin`+`super-admin` general tier. The file's other 5 functions (`getPendingSnapshotsAction`, `getSnapshotDetailsAction`, `approveSnapshotAction`, `rejectSnapshotAction`, `updateSnapshotItemsAction`) belong to a separate, `super-admin`-only approval/reconciliation workflow not reachable from Admin Order Management — left untouched, consistent with this REQ's treatment of every other override/approval tier.

3. **`components/features/admin/tabs/create-tab-dialog.tsx` deleted.** Fully orphaned once Quick Actions' "Open a New Tab" (its only caller) was removed — confirmed via project-wide grep before deletion.

4. **`e2e/critical/daily-report-payments.spec.ts` updated.** Its two tab-creation helpers drove the same now-deleted "Open a New Tab" dialog (unrelated to this REQ's own ACs — it's a daily-report-accuracy spec that happened to use that UI as a means to open a tab). Replaced with the Express create-tab flow; verified 11/11 passing afterward.

All four points are mechanical consequences of the original AC2/AC6 intent, not new scope — no new AC, SRS item, or risk-register entry needed.

## 3. Architecture decisions

- **No ADR needed** — This REQ only widens the allowed-roles string array in existing, unchanged authorization checks across 4 files (`app/dashboard/orders/page.tsx` UI deletion + role-guard edits in `express-actions.ts`, `tab-actions.ts`, `order-management-actions.ts`). No new dependency, external service, database/cache/queue tier, or authorization _mechanism_ is introduced — the same `role !== X` / `.includes(session.role)` pattern already in use is edited, not replaced. Risk class is HIGH because the change is RBAC-sensitive (widened permissions), not because it is architecturally significant; `deleteTabAction`'s `superAdminOverride` path is explicitly left untouched. Operator may override this verdict at the Phase 1 HIGH-risk plan-approval checkpoint if they disagree.

## 4. E2E test coverage

- **Spec(s):**
  - `e2e/authenticated.spec.ts` — AC1/AC2 (Quick Actions absent for admin/super-admin/csr; Admin Order Management visible to all three, including csr's own dashboard-visibility test).
  - `e2e/critical/csr-order-tab-parity-req109.spec.ts` (new) — AC3–AC7 (csr Express create-tab/add-order/close-tab lifecycle; csr cancel/delete order; csr write-off tab; csr and admin both still blocked from the delete-order super-admin override).
  - `e2e/critical/daily-report-payments.spec.ts` (updated, not new AC coverage) — its pre-existing tab-creation helpers were fixed to use the Express flow instead of the deleted Quick Actions dialog; see Plan deviation §4.
- **ACs covered:** AC1, AC2, AC3, AC4, AC5, AC6, AC7. AC8 (customer checkout unaffected) verified by inspection (no code change to `/menu`/`/checkout`; no existing customer-facing spec needed updating) rather than a new/updated spec.
- Full local run: `npx playwright test --project=critical` — 286 passed, 3 failed (all pre-existing concurrent-worker report-aggregate-delta flakes in unrelated specs — `admin-order-inventory-delta.over-sell.spec.ts`, `dashboard-revenue.spec.ts`, `express-order-report.spec.ts` Transfer-payment variant — confirmed via isolated single-worker reruns to pass cleanly when not competing for shared daily-report state with other revenue-creating tests; none touch REQ-109's changed files).

## 5. Threat model + security considerations

| Threat                                                                                                                                                                                                          | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elevation of Privilege — widening `csr`'s role guard accidentally also widens `deleteTabAction`'s `superAdminOverride` path, letting `csr`/`admin` bypass reconciliation controls meant for `super-admin` only. | Medium     | High   | The override check (`tab-actions.ts:674`, `session.role !== 'super-admin'`) is a separate `if` from the general role guard being widened; AC7 adds an explicit E2E regression test asserting `csr` and `admin` are rejected on the override path. Code review diff explicitly isolates the two checks.                              |
| Elevation of Privilege — a role-guard edit accidentally loosens a check beyond `csr` (e.g. typo admits `customer`).                                                                                             | Low        | High   | Each edited guard is a small, reviewable `includes()`/`!==` change; unit/integration tests assert `customer`/unauthenticated callers are still rejected on every widened action.                                                                                                                                                    |
| Tampering — `csr` given access to destructive actions (`deleteOrderAction`, `deleteTabAction` general path, `writeOffTabAction`) they didn't have before.                                                       | Medium     | Medium | This is an intentional, explicitly-approved scope change (per issue #902 and operator confirmation), not an oversight; flagged in the plan and PR description for reviewer sign-off. Existing `AuditLogService` calls in these actions are unchanged, so `csr`-performed deletions/write-offs remain attributable in the audit log. |
| Information Disclosure — none new; no new data surface is exposed, only existing staff-only actions gain one more staff role.                                                                                   | Low        | Low    | N/A                                                                                                                                                                                                                                                                                                                                 |

**Secrets / credentials:** N/A — no secrets/credentials introduced or handled by this change.

**Dependencies introduced:** None.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md` (project convention: `R-NNN`, not `RISK-NNN`):

- **R-034 — `csr` granted destructive tab/order-management actions previously restricted to admin/super-admin** — Status: ACCEPTED. Intentional, operator-confirmed scope decision (issue #902); compensating control is the existing, unchanged `AuditLogService` attribution on every widened action.
- **R-035 — Role-guard widening for `csr` could accidentally also loosen the super-admin-only delete-tab override** — Status: MITIGATED. The two `deleteTabAction` checks are edited independently (diff-reviewable), and AC7 adds a permanent regression test asserting `csr`/`admin` remain rejected on the `superAdminOverride` path.

The info-disclosure threat in the table above is `@risk-deferred: no new data surface is exposed — csr already had read access to the same tabs/orders data via other dashboard cards before this REQ` — not register-worthy on its own.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ only changes role-based authorization checks (which staff role may call existing tab/order-management server actions) and removes a UI section. It does not add, change, or expand what personal data is collected, displayed, or retained — `csr` already had visibility into the same customer/order data via the dashboard's other cards (Tabs Display, Kitchen Display); this REQ only lets `csr` also _act_ on tabs/orders they could already see.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change any AI/ML behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit. All changes are role-guard string-array edits and a UI section deletion — no schema or data migration involved.
- **Data implications of rollback:** None. No new data is written by this change; a `csr`-created tab/order after this ships is a normal tab/order indistinguishable from one created by `admin`, and remains valid data after rollback (rollback only re-restricts _future_ actions, it doesn't invalidate past ones).
- **Notification path if rollback during a release:** Standard incident path — comment on REQ-109's issue/PR, notify via the project's existing on-call/incident process, re-deploy the previous production SHA.

## 9. Verification

- **Unit + integration tests:** New/updated tests for each widened server action asserting `csr` is now permitted and `customer`/unauthenticated remain rejected; explicit regression test that `deleteTabAction`'s `superAdminOverride` still rejects `csr` and `admin`.
- **E2E coverage:** see §4 for spec pointer(s) once `e2e-test-engineer` completes; covers AC1–AC8 above, including role-specific dashboard visibility and the customer `/menu` → `/checkout` regression check.
- **Manual smoke after deploy:** Log in as `csr`, `admin`, `super-admin`, and exercise create-tab/create-order/close-tab/cancel-order/delete-order/write-off-tab from `/dashboard/orders`; confirm "Quick Actions" is absent for all three; log in (or as guest) and complete a `/menu` → `/checkout` order.
- **Monitoring / alerting:** None new; existing `AuditLogService` entries on these actions remain the audit trail for `csr`-performed actions post-release.

## 10. Sign-off

- **Plan reviewer (eng):** REPLACE — name + date
- **Plan reviewer (security / DPO):** N/A — no GDPR/AI scope; threat model is RBAC-only, standard code review covers it.
- **Plan approved by operator:** REPLACE — name + date

## Upload path

This file lives at `compliance/plans/REQ-109/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
