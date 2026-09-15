---
title: 'Implementation plan — REQ-105'
requirement_id: 'REQ-105'
risk_class: 'LOW'
change_type: 'fix'
authored_by: 'agent (sdlc-implementer)'
authored_at: '2026-09-14'
---

# Implementation plan — REQ-105

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                         |
| --------------------------------------------------------- | --------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + verification strategy per AC. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.        |
| **GDPR Art. 25** Data protection by design and by default | N/A — see §6.                                       |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A — see §7.                                       |

## 1. Goal + acceptance criteria

- **Goal:** `EditExpenseDialog` (super-admin only) silently omits four fields (`transactionFee`, `receiptReference`, `referenceNumber`, `linkedInventoryId`) that `UpdateExpenseDTO`/`ExpenseService.updateExpense` already fully support editing. Surface them in the UI, and show the remaining audit/traceability fields read-only for a complete "view all details" experience.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                     | SRS item it traces to |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| AC1 | Given the expense edit dialog, When a super-admin opens it for any expense, Then `transactionFee`, `receiptReference`, `referenceNumber`, and `linkedInventoryId` are shown as editable fields and persist correctly on save.                                                   | REQ-FIN-007 (new)     |
| AC2 | Given an expense with an active inventory link, When a super-admin changes `linkedInventoryId`/`quantity`/`amount` together via this dialog, Then the existing REQ-034 inventory-link reversal/reapply logic in `ExpenseService.updateExpense` fires correctly (no regression). | REQ-FIN-007 (new)     |
| AC3 | Given the expense edit dialog, When a super-admin opens it, Then `pendingGroupId` (if set), `createdBy`, `createdAt`, and `updatedAt` are visible in a read-only info block, not editable.                                                                                      | REQ-FIN-007 (new)     |
| AC4 | Given a non-super-admin, When they view an expense, Then edit access remains unavailable, unchanged from current behavior.                                                                                                                                                      | REQ-FIN-007 (new)     |
| AC5 | Given an already-transferred expense, When a super-admin opens the edit dialog, Then they can add (existing or newly created inline) and remove tags — including clearing all tags — and the change persists on save.                                                           | REQ-FIN-007 (amended) |

## Requirements gap accepted (amended post-UAT, iteration 1)

**Gap:** AC5 was missing from the original plan. The plan's own §2 scope note ("If Part 1 (Tags) ships first or alongside, add a TagCombobox field here too so tags remain editable post-transfer") correctly identified the touchpoint but never turned it into an AC, so it shipped as a silent gap: `UpdateExpenseDTO` had no `tagIds` field and `edit-expense-dialog.tsx` had no tag UI at all. Surfaced during UAT of the shared bundle PR — the operator could not edit or remove a tag on an existing expense.

**Resolution:** Amended the AC table (AC5 above), added `tagIds?: string[]` to `UpdateExpenseDTO`/`ExpenseService.updateExpense` (the generic `$set` payload builder already handled it once typed — including an empty array to clear all tags), added the `TagCombobox` to `edit-expense-dialog.tsx` sourced from `listAllTagsAction()` (not `listActiveTagsAction()`, so an already-attached-but-since-archived tag still renders/removes correctly). `docs/SRS.md` REQ-FIN-007 updated with the new Given/When/Then. New unit test (`expense-service.update-fields.test.ts`) and e2e test (`cash-tags-and-edit.spec.ts` AC5) added.

## SRS items proposed/touched

| AC      | SRS item                     | Status                                           | Notes                                                                                                                                                                                                                                                                                                                |
| ------- | ---------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1-AC4 | REQ-FIN-007 (new — proposed) | authored (canonical Given/When/Then, not a stub) | No existing SRS item covers the expense-edit dialog at all (grep confirms zero hits for `updateExpenseAction`/`EditExpenseDialog`) — this is retroactively documenting an existing capability while fixing its field-completeness gap. Cross-referenced from REQ-FIN-001 (create+list) and REQ-034 (inventory-link). |
| AC5     | REQ-FIN-007 (amended)        | authored (canonical Given/When/Then, not a stub) | Added post-UAT — see "Requirements gap accepted" above.                                                                                                                                                                                                                                                              |

## 2. Scope

- **In scope:** `components/features/finance/edit-expense-dialog.tsx` only — form fields, zod schema, submit payload.
- **Out of scope:** `app/actions/finance/expense-actions.ts` (no signature change needed — `updateExpenseAction`/`UpdateExpenseDTO` already accept all four fields); `stockMovementId`/`linkVoidedAt` (internal/derived, not user-meaningful, stay out of the dialog entirely).

### Surface inventory (MEDIUM/HIGH risk — required)

LOW risk — table not required; single surface named directly in the ACs (the expense edit dialog).

## 3. Architecture decisions

- **No ADR needed** — single-file UI change surfacing fields an already-shipped API already supports; no new dependency, no new pattern, no schema change. Risk class is LOW.

## 4. E2E test coverage

- **Spec(s):** `e2e/finance/cash-tags-and-edit.spec.ts` (shared spec file, bundled REQ-104/105/106; `describe('REQ-105: Expense edit dialog — full field visibility')`).
- **ACs covered:** AC1, AC3. AC2 covered by pre-existing REQ-034 unit tests (unchanged logic); AC4 is pre-existing unchanged behaviour. See `compliance/evidence/REQ-105/e2e-scope-decision.md`.

## 5. Threat model + security considerations

| Threat                                                                                                           | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfacing `linkedInventoryId` edit re-opens the REQ-034 stock-quantity manipulation surface to a wider field set | Low        | Low    | The reversal/reapply logic is pre-existing (`services/expense-service.ts:263-343`) and already handles this correctly today via the DTO path — this REQ only adds a UI trigger for logic that already exists and is already tested; the guard against driving `Inventory.currentStock` below zero is unchanged. |

**Secrets / credentials:** None.

**Dependencies introduced:** None.

### Risk register entries

- **@risk-deferred:** LOW risk — this REQ surfaces existing, already-validated backend capability; no new attack surface or financial-calculation risk beyond what REQ-034 already assessed for the inventory-link reversal logic.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — `supplier`/`receiptReference`/`referenceNumber` are business transaction metadata, not personal data about an identifiable individual.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A.

## 8. Rollback plan

- **Reversible via:** `git revert` — UI-only change, no schema/migration.
- **Data implications of rollback:** None.
- **Notification path if rollback during a release:** Standard PR-revert + re-deploy.

## 9. Verification

- **Unit + integration tests:** Extend existing `ExpenseService.updateExpense` test coverage if any gaps are found for the four newly-surfaced fields (the service-level DTO already has test coverage per REQ-034; this REQ's tests focus on the dialog wiring reaching the service correctly).
- **E2E coverage:** see §4.
- **Manual smoke after deploy:** As super-admin, open an existing expense's edit dialog, edit `transactionFee`/`receiptReference`/`referenceNumber`, save, reopen and confirm persistence; confirm `pendingGroupId`/`createdBy`/`createdAt` display read-only.
- **Monitoring / alerting:** None added.

## 10. Sign-off

- **Plan reviewer (eng):** N/A — solo-operator project; reviewed by the sdlc-implementer skill flow, human sign-off at UAT.
- **Plan reviewer (security / DPO):** N/A.
- **Plan approved by operator:** LOW risk — auto-continues per Phase 1 step 11.

## Upload path

This file lives at `compliance/plans/REQ-105/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
