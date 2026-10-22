---
req: REQ-112
e2e_required: false
spec_path: null
generated_by: sdlc-implementer
generated_at: 2026-10-21
---

# E2E scope decision — REQ-112

**Decision:** No dedicated Playwright spec. `e2e-test-engineer` was not invoked for this REQ.

**Rationale:** This REQ is a LOW-risk content/visibility fix: one new static page (`/terms`, identical pattern to the existing `/privacy` page) and a conditional-render branch on an existing, already-tested session check (`/data-deletion` now shows static instructions to logged-out visitors instead of redirecting to `/login`; the gated submission form itself is unchanged). No new business logic, no new form submission path, no new data flow. Coverage via `tsc --noEmit` + the full existing unit suite (regression pin) + manual smoke on UAT after deploy is proportionate; a Playwright spec for two static-content pages and a redirect removal would not materially increase confidence over the manual smoke already planned.
