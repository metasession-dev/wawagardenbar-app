---
title: 'Implementation plan — REQ-098'
requirement_id: 'REQ-098'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'agent (sdlc-implementer)'
authored_at: '2026-08-03'
---

# Implementation plan — REQ-098

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | N/A — see §5.                                              |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A — see §6.                                              |

## 1. Goal + acceptance criteria

**Goal:** Give managers/super-admins a formal, audit-trailed way to write off a dormant/uncollectible tab as bad debt — excluding it from recognized revenue — instead of the only existing options today (silently leave it open forever, or force-close it as `'paid'` and overstate revenue, which is exactly what happened on 2026-07-31 to 51 dormant tabs).

**Risk classification rationale:** HIGH, per `SDLC/Test_Policy.md` §Risk-Based Testing "core revenue capabilities" + "regulatory compliance features" signals. This change (a) directly alters what counts as recognized revenue in the financial reports managers rely on for business decisions, (b) includes a one-time script that rewrites 51 already-contaminated production financial records, (c) is RBAC-gated because misuse would let staff hide real unpaid revenue as "written off," and (d) must produce a defensible audit trail (reason + actor + amount) for every write-off — a bad-debt classification that's wrong or unaudited is a compliance/financial-integrity issue, not a UI bug. Same risk tier as REQ-096 (payment-revert on tab/order deletion), which touches the same subsystem.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | SRS item it traces to                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | **Given** a Tab or Order in the database, **When** its `paymentStatus` is inspected, **Then** `'written-off'` is a valid value alongside the existing values — no existing value or behaviour changes.                                                                                                                                                                                                                                                                        | REQ-TABMGT-007 (new) — schema is the substrate for this AC's journey, not a separate journey                                                                                    |
| AC2 | **Given** an open or closed tab that is not already `'written-off'` (including one with `partialPayments`), **When** a manager/super-admin calls the write-off action with a reason, **Then** the tab and every linked order become `paymentStatus: 'written-off'`, `Tab.status` becomes `'closed'`, a `writeOff` record (amount, reason, actor, timestamp) is stamped on both, and an audit-log entry is written. Calling it again on an already-written-off tab is refused. | REQ-TABMGT-007 (new); audit-log aspect also traces to REQ-AUDIT-001 (existing, unchanged)                                                                                       |
| AC3 | **Given** a staff member who is not admin/super-admin, **When** they attempt the write-off action (directly or via UI), **Then** it is refused server-side with "Insufficient permissions" — identical RBAC gate to `deleteTabAction`.                                                                                                                                                                                                                                        | REQ-TABMGT-007 (new)                                                                                                                                                            |
| AC4 | **Given** a manager/super-admin viewing a tab's detail page, **When** they open the new "Write off" action, **Then** a confirmation dialog requires a free-text reason before submitting, and on success the page reflects the tab as written off; the existing Delete action is unchanged and still available side by side.                                                                                                                                                  | REQ-TABMGT-007 (new)                                                                                                                                                            |
| AC5 | **Given** an open tab that has been open longer than the configured dormant threshold (default 24h), **When** a manager/super-admin views the tabs list page, **Then** it is visibly flagged as dormant, and a corresponding `dormant_open_tab` incident (deduped per 24h) appears on `/dashboard/incidents` so a manager is prompted to decide.                                                                                                                              | REQ-TABMGT-008 (new, list flag) + REQ-INV-019 (new, incident scan)                                                                                                              |
| AC6 | **Given** a daily or period financial report for a range containing one or more written-off orders, **When** a manager views the report, **Then** a "Written off (bad debt)" section shows the count and total amount, and those orders are excluded from `totalRevenue`/`orderCount` (already true today with no query change, since existing queries filter on `paymentStatus: 'paid'`).                                                                                    | REQ-REPORT-006 (new)                                                                                                                                                            |
| AC7 | **Given** the 51 tabs contaminated by the 2026-07-31 bulk manual close, **When** an operator runs the scoped remediation script in dry-run then confirmed mode, **Then** exactly those 51 tabs/orders (and no others) are written off via `TabService.writeOffTab`, with the exact list + amounts printed before any write and an explicit `yes` confirmation required.                                                                                                       | `@srs-deferred: one-time production remediation script, not a recurring system behaviour — verified via the script's own dry-run output + AC9's fixture test, not SRS-tracked.` |

