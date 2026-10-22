---
req: REQ-112
generated_from: compliance/plans/REQ-112/implementation-plan.md
---

# Test scope — REQ-112

| AC  | Description                                                                                                                                                              | SRS item                   | Risk class | Verification method                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ---------- | -------------------------------------------------------------- |
| AC1 | Given a visitor (logged in or out) navigates to `/terms`, When the page loads, Then the Terms of Service content renders, matching the `/privacy` page's layout/style.   | REQ-PRIVACY-003 (new)      | LOW        | `tsc --noEmit` + manual smoke on UAT after deploy              |
| AC2 | Given a logged-out visitor navigates to `/data-deletion`, When the page loads, Then deletion instructions render directly (no redirect to `/login`).                     | REQ-PRIVACY-001 (existing) | LOW        | `tsc --noEmit` + manual smoke on UAT after deploy              |
| AC3 | Given a logged-in visitor navigates to `/data-deletion`, When the page loads, Then the existing interactive deletion-request form still renders and functions as before. | REQ-PRIVACY-002 (existing) | LOW        | `tsc --noEmit` + manual smoke on UAT after deploy (regression) |
| AC4 | Given any visitor, When they view the site footer, Then "Terms of Service" and "Privacy Policy" links appear and navigate correctly.                                     | `@srs-deferred`            | LOW        | Manual smoke on UAT after deploy                               |
| AC5 | Given any visitor, When they open `/contact`, Then only WhatsApp + email are shown — no hours, no support-ticket form.                                                   | REQ-CONTACT-001 (new)      | LOW        | `tsc --noEmit` + manual smoke on UAT after deploy              |
| AC6 | Given any visitor, When they open `/privacy` or `/terms` and view Contact Us, Then it links to `/contact` instead of duplicating contact details.                        | REQ-CONTACT-001 (new)      | LOW        | Manual smoke on UAT after deploy                               |
| AC7 | Given any visitor, When they view the footer, Then the business address renders, and only Instagram + TikTok social links are present.                                   | REQ-CONTACT-002 (new)      | LOW        | Manual smoke on UAT after deploy                               |
