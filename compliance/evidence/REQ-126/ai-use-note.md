# AI use note — REQ-126

**Tool:** Claude Code (Anthropic), driving the `sdlc-implementer` skill
**Model:** Claude Sonnet 5.5 (claude-sonnet-5-5)
**Session:** 2a4436ed-6536-4a6b-b0be-794db8dc4cd2
**Commits:** the commits of this bundle carrying the `Sdlc-Implementer-Sentinel:` trailer, `5fb04778` onward
**Human reviewer:** the operator who approves the release (william@ostendo.io)

AI wrote the plan, SRS items, ADR-014 draft, risk entries, the implementation, the unit and e2e tests and this evidence under the operator's direction and plan approval (2026-11-25). The operator chose the design decisions (option B for #1031, opted-out customers still get the order link, replies to a customer's own message are not switchable). Findings from the e2e runs were fixed in the same branch. Nothing is sent to an external AI service by the product.

## Bundled Release Context

- **Core tracked release:** `REQ-125` (this REQ, REQ-126, is a co-tracked member)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.15.0 sync, `reuse_pull_request_gates` config); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-125.md`
- **Why bundled here:** REQ-125 (WA-15), REQ-126 (WA-16) and REQ-127 (#1031) were declared as one bundle at planning time (MEDIUM, no overlapping files) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-125, and covers all three.
- **Reviewer impact:** approval covers REQ-125 and its co-tracked members REQ-126 and REQ-127 (all MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-77 to R-80 in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa15-wa16-checkout-fix`
