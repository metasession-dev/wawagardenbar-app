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

The implementation was driven through 12 ordered steps over two sessions
(2026-05-09 and 2026-05-11/12). The substantive prompts below capture
design-fork decisions; pure-execution prompts ("continue", "continue
REQ-034 from step 2", etc.) are omitted as they carried no design
content. Per-step rationale lives in each commit message; this file
records the moments where the AI surfaced options and the user picked.

### Phase A prompts (steps 1–7)

#### Step 3 — MenuItem.kind design fork (2026-05-09)

After step 2 added `Inventory.kind`, step 3's customer-menu guard needed
a way to filter menu queries. The plan didn't say whether to filter at
the query layer (with `$nin` / `$lookup`) or to add a `kind` field to
MenuItem too. AskUserQuestion surfaced three options:

1. Mirror `kind` on MenuItem (single-collection check, simplest)
2. `$nin` pre-fetch of kitchen-ingredient menu-item ids
3. `$lookup`-based aggregate filter

**User chose option 1: "Mirror `kind` on MenuItem".** Rationale: matches
the spirit of "every menu query filters `kind:'menu-item'`"; one backfill
script handles both collections; no per-query aggregate overhead.

Outcome: commit `f5d0f76` adds the kind discriminator to MenuItem, extends
the backfill script, and guards 10 customer-menu query sites.

#### Step 5 — Expense → Inventory link scope + trigger (2026-05-11)

Step 5 was the largest single step (financial-data write path, multi-
collection writes, reversal logic). Two design forks were surfaced:

1. **Commit shape** — Single bundled commit vs three sub-commits (helper+
   tests, service wiring, form UI).
2. **Trigger point for the side-effects** — `confirmTransfer` (only point
   Expense rows are actually created) vs `approveGroup` (status change)
   vs both.

**User chose: "Single bundled commit"** (matches the project's
single-PR-for-tightly-coupled-work rule) and **"On confirmTransfer"**
(aligns with money-leaves-the-bank semantics; no double-reversal surface
if approval is rolled back).

Outcome: commit `95e83f5` lands all of steps 5's work — new `lib/expense-
inventory-link.ts` helpers, new `services/expense-inventory-link-service.ts`,
schema additions, pending-group → confirmTransfer wiring, expense-form
dropdown, and 40 new tests.

### Phase B prompts (steps 8–12)

Phase B had no further design forks beyond what was already specced in
`implementation-plan.md`. The 12 ordered steps executed against
unambiguous pre-existing decisions: optimistic deduction with
$gte-guarded $inc + reversal pass (Resolution #3, standalone Mongo);
mass + volume conversion factor table with strict id-equality for count/
other/time (Resolution #1); 24h void window with mandatory reasonNote
past it (Resolution #6).

A noteworthy implementation detail captured during step 9: the
production batch's `productionId` is pre-allocated as a `new
Types.ObjectId()` _before_ the first deduction so the N+1 StockMovement
chain carries it from the first write onward. This avoids a chicken-
and-egg back-fill that would otherwise need to update the movements
after Production.create.

## Verification phase

### CI iteration 1 (merge commit `4159c9c`)

CI red on dependency audit — three fresh CVEs published between the
prior develop CI (2026-05-08, REQ-035/036) and the REQ-034 merge: high-
severity `next`, `fast-uri`, `fast-xml-builder`. Pre-existing in develop
state, surfaced by REQ-034's CI run.

**AskUserQuestion** surfaced three CVE-response options:

1. `npm audit fix` on develop in a separate commit (recommended).
2. Add the three packages to the CI ACCEPTED allowlist.
3. Open a standalone CVE-patch branch + PR.

**User chose option 1.** Outcome: commit `9b19c43` (`chore: npm audit
fix`), lockfile-only change, no manifest version bumps, 718 vitest pass
preserved.

### CI iteration 2 (`9b19c43`)

Quality Gates passed (TypeScript / SAST / Dependency Audit / E2E / Build).
Upload Evidence job failed with 11 × `404 Application not found` against
META-COMPLY's `/api/evidence/upload` endpoint. Investigation
(direct curl probes from local) confirmed the `wawagardenbar-app`
project record was missing from the META-COMPLY DB between 2026-05-08
and 2026-05-12 — a remote infrastructure issue, not a code regression.

**Resolution path:** META-COMPLY admin restored the project slug;
`gh run rerun 25703823360 --failed` re-ran the Upload Evidence job and
returned green. Full CI Pipeline status: success.

### Final CI state (used for evidence)

CI run [25703823360](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25703823360):

- Quality Gates: PASS (job 75513048988)
- Register Release: PASS (job 75513048581)
- Upload Evidence: PASS (job 75513036849, after rerun)
