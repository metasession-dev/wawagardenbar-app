# Release Ticket: REQ-040 — Script hardening (refuse mongodb:// URIs without database path; D12 follow-up)

**Status:** SCAFFOLDED
**Date:** 2026-05-17
**Requirement ID:** REQ-040
**Risk Level:** LOW (pure-parser helper; script-boundary check; strictly safer than today)
**Issue:** [#89](https://github.com/metasession-dev/wawagardenbar-app/issues/89)
**Depends on:** REQ-034 (#74) — original Kitchen Management feature whose backfill + audit scripts this hardens
**PR plan:** Bundled PR with REQ-038 (#84) + REQ-039 (#88) develop → main

---

## Summary

Adds a script-boundary safety check that refuses `mongodb://` URIs lacking a database path. Closes the D12 root cause (silent connect to default DB; "0 candidates found" misread as "script did its job"). LOW risk — no schema, no UI, no env-var contract change, no app-side write path touched.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** all helper, tests, script edits, scaffold artefacts.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per LOW Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit
- **Prompt log:** `compliance/evidence/REQ-040/ai-prompts.md`

---

## Implementation Details

(See `compliance/evidence/REQ-040/test-plan.md` + `implementation-plan.md` for the canonical AC list + order of work.)

### Files Created

- `compliance/evidence/REQ-040/{test-plan,test-scope,security-summary,implementation-plan,ai-prompts,uat-checklist,test-execution-summary}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-040.md` (this file)
- `lib/mongo-uri.ts`
- `__tests__/lib/mongo-uri.test.ts`

### Files Modified

- `scripts/backfill-inventory-kind.ts` (+~5 lines)
- `scripts/audit-expense-link-units.ts` (+~5 lines)
- `compliance/RTM.md`

### Schema additions

None.

---

## Acceptance Criteria

See `compliance/evidence/REQ-040/test-plan.md`.

---

## Quality Gates

- [ ] TypeScript: 0 errors (`tsc --noEmit`)
- [ ] Unit tests: green (+8 new tests in `mongo-uri.test.ts`)
- [ ] No E2E delta (script-only change)
- [ ] Build: `npm run build` green
- [ ] Semgrep: 0 findings on changed paths
- [ ] Dependency audit: 0 unaccepted high/critical
- [ ] CI Pipeline: green on develop
- [ ] Compliance evidence uploaded to META-COMPLY

---

## Rollback Plan

Single-commit revert. No schema; no migration; no env-var contract change. Scripts return to pre-REQ-040 behaviour.

---

## Sign-off

- [ ] Implementation complete
- [ ] All quality gates pass on develop
- [ ] META-COMPLY / DevAudit UAT approval obtained
- [ ] PR merged to main
- [ ] Local manual verification (positive + negative URI per uat-checklist.md)

---

## Audit Trail

| Date       | Action                 | Actor           | Notes                                                                                                                                                      |
| ---------- | ---------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-17 | Issue filed            | ostendo-io      | #89 filed as the D12 follow-up tracked in REQ-034's release ticket since 2026-05-14.                                                                       |
| 2026-05-17 | Requirement scaffolded | ostendo-io + AI | LOW risk; RTM row added; full evidence skeleton (7 markdown files) + this ticket created; no code yet. Will ship in the bundled PR with REQ-038 + REQ-039. |
