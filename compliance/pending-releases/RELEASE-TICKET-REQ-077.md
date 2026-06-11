# Release Ticket: REQ-077 — Expandable incidents on /dashboard/incidents

**Status:** DRAFT
**Date:** 2026-06-11
**Requirement ID:** REQ-077
**Risk Level:** MEDIUM
**GitHub Issue:** [#364](https://github.com/metasession-dev/wawagardenbar-app/issues/364)
**Integration PR:** [#365 (feat/REQ-077 → develop)](https://github.com/metasession-dev/wawagardenbar-app/pull/365) — merged 2026-06-11 04:03:40Z (`bd7f798`)
**Release PR:** (to be opened after this evidence pack lands on develop) — single-REQ release path, `[REQ-077]` brackets in PR title for `derive-release-version.sh` attribution.
**Sign-off (dual-actor):** Pending portal UAT + Production approval. Per `solo_with_gap` framework reading: the AI-tooling actor (sdlc-implementer + sub-skills) and the human operator (portal approver) are distinct actors; this satisfies the four-eyes contract on a one-person team.
**DevAudit Release:** [`devaudit.ai/projects/wgb/releases/REQ-077`](https://devaudit.ai/projects/wgb/releases/REQ-077) — release version `REQ-077`, status flips `draft` → `uat_review` on this evidence push.

---

## Summary

Admins can now expand each row on `/dashboard/incidents` to see the full `IncidentEventModel.errorDetails` JSON, a snapshot of the linked Order (status, items, totals, statusHistory), and a passthrough of the existing Retry-now button. Inline expansion is keyboard-accessible, server-rendered, and the expanded-row state survives reload via URL hash (`#open=<id1>,<id2>`).

- **AC1** — Click row / chevron / Enter / Space toggles expansion; multiple rows expand simultaneously; `aria-expanded` mirrors state.
- **AC2 + AC3** — Expanded panel renders full `errorDetails` JSON pretty-printed + ISO + relative timestamps + clickable `entityId` link + Order snapshot block (status, items, totals, paidAt, inventoryDeducted).
- **AC4** — `inventory_deduction_failed` row with `inventoryDeducted:false` shows the existing `<IncidentRetryButton>` inside the expansion (REQ-INV-013 reuse, R-003 mitigation). `stale_paid_order` row shows the Order's `statusHistory[]` chronologically (REQ-INV-016).
- **AC5** — All expansion-panel HTML in the initial server-rendered response; expanding a row triggers no `/api/incidents/*` network request.
- **AC6** — `#open=<id1>,<id2>` URL hash preserves expanded state across reload; segments regex-validated against `/^[a-f0-9]+$/`; malformed segments silently ignored (R-004 mitigation).

**Honest framing:** AC4 (R-003) pins the retry button's reachability + enabled state inside the new container, not its click outcome — that's REQ-066 AC10's domain and already e2e'd elsewhere. AC5 was annotated `@srs-deferred: implementation-detail` per `requirements-aligner` since "how the same observable outcome is delivered" is not a user-observable behaviour in its own right.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **Sub-skills invoked:** `requirements-aligner` (Phase 1 step 6) → `adr-author` (Phase 1 step 7) → `risk-register-keeper` (Phase 1 step 8) → `e2e-test-engineer` (Phase 2 step 3 mandatory delegation gate). All four invoked via the standard `Skill(...)` mechanism per the framework's delegation contract.
- **Skill-pause bug surfaced mid-cycle:** the agent was incorrectly pausing after each sub-skill return; operator caught it; filed upstream at [DevAudit-Installer #144](https://github.com/metasession-dev/DevAudit-Installer/issues/144).
- **Operator action this cycle:** confirmed Phase 0 triage, nudged the agent past the skill-pause bug 4 times, merged PR #365.

## Evidence pack

- [`implementation-plan.md`](../evidence/REQ-077/implementation-plan.md) — Phase 1 plan (ISO 29119 §3.4 / ISO 27001 A.8.25 / GDPR Art. 25 / EU AI Act Art. 11)
- [`test-plan.md`](../evidence/REQ-077/test-plan.md) — AC → test mapping
- [`test-scope.md`](../evidence/REQ-077/test-scope.md) — in-scope / out-of-scope / SRS items covered
- [`test-execution-summary.md`](../evidence/REQ-077/test-execution-summary.md) — gate results
- [`security-summary.md`](../evidence/REQ-077/security-summary.md) — STRIDE pass
- [`ai-use-note.md`](../evidence/REQ-077/ai-use-note.md) — AI involvement + limitations
- [`ai-prompts.md`](../evidence/REQ-077/ai-prompts.md) — operator prompts + sub-skill invocations
- [`srs-alignment.md`](../evidence/REQ-077/srs-alignment.md) — `requirements-aligner` Phase 2 artefact (Tier 3)
- [`architecture-decision.md`](../evidence/REQ-077/architecture-decision.md) — `adr-author` Phase 2 artefact (Tier 3)
- [`risk-assessment.md`](../evidence/REQ-077/risk-assessment.md) — `risk-register-keeper` Phase 3 artefact (Tier 3)

## Risk register entries

- **R-003** — IncidentRetryButton remediation regression when relocated into expansion container — OPEN (residual low × high)
- **R-004** — URL-hash-driven expansion state: fidelity + injection-surface defence — OPEN (residual low × low)

Full canonical entries: [`compliance/risk-register.md`](../risk-register.md).

## SRS items added

- REQ-INV-014 — Incidents queue row expansion UX
- REQ-INV-015 — Incident details panel: errorDetails + Order snapshot
- REQ-INV-016 — Stale-paid-order: status-history trail
- REQ-INV-017 — Incidents URL state: filter + expanded-row hash

All stubs authored by `requirements-aligner`; operator-edits to canonical Given/When/Then prose deferred to Phase 3 sign-off (this commit).

## Out of scope

| Item                                                | Why deferred                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Bulk actions on incidents (clear-all, mark-as-read) | Heavier scope; changes audit-trail contract — incidents are append-only today. |
| Pagination beyond 200 rows                          | Existing cap has not surfaced as a real bottleneck.                            |
| Email / SMS notifications on new incidents          | Adjacent concern; REQ-066 surfaces them on the page already.                   |
| New incident kinds                                  | This REQ surfaces what's already captured; future kinds are their own REQs.    |
| Charts / trend view                                 | V1 ships tables-only; charts deferred.                                         |

## Quality Gates

| Gate                                            | Expected    | Actual (2026-06-11)                                                                                       |
| ----------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                              | exit 0      | exit 0                                                                                                    |
| `npx vitest run` (full)                         | 0 failures  | 1226 pass / 4 skip / 0 fail (+18 cases vs base)                                                           |
| `npx playwright test --project=critical --list` | 9 new tests | 9 new tests under `[critical]` registered correctly                                                       |
| Quality Gates (CI Pipeline)                     | green       | [run 27322979496](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27322979496) (16m37s) |
| Compliance Evidence Upload (CI)                 | green       | [run 27322979515](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27322979515) (3m16s)  |
| E2E Regression (critical tier) — release PR     | green       | _pending release-PR CI_                                                                                   |

## Stage Approvals

- [x] Stage 1 — Plan (operator confirmed Phase 0 "proceed" at workflow decision)
- [x] Stage 2 — Implement + unit-test (1226/4/0; tsc clean; 18 new cases) — landed via PR #365
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR + manual walkthrough)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Single-REQ tracked release path — NOT a housekeeping bundle.
- PR title MUST carry `[REQ-077]` brackets per `feedback_pr_title_req_brackets` so `derive-release-version.sh` attributes evidence to the right release.
- The `feedback_phase3_release_ticket_mandatory` memory applies: this release ticket + 9 evidence markdowns land on develop BEFORE the release PR is opened (this commit + the Phase 4 release PR are separate hops).
- Second REQ in this project to use the full SoT-alignment skill family (`requirements-aligner` + `adr-author` + `risk-register-keeper`); first cycle filed an upstream docs/contract clarification at DevAudit-Installer #144.
