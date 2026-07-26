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
