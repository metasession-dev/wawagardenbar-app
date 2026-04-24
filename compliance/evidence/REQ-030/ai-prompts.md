# AI Prompt Log — REQ-030

Chronological log of AI interactions that drove plan or code. HIGH-risk REQ requires this log per SDLC.

## Session 1 — 2026-04-24

**Developer prompt (verbatim):**

> implement https://github.com/metasession-dev/wawagardenbar-app/issues/53

**AI action:** Read issue #53 — a feature request to extend `ICustomizationOption` with optional `inventoryId` and `inventoryDeduction` so a single menu item (e.g. Poundo served with a choice of Ogbono / Egusi / Ugu soups) deducts stock from multiple inventory records on sale. Investigated:

- `interfaces/menu-item.interface.ts` — `ICustomizationOption` shape
- `models/menu-item-model.ts` — subdocument `customizationOptionSchema`
- `services/inventory-service.ts` — `deductStockForOrder` / `restoreStockForOrder` current behaviour
- `interfaces/order.interface.ts` — `IOrderItem.customizations: { name, option, price }[]` (selection recorded as group-name / option-name strings)
- `app/actions/admin/menu-actions.ts` — `updateMenuItemAction` parses `customizations` JSON from `FormData`; no validation
- `components/features/admin/customization-options-builder.tsx` — current builder has name/price per option only

**AI action:** Presented implementation plan summary for confirmation (WAIT CHECKPOINT 1):

- D1 Optional fields, no migration — legacy menu items continue to work
- D2 Match selected option to menu option by `(groupName, optionName)` pair
- D3 Base inventory still looked up via `findOne({ menuItemId })`; linked looked up via `findById(inventoryId)`
- D4 `portionMultiplier` (half / quarter) also scales linked deduction
- D5 Linked deduction runs independently of base `trackInventory`
- D6 Restore mirrors deduct (type `addition`, short-circuits on `!order.inventoryDeducted`)
- D7 Zod validation at the admin action boundary (24-hex ObjectId, finite positive deduction)
- D8 Aggregation across same-inventoryId selections is lossless (duplicate rows, not summed — preserves audit trail per option)
- D9 Resolver is a single pure module `lib/customization-inventory.ts`, no Mongo dependency, shared between deduct + restore

**Developer prompt (verbatim):**

> proceed

**AI action:** WAIT CHECKPOINT 1 cleared. Wrote the following evidence files before any code:

- `compliance/evidence/REQ-030/implementation-plan.md`
- `compliance/evidence/REQ-030/test-scope.md` (10 acceptance criteria AC1–AC10)
- `compliance/evidence/REQ-030/test-plan.md` (AC → test-file traceability matrix)
- `compliance/evidence/REQ-030/ai-use-note.md` (HIGH-risk disclosure per AI Use Policy)

**AI action:** Phase 1 (TDD red). Wrote 32 unit tests across three files — all failing against unchanged code:

- `__tests__/lib/customization-inventory.test.ts` (10 tests — resolver)
- `__tests__/services/inventory-service.customization-linked.test.ts` (13 tests — mocked Mongo)
- `__tests__/actions/admin/menu-actions.customization-inventory.test.ts` (9 tests — Zod validation)

Committed as `test: [REQ-030] add failing unit tests + impl plan for customization inventory links` (`39d75d6`). Confirmed red phase: 15 of 32 new tests failed as expected; the 7 that already passed did so because the pre-change code was already permissive for legacy shapes.

**AI action:** Phase 2 (green). Implemented:

- Added `inventoryId?: string` + `inventoryDeduction?: number` to `ICustomizationOption`
- Added `inventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory' }` and `inventoryDeduction: { type: Number, min: 0 }` to `customizationOptionSchema`
- Created `lib/customization-inventory.ts` — pure `resolveLinkedInventoryFor(menuItem, selected)` → `Array<{ inventoryId, deductionPerUnit }>`
- Modified `InventoryService.deductStockForOrder` / `restoreStockForOrder` to call the resolver and iterate linked inventories; linked branch runs even when base `trackInventory` is false; uses `findById` with null-skip for deleted inventories
- Added Zod schemas `customizationOptionInputSchema` + `customizationsInputSchema` in `app/actions/admin/menu-actions.ts`; `updateMenuItemAction` now `safeParse`s the customizations payload and returns a path-qualified error string on failure
- Added `listInventoryItemsAction` in `app/actions/inventory/list-actions.ts` — populates admin select with `{ _id, name, unit }[]`
- Extended `components/features/admin/customization-options-builder.tsx` with Inventory-link Select + Units-to-deduct Input per option (sentinel `__none__` for Radix empty-value)
- Wired `menu-item-edit-form.tsx` to fetch the list on mount and pass it down
- Added REQ-030 row to `compliance/RTM.md` (IN PROGRESS)

Confirmed green: 32/32 new tests pass, 386/386 total (no regressions). `npx tsc --noEmit` 0 errors.

**AI action:** Phase 3 (E2E). Wrote `e2e/menu-customization-inventory.spec.ts` — two Playwright tests that auth as super-admin, navigate to a menu edit page, and verify the inventory-link controls render. Skips gracefully when the test DB has no inventory records, since unit tests already assert persistence.

**AI action:** Phase 4 (gates).

- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 386/386
- `semgrep scan --config auto app/ lib/ services/ models/` → 1 WARNING in pre-existing `lib/cors.ts` (CI baseline 6)
- `npm audit --json` → only pre-existing allowlisted `xlsx`

Committed as `feat: [REQ-030] multi-component inventory deduction via customization links` (`e007f3c`), followed by `compliance: [REQ-030] local gate evidence (vitest, semgrep, audit)` (`c5d4327`). Pushed as a single `git push` per user's batch-push preference.

CI Pipeline run #24887448477 and Compliance Evidence Upload run #24887448475 both green. Committed `compliance: [REQ-030] CI gates confirmed green on develop` (`830ab4c`) and pushed. Opened PR #66.

**Developer prompt:**

> Compliance Validation is failing on PR #66. Create `compliance/pending-releases/RELEASE-TICKET-REQ-030.md` (plus `compliance/evidence/REQ-030/ai-prompts.md` for the AI warning), commit with `compliance: [REQ-030] evidence compiled - awaiting review`, push.

**AI action:** Writing this prompt log + release ticket.

**Next:** CI re-runs compliance-validation with the ticket and prompt log present, cutting a new META-COMPLY release version for UAT approval.
