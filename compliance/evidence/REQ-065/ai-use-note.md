# REQ-065 — AI use note

## Tool

Claude Opus 4.7 via Claude Code (CLI). `e2e-test-engineer` skill invoked once during this cycle for the live-execution E2E phase.

## What the AI did

- **Implementation plan.** Wrote `compliance/plans/REQ-065/implementation-plan.md` with 5 ACs, MEDIUM risk classification (data-egress as the load-bearing concern), STRIDE-shaped security considerations, and dependency chain back to REQ-055 / REQ-056 / REQ-059 / REQ-064 (the prior REQs that own the collections the export reads from).
- **Data export endpoint.** Authored `app/api/user/export/route.ts` with the 9-collection parallel projection, session gate (401), rate-limit check (429 + Retry-After), explicit secret-stripping on the User doc, and Content-Disposition attachment header.
- **Rate-limit utility.** Authored `lib/rate-limit.ts` — in-memory `Map<key, lastTimestamp>` with `checkRateLimit(key, windowMs)`. Forward-compatible to Redis. Includes a test-only `__resetRateLimitForTests()` exit for isolation between vitest cases.
- **UI surfaces.** Authored `<DataExportButton />` (client component with Blob download + 429 retry-after toast) and `<CookieConsentBanner />` (client component with localStorage gate, private-mode-safe failure mode). Added the data-export section to `/profile` and embedded the cookie banner globally from `app/layout.tsx`.
- **Tests.** TDD red baseline observed where applicable. Authored 9 new vitest cases (4 rate-limit + 5 user-export). Authored 3 new Playwright specs (1 live auth-gate + 2 live cookie banner + 1 `test.fixme`'d customer-flow).
- **Live E2E execution.** Ran the focused REQ-065 set live against UAT — 4 passed / 1 skipped (`test.fixme`'d AC4) / 0 failed. Captured 2 evidenceShot screenshots for AC5. Triaged the initial 404 (UAT deploy not yet propagated) by polling the endpoint until it returned the expected 401.
- **Compliance pack.** Authored this evidence pack (release ticket + 7 markdown files) BEFORE opening the release PR, per `feedback_phase3_release_ticket_mandatory`.

## Human review boundary

- Operator picked Bundle D as REQ-065 and confirmed the post-REQ-062 trio sequencing.
- Operator authorised the earlier-execution E2E pattern over REQ-064's deferred pattern.
- Operator chose informational cookie consent mode over strict GDPR.
- Operator approved bundling P4 #21 into REQ-063 (not REQ-065).
- Operator will perform Stage 4 portal UAT approval and Stage 5 Production approval.

## Quality posture

- TDD red-then-green observed for unit cases.
- All gates run locally before commit: `tsc --noEmit`, `vitest run`, `eslint`, `npm run build`, `playwright test` (focused first, then full regression in background).
- No `--no-verify`, no `eslint-disable`, no `@ts-expect-error`. Pre-commit hook (commitlint + lint-staged) ran on every commit with no overrides.

## What the AI did NOT do

- Did not enable auto-trigger workflows for E2E (policy stays in force per `project_e2e_targeted_until_117`).
- Did not modify any existing user data (no migration, no backfill).
- Did not add a new package, env var, or DB migration.
- Did not silence any pre-existing warning or test.
- Did not delete any existing test (nothing obsolete was identified).
- Did not write or read against the prod Mongo (UAT only per `feedback_no_prod_db_touches`).
- Did not run `--admin` merges or skip CI gates.
