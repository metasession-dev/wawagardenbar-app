# AI Use Note — REQ-033

**Requirement:** REQ-033 — App-wide Unit-of-Measurement registry
**Risk Level:** MEDIUM-HIGH
**Date:** 2026-05-01
**AI Tool:** Claude Code (Claude Opus 4.7, 1M context)

## Scope of AI involvement

| Surface                                                                                                                | AI authored                                                     | Human reviewed            |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------- |
| Interface (`unit-of-measurement.interface.ts`)                                                                         | Yes                                                             | Yes — pre-merge PR review |
| Pure helpers (`lib/units.ts`)                                                                                          | Yes (tests-first)                                               | Yes                       |
| Pure-helper tests                                                                                                      | Yes (tests-first)                                               | Yes                       |
| Service additions (`getUnitsOfMeasurement`, `updateUnitsOfMeasurement`)                                                | Yes                                                             | Yes                       |
| Service tests                                                                                                          | Yes (post-hoc — see TDD slip note in test-execution-summary.md) | Yes                       |
| Server action (`updateUnitsOfMeasurementAction`)                                                                       | Yes                                                             | Yes                       |
| Settings form (`units-of-measurement-form.tsx`)                                                                        | Yes                                                             | Yes                       |
| Form integrations (Expense, Menu-item, Edit-expense)                                                                   | Yes                                                             | Yes                       |
| Backfill script (`backfill-unit-values.ts`)                                                                            | Yes (mirrors existing `backfill-business-dates.ts` pattern)     | Yes                       |
| E2E spec (`e2e/settings/units-of-measurement.spec.ts`)                                                                 | Yes                                                             | Yes                       |
| Compliance artefacts (test-scope, test-plan, implementation-plan, security-summary, test-execution-summary, this file) | Yes                                                             | Yes                       |
| Validator hardening (`validate-compliance-artifacts.sh`)                                                               | Yes (defensive fix for phantom-REQ pattern)                     | Yes                       |

## AI-specific risks for this REQ

### Risk: AI silently skips an SDLC step

**Materialised once** in this REQ. The AI:

- Wrote the E2E spec but did not run it.
- Did not register the spec in `playwright.config.ts`.
- Did not capture `gates/` artefacts.
- Did not write `security-summary`, `test-execution-summary`, `ai-prompts`, `ai-use-note`, or `uat-checklist` before pushing.

**Detected by the human operator** mid-cycle ("why were there no e2e tests okanned and run according ti the sdlc process, what parts of the sdlc did you skip"). Gap-fix executed in the same REQ before merge to main.

**Mitigation for future REQs:** the SDLC scaffolding pattern is now saved as a memory feedback (`feedback_sdlc_scaffold_order.md`) and includes explicit "before merge" entries for security-summary, test-execution-summary, gates/, ai-prompts, ai-use-note, uat-checklist. The pattern has been re-examined to add a "register E2E in playwright.config.ts" step that the AI must not skip.

### Risk: AI breaks TDD discipline

**Materialised once** in this REQ. Service-layer tests were written after the service implementation. Pure-helper tests were correctly written first.

**Mitigation:** captured honestly in `test-execution-summary.md` (Defect 0). Future REQs should write service-layer tests against a stubbed implementation first.

### Risk: AI declares "Tests to Update: None" without auditing

**Materialised once** in this REQ. The original test-plan.md said "None — existing suites are unaffected" without a grep audit. When the human operator pushed back, the audit revealed `e2e/pending-expenses.spec.ts` was broken on 3 lines.

**Mitigation:** test-plan.md now contains the full audit list with explicit "Tests to Update" entries for the spec and verification of each "Verified safe" file.

### Risk: AI makes silent quality cuts under time pressure or auto-mode

**Materialised** in this REQ — auto-mode encouraged the AI to push without all SDLC artefacts in place. The human operator's audit caught it.

**Mitigation:** even under auto mode, financial-data REQs (per memory `feedback_sdlc_all_code_changes.md`) require the full SDLC artefact set before merge. This is now reinforced by the memory feedback for the scaffold order.

## Components Regenerated

None — every edit is targeted at existing infrastructure (REQ-028's settings registry pattern, REQ-026/28/29's expense form, REQ-031's menu-item form). No file was rewritten from scratch.

## Reviewer Sign-off (post-merge)

- **Lead reviewer (1 of 1, MEDIUM baseline):** ostendo-io
- **AI-involvement bump applied:** No (the change is contained, deterministic, all logic in pure helpers + service-layer methods that mirror REQ-028's audited pattern)
- **Sign-off date:** TBD (post-PR merge)
