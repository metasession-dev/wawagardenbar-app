---
title: 'Implementation plan — REQ-112'
requirement_id: 'REQ-112'
risk_class: 'LOW'
change_type: 'fix'
authored_by: 'claude-sonnet-5'
authored_at: '2026-10-21'
---

# Implementation plan — REQ-112

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | Explicit "no personal data" callout (not applicable).      |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | Explicit "no AI in scope" callout (not applicable).        |

## 1. Goal + acceptance criteria

- **Goal:** Add a public Terms of Service page and fix the Data Deletion page so its instructions render for logged-out visitors, so Meta's WhatsApp app review can verify the three legal/compliance URLs required for Go Live.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                     | SRS item it traces to                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Given a visitor (logged in or out) navigates to `/terms`, When the page loads, Then the Terms of Service content renders, matching the existing `/privacy` page's layout/style.                 | REQ-PRIVACY-003 (new)                                                                                                            |
| AC2 | Given a logged-out visitor navigates to `/data-deletion`, When the page loads, Then deletion instructions render directly (no redirect to `/login`) with a "Log In to Continue" call-to-action. | REQ-PRIVACY-001 (existing — closes pre-existing drift)                                                                           |
| AC3 | Given a logged-in visitor navigates to `/data-deletion`, When the page loads, Then the existing interactive deletion-request form still renders and functions exactly as before.                | REQ-PRIVACY-002 (existing, trace-only — regression)                                                                              |
| AC4 | Given any visitor, When they view the site footer, Then "Terms of Service" and "Privacy Policy" links appear and navigate to `/terms` and `/privacy` respectively.                              | `@srs-deferred: incidental navigation wiring to pages already covered by REQ-PRIVACY-001/003; not independently register-worthy` |

## SRS items proposed/touched

| AC  | SRS item              | Status                     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-PRIVACY-003 (new) | added (new)                | `/terms` had no SRS coverage at all. Added at Feature Area 25, sibling pattern to REQ-PRIVACY-001.                                                                                                                                                                                                                                                                                                                              |
| AC2 | REQ-PRIVACY-001       | drift closed — no SRS edit | REQ-PRIVACY-001 already specified both `/privacy` _and_ `/data-deletion` "load without authentication" — the SRS was correct, but `/data-deletion`'s code never matched it (unconditional login redirect). This REQ's AC2 brings the implementation into line with the pre-existing, already-correct SRS text. No SRS prose change needed — this is implementation catching up to spec, not spec catching up to implementation. |
| AC3 | REQ-PRIVACY-002       | unchanged                  | Trace-only — the logged-in submission flow (the actual deletion request, gated behind login) is unchanged by this REQ.                                                                                                                                                                                                                                                                                                          |
| AC4 | `@srs-deferred`       | deferred                   | Footer link placement; see rationale in AC table above.                                                                                                                                                                                                                                                                                                                                                                         |

**Table/heading drift check (Step 4a):** none found — `REQ-PRIVACY-001`/`002` appear consistently in both the summary table (`docs/SRS.md:226-227`) and heading blocks (`docs/SRS.md:1490,1496`) prior to this REQ's addition.

## 2. Scope

- **In scope:**
  - New page: `app/(public)/terms/page.tsx`
  - Modified: `app/(public)/data-deletion/page.tsx` (remove unconditional redirect for unauthenticated visitors)
  - Modified: `app/(public)/data-deletion/data-deletion-form.tsx` (branch on `isLoggedIn`, add public instructions block)
  - Modified: `components/shared/navigation/footer.tsx` (uncomment/activate Terms + Privacy links)
- **Out of scope:**
  - Any change to the deletion request's actual processing logic (`requestDataDeletionAction`) — untouched.
  - Any change to `/privacy` content.
  - Production deployment/release to `main` — this REQ lands on `develop` (auto-deploys to UAT) and is deferred for bundling with REQ-111's eventual production release (see Risk register / Rollback notes).

### Surface inventory

