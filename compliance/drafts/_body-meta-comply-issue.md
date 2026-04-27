## Background — what went wrong on the consuming project

`metasession-dev/wawagardenbar-app` shipped REQ-030 (PR #66, "multi-component inventory deduction via customization option links") through every Stage of the SDLC and reached `develop` with green gates. On user inspection during attempted use, it turned out the feature was unreachable through the UI: the back-end, validation, admin configurator, and stock-deduction logic were complete, but no order-creation surface (customer modal, staff Express Order, admin Edit Order) actually let a user _select_ a customization at order time. Result: a feature marked "TESTED — PENDING SIGN-OFF" that no end user can use.

The work has been superseded by REQ-031 with full end-to-end scope. The release ticket has been moved to `compliance/superseded-releases/RELEASE-TICKET-REQ-030.md` with a banner explaining what happened. PR #66 will be closed unmerged.

## Root cause analysis

The planning workflow at `sdlc/1-plan-requirement.md` let an incomplete feature pass `WAIT CHECKPOINT 1` because:

1. The implementation plan has no requirement to enumerate **every UI/API surface** the user-journey touches. REQ-030's plan named the back-end files it changed but never asked "which order-creation surfaces need a picker?".
2. The Step 7 test-scope templates show ACs phrased as **technical-layer assertions** ("schema accepts field X (persistence round-trip)", "resolver maps selected pairs to inventory link"). These pass unit tests while the user can't perform the action in any UI.
3. The `WAIT CHECKPOINT 1` summary block doesn't gate on either of the above. The reviewer has nothing in the template prompting them to ask "can a real user complete the journey end-to-end with what we ship?"

This is a process bug in the SDLC, not a developer or AI error. The same pattern would catch any feature where the technical layers ship before the UX surfaces.

## Proposed change to `sdlc/1-plan-requirement.md`

Three additive edits (no existing wording removed). LOW risk — process docs only, no code, no compliance gates affected.

### Change 1 — New sub-section in Step 6 (Implementation Plan)

Insert after `## Architecture Decisions`, before `## Dependencies`:

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

### Change 2 — Replace AC examples in the Step 7 test-scope templates (LOW / MEDIUM / HIGH)

Insert immediately above each `## Acceptance Criteria` heading:

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

### Change 3 — Append to the `### WAIT CHECKPOINT: Implementation Plan Review` bullet list in Step 6

```markdown
- **Surface inventory completeness** — every user-touchable surface is either In scope or explicitly waived; no surface is silently absent
- **AC form** — the test-scope ACs (drafted in Step 7) can be phrased in Given/When/Then against the surfaces in scope; if any AC reduces to "the schema accepts X", the plan is incomplete
```

## Acceptance criteria for this issue

- [ ] `sdlc/1-plan-requirement.md` updated with all three changes
- [ ] At least one consuming project's recent REQ retro-tested against the new template — the failure mode that produced REQ-030/REQ-031 must be caught by the new gate
- [ ] Change announced to consuming projects (META-ATS, META-AGENT, wawagardenbar-app) so existing in-flight REQs can self-audit

## Risk

LOW — process docs, no code, no compliance gate changes.

## Reference

- Failed feature trail: `metasession-dev/wawagardenbar-app#53` → REQ-030 → PR #66 (will be closed unmerged) → superseded by REQ-031
- Drafted patch detail: `metasession-dev/wawagardenbar-app:compliance/drafts/sdlc-stage1-patch.md`
