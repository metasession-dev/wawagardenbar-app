---
adr_id: 'ADR-003'
status: 'Proposed'
date: '2026-08-03'
authored_by: 'sdlc-implementer@1.0'
related_reqs: ['REQ-098']
supersedes: []
superseded_by: null
---

# ADR-003: Tab/Order write-off state uses a nested `writeOff` subdocument, not flat fields

## Status

**Proposed** (DRAFT — operator to flip to _Accepted_ on plan APPROVAL)

## Context

REQ-098 (issue #626) adds a "written-off" (bad-debt) classification to `Tab.paymentStatus` and `Order.paymentStatus`, so a dormant/uncollectible tab can be excluded from recognized revenue with an audit-trailed reason. Every existing precedent in this codebase for "a status change plus who/why/when" is a **flat 3-field triplet** sitting directly on the schema: `isDeleted`/`deletedAt`/`deletedBy` on Order (REQ-096, ADR-002), and `reconciled`/`reconciledAt`/`reconciledBy` on both Tab and Order. Neither model has an existing nested-object-per-status-change pattern; the closest nested-subdocument precedent at all is `Tab.partialPayments`, which is an _array_ of repeating payment rows, not a single embedded object describing one state transition.

The GitHub issue's AC2, however, explicitly specifies "stamps a `writeOff` subdocument (`{ amount, reason, writtenOffBy, writtenOffAt }`)" on both Tab and Order — a single nested object, not four flat sibling fields. This plan follows that explicit instruction rather than the flatter existing convention, which is a genuine, first-of-its-kind schema-shape decision worth recording rather than silently introducing.

## Decision

Both `models/tab-model.ts` and `models/order-model.ts` gain a single embedded `writeOff` subdocument (not an array — a tab/order can only be written off once, enforced by the service-layer refusal on an already-`'written-off'` tab):

```ts
writeOff: {
  amount: { type: Number, required: false },
  reason: { type: String, required: false },
  writtenOffBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  writtenOffAt: { type: Date, required: false },
}
```

`Tab.paymentStatus` and `Order.paymentStatus` each gain a new `'written-off'` enum value alongside their existing values (additive only — no existing value removed or renamed). `TabService.writeOffTab()` is the only writer of the `writeOff` subdocument on either model; no other code path sets these fields. The nested-object shape is deliberately chosen over a flat triplet so that all four write-off facts (amount, reason, actor, timestamp) travel and are read as one cohesive unit — `order.writeOff?.reason`, `order.writeOff?.writtenOffAt` — rather than four independently-optional sibling fields whose co-presence would otherwise need to be enforced by convention alone.

## Consequences

- **Good:** The four write-off facts are grouped and always read/written together, which makes it structurally harder to end up with e.g. a `writtenOffAt` timestamp with no matching `reason` — a real risk with four independent flat fields. `Order.writeOff.writtenOffAt` gives the financial-report "Written off (bad debt)" section (REQ-REPORT-006) a single, unambiguous field path to filter on. No migration required — the field is new and optional/absent by default on every existing document.
- **Bad:** This is the first nested-object-per-status-change pattern in the codebase (as opposed to the established flat-triplet convention for `isDeleted`/`reconciled`), so a future contributor sees two different conventions for "state change + actor + timestamp" on the same models (`reconciled`/`reconciledAt`/`reconciledBy` flat, `writeOff.{reason,writtenOffAt,writtenOffBy}` nested) and must learn both. Querying/indexing a nested field (`writeOff.writtenOffAt`) is marginally less ergonomic in Mongoose than a top-level field for ad-hoc scripts and Mongo shell queries.
- **Neutral / tradeoffs:** Consistency with the _issue's explicit AC_ was weighted over consistency with the _existing flat-field convention_. Both are legitimate; this ADR exists so the choice is visible rather than silently one or the other.

## Alternatives considered

- **Flat triplet, matching `isDeleted`/`deletedAt`/`deletedBy` exactly** (e.g. `writtenOff: boolean`, `writeOffReason: string`, `writtenOffAt: Date`, `writtenOffBy: ObjectId`, `writeOffAmount: number`): More consistent with the codebase's existing convention on these exact two models. Ruled out (for this cycle) because the issue's AC2 explicitly names "a `writeOff` subdocument," and diverging from an explicit, reviewed acceptance criterion without a scope-expansion/requirements-gap conversation would be an undocumented implementation deviation, not a neutral style choice.
- **Reuse `Tab.partialPayments`-style array (`writeOffs: [{...}]`)**: Rejected because a tab/order can only ever be written off once (enforced by the "refuse if already written-off" guard) — an array implies a repeatable event, which this explicitly is not.
- **No new field at all — reuse `statusHistory`-style logging (Order's existing array-of-log-entries pattern) instead of a dedicated `writeOff` object:** Would avoid adding a new nested shape, but loses the direct, single-field-path access the reporting section (REQ-REPORT-006) and UI need for "was this order written off, and why" without having to filter/search a log array. Ruled out as unnecessarily indirect for a fact that's checked on essentially every report-generation and tab-detail-page read.

## Cross-references

- Implementation plan: `compliance/plans/REQ-098/implementation-plan.md`
- SRS items: REQ-TABMGT-007 (new — dormant tab write-off), REQ-TABMGT-008 (new — dormant open-tab visibility), REQ-INV-019 (new — dormant-open-tab incident scan), REQ-REPORT-006 (new — written-off report section)
- Risk register: populated by `risk-register-keeper` (mandatory at HIGH risk) — see plan §4
- Supersedes / superseded-by: none
