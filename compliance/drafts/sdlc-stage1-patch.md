# DRAFT — Patch to `SDLC/1-plan-requirement.md`

The lesson from REQ-030: the planning workflow let an "incomplete feature" pass WAIT CHECKPOINT 1 because the AC list and impl plan didn't force the question _"can a real user complete the journey end-to-end?"_. This patch closes that gap.

Three changes, all additive — no existing wording is removed.

---

## Change 1 — New sub-section in Step 6 (Implementation Plan), inserted after `## Architecture Decisions`, before `## Dependencies`

```markdown
## Surface Inventory (MEDIUM/HIGH risk — required)

List every UI, API, background job, and report **that a real user touches** in the journey this REQ enables. For each surface, mark one of:

- **In scope** — this REQ adds or modifies it
- **Already works** — existing code already handles it correctly (link the file/route as evidence)
- **Out of scope (waived)** — explicitly deferred, with one-sentence justification and a follow-up issue link

| Surface              | URL / file                                     | Status                                                                  |
| -------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| [e.g. Customer cart] | `/menu` modal — `components/features/menu/...` | In scope                                                                |
| [e.g. Staff POS]     | `/dashboard/orders/express/...`                | Out of scope (waived) — front-of-house flow not used yet, follow-up #NN |

**Rule of thumb:** if the AC list reads _"the schema accepts X"_ or _"the resolver returns Y"_ but never _"the user can do Z in the UI and see the result in the UI"_, the surface inventory is incomplete and the plan is not ready for approval.
```

---

## Change 2 — Replace the AC examples in the Step 7 test-scope templates

Today's templates show ACs like:

```
- [ ] [Criterion 1 — what "done" looks like]
- [ ] [Criterion 2]
```

**Replace with the following Given/When/Then guidance** in all three risk variants (LOW / MEDIUM / HIGH), placed immediately above the `## Acceptance Criteria` heading:

```markdown
### How to write acceptance criteria

Phrase each AC as a **user-observable journey**, not a technical layer assertion. Use the Given/When/Then form:

> **Given** [the relevant pre-state, including which UI surface the user is on],
> **When** [the user takes a specific, named action with a specific, named control],
> **Then** [the user can observe a specific, named change in a specific, named UI surface]
> _(And any additional observable changes — audit rows, downstream UI updates, etc.)_

Concrete examples:

- ✅ "Given Poundo has Ogbono linked, When a staff member opens `/dashboard/orders/express/create-order` and picks Ogbono from the Soup group and marks the order Complete, Then `/dashboard/inventory/{ogbono}` shows stock decreased by 1 and one new Sale movement row tied to the order ID."
- ❌ "Schema accepts optional `inventoryId` field (persistence round-trip)" — this is a unit-test contract, not a user-observable AC. It belongs in `test-plan.md`, not here.
- ❌ "Resolver maps selected pairs to inventory link" — same problem. Internal mechanics, not user value.

If you can't phrase an AC in Given/When/Then because no UI surface delivers the change to a user, the scope is incomplete — return to Step 6 and expand the surface inventory.
```

---

## Change 3 — Add to the `### WAIT CHECKPOINT: Implementation Plan Review` block in Step 6

Append to the bullet list of items to summarise:

```markdown
- **Surface inventory completeness** — every user-touchable surface is either In scope or explicitly waived; no surface is silently absent
- **AC form** — the test-scope ACs (drafted in Step 7) can be phrased in Given/When/Then against the surfaces in scope; if any AC reduces to "the schema accepts X", the plan is incomplete
```

---

## Why these three changes together

- **Change 1** forces the planner to enumerate every surface up front — REQ-030 would have needed to mark "customer modal" and "express order create" and "edit order dialog" as either in-scope or explicitly waived. None of those marks would have read "Already works".
- **Change 2** rewrites the AC framing so a green AC list always corresponds to a journey a user can actually walk. Unit-test contracts move to `test-plan.md` where they belong.
- **Change 3** ties both into the gate at the end of Step 6, so WAIT CHECKPOINT 1 fails fast on incomplete plans.

## Risk classification for shipping this patch

LOW — process docs only, no code, no compliance gates affected. Standard PR review.
