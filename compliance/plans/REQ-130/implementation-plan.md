---
title: 'Implementation plan — REQ-130'
requirement_id: 'REQ-130'
risk_class: 'LOW'
change_type: 'bug-fix'
authored_by: 'sdlc-implementer (Claude Sonnet 5.5)'
authored_at: '2026-11-27'
---

# Implementation plan — REQ-130

Issue: [#1087](https://github.com/metasession-dev/wawagardenbar-app/issues/1087) — Dashboard: add a Support link to the main menu (tracker #953). Co-tracked member of the bundle whose core is REQ-129 (#975); one branch, one PR, one release. The bundle runs at MEDIUM depth (REQ-129).

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1, §9), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** Staff who can open the Support queue can reach it from the dashboard menu.

### What the code does today (verified)

- `components/features/admin/dashboard-nav.tsx` has no Support entry; `/dashboard/support` and `/dashboard/support/[ticketId]` work and are gated by `requireRole(['csr','manager','admin','super-admin'])` in `app/dashboard/support/layout.tsx`.
- The nav marks an item active when the path equals its `href` or starts with `href/`, so one `/dashboard/support` entry also highlights ticket pages (AC3).

### Decisions

No decisions beyond the issue. The urgent-ticket badge is a follow-up and is not in this REQ.

### Acceptance criteria

| AC  | Description (Given / When / Then)                                                                                                               | SRS-ID       | Verification |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ |
| AC1 | **Given** a csr, manager, admin or super-admin, **Then** the dashboard menu shows a Support item that opens `/dashboard/support`.               | REQ-DASH-007 | unit + e2e   |
| AC2 | **Given** a kitchen-only member or a customer, **Then** the item is not shown and `/dashboard/support` is not reachable (existing layout gate). | REQ-DASH-007 | unit + e2e   |
| AC3 | **Given** the user is on `/dashboard/support` or a ticket page, **Then** the Support item is highlighted.                                       | REQ-DASH-007 | unit + e2e   |
| AC4 | **Given** the critical e2e suite, **Then** a spec shows the link for csr and its absence for kitchen-only.                                      | REQ-DASH-007 | e2e          |

### SRS items proposed/touched

| AC      | SRS item           | Status  | Notes                         |
| ------- | ------------------ | ------- | ----------------------------- |
| AC1–AC4 | REQ-DASH-007 (new) | written | Support link in dashboard nav |

Story → test: `e2e/critical/dashboard-support-link.spec.ts`.

## 2. Scope

- **In scope:** `components/features/admin/dashboard-nav.tsx` (one entry, role list taken from the Support layout's roles), unit test for the nav filter, one critical e2e spec.
- **Out of scope:** urgent or overdue badge; any change to `/dashboard/support` itself.

## 3. Architecture decisions

- **No ADR needed** — REQ-130 adds one role-filtered entry to the dashboard menu; access control stays in the existing Support layout. Signals examined: none of the ADR signals apply (one file, no dependency, no schema, LOW risk).

## 4. E2E test coverage

Delegated to `e2e-test-engineer` in Phase 2 (`e2e/critical/dashboard-support-link.spec.ts`).

## 5. Threat model + security considerations

The link is presentation only; access control stays in `app/dashboard/support/layout.tsx` and the support actions. The nav entry uses the same role list so a role that cannot open the page never sees the link. No new dependency, secret or data path.

### Risk register entries

LOW risk: no new entries (`@risk-deferred: navigation entry only, access control unchanged`).

## 6. Data protection (GDPR Art. 25)

N/A — no personal data is read, stored or sent by this change.

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. AI assistance in authoring is disclosed in `ai-use-note.md`.

## 8. Rollback plan

Revert the PR; the page stays reachable by address as today.

## 9. Verification

Unit test of the nav role filter, the critical e2e spec, `npm run build`; checked on UAT as part of the REQ-129 UAT pack.

## 10. Sign-off

Plan authored 2026-11-27; operator asked for this link to be included in the bundle on 2026-11-27.
