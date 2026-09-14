---
title: 'Implementation plan — REQ-104'
requirement_id: 'REQ-104'
risk_class: 'LOW'
change_type: 'feat'
authored_by: 'agent (sdlc-implementer)'
authored_at: '2026-09-14'
---

# Implementation plan — REQ-104

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | N/A — see §6.                                              |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A — see §7.                                              |

## 1. Goal + acceptance criteria

- **Goal:** Let admins create and archive tags, attach them to pending-expense line items at creation, and filter the expense list by one or more tags.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                  | SRS item it traces to |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| AC1 | Given the pending-expense creation form (`/dashboard/finance/expenses` → Add Expense), When an admin types a new tag name into a line item's tag field and confirms, Then a new tag is created and attached to that line item, and appears immediately in the tag field as a selected badge. | REQ-FIN-006 (new)     |
| AC2 | Given the same form, When an admin selects an existing tag from the dropdown, Then it's attached to that line item without creating a duplicate tag.                                                                                                                                         | REQ-FIN-006 (new)     |
| AC3 | Given a tag with existing expense references, When a super-admin/admin archives it (from the tag management list), Then it no longer appears in the create-dropdown for new line items, but expenses that already reference it continue to display it correctly.                             | REQ-FIN-006 (new)     |
| AC4 | Given the expense list (`/dashboard/finance/expenses`), When one or more tags are selected in the tag filter, Then only expenses carrying at least one of the selected tags are shown.                                                                                                       | REQ-FIN-006 (new)     |
| AC5 | Given a transferred pending expense group whose line items carried tags, When the resulting `Expense` ledger record is viewed/filtered, Then it retains those tags.                                                                                                                          | REQ-FIN-006 (new)     |

## SRS items proposed/touched

| AC      | SRS item                     | Status                                           | Notes                                                                                                                                                                                                                   |
| ------- | ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1-AC5 | REQ-FIN-006 (new — proposed) | authored (canonical Given/When/Then, not a stub) | New item covering the whole tag lifecycle; cross-referenced from REQ-026 (pending expense groups) and REQ-FIN-003. No existing SRS item covered tagging/categorization beyond the unrelated free-text `category` field. |

## 2. Scope

- **In scope:**
  - New `Tag` model + service + server actions (create, list active, list all, archive, restore).
  - `PendingExpenseGroup`'s `ExpenseLineItemSchema` gains `tagIds`; propagated to `Expense` at transfer.
  - New creatable-combobox UI component (`components/ui/tag-combobox.tsx`).
  - `expense-form.tsx` / `edit-pending-group-dialog.tsx` — per-line-item tag combobox.
  - `expense-list.tsx` — tag multi-select filter.
  - A minimal tag management list (archive/restore) reachable from Settings.
- **Out of scope:**
  - Editing tags on an already-transferred `Expense` record via the expense-edit dialog — that's REQ-105 (bundled sibling, issue #768), which already plans to add a `TagCombobox` there once this REQ's `Tag` model exists.
  - Cash/transfer payment method, cash position, deposits — REQ-106 (bundled sibling, issue #769), unrelated data model.

### Surface inventory (MEDIUM/HIGH risk — required)

LOW risk — surface inventory table not required per template; the two user-facing surfaces are named directly in the ACs above (pending-expense creation form, expense list).

## 3. Architecture decisions

- **No ADR needed** — assessed by `adr-author` against the decision tree: new single-purpose Mongoose collection (`Tag`) following the existing `archivedAt` soft-delete pattern already used twice in this codebase (`Inventory`, `MenuItem`), and the existing ObjectId-array-ref pattern (`Order.appliedRewards`, `User.favoriteItems`) for the `tagIds` field — no new third-party dependency, no new database/cache/queue tier, no new external service, and no cross-cutting pattern change (the multiple touched files are all new-feature wiring, not a change to an existing pattern spanning them). Risk class is LOW. No `sdlc-config.json:adr_author.file_paths_signal_architecture` match.

## 4. E2E test coverage

- **Spec(s):** `e2e/finance/cash-tags-and-edit.spec.ts` (shared spec file, bundled REQ-104/105/106; `describe('REQ-104: Expense Tags — create inline + attach')`).
- **ACs covered:** AC1, AC2, AC5 (create-inline, attach, and tag persistence through transfer confirmed by direct DB inspection). AC3/AC4 covered by unit tests only — see `compliance/evidence/REQ-104/e2e-scope-decision.md` for the full breakdown.

## 5. Threat model + security considerations

| Threat                                                                 | Likelihood | Impact | Mitigation                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag-name injection into downstream rendering (stored XSS via tag name) | Low        | Low    | Tag names are plain text rendered via React's default escaping (no `dangerouslySetInnerHTML` anywhere in the codebase's expense UI); no change to that convention.                |
| Unauthorized tag creation/archival bypassing admin gate                | Low        | Low    | All new server actions reuse the existing `requireAdminOrAbove` guard already defined in `pending-expense-actions.ts`, identical to how expense category actions are gated today. |

**Secrets / credentials:** None.

**Dependencies introduced:** None — the combobox is hand-built on existing `@radix-ui/react-popover`, no new package.

### Risk register entries

- **@risk-deferred:** LOW risk, purely additive descriptive metadata with no financial-calculation, auth, or data-exposure surface. No RISK-NNN entry warranted.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — tags are free-text labels for internal expense categorization (e.g. "Fuel", "Marketing"); no personal data is read, stored, or displayed.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI/model behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit — new collection/fields are additive; no existing data is migrated or altered.
- **Data implications of rollback:** None — `tagIds` fields simply become unused on rollback; no destructive migration needed either direction.
- **Notification path if rollback during a release:** Standard PR-revert + re-deploy.

## 9. Verification

- **Unit + integration tests:** New tests for `TagService` (create/find-or-create/archive/restore, case-insensitive de-dupe) and for the `tagIds` propagation in `buildExpenseRecordsFromGroup`.
- **E2E coverage:** see §4 — pending `e2e-test-engineer` invocation.
- **Manual smoke after deploy:** Create a tag inline while adding an expense line item; archive it; confirm it disappears from the create-dropdown but stays correctly displayed on the already-tagged expense; filter the expense list by that tag.
- **Monitoring / alerting:** None added — no new failure mode beyond existing expense-management error handling.

## 10. Sign-off

- **Plan reviewer (eng):** N/A — solo-operator project; reviewed by the sdlc-implementer skill flow, human sign-off at UAT.
- **Plan reviewer (security / DPO):** N/A — no GDPR or non-trivial threat-model surface.
- **Plan approved by operator:** LOW risk — auto-continues per Phase 1 step 11.

## Upload path

This file lives at `compliance/plans/REQ-104/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
