# Release Ticket: REQ-112 — Terms of Service page + public Data Deletion instructions

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-10-21
**Requirement ID:** REQ-112
**Risk Level:** LOW
**Issue:** [#938](https://github.com/metasession-dev/wawagardenbar-app/issues/938)
**Implementation branch:** `feat/REQ-112-terms-data-deletion`

**Release status (2026-10-22):** proceeding to a bundled `develop → main` release now with REQ-111 (`Bundles: #933, #938`), rather than continuing to wait on REQ-111's live WhatsApp round-trip test — see `compliance/pending-releases/RELEASE-TICKET-REQ-111.md` § Requirements gap accepted (2026-10-22) for the operator's decision and rationale. This REQ's own evidence (legal pages, contact page, footer) is unaffected and was already fully verified live on UAT.

## Summary

Adds a public `/terms` page (mirrors the existing `/privacy` page's layout/style) and fixes `/data-deletion` to render deletion instructions for logged-out visitors instead of unconditionally redirecting to `/login` — the interactive submission form stays gated to logged-in users, unchanged. Activates two pre-existing, commented-out footer links to both pages. Unblocks the WGB DEV Meta WhatsApp app's Go Live checklist, which requires a reachable Terms of Service URL and a Data Deletion instructions URL that doesn't hide its content behind a login wall from an unauthenticated reviewer.

**Change-request iteration 1 (2026-10-21):** operator requested additional, related changes be folded into this REQ — see `compliance/plans/REQ-112/implementation-plan.md` § Change-request iteration 1 for the full amendment record. Summary: `/contact` rewritten to show only WhatsApp + email (hours and support-ticket form removed); `/privacy`/`/terms` Contact Us sections now link to `/contact` instead of duplicating details; footer gains the business's physical address and is reduced to Instagram + TikTok social links only.

## AI contributors

| Tool        | Version  | Commits                                                                                             | Date       |
| ----------- | -------- | --------------------------------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `635ec11`, `482c654` (plan + SRS + RTM + implementation + evidence); iteration 1 commit TBD on push | 2026-10-21 |

## Implementation details

- `app/(public)/terms/page.tsx` — new static page, identical component pattern to the existing `app/(public)/privacy/page.tsx`.
- `app/(public)/data-deletion/page.tsx` — removed the unconditional `redirect('/login?redirect=/data-deletion')` for unauthenticated visitors; now passes `isLoggedIn` to `DataDeletionForm`.
- `app/(public)/data-deletion/data-deletion-form.tsx` — new `isLoggedIn` prop; logged-out visitors see a public instructions block + a "Log In to Continue" CTA; logged-in visitors see the unchanged interactive form.
- `components/shared/navigation/footer.tsx` — uncommented the pre-existing "Terms of Service" and "Privacy Policy" footer link entries.
- `docs/SRS.md` — `REQ-PRIVACY-003` (new); `REQ-PRIVACY-001` traced (existing — this REQ closes a pre-existing drift where the SRS already specified `/data-deletion` loads without authentication but the code never matched it); `REQ-PRIVACY-002` traced unchanged (regression case).
- No ADR needed (4-file content/small-fix change, no new dependency/service/DB tier — see `compliance/evidence/REQ-112/architecture-decision.md`).
- Risk register: `@risk-deferred` (LOW risk, no register-worthy surface).

**Iteration 1:**

- `app/(customer)/contact/page.tsx` — rewritten: removed `SettingsService`/Mongo fetch, the Hours card, and the "File a support ticket" card/`SupportForm`; now a static page hardcoding WhatsApp (+234 814 825 3342) and email (ade@wawagardenbar.com) as the only two contact methods.
- `app/(public)/privacy/page.tsx` §7, `app/(public)/terms/page.tsx` §11 — Contact Us sections now link to `/contact` instead of listing separate contact details.
- `components/shared/navigation/footer.tsx` — added the business address; social links reduced from Facebook/Instagram/Twitter to Instagram + TikTok only (TikTok has no lucide-react icon, so a minimal inline SVG was added).
- `docs/SRS.md` — new Feature Area 28 (Contact / Support): `REQ-CONTACT-001` (centralized contact info), `REQ-CONTACT-002` (footer address + social handles). Also closes a stated SRS backlog gap — Appendix A explicitly listed "the `/contact` page" as planned-but-uncovered.
- No ADR needed (re-confirmed — see implementation plan §3 iteration 1 re-check).
- Risk register: `@risk-deferred` unchanged.

## Scope note

This REQ previously landed on `develop` only, auto-deploying to UAT via `deploy-uat-k3s.yml` to unblock the Meta Go Live checklist (WGB DEV's Basic Settings URLs point at the UAT domain, not production). As of 2026-10-22 it proceeds to the bundled `develop → main` production release alongside REQ-111 — see **Release status** above.

## Verification

- TypeScript: 0 errors (both the original diff and iteration 1).
- ESLint: 0 errors on changed files (1 pre-existing warning in `data-deletion-form.tsx`, unrelated to this REQ).
- Unit: 1,512 passed, 4 skipped (full suite) — no new tests needed (no new business logic in either iteration); confirms no regression.
- npm audit --audit-level=high: 23 pre-existing findings (15 high), confirmed unrelated — no `package.json`/`package-lock.json` changes in this diff.
- E2E: `@e2e-deferred` — see `compliance/evidence/REQ-112/e2e-scope-decision.md`.
- Full detail: `compliance/evidence/REQ-112/test-execution-summary.md` (re-compiled for iteration 1, covers all 7 ACs).

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
