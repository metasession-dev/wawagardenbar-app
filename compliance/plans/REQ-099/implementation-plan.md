---
title: 'Implementation plan — REQ-099'
requirement_id: 'REQ-099'
risk_class: 'MEDIUM'
change_type: 'fix'
authored_by: 'agent (sdlc-implementer)'
authored_at: '2026-08-16'
---

# Implementation plan — REQ-099

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | N/A — see §5.                                              |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A — see §6.                                              |

## 1. Goal + acceptance criteria

- **Goal:** In the Tabs Management list view, make written-off tabs visually distinct from genuinely-paid closed tabs, and let admins filter the list to written-off tabs directly, instead of the list rendering both the same way ("closed" badge + "Tab Paid" button) and forcing admins to eyeball a "Closed" filter result.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                          | SRS item it traces to                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| AC1 | Given a written-off tab (`paymentStatus === 'written-off'`), When an admin opens `/dashboard/orders/tabs` (Tabs Management list), Then the tab's card shows a distinct "Written off" badge instead of the generic status badge, and does not render the "Tab Paid" button.                           | REQ-TABMGT-009 (new)                                                       |
| AC2 | Given the Tabs Management filter panel, When an admin checks a new "Written off" checkbox, Then the list re-queries and shows only tabs with `paymentStatus === 'written-off'`, independent of which `status` checkboxes (Open/Settling/Closed) are checked.                                         | REQ-TABMGT-009 (new)                                                       |
| AC3 | Given the existing "Closed" status checkbox, When an admin checks only "Closed" (Written off unchecked), Then the list behaves exactly as before this change — genuinely-paid closed tabs and written-off tabs both appear, unfiltered by payment status (no regression to the pre-existing filter). | REQ-TABMGT-001 (existing — updated, was stale on the new filter dimension) |

## SRS items proposed/touched

| AC       | SRS item                  | Status                   | Notes                                                                                                                        |
| -------- | ------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| AC1, AC2 | REQ-TABMGT-009 (new)      | added                    | Written-off tab list badge + filter — no existing SRS item covered the payment-status-driven badge/filter distinction.       |
| AC3      | REQ-TABMGT-001 (existing) | updated (drift resolved) | Added a Given/When/Then line clarifying status-checkbox filtering is unchanged when the new "Written off" filter isn't used. |

Both edits landed directly in `docs/SRS.md` (canonical prose, not stubs) — solo-operator dual-actor sign-off per Phase 4 §2 interpretation (AI tooling authored, human operator reviews at UAT).

## 2. Scope

- **In scope:**
  - `components/features/admin/tabs/dashboard-tabs-list-client.tsx` — badge rendering + action-button branch for written-off tabs.
  - `components/features/admin/tabs/dashboard-tabs-filter.tsx` — new "Written off" filter checkbox, independent of the status checkbox group.
  - `app/actions/tabs/tab-actions.ts` — `getDashboardFilteredTabsAction` filter param passthrough.
  - `services/tab-service.ts` — `TabService.listAllTabsWithFilters` query construction for the new `writtenOffOnly` filter.
- **Out of scope:**
  - The tab detail page (`/dashboard/orders/tabs/[tabId]`) and the Daily Report's "Written off (bad debt)" section — both already correctly distinguish write-offs per the issue's own investigation; no changes needed.
  - The filter's date-range field querying `openedAt` instead of `closedAt`/`businessDate` — flagged in the issue as a separate, out-of-scope concern; left for a follow-up issue.

### Surface inventory (MEDIUM/HIGH risk — required)

| Surface                                             | URL / file                                                                                 | Status                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Tabs Management list — status badge / action button | `/dashboard/orders/tabs` — `components/features/admin/tabs/dashboard-tabs-list-client.tsx` | In scope                                                                       |
| Tabs Management list — status filter panel          | `/dashboard/orders/tabs` — `components/features/admin/tabs/dashboard-tabs-filter.tsx`      | In scope                                                                       |
| Tab detail page status badge                        | `/dashboard/orders/tabs/[tabId]`                                                           | Already works — renders `tab.paymentStatus` directly (per issue investigation) |
| Daily Report "Written off (bad debt)" section       | `/dashboard/reports/daily` — `components/features/reports/written-off-section.tsx`         | Already works — REQ-098 AC6, unaffected by this REQ                            |

## 3. Architecture decisions

