# Release Ticket: REQ-112 — Terms of Service page + public Data Deletion instructions

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-10-21
**Requirement ID:** REQ-112
**Risk Level:** LOW
**Issue:** [#938](https://github.com/metasession-dev/wawagardenbar-app/issues/938)
**Implementation branch:** `feat/REQ-112-terms-data-deletion`

- **Release intent:** deferred-to-next — not yet submitted for a `develop → main` release PR, will bundle with REQ-111 (`Bundles: #933, #938`) once REQ-111's WhatsApp UAT round-trip test passes. See `compliance/pending-releases/RELEASE-TICKET-REQ-111.md` § Release status note (2026-10-21).

## Summary

Adds a public `/terms` page (mirrors the existing `/privacy` page's layout/style) and fixes `/data-deletion` to render deletion instructions for logged-out visitors instead of unconditionally redirecting to `/login` — the interactive submission form stays gated to logged-in users, unchanged. Activates two pre-existing, commented-out footer links to both pages. Unblocks the WGB DEV Meta WhatsApp app's Go Live checklist, which requires a reachable Terms of Service URL and a Data Deletion instructions URL that doesn't hide its content behind a login wall from an unauthenticated reviewer.

## AI contributors

| Tool        | Version  | Commits                                                  | Date       |
| ----------- | -------- | -------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `635ec11` (plan + SRS + RTM + implementation + evidence) | 2026-10-21 |

## Implementation details

- `app/(public)/terms/page.tsx` — new static page, identical component pattern to the existing `app/(public)/privacy/page.tsx`.
- `app/(public)/data-deletion/page.tsx` — removed the unconditional `redirect('/login?redirect=/data-deletion')` for unauthenticated visitors; now passes `isLoggedIn` to `DataDeletionForm`.
- `app/(public)/data-deletion/data-deletion-form.tsx` — new `isLoggedIn` prop; logged-out visitors see a public instructions block + a "Log In to Continue" CTA; logged-in visitors see the unchanged interactive form.
- `components/shared/navigation/footer.tsx` — uncommented the pre-existing "Terms of Service" and "Privacy Policy" footer link entries.
- `docs/SRS.md` — `REQ-PRIVACY-003` (new); `REQ-PRIVACY-001` traced (existing — this REQ closes a pre-existing drift where the SRS already specified `/data-deletion` loads without authentication but the code never matched it); `REQ-PRIVACY-002` traced unchanged (regression case).
- No ADR needed (4-file content/small-fix change, no new dependency/service/DB tier — see `compliance/evidence/REQ-112/architecture-decision.md`).
- Risk register: `@risk-deferred` (LOW risk, no register-worthy surface).

## Scope note

This REQ lands on `develop` only for now — no `main`/production release yet. `develop` auto-deploys to UAT via `deploy-uat-k3s.yml`, which is sufficient to unblock the Meta Go Live checklist (WGB DEV's Basic Settings URLs point at the UAT domain, not production, since this app exists only for UAT testing). Production release is deferred and will be bundled with REQ-111 once REQ-111's WhatsApp UAT test passes — see **Release intent** above.

## Verification

- TypeScript: 0 errors.
- ESLint: 0 errors on changed files (1 pre-existing warning in `data-deletion-form.tsx`, unrelated to this REQ).
- Unit: 1,512 passed, 4 skipped (full suite) — no new tests needed (no new business logic); confirms no regression.
- npm audit --audit-level=high: 23 pre-existing findings (15 high), confirmed unrelated — no `package.json`/`package-lock.json` changes in this diff.
- E2E: `@e2e-deferred` — see `compliance/evidence/REQ-112/e2e-scope-decision.md`.
- Full detail: `compliance/evidence/REQ-112/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. LOW risk auto-continued through Phase 1 per skill policy (no HIGH/CRITICAL plan-approval pause); the operator reviews the PR before merge to `develop`.

## Bundled Changes

- **Core tracked release:** `REQ-112`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-112.json`
- **Manifest hash:** `sha256:3101c5e46539191afd32cd36f9d7535eac33a51c5d3f4a53da658b6245b93faf`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-111
- **Absorbed non-release work:** housekeeping commits since `51e0f8390b51ad252cbbe0138e268e42139c31d8`
- **Why bundled here:** REQ-111 and REQ-112 were declared co-primary at Phase 1 planning time per the operator's decision (2026-10-21) — both ship under one shared `develop → main` release, one UAT review, one Production approval. REQ-111 keeps its own fully isolated plan/evidence; nothing is absorbed or superseded.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes both REQ-112 and REQ-111.
- **Security / risk impact:** No additional security/risk impact from bundling itself; see each REQ's own risk register entries.
- **Reference:** commit range `51e0f8390b51ad252cbbe0138e268e42139c31d8..HEAD`

See `compliance/pending-releases/BUNDLED-CHANGES-REQ-112.md` for the full generated manifest.
