# AI use note — REQ-128

**Tool:** Claude Code (Anthropic), driving the `sdlc-implementer` skill
**Model:** Claude Sonnet 5.5 (claude-sonnet-5-5)
**Commits:** the commits of this REQ carrying the `Sdlc-Implementer-Sentinel:` trailer, `e0ecaacd`, `0e6c8138` and `46aaefe1`
**Human reviewer:** the operator who approves the release (william@ostendo.io)

AI wrote the plan, SRS items, ADR-015 draft, risk entries, the implementation, the unit and e2e tests and this evidence under the operator's direction and plan approval (2026-11-26). The operator approved decisions D1 to D6, asked for the refund to be available to staff from the order in the dashboard, asked for #1071 to be included as an acceptance criterion, and approved the wording change to `order_cancelled`. Findings from the e2e run were fixed in the same branch. Nothing is sent to an external AI service by the product.
