# Release Ticket: REQ-039 — Missing-inventory cost on snapshot summaries

**Status:** SCAFFOLDED
**Date:** 2026-05-17
**Requirement ID:** REQ-039
**Risk Level:** MEDIUM (financial-data surface; multi-UI changes; cost-freeze invariant is load-bearing)
**Issue:** [#88](https://github.com/metasession-dev/wawagardenbar-app/issues/88)
**Depends on:** REQ-032 (cost-snapshot pattern this mirrors), REQ-034 (weighted-average cost infrastructure)
**PR plan:** Bundled PR with REQ-038 (#84) + REQ-040 (#89) develop → main

---

## Summary

Surfaces the total financial value of inventory reported as missing on the inventory-snapshot workflow. Three operator-facing surfaces gain a "Missing Cost" figure: the submit form (live total), the post-submit detail Summary panel, and the snapshot list page. Cost-per-unit is **frozen at submission** on each item — past snapshots stay numerically stable when an `Inventory.costPerUnit` changes later, mirroring REQ-032's order-time cost-snapshot pattern.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** schema additions, service stamp/re-stamp/summary/audit-log edits, three UI changes, pure helper, all SDLC artefacts, all tests, all commit messages.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit
- **Prompt log:** `compliance/evidence/REQ-039/ai-prompts.md`

---

## Implementation Details

(See `compliance/evidence/REQ-039/test-plan.md` + `implementation-plan.md` for the canonical AC list + order of work.)

### Files Created

- `compliance/evidence/REQ-039/{test-plan,test-scope,security-summary,implementation-plan,ai-prompts,uat-checklist,test-execution-summary}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-039.md` (this file)
- `lib/snapshot-missing-cost.ts`
- `__tests__/lib/snapshot-missing-cost.test.ts`

### Files Modified

- `interfaces/inventory-snapshot.interface.ts` (+ `costPerUnitAtSnapshot?`; + `missingCost` on summary)
- `models/inventory-snapshot-model.ts` (mirror)
- `services/inventory-snapshot-service.ts` (stamp / re-stamp / summary / audit-log)
- `models/audit-log-model.ts` (extend event-detail shape if validated)
- `components/features/inventory/inventory-summary-client.tsx` (+ live total)
- `components/features/inventory/snapshot-details-client.tsx` (+ Summary cell)
- `components/features/inventory/snapshots-list-client.tsx` (+ list column)
- `__tests__/services/inventory-snapshot-service.test.ts` (extended)
- `e2e/inventory-snapshots.spec.ts` (extended)
- `compliance/RTM.md`

### Schema additions

- `IInventorySnapshotItem.costPerUnitAtSnapshot?: number` (optional; absent on legacy snapshots; populated at stamp time)
- `IInventorySnapshotSummary.missingCost: number` (computed view-time by `calculateSummary`; sum over items with `discrepancy < 0` of `abs(discrepancy) × (costPerUnitAtSnapshot ?? 0)`)

No migration required — both new fields are additive.

---

## Acceptance Criteria

See `compliance/evidence/REQ-039/test-plan.md`.

---

## Quality Gates

- [ ] TypeScript: 0 errors (`tsc --noEmit`)
- [ ] Unit tests: green (+14 new tests)
- [ ] E2E: extended `inventory-snapshots.spec.ts` green; per-AC PNGs uploaded under `compliance/evidence/REQ-039/screenshots/`
- [ ] Build: `npm run build` green
- [ ] Semgrep: 0 findings on changed paths
- [ ] Dependency audit: 0 unaccepted high/critical
- [ ] CI Pipeline: green on develop
- [ ] Compliance evidence uploaded to META-COMPLY

---

## Rollback Plan

Single-commit revert.

1. **No data corruption risk.** `costPerUnitAtSnapshot` on existing documents is benign (no query filter depends on it).
2. UI surfaces revert to pre-REQ-039 shapes; missing-cost cells/columns disappear.
3. Audit-log `missingCost` detail field becomes orphan on existing entries; readers ignore unknown fields.
4. No backfill / cleanup required post-revert.

---

## Sign-off

- [ ] Implementation complete
- [ ] All quality gates pass on develop
- [ ] META-COMPLY / DevAudit UAT approval obtained
- [ ] PR merged to main
- [ ] Cost-freeze invariant + legacy regression manual checks per uat-checklist.md

---

## Audit Trail

| Date       | Action                 | Actor           | Notes                                                                                                                                                                                                                                          |
| ---------- | ---------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-17 | Issue filed            | ostendo-io      | #88 filed after operator request "when inventory summaries are made we need to have a total cost for the inventory that has been reported as missing"; two clarification questions resolved (snapshot-only scope + cost-freeze at submission). |
| 2026-05-17 | Requirement scaffolded | ostendo-io + AI | MEDIUM risk; RTM row added; full evidence skeleton (7 markdown files) + this ticket created; no code yet. Will ship in the bundled PR with REQ-038 + REQ-040.                                                                                  |