## SRS items proposed/touched

| AC          | SRS item                 | Status    | Notes                                                                                                                              |
| ----------- | ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| AC1–AC4     | REQ-TABMGT-007 (new)     | added     | Dormant tab write-off — service method, RBAC, and UI dialog as one user journey (mirrors REQ-TABMGT-004's multi-bullet structure). |
| AC5         | REQ-TABMGT-008 (new)     | added     | Dormant open-tab visibility (tabs-list flag).                                                                                      |
| AC5         | REQ-INV-019 (new)        | added     | Dormant-open-tab incident scan (mirrors REQ-INV-011's reconciliation-cron pattern).                                                |
| AC6         | REQ-REPORT-006 (new)     | added     | Written-off (bad debt) report section.                                                                                             |
| AC2 (audit) | REQ-AUDIT-001 (existing) | unchanged | The general "admin actions appear in audit log" item already covers a new `tab.write_off` action instance — no drift.              |
| AC7         | —                        | deferred  | `@srs-deferred` — see AC7 row above.                                                                                               |

Full canonical Given/When/Then prose for REQ-TABMGT-007, REQ-TABMGT-008, and REQ-INV-019/REQ-REPORT-006 has been drafted directly into `docs/SRS.md` (Feature Areas 11, 15, 17 respectively) as part of this Stage-1 cycle — please review/amend as part of approving this plan.

## 2. Scope

- **In scope:**
  - `models/tab-model.ts`, `models/order-model.ts` — schema additions (`'written-off'` enum value, `writeOff` subdocument)
  - `interfaces/tab.interface.ts`, `interfaces/order.interface.ts` — matching type additions
  - `interfaces/audit-log.interface.ts` — new `'tab.write_off'` audit action literal
  - `services/tab-service.ts` — new `writeOffTab()` method, new `scanDormantOpenTabs()` method
  - `services/incident-event-service.ts`, `models/incident-event-model.ts` — new `dormant_open_tab` incident kind
  - `services/system-settings-service.ts` — new `getDormantTabThresholdHours()` / `updateDormantTabThresholdHours()`, mirroring `getBusinessDayCutoff`/`updateBusinessDayCutoff`
  - `lib/scheduled-jobs.ts` — wire the new dormant-tab scan into the existing cron alongside `scanStalePaidOrders`
  - `app/actions/tabs/tab-actions.ts` — new `writeOffTabAction()`
  - `components/features/admin/tabs/write-off-tab-dialog.tsx` (new) — mirrors `delete-tab-dialog.tsx`
  - `app/dashboard/orders/tabs/[tabId]/page.tsx` — render the new dialog next to the existing delete action
  - `app/dashboard/orders/tabs/page.tsx` + its list client component — dormant flag/filter
  - `services/financial-report-service.ts` — new "Written off (bad debt)" section on all three report-generating functions
  - `scripts/write-off-dormant-tabs-2026-07-31.ts` (new, one-time) — scoped remediation script
  - `docs/SRS.md`, `compliance/RTM.md` — new REQ-098 entries

- **Out of scope** (per the issue's own "Out of scope" section, confirmed unchanged):
  - `TabService.deleteTab`, `TabService.completeTabPaymentManually`, `TabService.closeTab` — no modifications, no shared mutation path beyond the `Tab`/`Order` documents themselves.
  - `Order.status` (kitchen-workflow field) — write-off only ever touches `paymentStatus`.
  - Any general-purpose bulk write-off tool beyond the one scoped 2026-07-31 script.
  - Automatic/unattended write-off — always a human-initiated action with a required reason; the dormancy flag/incident only surfaces the decision, it never auto-executes it.

### Surface inventory (HIGH risk — required)

| Surface                               | URL / file                                                             | Status                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Tab detail — write-off action         | `/dashboard/orders/tabs/[tabId]` — `write-off-tab-dialog.tsx`          | In scope                                                                                    |
| Tabs list — dormant flag              | `/dashboard/orders/tabs` — list client component                       | In scope                                                                                    |
| Incidents dashboard — dormant tab row | `/dashboard/incidents`                                                 | In scope — reuses the existing incidents surface as-is; only a new `kind` value is added    |
| Financial reports — write-off section | `/dashboard/reports` (daily + period + category reports)               | In scope                                                                                    |
| Tab delete action (existing)          | `/dashboard/orders/tabs/[tabId]` — `delete-tab-dialog.tsx`             | Already works — explicitly left unmodified per AC2/Out-of-scope                             |
| Production remediation                | `scripts/write-off-dormant-tabs-2026-07-31.ts` (CLI, not a UI surface) | In scope — operator-run, not user-facing; verification is the printed dry-run list + counts |

## 3. Architecture decisions

- **ADR-003 — Tab/Order write-off state uses a nested `writeOff` subdocument, not flat fields** — Drafted by `adr-author`. File at `docs/ADR/ADR-003-write-off-subdocument-shape.md`. Trigger: this REQ introduces a genuinely new schema pattern (a nested `writeOff` subdocument mirroring `{amount, reason, writtenOffBy, writtenOffAt}` on both `Tab` and `Order`) where the codebase's existing precedent for "state change + actor + timestamp" is a flat 3-field triplet (`isDeleted`/`deletedAt`/`deletedBy` per ADR-002, `reconciled`/`reconciledAt`/`reconciledBy`) rather than a subdocument — a genuine pattern-spanning decision (>5 files) at HIGH risk class, both independently ADR-triggering signals per the decision tree. Operator edits stub to canonical prose + flips status to _Accepted_ before plan APPROVAL.

## 4. Threat model + security considerations

| Threat                                                                                       | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non-admin staff writes off a tab to hide real unpaid revenue / cover a shortfall             | Medium     | High   | Server-side RBAC gate identical to `deleteTabAction` (admin/super-admin only), never trust client-side UI gating alone.                                                                                                                                                                                                                                                                              |
| A write-off is issued with no reason, making the audit trail useless                         | Low        | Medium | `reason` is a required field at both the service-method signature and the UI dialog (mirrors `partialPayments.note` being `required: true`).                                                                                                                                                                                                                                                         |
| Double write-off / re-triggering on an already-written-off tab corrupts the audit trail      | Low        | Medium | `writeOffTab` explicitly refuses (throws) when `tab.paymentStatus === 'written-off'` already, mirroring `completeTabPaymentManually`'s existing-`'paid'` refusal.                                                                                                                                                                                                                                    |
| Remediation script (AC7) writes off tabs outside the intended 2026-07-31 contamination event | Low        | High   | Selection criteria hard-coded to the exact business-date window + a `createdAt`-before-`paidAt` gap threshold of **30+ days** (operator-confirmed 2026-08-03 — comfortably below the actual 3–7+ month gaps in the known 51-tab profile); dry-run prints the full candidate list for operator review before any write; idempotent on rerun (already-written-off tabs are skipped, not re-processed). |
| Remediation script run directly against production without a backup                          | Low        | High   | Follow `sync-prod-to-uat.sh`'s `mongodump` pattern — dump the `tabs`/`orders` collections to a timestamped backup dir before the confirmed-write step.                                                                                                                                                                                                                                               |
| Dormant-tab incident scan false-positives, alert fatigue                                     | Low        | Low    | 24h dedup via `IncidentEventService.dedupRecent`, mirroring the existing `stale_paid_order` kind exactly.                                                                                                                                                                                                                                                                                            |

**Secrets / credentials:** None introduced.

**Dependencies introduced:** None — reuses existing `mongoose`, `AuditLogService`, `IncidentEventService`, `SystemSettingsModel` infrastructure.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md` (risk class HIGH):

- **R-019 — Write-off action misused to hide unpaid revenue as bad debt** — Status: OPEN. RBAC gate + required reason + audit log + dormancy incident as a structural cross-check.
- **R-020 — One-time remediation script writes off tabs/orders outside the intended 2026-07-31 contamination event** — Status: OPEN. Scoped selection criteria + mongodump backup + dry-run/confirm + idempotent rerun.
- **R-021 — Dormant-tab incident scan false positives / alert fatigue** — Status: OPEN. Mirrors the already-shipped `stale_paid_order` 24h-dedup pattern; configurable threshold.
- **R-022 — Double write-off or missing refusal corrupts the write-off audit trail** — Status: OPEN. Explicit refusal on already-`'written-off'` tabs, mirroring `completeTabPaymentManually`'s existing-`'paid'` refusal.

Operator to edit the canonical rows + sign off residual ratings before plan APPROVAL.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No new personal data. The feature operates on existing `Tab`/`Order` records (which already carry `customerName`/`customerEmail`/`customerPhone` where applicable) and adds only financial/audit metadata (`reason`, `writtenOffBy` user reference, `writtenOffAt` timestamp, `amount`) — no new personal-data field, category, or purpose is introduced. The `writtenOffBy` actor reference follows the exact same pattern as the already-covered `deletedBy`/`reconciledBy`/`processedBy` actor references elsewhere on these models.

_N/A beyond the above — no new lawful basis, retention, or cross-border-transfer analysis required._

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No. This REQ is a standard CRUD/reporting feature with human-initiated actions and a human-reviewed remediation script; no model inference, prompt, or AI-driven decisioning is introduced.

## 7. Rollback plan

- **Reversible via:** Git revert of the code change (schema additions are additive-only — no migration, no destructive change to existing fields or values, matching the REQ-096 `isDeleted`/`ADR-002` precedent). For the one-time remediation script (AC7), the `mongodump` backup taken immediately before the confirmed-write step is the data-level rollback: `mongorestore` from that backup reverts the 51 records to their pre-write-off state if the classification is later found wrong.
- **Data implications of rollback:** A code rollback does not touch already-written data — any tab/order already marked `'written-off'` stays that way (Mongoose enum values are additive; an older app version would simply not recognize the new dialog/report section, but existing data is not corrupted by reading it — a schema `enum` array a document's stored value isn't in only matters at write time, not read time, in Mongoose). If a specific write-off needs undoing, that's a manual, audited data correction (out of scope for this REQ — no "un-write-off" action is being built, matching the "no general-purpose bulk tool" out-of-scope line).
- **Notification path if rollback during a release:** Standard incident/rollback communication per the project's existing on-call practice — no new notification path needed since no new alerting channel is introduced.

## 8. Verification

- **Unit + integration tests:** `services/tab-service.test.ts` (or equivalent) — `writeOffTab` excludes tab/orders from revenue-eligible state, refuses double write-off, writes the audit log, does not touch `partialPayments`-guarded refusal from `deleteTab`. `services/financial-report-service.test.ts` — written-off orders excluded from `totalRevenue`/`orderCount`; new "Written off (bad debt)" section totals match. `services/system-settings-service.test.ts` — dormant threshold get/update. A dry-run test of the remediation script against a seeded fixture matching the 51-order profile (AC7, per issue's AC9).
- **E2E coverage:** dormancy flag appears on the tabs list past threshold; write-off action end-to-end from tab detail page through confirmation dialog to updated UI state. Delegated to `e2e-test-engineer` per this skill's Phase 2 step 3 contract.
- **Manual smoke after deploy:** Verify the new "Written off (bad debt)" report section renders correctly against real (non-destructive) data; verify the dormancy incident appears for a genuinely dormant tab in a lower environment before the remediation script ever touches production.
- **Monitoring / alerting:** No new dashboard; the existing `/dashboard/incidents` surface gains a new incident kind, which is the intended visibility mechanism (AC5).

## 9. Sign-off

- **Plan reviewer (eng):** REPLACE — name + date
- **Plan reviewer (security / DPO):** N/A — no personal-data or AI-in-scope sections triggered
- **Plan approved by operator:** REPLACE — name + date (HIGH risk — this plan pauses here per Phase 1 step 11 for your explicit approval before implementation begins)

## Upload path

This file lives at `compliance/plans/REQ-098/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
