# REQ-098 — AI use note

## What the AI did

- Read issue [#626](https://github.com/metasession-dev/wawagardenbar-app/issues/626) (filed with a full implementation plan intentionally not yet implemented, per the issue's own note) and verified every cited file/line against the current code before drafting Stage 1.
- Authored the implementation plan, then invoked `requirements-aligner` (4 new SRS items + 1 existing-item trace + 1 explicit `@srs-deferred`), `adr-author` (ADR-003 — write-off subdocument shape, a genuine architectural decision since it diverges from the codebase's existing flat-triplet convention), and `risk-register-keeper` (R-019–R-022) as sub-skills — none authored inline.
- Paused at the HIGH-risk plan-approval checkpoint; the operator reviewed the plan, ADR-003, the 4 risk entries, and confirmed the AC7 remediation script's gap threshold (30+ days) before implementation began.
- Implemented additively: `TabService.writeOffTab()`/`scanDormantOpenTabs()`, `writeOffTabAction`, the write-off dialog, the dormancy threshold setting + tabs-list flag, the "Written off (bad debt)" report section (on-screen + all three export formats), and the scoped one-time remediation script — none of `deleteTab`/`completeTabPaymentManually`/`closeTab` were modified.
- Discovered mid-implementation that the report-section query needed `businessDate` stamped at write-off time (a plan deviation — `writeOffTab` doesn't originally set it, and orders that were never paid have no other date to attribute a report period to); fixed and documented as a `## Plan deviation` in the implementation plan rather than silently patching around it.
- Delegated all e2e test work to the `e2e-test-engineer` skill per the framework's mandatory sub-skill contract; did not author `e2e/**/*.spec.ts` directly.
- While validating quality gates, discovered a live, unrelated npm audit finding (`socket.io-parser`/`fast-uri`) blocking a clean gate pass — surfaced it to the operator rather than silently bundling a dependency fix into this REQ's PR; the operator chose to fix it now, so it shipped as a separate housekeeping PR (#635, merged to `develop` before this REQ's own PR) instead of being folded into REQ-098's diff.

## Honest framing of limitations

**The broader adjacent-area e2e regression sweep did not complete.** After the two REQ-098-targeted specs passed reliably (verified twice), an attempt to also run ~13 adjacent critical-tier specs (tabs/reports/incidents) locally hung on an unhealthy local dev-server process unrelated to this REQ's code. The process was killed and the two REQ-098 specs re-verified clean on a fresh server, but the broader adjacent-area check was not completed locally — it relies on CI's properly-provisioned environment for the authoritative full-suite run.

**AC7's remediation script has not been run against production.** This REQ ships the script, its dry-run-tested selection logic, and the 30+ day threshold the operator confirmed — but executing it against the real 51 contaminated tabs is a separate, explicit operator action after this release ships, not part of this REQ's own verification.

## What the operator validated

- Approved the HIGH-risk implementation plan, ADR-003, the risk register entries, and the AC7 gap threshold explicitly before Phase 2 began.
- Will validate at PR review and during portal UAT review.

## Reproducibility

Unit tests:

```bash
npx vitest run \
  __tests__/models/write-off-schema.test.ts \
  __tests__/services/tab-service.write-off.test.ts \
  __tests__/actions/tabs/tab-actions.write-off.test.ts \
  __tests__/services/tab-service.dormant-scan.test.ts \
  __tests__/services/financial-report-service.write-off-section.test.ts \
  __tests__/scripts/write-off-dormant-tabs-2026-07-31.test.ts
```

E2E (requires a running dev server + local MongoDB):

```bash
BASE_URL=http://localhost:3000 npx playwright test --project=regression \
  e2e/critical/write-off-tab.spec.ts e2e/orders/dormant-tab-visibility.spec.ts
```
