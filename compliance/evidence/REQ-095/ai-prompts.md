# AI Prompt Record — REQ-095

**Date:** 2026-07-26
**Tool:** Codex (GPT-5)
**GitHub Issue:** #603

## Work directed

- Investigate whether the Daily Summary uses the configured cutoff consistently for Today, Yesterday, Last 7 Days, and custom ranges.
- Implement the fix using the repository SDLC and preserve legacy `paidAt` fallback behavior.
- Add boundary, range, and regression tests.

## Verification decisions

- Treat persisted `businessDate` as the authoritative modern-record selector.
- Use cutoff-to-cutoff intervals only for legacy records without `businessDate`.
- Do not alter unrelated date-only inventory or public-summary APIs.
- Do not claim UAT feature verification when local credentials cannot authenticate against UAT.

---

# AI Prompt Record — REQ-095 (2026-07-27 addendum)

**Date:** 2026-07-27
**Tool:** Claude Code (claude-sonnet-5)
**GitHub Issue:** #603

## Work directed

- Review the compliance/RTM state on issue #603 and explain why the DevAudit
  release-completeness checklist showed only 1 of 4 gates and 0% requirements
  covered despite PR #604/#605 being merged.
- Write the Playwright coverage the implementation plan called for but the
  original PR shipped without; run it and fix whatever it found.
- Once the order-number generator bug was found blocking that verification, fix
  it and fold it into this REQ rather than filing it separately, per explicit
  operator direction.
- Run the full regression suite and fix anything else that came up.

## Verification decisions

- Diagnosed root cause via direct evidence (Actions run logs, workflow YAML,
  RTM/release-ticket state, `git log`) before proposing any fix, rather than
  guessing from symptoms.
- Confirmed each candidate regression (test-runner races, flakiness, order
  creation not persisting) against a fresh, isolated re-run before treating it
  as real, distinguishing genuine defects from environment/timing artifacts of
  the very long local test session (leftover tab state, an unset
  `ENABLE_E2E_PIN_INTERCEPT` env var, resource contention under 4-way local
  parallelism that the project's own `playwright.config.ts` doesn't use in CI).
- Ran the final regression pass at `CI=true` specifically because
  `playwright.config.ts` sets `workers: 1` only when `CI` is set — the earlier
  default-parallelism runs were not representative of what the pipeline
  actually executes.
- Did not touch `docs/SRS.md` — REQ-REPORT-002's existing wording already
  describes the intended contract; what changed is the code now actually
  satisfying it, which belongs in implementation/test evidence, not a new
  requirement statement.
