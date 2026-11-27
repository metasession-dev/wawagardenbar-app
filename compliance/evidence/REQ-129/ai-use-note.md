# AI use note — REQ-129

**Tool:** Claude Code (Anthropic), driving the `sdlc-implementer` skill
**Model:** Claude Sonnet 5.5 (claude-sonnet-5-5)
**Session:** ac8e55aa-87eb-4514-bb27-6e5c6509a6c1
**Commits:** the commits of this bundle carrying the `Sdlc-Implementer-Sentinel:` trailer, `110b0f9b` onward
**Human reviewer:** the operator who approves the release (william@ostendo.io)

AI wrote the plan, SRS items, risk entries, the implementation, the unit and e2e tests, the template wording and this evidence under the operator's direction (the operator declared the bundle and the scope on 2026-11-27 and confirmed the UAT template submission). The operator decides the sign-offs and approves the release.

## Bundled Release Context

- **Core tracked release:** `REQ-129` (this REQ is the core)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (the docs note on Paystack keys, PR #1104); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-129.md`
- **Why bundled here:** REQ-129 (WA-13, MEDIUM) and REQ-130 (#1087, LOW) were declared as one bundle at planning time by the operator; both add one entry to `components/features/admin/dashboard-nav.tsx` (the overlap was accepted) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-129, and covers both.
- **Reviewer impact:** approval covers REQ-129 and its co-tracked member REQ-130 (the bundle runs at MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-85 to R-87 in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa13-bookings-support-link`
