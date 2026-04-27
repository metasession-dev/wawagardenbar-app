# Release Ticket: REQ-030 — Multi-component inventory deduction via customization option links

> **SUPERSEDED 2026-04-25** — This release was never merged. Original scope (REQ-030) shipped only the back-end + admin-config layer; the customer/staff order-time picker was missing, leaving the feature unreachable through the UI. Replaced by REQ-031 which scopes the full end-to-end journey. PR #66 closed unmerged. Back-end commits (`39d75d6`, `e007f3c`, `c5d4327`, `830ab4c`, `4469b6b`) remain on `develop` as the pre-cursor for REQ-031.
>
> **Successor:** REQ-031 / issue #67 / `compliance/evidence/REQ-031/`

**Status:** SUPERSEDED (was: TESTED - PENDING SIGN-OFF)
**Date:** 2026-04-24
**Requirement ID:** REQ-030
**Risk Level:** HIGH (MEDIUM baseline — order-fulfilment / inventory write path — with AI-involvement +1)
**Issue:** #53
**PR:** #66

---

## Summary

A single menu item's customization options can now each link to their own inventory record and per-unit deduction. When an order containing such an item is fulfilled, stock is deducted from both the base item's inventory and every linked inventory referenced by the selected customization options. Cancelling the order restores both sides symmetrically. Legacy customization options (no `inventoryId`) continue to behave exactly as before.

The canonical driving case is Poundo (base menu item with inventory "Poundo") served with a choice of soup (Ogbono / Egusi / Ugu — each its own inventory record): a sale of Poundo + Ogbono must decrement both the Poundo and Ogbono inventories in a single pass, with distinct stock-movement audit rows.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** Planning docs, implementation, unit tests, E2E spec, and compliance artefacts
- **Human Reviewer of AI Code:** ostendo-io (pending)
- **Components Regenerated:** None — every change is a targeted edit
- **Prompt log:** `compliance/evidence/REQ-030/ai-prompts.md`

HIGH risk — requires a second human reviewer per the Review Policy (Risk-Tiered) before merge to main.

---

## Implementation Details

**Files Modified:**

- `interfaces/menu-item.interface.ts` — `ICustomizationOption` gains optional `inventoryId?: string` and `inventoryDeduction?: number`
- `models/menu-item-model.ts` — `customizationOptionSchema` mirrors the new fields (`inventoryId: ObjectId ref 'Inventory'`, `inventoryDeduction: Number min 0`)
- `services/inventory-service.ts` — `deductStockForOrder` / `restoreStockForOrder` consume the new resolver; linked deduction runs independently of base `trackInventory`; missing linked inventory records are silently skipped
- `app/actions/admin/menu-actions.ts` — Zod schemas added; `updateMenuItemAction` `safeParse`s `customizations` payload and returns path-qualified errors on bad `inventoryId` or `inventoryDeduction`
- `components/features/admin/customization-options-builder.tsx` — Inventory-link Select + Units-to-deduct Input per option
- `components/features/admin/menu-item-edit-form.tsx` — fetches inventory list on mount and passes it to the builder
- `compliance/RTM.md` — REQ-030 row added

**Files Created:**

- `lib/customization-inventory.ts` — pure resolver `resolveLinkedInventoryFor(menuItem, selected) → Array<{ inventoryId, deductionPerUnit }>`
- `app/actions/inventory/list-actions.ts` — `listInventoryItemsAction()` for the admin select
- `__tests__/lib/customization-inventory.test.ts` — 10 unit tests
- `__tests__/services/inventory-service.customization-linked.test.ts` — 13 unit tests (mocked Mongo)
- `__tests__/actions/admin/menu-actions.customization-inventory.test.ts` — 9 unit tests
- `e2e/menu-customization-inventory.spec.ts` — Playwright

**Dependencies Added/Changed:** None.