| Surface                         | URL / file                                               | Status                                                     |
| ------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Terms of Service page           | `/terms` — `app/(public)/terms/page.tsx`                 | In scope                                                   |
| Data Deletion page (logged out) | `/data-deletion` — `app/(public)/data-deletion/page.tsx` | In scope                                                   |
| Data Deletion page (logged in)  | `/data-deletion` — same file, existing form              | Already works — unchanged, just re-verified not to regress |
| Footer links                    | `components/shared/navigation/footer.tsx`                | In scope                                                   |

## 3. Architecture decisions

- **No ADR needed** — Evaluated against the decision tree: no new third-party dependency, no new external service, no new DB/cache/queue tier, no schema-level data model change, risk class LOW (not HIGH/CRITICAL), no `file_paths_signal_architecture` match. The diff is one new static content page (`app/(public)/terms/page.tsx`, identical pattern to the existing `/privacy` page) plus a conditional-render branch added to an existing session check in `app/(public)/data-deletion/page.tsx` + `data-deletion-form.tsx`, plus uncommenting two pre-existing footer link entries — 4 files total, no structural or pattern change spanning the codebase. This matches the "bug fix / small content change touching a handful of files in `app/`" no-ADR signal.

## 4. E2E test coverage

- **`@e2e-deferred: <rationale>`** — This REQ is a transparency/legal-content fix with no interactive business logic beyond an existing, already-tested session check. The existing form's logged-in behaviour is unchanged (same `DataDeletionForm` component, same `requestDataDeletionAction` call). Coverage is via unit-level type-checking (`tsc --noEmit`) and manual verification of both the logged-in and logged-out render paths; a dedicated Playwright spec is not proportionate to a static-content/redirect-removal change at LOW risk.

## 5. Threat model + security considerations

| Threat                                                                                                                       | Likelihood | Impact | Mitigation                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Removing the login redirect on `/data-deletion` accidentally exposes the submission form or user data to logged-out visitors | Low        | Low    | The logged-out branch renders static instructions only — no user data, no form fields, no session-derived values. The interactive form remains behind the existing `session.isLoggedIn` check, unchanged. |
| New `/terms` page introduces an XSS surface via unsanitised content                                                          | Low        | Low    | Content is static JSX authored directly in the component — no user input, no `dangerouslySetInnerHTML`, matching the existing `/privacy` page's pattern.                                                  |

**Secrets / credentials:** None introduced.

**Dependencies introduced:** None.

### Risk register entries

- **@risk-deferred: LOW risk, no register-worthy surface.** The only behavioural change is making static instructional text visible to logged-out visitors on a page that previously 100% gated on login; no data, auth state, or financial logic is affected.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ does not process personal data. It only changes which visitors (authenticated or not) can see static legal/instructional text; the data-deletion request form itself (which does handle an email/phone identifier) is unchanged and still gated behind login.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit on `develop`. No migrations, no data written by the new code.
- **Data implications of rollback:** None — no new data is written anywhere by this change.
- **Notification path if rollback during a release:** N/A — this REQ is not released to production independently. Per the operator's decision (2026-10-21), it is bundled with REQ-111 for the eventual `develop → main` release once REQ-111's WhatsApp UAT testing (unblocked by this REQ landing on `develop` and auto-deploying to UAT) is complete. Until then, this REQ's production exposure is limited to UAT (`https://wawagardenbar-uat.ostendo.io`), not `app.wawagardenbar.com`.

## 9. Verification

- **Unit + integration tests:** `npx tsc --noEmit` (no new runtime logic beyond an existing boolean branch); no new unit test needed given the triviality of the branch and absence of business logic.
- **E2E coverage:** see §4 — `@e2e-deferred`.
- **Manual smoke after deploy:** Visit `/terms` and `/data-deletion` both logged-in and logged-out on UAT (`https://wawagardenbar-uat.ostendo.io`) after this REQ auto-deploys there; confirm footer links resolve.
- **Monitoring / alerting:** None added; no new error paths introduced.

## 10. Sign-off

- **Plan reviewer (eng):** claude-sonnet-5 (AI-authored; operator review via PR)
- **Plan reviewer (security / DPO):** N/A — no personal data, no AI in scope.
- **Plan approved by operator:** William Ostendo (pending PR review)

## Upload path

This file lives at `compliance/plans/REQ-112/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
