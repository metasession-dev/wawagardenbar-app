# REQ-063 — AI use note

## Tool

Claude Opus 4.7 via Claude Code (CLI), running locally as the implementer subagent.

## What the AI did

- **Scope refinement.** Spotted that REQ-053 (RELEASED 2026-05-31) had already shipped most of WA-4 — the only remaining gaps for #117 P4 #21 were the PIN-entry single-checkbox collapse and the missing `emailMarketing` split. Surfaced this to the operator before any coding so the cycle was sized accurately.
- **Implementation plan.** Wrote `compliance/plans/REQ-063/implementation-plan.md` with 5 ACs, MEDIUM risk classification, STRIDE-shaped security considerations, and an explicit "existing users left alone" note as the operator decision.
- **Schema split.** Added `emailMarketing: boolean` (default false) + `communicationPreferencesUpdatedAt?: Date` to `IPreferences` (interface + Mongoose model).
- **Action wiring.** Extended `PinOptInPayload` in all three verify actions; persisted the three booleans independently on first-verify and stamped the audit timestamp; updated `updatePreferencesAction` to stamp the timestamp server-side on every save.
- **UI changes.** Replaced the single `whatsappOptIn` checkbox with three labelled rows in `login-form.tsx`; added an "Email — offers & promotions" toggle in `preferences-tab.tsx`.
- **NotificationService gate.** Routed marketing-category email through the new `emailMarketing` consent flag; transactional + authentication paths unchanged.
- **Tests.** Authored 8 new vitest cases (TDD red baseline ran first, then green after the implementation). Updated REQ-053 + REQ-054 test fixtures for the new payload + gate shape.
- **Compliance pack.** Authored this evidence pack (release ticket + 7 markdown files) BEFORE opening the release PR, per `feedback_phase3_release_ticket_mandatory`.

## Human review boundary

- Operator approved the scope-narrowing call (REQ-053 already shipped most of WA-4).
- Operator picked the lighter audit-trail shape (single timestamp vs event log).
- Operator approved the "existing collapsed REQ-053 users left alone" decision at plan time.
- Operator will perform Stage 4 portal UAT approval and Stage 5 Production approval.

## Quality posture

- TDD red-then-green discipline observed: 5 failing tests → implementation → 12/12 green.
- All gates run locally before commit: `tsc --noEmit`, `vitest run`, `eslint`, `npm run build`. All passed.
- No `--no-verify`, no `eslint-disable`, no `@ts-expect-error`. The pre-commit hook (commitlint + lint-staged) ran on every commit with no overrides.

## What the AI did NOT do

- Did not modify any existing user document data (no migration, no backfill).
- Did not add a new package or env var.
- Did not silence any pre-existing warning or test.
- Did not generate any UI text in languages other than English.
- Did not run `--admin` merges or skip CI gates.
