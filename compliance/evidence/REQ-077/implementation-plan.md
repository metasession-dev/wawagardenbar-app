---
title: 'Implementation plan — REQ-077'
requirement_id: 'REQ-077'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'agent (sdlc-implementer)'
authored_at: '2026-06-10'
---

# Implementation plan — REQ-077

**Title:** Expand each incident on `/dashboard/incidents` to show details + remediation context

**Issue:** [#364](https://github.com/metasession-dev/wawagardenbar-app/issues/364)

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one (Section 1 + Section 8).                                    |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations (Section 4).                                                              |
| **GDPR Art. 25** Data protection by design and by default | Per-purpose data flows; minimisation; lawful basis; retention. Explicit "no personal data" callout below (Section 5). |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | Explicit "no AI in scope" callout (Section 6).                                                                        |

## 1. Goal + acceptance criteria

- **Goal:** Surface the full `IncidentEventModel.errorDetails` payload + the linked Order's context inline on `/dashboard/incidents` so admins can remediate failures without leaving the page.

### Acceptance criteria

| AC  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      | SRS item it traces to                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| AC1 | **Given** an admin is on `/dashboard/incidents` with at least one incident in the listing, **When** they click the row (or its chevron icon), **Then** the row expands inline to reveal a details panel, the chevron rotates to indicate expanded state, multiple rows can be expanded at once, and `Enter`/`Space` toggle expansion via keyboard.                                                                                                               | **REQ-INV-014** (new — Incidents queue row expansion UX)                                                                     |
| AC2 | **Given** an admin has expanded an incident row, **When** the expanded panel renders, **Then** the panel shows the full `errorDetails` JSON pretty-printed (formatted, multi-line), `createdAt` + `updatedAt` timestamps in both ISO + human-relative forms, and the `entityId` as a clickable link to `/dashboard/orders/{entityId}`.                                                                                                                           | **REQ-INV-015** (new — Incident details panel: errorDetails + Order snapshot) — AC2 = errorDetails/timestamps/entityId half  |
| AC3 | **Given** an admin has expanded an incident row whose `entityId` resolves to a valid Order, **When** the expanded panel renders, **Then** it includes an Order snapshot block showing order number, status, paymentStatus, paymentMethod, businessDate, line items (name × quantity × subtotal), total, tipAmount, the `inventoryDeducted` boolean, and the `createdAt` / `paidAt` / `completedAt` timestamps.                                                   | **REQ-INV-015** (new — same item; AC3 = Order-snapshot half of the same panel)                                               |
| AC4 | **Given** an admin has expanded an `inventory_deduction_failed` incident whose linked Order has `inventoryDeducted: false`, **When** the panel renders, **Then** the existing `<IncidentRetryButton>` is visible inside the expansion (reused as-is — same `orderId` prop). **And** for `stale_paid_order` incidents the panel shows `order.statusHistory[]` as a chronological list (status → timestamp → note) so the admin can see which transition is stuck. | **REQ-INV-013** (existing — Retry-now; trace-only, no drift) + **REQ-INV-016** (new — Stale-paid-order status-history trail) |
| AC5 | **Given** an admin loads `/dashboard/incidents` with up to 200 incidents (the existing page cap), **When** the page server-renders, **Then** all expansion-panel HTML is included in the initial server-rendered response (the Order lookups already join in the page's single server query — extended in scope, no new per-row fetch); clicking expand toggles client state only and triggers no network call.                                                  | `@srs-deferred: implementation-detail` (how the same observable outcomes from AC1–AC4 are delivered, not WHAT the user sees) |
| AC6 | **Given** an admin is viewing `/dashboard/incidents?kind=inventory_deduction_failed` with at least one row expanded, **When** they refresh the page (or share the URL with another admin), **Then** the `?kind=` filter is preserved as today and the previously-expanded incident remains expanded after reload via a URL hash (e.g. `#open=<id>` accepting `<id1>,<id2>` for multi-row state).                                                                 | **REQ-INV-017** (new — Incidents URL state: filter + expanded-row hash)                                                      |

> **SRS-ID column populated by the `requirements-aligner` skill** at Stage 1 plan APPROVAL. The skill fuzzy-matches each AC against `docs/SRS.md`, proposes new `REQ-AREA-NNN` stubs for behaviour the SRS doesn't yet describe, and flags stale items.

## 2. Scope

- **In scope:**
  - `app/dashboard/incidents/page.tsx` — server-side fetch extended to include Order snapshot fields (`statusHistory`, `items`, `total`, `tipAmount`, `businessDate`, `paymentStatus`, `paymentMethod`, `paidAt`, `completedAt`, `orderNumber`, `status`) in the same `OrderModel.find` projection that today only fetches `_id` + `inventoryDeducted`. Render replaced from inline `<TableRow>` to a new `<IncidentRow>` client component.
  - `components/features/admin/incident-row.tsx` (new) — client component holding expand/collapse state, chevron, keyboard handlers, URL-hash sync.
  - `components/features/admin/incident-details-panel.tsx` (new) — the expanded-view content (errorDetails JSON renderer + Order snapshot + kind-specific hints + retry button passthrough).
  - `services/incident-event-service.ts` — new method `listWithLinkedOrders(filter)` returning `(IIncidentEvent + linkedOrder?: OrderSnapshot)` shape so the page can call it once instead of doing the join inline. Existing `list()` stays for callers that don't want the join.
  - Unit tests: `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` — pins the join logic + the kind-conditional snapshot fields.
  - E2E: critical-tier spec at `e2e/critical/incidents-expansion.spec.ts` (delegated to `e2e-test-engineer`).
- **Out of scope:**
  - New incident kinds (this REQ surfaces what's already captured; future REQs add kinds).
  - Bulk actions (mark-as-read, clear-all, etc.).
  - Pagination beyond the existing 200-row cap.
  - Editing the incident itself (audit records remain append-only).
  - Email/SMS notifications when new incidents fire — separate REQ if requested.

### Surface inventory (MEDIUM/HIGH risk — required)

| Surface                      | URL / file                                                                                               | Status                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incidents queue (list)       | `/dashboard/incidents` — `app/dashboard/incidents/page.tsx`                                              | **In scope** — table rows extended to be expandable; new server query for Order snapshot                                                                          |
| Incident-row expansion (new) | `components/features/admin/incident-row.tsx` + `incident-details-panel.tsx`                              | **In scope** — net-new components                                                                                                                                 |
| Per-row "Retry now"          | `components/features/admin/incident-retry-button.tsx`                                                    | **Already works** — reused unchanged inside the new expansion panel for `inventory_deduction_failed` rows whose linked Order still has `inventoryDeducted: false` |
| Linked Order detail page     | `/dashboard/orders/{id}`                                                                                 | **Already works** — `entityId` link target; no change                                                                                                             |
| RBAC gate                    | `requireRole(['csr','admin','super-admin'])` on the incidents page + `IAdminPermissions.incidentsAccess` | **Already works** — REQ-066 AC10 enforced via existing nav filter + page guard; no change                                                                         |
| Filter chips (kind=all/...)  | Already on `/dashboard/incidents` via `?kind=`                                                           | **Already works** — preserved as-is + composed with the new URL-hash for expanded-row state                                                                       |

## 3. Architecture decisions

- **No ADR needed** — UI-only enhancement on the existing `/dashboard/incidents` page. No new third-party runtime dependency (pretty-printing uses native `JSON.stringify(value, null, 2)` in a `<pre>` block); no new external service; no new database / cache / queue tier; no schema change (`IncidentEventModel` and `OrderModel` projections only extended, not migrated); risk class MEDIUM (not HIGH/CRITICAL). The 4 in-scope files (`app/dashboard/incidents/page.tsx` + 2 new client components + 1 service method extension) follow the existing page → service → component pattern already used throughout `app/dashboard/**` — no new architectural pattern introduced. Verdict by `adr-author` skill at Stage 1 plan APPROVAL.

## 4. Threat model + security considerations

> _Closes ISO 27001 A.8.25 — secure development life cycle_

| Threat                                                                                                           | Likelihood | Impact | Mitigation                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthorised access to the incidents page (and therefore to operational error metadata)                          | LOW        | MEDIUM | Existing RBAC (REQ-066 AC10) — `requireRole(['csr','admin','super-admin'])` + `incidentsAccess` permission — gates the page. This REQ does NOT change the gate. New components inherit the same auth context.                            |
| `errorDetails` JSON containing an arbitrary actor field (e.g. `actorUserId`) leaked beyond its intended audience | LOW        | LOW    | The data is already in DB + read by the page server-side. This REQ surfaces what's already accessible to admins (same audience as today's row Summary). No fan-out to customers or unauthenticated routes.                               |
| Client-side state (expanded-row IDs in URL hash) used for XSS                                                    | LOW        | MEDIUM | Hash content used only to drive `useState(initial)` for expansion — never `dangerouslySetInnerHTML`, never `eval`. IDs match `/^[a-f0-9]+$/` ObjectId pattern; non-matching segments ignored.                                            |
| Cascading regression of the existing `<IncidentRetryButton>` action (REQ-066 AC10)                               | LOW        | HIGH   | The retry button is REUSED as-is — same component import, same `orderId` prop, no wrapping changes its behaviour. Unit + e2e tests pin both "retry visible when undeducted" and "retry-now flow still works post-click".                 |
| Large `errorDetails` payload bloats page response (200 rows × N-deep JSON)                                       | LOW        | LOW    | Existing 200-row cap. errorDetails is currently `{ message, actorUserId, actorRole }` — small. JSON renderer pretty-prints client-side; server response grows linearly with row count and is well within Next.js's typical RSC envelope. |

**Secrets / credentials:** N/A — no new secrets handled, stored, or exposed.

**Dependencies introduced:** None planned. Pretty-printing of JSON uses native `JSON.stringify(value, null, 2)` rendered inside a `<pre>` tag — no library. If a syntax-highlighter were desired (bonus, not in scope), it would need ADR review.

### Risk register entries

This REQ opens the following entries in [`compliance/risk-register.md`](../../risk-register.md):

- **R-003 — IncidentRetryButton remediation regression when relocated into expansion container** — Status: OPEN (residual low × high). Opened by `risk-register-keeper` skill at Stage 1 plan APPROVAL. Mitigations: component reused unchanged + unit + e2e + critical-tier gate. Operator edits canonical row + signs off residual rating before plan APPROVAL.
- **R-004 — URL-hash-driven expansion state: fidelity + injection-surface defence** — Status: OPEN (residual low × low). Opened by `risk-register-keeper` skill at Stage 1. Mitigations: ObjectId regex on hash segments + no DOM-string-injection sinks + graceful-degradation default + AC6 e2e round-trip. Operator edits + signs off before plan APPROVAL.

Deferred from register (covered as inline notes in §4 threat-model table):

- `@risk-deferred: inherited from REQ-066 RBAC` — unauthorised access to incidents page; existing `requireRole(['csr','admin','super-admin'])` + `incidentsAccess` permission gate unchanged by this REQ.
- `@risk-deferred: same audience as today; no fan-out` — `errorDetails` JSON contents (e.g. `actorUserId`) already accessible to admins via the existing list view; this REQ surfaces what's already in the page's audience.
- `@risk-deferred: existing 200-row cap bounds the surface` — payload bloat from extending the Order-snapshot projection; the existing limit caps the worst case.

## 5. Data protection (GDPR Art. 25)

> _Closes GDPR Art. 25 — data protection by design_

**Personal data processed by this REQ:** No (no new processing).

`IncidentEventModel.errorDetails.actorUserId` is an admin/staff identifier already stored when the incident fires (see `services/order-service.ts:870`). This REQ surfaces existing data to an existing audience (the same admins) via an existing page. No new collection, no new retention, no new disclosure.

- **Categories of data subjects:** N/A (no new processing)
- **Categories of personal data:** Internal admin identifiers (`actorUserId`) — already collected; surfaced under existing admin-only RBAC.
- **Special categories (Art. 9):** None.
- **Lawful basis:** Art. 6(1)(f) legitimate interest — operational diagnostics for staff. Already established by REQ-066.
- **Purpose limitation:** Same purpose as REQ-066 (audit visibility of silent failures); no new purpose.
- **Data minimisation:** The expansion shows ONLY fields already in DB for incidents and their linked orders. No new fields fetched from external systems.
- **Retention:** Inherits REQ-066's retention policy (records persist indefinitely; explicit cleanup tracked at a future REQ).
- **Cross-references:**
  - ROPA: N/A — no new processing operation to register.
  - DPIA: N/A — no high-risk profile under Art. 35.
- **Cross-border transfers:** None.

## 6. AI / model considerations (EU AI Act Art. 11)

> _Closes EUAIA Art. 11 — technical documentation_

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour. Pure UI enhancement reading existing DB content.

## 7. Rollback plan

- **Reversible via:** `git revert <merge-commit>` — feature is purely additive (new files + extended server fetch on an existing page). Reverting restores the existing list view.
- **Data implications of rollback:** None. No data writes. No schema change. No migration. The expanded URL-hash, if present in user browser history, is silently ignored by the reverted page.
- **Notification path if rollback during a release:** Standard SDLC incident path per `compliance/governance/incident-report-template.md`. Operator notifies via the release-ticket issue comment; no customer-facing impact (admin-only feature).

## 8. Verification

- **Unit + integration tests:**
  - `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` — new (~8 cases) pinning:
    - Returns flat list when no incidents
    - Joins Order snapshot fields only for `inventory_deduction_failed` + `stale_paid_order` kinds whose `entityId` is a valid ObjectId
    - Returns `linkedOrder: null` (not undefined) when the entityId resolves to no Order
    - Preserves the existing `IncidentEventService.list()` filter semantics (kind=all / kind=specific, limit)
    - Order snapshot includes the expected projection (orderNumber, status, items, total, tipAmount, paymentMethod, paymentStatus, businessDate, statusHistory, inventoryDeducted, paidAt, completedAt, createdAt)
    - `statusHistory` is shaped as `Array<{status, timestamp, note?}>` for the stale_paid_order case
- **E2E coverage:** delegated to `e2e-test-engineer`. New spec at `e2e/critical/incidents-expansion.spec.ts` covering AC1 (expansion toggle + keyboard), AC2 (errorDetails JSON visible), AC3 (Order snapshot present), AC4 (retry button reachable from inside expansion + retry-now flow still works), AC5 (no per-row network call on click — `page.on('request')` assertion), AC6 (URL-hash round-trip on reload).
- **Manual smoke after deploy:** Open `/dashboard/incidents` as super-admin on prod, expand one of each kind, verify the displayed errorDetails matches what's in Mongo, click Retry on an undeducted incident (if any), confirm UI updates without page reload.
- **Monitoring / alerting:** Inherits REQ-066's existing surface. No new dashboards.

## 9. Sign-off

- **Plan reviewer (eng):** ostendo-io — 2026-06-10
- **Plan reviewer (security / DPO):** N/A — no GDPR / threat-model concerns beyond the trivial; same data audience as today.
- **Plan approved by operator:** ostendo-io — 2026-06-10 (confirmed at Phase 0 "proceed")

## Upload path

This file lives at `compliance/plans/REQ-077/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`. The portal's framework-coverage matrix flips ISO 29119 §3.4, ISO 27001 A.8.25, GDPR Art. 25, and EU AI Act Art. 11 to COVERED for this REQ once the upload lands.

Verify the upload at `https://devaudit.ai/projects/wgb/releases/REQ-077` — the "Evidence by requirement" list should show this plan tagged with `category=planning`.
