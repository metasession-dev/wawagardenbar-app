# AI Prompt Log — REQ-031

Chronological log of AI interactions that drove plan or code. HIGH-risk REQ requires this log per SDLC.

## Session 1 — 2026-04-25

**Developer prompt:**

> open issue 67 and start to implement it

**AI action:** Investigated REQ-030 (PR #66) and confirmed the picker UI gap across all three order-creation surfaces (customer modal, Express Order, Edit Order dialog) — none rendered a picker, leaving REQ-030's back-end logic unreachable through the UI.

Drafted implementation plan at `compliance/evidence/REQ-031/implementation-plan.md` with WAIT CHECKPOINT 1 per SDLC.

**Developer prompt:**

> I would rather dump the current inflight change #53 and start again making sure it is a complete e2e solution. I hindsight is there a better way to define the feature and implement it for a complete solution and not this haphazard situation we find ourselves in??

**AI action:** Honest retrospective. Identified root cause as the AC-writing pattern in the SDLC template — REQ-030's ACs were technical-layer assertions ("schema accepts field X") that pass unit tests while being unreachable through the UI. Proposed three SDLC patches: surface inventory enumeration, Given/When/Then ACs, and gate the WAIT CHECKPOINT on both.

**Developer prompt:**

> proceed with issue body and RTM superceded wording and create in issue in meta-comply for SDLC patch

**AI action:** Drafted three artefacts: new issue body for #67, RTM update to mark REQ-030 SUPERSEDED, and SDLC patch issue body. Filed META-COMPLY [#152](https://github.com/metasession-dev/META-COMPLY/issues/152) and wawagardenbar-app [#67](https://github.com/metasession-dev/wawagardenbar-app/issues/67). Closed PR #66 unmerged. Moved release ticket to `compliance/superseded-releases/`. Updated RTM.

**Developer prompt:**

> complete 1. 2 and 3

**AI action:** Closed PR #66 with full superseded message, committed compliance changes (`ab33003`), and started REQ-031 Stage 1 plan rewrite using the new template (informally — META-COMPLY #152 still open).

**AI action:** Wrote `implementation-plan.md` with Surface Inventory (S1–S20), `test-scope.md` with Given/When/Then ACs (AC1–AC11), `test-plan.md` with AC↔test mapping, `ai-use-note.md`. Presented at WAIT CHECKPOINT 1.

**Developer prompt:**

> the venue may not be using a non 0 option for some customizations

**AI action:** Confirmed that customization-option surcharges are real (not all zero). Discussed two approaches for half/quarter portion behaviour. Default chose Option B: surcharge scales with portion (matches REQ-030's linked-deduction scaling).

**Developer prompt:**

> I want to be able to set the combined price when i customise the menu item, how will/can this done or has that already been considered

**AI action:** Recognised the existing `option.price` field can be exposed as either a "surcharge" or a "combined price" — same data model, different admin UX. Designed a live preview that shows both interpretations, plus an optional toggle to enter the combined price directly with auto-derived surcharge. Updated implementation plan to reclassify S17 to **In scope**, added D10 architecture decision (admin combined-price preview), AC12–AC15 to test scope, ~15 new unit tests + 1 new test file (`cart-line-math.test.ts`).

**Developer prompt:**

> proceed

**AI action:** Stage 1 plan committed (`0189e99`). TaskUpdate marked Stage 1 done; moved to Stage 2 TDD.

**AI action — Stage 2 chunk 1:** Wrote `__tests__/lib/cart-line-math.test.ts` (13 tests) and `__tests__/lib/customization-validation.test.ts` (13 tests) as red phase. Confirmed both fail to import the not-yet-existing modules. Committed red (`5ca1ef6`).

**AI action — Stage 2 chunk 1 green:** Implemented `lib/cart-line-math.ts` and `lib/customization-validation.ts` (the canonical home for `SelectedCustomization` type). 26/26 green. Committed (`e86b893`). Full vitest sweep: 412/412 (386 baseline + 26 new).

**AI action — Stage 2 architectural decision:** Discovered the project has no React Testing Library setup (vitest config: `environment: 'node'`, includes only `*.test.ts`). Presented the user with Option A (pure-helper extraction, rendering covered by E2E) vs Option B (set up RTL). Recommended A.

**Developer prompt:**

> A

**AI action:** Updated test-plan.md to reflect helper extraction. Wrote `customization-picker-state.test.ts` (11 tests, red) and `customization-builder-preview.test.ts` (5 tests, red). Committed red. Implemented helpers — 16/16 green. Committed `06487c6`.

**AI action — Stage 2 chunk 2:** Wrote `cart-store-helpers.test.ts` (12 tests) covering merge key + per-line + cart-total math. Implemented helper. Refactored `stores/cart-store.ts` to delegate to the helper. Bumped persist version 1→2 with (initially over-cautious) clear-on-migrate. Committed `bf926d9`.

**AI action — Stage 2 chunk 3:** Wrote `order-line-totals.test.ts` (12 tests) covering reconciler + tamper detection. Implemented helper. Committed `1fe0d99`. Full sweep: 452/452.

**AI action — Stage 2 chunk 4 (vertical slice):** Wrote `customization-picker.tsx` React shell. Wired into `menu-item-detail-modal.tsx`. Updated `cart-item.tsx` for line summary + surcharge-aware per-each price. Updated `payment-actions.ts` (`createOrder`) to forward customizations and use surcharge-aware math. Committed `aecbf87`. Full sweep: 452/452.

**Developer prompt:**

> push

**AI action:** Pushed develop. CI ran. **First push failed CI** — three E2E cart tests broke because the cart-store v1→v2 migration was clearing items unnecessarily (legacy items without customizations hash to the same merge key — clearing was over-cautious worry).

**AI action:** Fixed migration to be a non-destructive version marker. Committed `55fbced` and pushed. CI green.

**Developer prompt:**

> [reported three display bugs from UAT verification with screenshots]

**AI action:** Investigated all three:

1. `/checkout` Order Summary showed base price (no surcharge) and didn't render customizations
2. Tab detail page didn't render customizations
3. Kitchen card and admin order-items-table used wrong field name (`custom.value` instead of `custom.option`) — pre-existing REQ-030 bug now visible

Fixed all four surfaces in `e2d80bd` (cart sidebar `cart-item.tsx` per-each price also brought in line for visual consistency). Pushed. CI green.

**Developer prompt:**

> proceed

**AI action — Stage 2 chunk 5 (admin surfaces):** Built `customization-picker-dialog.tsx` (shared modal-on-modal wrapper). Wired into:

- Express Order page (`addToCart` opens picker, cart line dedupe includes customizations)
- Edit Order dialog (sub-dialog picker on `handleAddItem`)
- Admin builder (`customization-options-builder.tsx` accepts `basePrice` + `itemName`, renders combined-price preview, optional combined-price input mode toggle)

Wired `reconcileAndValidateOrderLines` into:

- `expressCreateOrderAction`
- `updateOrderItemsAction`
- `POST /api/public/orders` (with tamper detection — `clientTotal` parameter)

Fixed `getAvailableMenuItemsAction.select(...)` which was loading the wrong field name (`customizationOptions` — non-existent — instead of `customizations`). Initially committed in `9d9368e` but the change didn't stick (linter/autofix conflict); re-fixed in `cbadb07`.

**Developer prompt:**

> the orders page needs to display the customization options [screenshot] then continue

**AI action:** Updated `order-card.tsx` to render `summariseSelected` under each line. Committed `66dd3e2` and pushed.

**AI action — Stage 2 final + Stage 3 evidence:** Wrote `e2e/menu-customization-picker.spec.ts` (3 tests). Wrote `docs/customization-options-user-guide.html` and rendered to PDF (6 pages A4) — gates AC10. Captured gates: tsc 0, vitest 452/452, semgrep 0 new (1 pre-existing baseline), audit 0 new (1 pre-existing allowlisted). Wrote security-summary.md, test-execution-summary.md, this prompt log.

**Next:** Move RTM status DRAFT → TESTED, write the release ticket, push, await user sign-off for Stage 4 PR opening.