- **No ADR needed** — this is an additive UI-rendering + query-filter change on an existing, already-designed data model (`Tab.paymentStatus === 'written-off'` shipped in REQ-098 / ADR-003). No new dependency, no new database/cache/queue, no new external service. The 4 touched files (`dashboard-tabs-list-client.tsx`, `dashboard-tabs-filter.tsx`, `tab-actions.ts`, `tab-service.ts`) are the standard existing action→service layering already used by every other filter on this same list view — not a new pattern spanning the codebase, just this one existing filter/query flow gaining one more filter dimension.

## 4. Threat model + security considerations

| Threat                                                                       | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New filter param (`writtenOffOnly`) used to bypass RBAC and read tabs        | Low        | Low    | `getDashboardFilteredTabsAction` already requires `session.role === 'admin' \| 'super-admin'` before calling `TabService.listAllTabsWithFilters` — the new param is validated the same way as existing `statuses`/`reconciled` params (boolean coercion only, no injectable string passed to the Mongo query beyond the fixed literal `'written-off'`). |
| Query construction regression leaks tabs outside the admin's intended filter | Low        | Low    | AC3 pins the "no regression to existing Closed-filter behaviour" case; unit tests cover both the `writtenOffOnly` true/false branches of `listAllTabsWithFilters`.                                                                                                                                                                                      |

**Secrets / credentials:** None — no new secrets, no new credential handling.

**Dependencies introduced:** None — reuses existing `lucide-react` (`FileX` icon, already used by `write-off-tab-dialog.tsx` for write-off UI elsewhere) and existing `Badge`/`Checkbox` UI primitives.

### Risk register entries

@risk-deferred: Purely additive UI + read-query change on an existing, already-risk-assessed data field (`paymentStatus: 'written-off'` and its RBAC/audit posture were assessed under REQ-098's RISK-019 through RISK-022, which remain MITIGATED and unchanged by this REQ). No new risk surface — this REQ only makes existing, already-correct data visible in one more place; it changes no write path, no RBAC gate, and no audit-logging behaviour.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ only changes how the (non-personal) `Tab.paymentStatus` / `Tab.status` fields are rendered and filtered in an existing admin-only dashboard view. No new field is read, stored, or transmitted; no data subject-identifying field is touched.

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI/model behaviour. Standard UI + query-filter code, implemented and reviewed under the project's SDLC (AI-assisted implementation, disclosed via `Co-Authored-By` on commits per standard project practice — not "AI in scope" in the Art. 11 sense of AI being part of the shipped product behaviour).

## 7. Rollback plan

- **Reversible via:** `git revert` of the merge commit — no data migration, no schema change, no irreversible write path touched.
- **Data implications of rollback:** None. The change only affects list rendering and a GET-style filter query; no data is written differently by this REQ.
- **Notification path if rollback during a release:** Standard project practice — comment on the REQ-099 issue + release ticket noting the revert and reason; no customer-facing or financial-reporting impact from a rollback (the Daily Report and tab detail page, which are the financially load-bearing surfaces, are unaffected by this REQ).

## 8. Verification

- **Unit + integration tests:** New Vitest cases for `TabService.listAllTabsWithFilters` covering: (a) `writtenOffOnly: true` with no `statuses` → query filters strictly on `paymentStatus: 'written-off'`; (b) `writtenOffOnly: true` with `statuses: ['closed']` → query returns tabs matching either `status` OR `paymentStatus: 'written-off'` (AC2 "independent of status checkboxes"); (c) `writtenOffOnly` unset/false → existing behaviour unchanged (AC3 regression guard).
- **E2E coverage:** Playwright spec(s) tagged `REQ-099` under `e2e/` (authored via `e2e-test-engineer`) covering: written-off tab renders the distinct badge and no "Tab Paid" button in the list (AC1); checking the new "Written off" filter checkbox isolates written-off tabs (AC2); existing "Closed" filter behaviour is unchanged when "Written off" is unchecked (AC3).
- **Manual smoke after deploy:** Load `/dashboard/orders/tabs`, confirm a known written-off tab (e.g. one of the 17 tabs written off under REQ-098's 2026-08-14 production remediation) shows the new badge and the "Written off" filter isolates it.
- **Monitoring / alerting:** None new — no new failure mode introduced beyond existing dashboard-load error handling (`toast` on `getDashboardFilteredTabsAction` failure, already in place).

## 9. Sign-off

- **Plan reviewer (eng):** N/A — solo-operator team, actor-type dual-review per Phase 4 §2 (AI tooling vs. human operator).
- **Plan reviewer (security / DPO):** N/A — no GDPR/threat-model sections non-trivial (see §4, §5).
- **Plan approved by operator:** Pending — MEDIUM risk auto-continues past Phase 1 per skill policy; operator reviews at UAT (Phase 4).

## Upload path

This file lives at `compliance/plans/REQ-099/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
