# AI Prompts — REQ-046

**Requirement:** REQ-046 — IG-1 cadence schema + IG-6 admin form fields
**Date:** 2026-05-25
**AI assistant:** Claude (Anthropic) — Claude Opus 4.7 via Claude Code CLI

## Originating user prompt (session, paraphrased to omit unrelated context)

> "implement https://github.com/metasession-dev/wawagardenbar-app/issues/117"

Issue #117 is a prioritised customer-facing backlog including an **IG band** for configurable Instagram engagement campaigns. The assistant recommended starting with IG-1 (schema cadence fields) bundled with IG-6 partial (admin form exposure) as the lowest-risk first slice — the user did not redirect.

## Follow-up clarifications during the session

- User chose "Auto-detect via Meta Graph API" (not the manual / honor-system path) when asked how to detect qualifying posts.
- User chose to "scope this as a new band on issue #117" rather than a separate issue.
- After implementation, when the pre-commit hook blocked the commit due to a pre-existing ESLint config issue in the project (`react-hooks` plugin duplication from the DevAudit onboarding commit), user approved `--no-verify` per the team's existing practice on PRs #114 and #115. A separate top-priority cleanup item was added to issue #117.

## Assistant-driven decisions (recorded for governance)

1. **Field naming**: chose `postsRequired` / `windowDays` / `requireMention` over reusing the existing `maxPostsPerPeriod` (which has cap semantics, not threshold). New fields are `optional` so existing rules are unaffected.
2. **Default for `requireMention`**: `true` — aligned with the user's stated preference for "auto-detect" since mention is the primary signal Meta's Graph API provides.
3. **No data migration**: all three fields are optional with no validators that reject pre-existing documents.
4. **Schema-introspection tests**: chose introspection over a full DB integration test because no code reads the fields yet — a behaviour test would be untestable. Introspection catches accidental removal during future refactors, which is the realistic regression vector.
5. **Backfilling REQ-046 retroactively**: the implementation PR (#124) shipped without a REQ number because the assistant's memory falsely claimed the SDLC was retired. User clarified that the SDLC is active; this evidence pack and the RTM row are being added in a follow-up compliance PR (`compliance/backfill-req-042-046`) per user direction.

## Constraints honoured

- Existing `socialConfig` fields untouched (regression test #4 covers this).
- No behaviour changes to any existing rule.
- Followed the existing Zod + react-hook-form pattern in `reward-rule-form.tsx` for the new inputs.
- No new dependencies.

## Prompts not used

- No automated code generation beyond what's listed here.
- No prompt-engineered scaffolding for the polling job (IG-3 / IG-4) — those are deferred to a follow-up REQ where the design will be discussed first.
