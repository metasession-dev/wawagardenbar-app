# AI Prompt Log — REQ-034

**Risk Level:** HIGH (AI-prompts artefact required per Risk-Tiered Review Policy)
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**AI Tool:** Claude Code (Claude Opus 4.7, 1M context)
**Compiled:** 2026-05-09 (scaffold) — finalized before merge

This log captures the substantive prompts that drove design + code generation. Tool-call mechanics (file reads, greps) and conversational filler are omitted.

## Design phase (2026-05-09)

### Prompt 1 — Initial scope

> "we need to be able to record tips as part of the payment process for express and quick actions..."

(Already covered in REQ-035 / REQ-036; included here for context — the kitchen-ingredient inventory work was always on the roadmap.)

### Prompt 2 — Review the issue

> "review https://github.com/metasession-dev/wawagardenbar-app/issues/74"

Resulted in identification of 8 design gaps (UoM matching, cost basis, atomicity, expense reversal, role scope, recipe deactivation, void window, replica-set verification).

### Prompt 3 — Resolve each gap one-by-one

> "ask me the questions one by one for me to answer"

Seven questions answered via AskUserQuestion. Decisions captured in issue body's "Design Resolutions" table.

### Prompt 4 — Add bar/waiting roles

> "we need to add roles for bar and waiting staff along with kitchen but dont apply any restrictions yet"
> "aside from the existing admin and superadmin"

Resulted in scope expansion: kitchen / bar / waiting roles all added in this REQ; kitchen gets default-deny allowlist; bar/waiting get csr-equivalent until future REQs narrow them.

### Prompt 5 — Implement

> "implement https://github.com/metasession-dev/wawagardenbar-app/issues/74"

Triggered:

- Replica-set verification (both prod + UAT confirmed standalone → optimistic deduction)
- REQ-033 prod-deploy date confirmation (2026-05-04 → soak elapses 2026-05-11)
- Codebase reconnaissance (UoMCategory as dimension flag; InventoryItemCostHistory replaces deprecated Inventory.costPerUnit)
- This scaffold

## Implementation phase

(To be populated commit-by-commit during Phase A and Phase B.)

### Phase A prompts

- _(populated during Phase A)_

### Phase B prompts

- _(populated during Phase B)_

## Verification phase

- _(populated post-CI)_
