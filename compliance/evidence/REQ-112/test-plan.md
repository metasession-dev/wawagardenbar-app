---
req: REQ-112
generated_from: compliance/plans/REQ-112/implementation-plan.md
---

# Test plan — REQ-112

| AC  | Test type    | File / method                                                                             | Covered?              |
| --- | ------------ | ----------------------------------------------------------------------------------------- | --------------------- |
| AC1 | Type-check   | `npx tsc --noEmit` (new `app/(public)/terms/page.tsx`)                                    | Yes                   |
| AC1 | Manual smoke | Visit `/terms` logged in + logged out on UAT after deploy                                 | Pending (post-deploy) |
| AC2 | Type-check   | `npx tsc --noEmit` (`app/(public)/data-deletion/page.tsx`, `data-deletion-form.tsx`)      | Yes                   |
| AC2 | Manual smoke | Visit `/data-deletion` logged out on UAT after deploy; confirm no redirect                | Pending (post-deploy) |
| AC3 | Manual smoke | Visit `/data-deletion` logged in on UAT after deploy; confirm form unchanged              | Pending (post-deploy) |
| AC4 | Manual smoke | Footer link check on UAT after deploy                                                     | Pending (post-deploy) |
| AC5 | Type-check   | `npx tsc --noEmit` (rewritten `app/(customer)/contact/page.tsx`)                          | Yes                   |
| AC5 | Manual smoke | Visit `/contact` on UAT after deploy; confirm WhatsApp + email only                       | Pending (post-deploy) |
| AC6 | Manual smoke | Visit `/privacy` and `/terms` on UAT after deploy; confirm Contact Us links to `/contact` | Pending (post-deploy) |
| AC7 | Manual smoke | Footer on UAT after deploy; confirm address + Instagram/TikTok-only social links          | Pending (post-deploy) |

**E2E:** `@e2e-deferred` — see implementation plan §4. No dedicated Playwright spec for this REQ; coverage is type-checking + manual smoke, proportionate to a LOW-risk static-content/redirect-removal change with no new business logic.

**Unit tests:** None added — no new business logic (the data-deletion fix is a single conditional render branch on an existing, already-tested session-read, not new logic warranting isolated unit coverage).
