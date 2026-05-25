# AI Use Note — REQ-046

**Requirement:** REQ-046 — IG-1 cadence schema + IG-6 admin form fields
**Date:** 2026-05-25

## Summary

AI (Claude Opus 4.7 via Claude Code) wrote all four files end-to-end: the interface change, the Mongoose schema change, the admin form changes, and the vitest test file. The human maintainer scoped the work via issue #117, approved the IG-1+IG-6 bundling decision, and ratified the implementation by accepting the PR for review.

## Human review checkpoints

- **Scoping**: human picked IG band from the customer-facing backlog and accepted the assistant's recommendation to start with IG-1 + minimal IG-6 (vs alternatives WA-1, P0 #2/#3/#4 bundle).
- **Design decision**: human picked Meta Graph API auto-detect (vs honor-system) when offered the two options.
- **Pre-commit bypass**: human explicitly approved `--no-verify` after the assistant explained the underlying broken ESLint config and confirmed the team's existing practice on PRs #114/#115.

## Determinism / repeatability

The schema and form changes are fully deterministic. The test file uses standard vitest mocking patterns established elsewhere in `__tests__/services/` (e.g. the test from REQ-044, `inventory-service.track-by-location.test.ts`). Re-running the assistant with the same prompt and codebase state would produce structurally identical output (field names, validators, test structure) modulo prose differences in JSDoc and commit message wording.

## Risks introduced by AI authorship

None identified for this REQ. All changes are additive and covered by tests. The assistant followed the existing conventions in the touched files (Zod schema pattern, JSDoc style, RewardRuleForm hydration pattern).

## Governance commitments

- This REQ-046 evidence pack is the first IG-band scaffolding under the re-onboarded DevAudit gated flow.
- Subsequent IG-band REQs (the polling job, the customer surface, the WhatsApp notification) will each carry their own RTM row + evidence pack scoped to the change they ship.
- The assistant will not infer "SDLC retired" again — that stale memory has been replaced with `project-sdlc-reinstated.md` in the assistant's persistent memory.