---

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                                                                                                                                                                                 |
| ---------------- | ----- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)    | 32    | 32     | 0      | Git: `__tests__/lib/customization-inventory.test.ts`, `__tests__/services/inventory-service.customization-linked.test.ts`, `__tests__/actions/admin/menu-actions.customization-inventory.test.ts` |
| E2E (Playwright) | 2     | 2      | 0      | Git: `e2e/menu-customization-inventory.spec.ts`                                                                                                                                                   |
| CI (full suite)  | All   | All    | 0      | [CI Run #24887448477](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24887448477)                                                                                              |

Full local vitest: 386 passed / 0 failed (was 354 before this REQ → 386 = 354 + 32 new). No regressions.

---

## Security Evidence

| Check            | Result                                                                                                | Evidence Location                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| SAST             | 1 WARNING in pre-existing `lib/cors.ts` (baseline 6) — 0 new for REQ-030                              | Git: `compliance/evidence/REQ-030/security-summary.md` |
| Dependency Audit | 0 new findings (only pre-existing `xlsx` allowlisted)                                                 | Git: `compliance/evidence/REQ-030/security-summary.md` |
| Access Control   | PASS (admin/super-admin session check unchanged)                                                      | Git: `compliance/evidence/REQ-030/security-summary.md` |
| Input Validation | PASS (Zod: 24-hex ObjectId + finite positive deduction; empty-string stripped; unknown keys stripped) | Git: `compliance/evidence/REQ-030/security-summary.md` |
| NoSQL injection  | PASS (any non-24-hex `inventoryId` rejected before it reaches `findById`)                             | Git: `compliance/evidence/REQ-030/security-summary.md` |

---

## Acceptance Criteria

- [x] AC1 — Menu-item schema accepts optional `inventoryId` + `inventoryDeduction` per option (persistence round-trip)
- [x] AC2 — Resolver maps selected `(groupName, optionName)` pairs to the configured inventory link
- [x] AC3 — `deductStockForOrder` deducts both base and linked inventories, one movement row each, scaled by `quantity * portionMultiplier * deductionPerUnit`
- [x] AC4 — `restoreStockForOrder` restores base and linked symmetrically with `addition` movement rows
- [x] AC5 — If a linked inventory record is missing or a selected option no longer exists on the menu, the fulfilment path silently skips the linked entry (no crash, base still processes)
- [x] AC6 — Admin action rejects malformed `inventoryId` (non-24-hex) and bad `inventoryDeduction` (0 / negative / NaN / Infinity); empty-string `inventoryId` is stripped
- [x] AC7 — Admin UI exposes inventory-link Select + Units-to-deduct Input per option, gated on non-empty inventory list
- [x] AC8 — Orders / menu items without any `inventoryId` continue to behave exactly as before (legacy-safe)
- [x] AC9 — Regression: 354 pre-existing unit tests still green
- [x] AC10 — Linked deduction runs independently of base `trackInventory` (drink with garnish scenario)

---

## Post-Deploy Actions

None required. No data migration — new fields are optional and default to absent on existing documents. No feature flag. No cache invalidation.

---

## Rollback Plan

Revert the merge commit on `main`. The new schema fields are optional, so documents saved with links will still validate against the old schema (Mongoose will simply ignore them on load). Admin UI reverts to the prior shape. No data changes to undo.

---

## UAT Verification

_Pending — to be performed against the UAT environment after compliance commit; results will be appended to `compliance/evidence/REQ-030/security-summary.md`._

**Planned checks:**

1. UAT health check: `GET /` → 200
2. UAT smoke test: `/dashboard/menu/<item>/edit` loads, customization builder renders
3. Feature verification (round-trip): link an existing menu-item option to an inventory record with Units-to-deduct `2.5`, save, reload — the link and deduction are still present
4. Negative verification: attempt to persist `inventoryDeduction: 0` via devtools / API — server rejects with 400-style error
5. Regression: order an unrelated menu item, confirm base-only deduction still works

---

## Reviewers

- [ ] Human reviewer #1 (required for HIGH risk) — ostendo-io
- [ ] Second human reviewer (required for HIGH risk, AI-involvement +1)
- [ ] UAT sign-off — META-COMPLY release

---

## Audit Trail

| Date       | Action                    | Actor       | Notes                                                                                     |
| ---------- | ------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| 2026-04-24 | Requirement created       | ostendo-io  | Risk: HIGH, GitHub issue #53                                                              |
| 2026-04-24 | Implementation plan       | Claude Code | Approved by ostendo-io (WAIT CHECKPOINT 1)                                                |
| 2026-04-24 | Test scope + test plan    | Claude Code | Authored after plan approval                                                              |
| 2026-04-24 | Unit tests written (TDD)  | Claude Code | 32 tests — 15 initially failing against pre-change code (`39d75d6`)                       |
| 2026-04-24 | Implementation completed  | Claude Code | `lib/customization-inventory.ts`, service wired, Zod added, admin UI extended (`e007f3c`) |
| 2026-04-24 | E2E spec written          | Claude Code | `e2e/menu-customization-inventory.spec.ts`                                                |
| 2026-04-24 | Local gates passed        | Claude Code | tsc 0, vitest 386/386, semgrep 1 (baseline 6), audit xlsx-only                            |
| 2026-04-24 | CI gates passed (develop) | CI          | Run #24887448477 — TSC, SAST, audit, E2E, build all green                                 |
| 2026-04-24 | Evidence compiled         | Claude Code | Security summary, test execution summary, release ticket, AI prompt log                   |
| 2026-04-24 | PR opened                 | Claude Code | PR #66                                                                                    |
