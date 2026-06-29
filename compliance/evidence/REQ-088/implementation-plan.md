---
title: 'Implementation plan — REQ-088'
requirement_id: 'REQ-088'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'AI (Cascade) + operator'
authored_at: '2026-06-28'
---

# Implementation plan — REQ-088

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. Reference the per-REQ `test-plan.md` if it lives separately.                                           |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations (auth, data handling, dependencies, secrets).                                                                         |
| **GDPR Art. 25** Data protection by design and by default | Per-purpose data flows; minimisation; lawful basis; retention. **Required for any REQ that processes personal data; explicit "no personal data" callout if not.** |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | When the REQ touches AI / model behaviour: model provenance, prompt sources, oversight path. **Explicit "no AI in scope" callout if not.**                        |

## 1. Goal + acceptance criteria

- **Goal:** Generalize the REQ-066 invariant E2E test pattern to all 7 silent-path invariants and replace console.error-swallowed catch sites with persistent IncidentEvent records + a daily admin summary cron.

### Acceptance criteria

| AC   | Description                                                                                                                                                                                                                                   | SRS item it traces to                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| AC1  | **Given** a trackInventory menu item with stock, **When** a customer completes checkout (customer path), **Then** `inventories` collection shows stock decremented by the ordered qty and a `stockmovements` row is linked to the order.      | REQ-INV-018 (new — generalize invariant beyond kitchen-display)                                             |
| AC2  | **Given** an order with `userId` is completed, **When** the completion chokepoint fires, **Then** a `PointsTransaction` row with `type: 'earned'` exists for that `orderId`.                                                                  | REQ-PTS-003 (new — points award invariant)                                                                  |
| AC3  | **Given** an `inventoryDeducted` order is cancelled, **When** `cancelOrder` runs, **Then** inventory `currentStock` is restored and a `PointsTransaction` row with `type: 'adjusted'` exists.                                                 | REQ-INV-019 (new — cancel reversal invariant)                                                               |
| AC4  | **Given** a tab with N paid orders, **When** the tab is closed, **Then** each order has `inventoryDeducted: true` and each has a `PointsTransaction` earned row.                                                                              | REQ-TABMGT-007 (new — tab close multi-deduction invariant)                                                  |
| AC5  | **Given** a webhook event has already been processed, **When** the same event is replayed, **Then** no duplicate inventory deduction, no duplicate points award, and `ProcessedWebhookEvent` returns `'duplicate'`.                           | REQ-PMT-006 (new — webhook idempotency invariant)                                                           |
| AC6  | **Given** a transactional notification template is sent, **When** `NotificationService.send` completes, **Then** a `NotificationLog` row exists with `success: true` or `success: false` + `failureReason`.                                   | REQ-NOTIF-008 (new — notification log invariant)                                                            |
| AC7  | **Given** an admin grants a manual reward, **When** the grant action completes, **Then** both a `Reward` row and a `PointsTransaction` row exist for the user.                                                                                | REQ-RWD-006 (new — reward grant invariant)                                                                  |
| AC8  | **Given** a catch site that previously swallowed a load-bearing side-effect failure via `console.error`, **When** the failure occurs, **Then** an `IncidentEvent` row is written with the appropriate `kind`, `entityId`, and `errorDetails`. | REQ-INV-020 (new — silent-path alarm layer)                                                                 |
| AC9  | **Given** unresolved `IncidentEvent` rows exist, **When** the daily admin summary cron runs, **Then** a WhatsApp/email digest is sent to admin users with the count and details of unresolved incidents.                                      | REQ-OPS-003 (new — daily incident summary cron)                                                             |
| AC10 | **Given** an order has `inventoryDeducted: false` after completion, **When** the reconciliation cron scans, **Then** it retries the deduction and writes a new `IncidentEvent` on persistent failure.                                         | `@srs-deferred: already covered by REQ-066 reconciliation cron — this REQ extends IncidentEvent kinds only` |
| AC11 | **Given** the `e2e/invariants/` directory exists with 7 spec files, **When** CI runs the Playwright regression tier, **Then** all invariant specs pass.                                                                                       | `@srs-deferred: test infrastructure — not user-observable`                                                  |

## 2. Scope

- **In scope:**
  - `e2e/invariants/` — 7 new Playwright spec files (one per invariant type)
  - `models/incident-event-model.ts` — extend `IncidentEventKind` enum with new kinds: `points_award_failed`, `notification_delivery_failed`, `reward_grant_failed`, `webhook_replay_mismatch`
  - `services/incident-event-service.ts` — update `ORDER_ENTITY_KINDS` for new order-linked kinds
  - `services/order-service.ts` — replace `console.error` at catch sites (lines 434, 446, 458, 759, 785, 908, 932, 959, 1045) with `IncidentEventService.recordIncident`
  - `app/api/webhooks/monnify/route.ts` — replace `console.error` at reward catch sites (lines 151, 203) with `IncidentEventService.recordIncident`
  - `app/api/webhooks/paystack/route.ts` — replace `console.error` at reward catch sites (lines 146, 195) with `IncidentEventService.recordIncident`
  - `services/notification-log-service.ts` — replace `console.error` at recordAttempt/updateStatus catch sites (lines 68, 133) with `IncidentEventService.recordIncident`
  - `lib/scheduled-jobs.ts` — add `runDailyIncidentSummaryJob` function
  - `services/incident-event-service.ts` — add `getUnresolvedSummary` method for the cron
  - `__tests__/services/incident-event-service.test.ts` — extend with new incident kinds
  - `__tests__/services/order-service.cancel-reversal.test.ts` — update to assert IncidentEvent instead of console.error spy
  - `compliance/RTM.md` — add REQ-088 row

- **Out of scope:**
  - `Pending<Side-effect>` flags on Order model — the existing `inventoryDeducted` boolean already serves this purpose for inventory; adding new flags for points/reward/notification would require schema migrations that are disproportionate to the risk. The IncidentEvent collection + daily summary cron provides the visibility layer. A future REQ can add per-side-effect flags if reconciliation crons are needed for non-inventory paths.
  - Reconciliation cron for non-inventory paths — the inventory reconciliation cron (REQ-066) already handles the highest-risk path. Other paths (points, notifications, rewards) are logged as incidents for manual review via the daily summary. Auto-retry for these is a future REQ.
  - Admin UI for the daily summary — the summary is sent via WhatsApp/email; the existing `/dashboard/incidents` page (REQ-077) already provides the UI surface.

### Surface inventory

| Surface                       | URL / file                                         | Status                                                                                |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Kitchen display               | `/dashboard/kitchen-display`                       | Already works — REQ-066 pilot specs cover this path                                   |
| Orders queue                  | `/dashboard/orders`                                | Already works — REQ-066 pilot specs cover this path                                   |
| Customer checkout             | `/cart` → `/checkout`                              | In scope — AC1 generalizes the invariant to the customer checkout path                |
| Admin express order           | `/dashboard/orders/express/create-order`           | In scope — AC1 generalizes to the admin express path                                  |
| Tab close                     | `/dashboard/tabs` — `TabService.markTabPaid`       | In scope — AC4 asserts multi-deduction on tab close                                   |
| Webhook handlers              | `/api/webhooks/monnify` + `/api/webhooks/paystack` | In scope — AC5 asserts idempotency; AC8 replaces console.error with IncidentEvent     |
| Notification send             | `NotificationService.send`                         | In scope — AC6 asserts NotificationLog row; AC8 replaces console.error in log service |
| Incident dashboard            | `/dashboard/incidents`                             | Already works — REQ-077 provides expandable incident details UI                       |
| Daily incident summary (cron) | `lib/scheduled-jobs.ts` → WhatsApp/email           | In scope — AC9 adds the daily digest job                                              |
| Points service                | `services/points-service.ts`                       | Already works — `awardPoints` and `reverseOrderTransactions` are the canonical paths  |
| Rewards service               | `services/rewards-service.ts`                      | Already works — `calculateReward` is the canonical path                               |

## 3. Architecture decisions

- **No ADR needed** — This REQ extends existing patterns (IncidentEventModel from REQ-066, NotificationLog from REQ-055, scheduled-jobs from REQ-048/058/066) to additional catch sites. No new third-party dependencies, no new database collections (IncidentEvent already exists), no structural architecture change. The invariant E2E specs follow the established DB-seed → action → DB-read-back pattern from REQ-066.

## 4. Threat model + security considerations

| Threat                                                                  | Likelihood | Impact | Mitigation                                                                                           |
| ----------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------- |
| IncidentEvent flood — a recurring failure triggers unbounded row writes | Medium     | Medium | `dedupRecent` already guards against duplicate incidents within a 24h window per kind+entityId       |
| Daily summary cron sends to wrong admin — leaked incident details       | Low        | High   | Cron queries `UserModel` for `role: { $in: ['admin', 'super-admin'] }` — same RBAC as dashboard      |
| New IncidentEvent kinds injected via untrusted input                    | Low        | Medium | Kinds are a TypeScript union type + Mongoose enum — untrusted input is rejected at schema validation |
| Invariant E2E specs mutate production UAT data                          | Medium     | Low    | Each spec uses seed/cleanup pattern (seed → test → restore) established by REQ-066 specs             |

**Secrets / credentials:** No new secrets. The daily summary cron reuses the existing `NotificationService.send` path which already has WhatsApp/email credentials configured via env vars.

**Dependencies introduced:** None. All functionality uses existing packages (Playwright, MongoDB driver, Mongoose, NotificationService).

### Risk register entries

- **RISK-009 — IncidentEvent flood from recurring failures** — Status: OPEN. `dedupRecent` mitigates within 24h windows, but a persistent failure across different entities could still generate high volume. Operator should monitor incident count in the daily summary and set a threshold alert in a future REQ.
- **RISK-010 — Invariant E2E specs leave UAT in dirty state** — Status: MITIGATED. Each spec uses afterEach cleanup that restores inventory, deletes test orders, and removes test incident rows. Pattern proven by REQ-066 specs running in CI since 2026-06-04.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** Yes — incident summaries sent via WhatsApp/email to admins may contain order numbers and customer email addresses (from webhook catch sites).

- **Categories of data subjects:** Customers (order references in incident error details)
- **Categories of personal data:** Order numbers, payment references, customer email addresses (in incident errorDetails)
- **Special categories (Art. 9):** None
- **Lawful basis:** Art. 6(1)(f) — legitimate interest (operational monitoring of system health)
- **Purpose limitation:** Incident data is used only for operational troubleshooting; not repurposed for analytics or marketing
- **Data minimisation:** errorDetails captures only the error message + entity ID; no customer PII beyond what's already in the Order document
- **Retention:** IncidentEvent rows are retained indefinitely (operational need); a future REQ can add a TTL or archival policy
- **Cross-references:**
  - Is the ROPA (`compliance/governance/ropa.md`) updated? No — IncidentEvent collection already documented under REQ-066; no new data processing
  - Is a DPIA required? No — operational monitoring of existing data flows
- **Cross-border transfers:** None — all data stays in MongoDB (Railway-hosted, same region as existing data)

## 6. AI / model considerations (EU AI Act Art. 11)

N/A — this REQ does not introduce or change AI behaviour. It adds test infrastructure and operational monitoring (incident logging + daily summary) for existing non-AI code paths.

## 7. Rollback plan

- **Reversible via:** git revert — all changes are code-level (no migrations, no schema changes to existing collections). The new IncidentEvent kinds are additive enum values; reverting the code stops writing them but existing rows remain queryable.
- **Data implications of rollback:** IncidentEvent rows written by the new code will have `kind` values not in the reverted enum. Mongoose will still return them (enum validation is on write, not read). The `/dashboard/incidents` page may show "unknown kind" badges — cosmetic only.
- **Notification path if rollback during a release:** Operator notifies via Slack #wawa-ops channel; Railway auto-deploys on merge to main, so revert → merge → auto-deploy is the path.

## 8. Verification

- **Unit + integration tests:**
  - Extend `__tests__/services/incident-event-service.test.ts` with cases for new incident kinds
  - Update `__tests__/services/order-service.cancel-reversal.test.ts` to assert `IncidentEventService.recordIncident` is called instead of `console.error` spy
  - New unit tests for `runDailyIncidentSummaryJob` in `__tests__/lib/scheduled-jobs.test.ts`
  - New unit tests for `IncidentEventService.getUnresolvedSummary`

- **E2E coverage:**
  - `e2e/invariants/order-inventory-invariant.spec.ts` — AC1 (customer checkout + admin express paths)
  - `e2e/invariants/order-points-invariant.spec.ts` — AC2
  - `e2e/invariants/order-cancel-reversal-invariant.spec.ts` — AC3
  - `e2e/invariants/tab-close-multi-deduction-invariant.spec.ts` — AC4
  - `e2e/invariants/webhook-idempotency-invariant.spec.ts` — AC5
  - `e2e/invariants/notification-log-invariant.spec.ts` — AC6
  - `e2e/invariants/reward-grant-invariant.spec.ts` — AC7
  - Each spec uses the DB-seed → action → DB-read-back → delta assertion pattern from REQ-066
  - `evidenceShot()` captures on each spec for portal evidence

- **Manual smoke after deploy:**
  - Trigger a notification send and verify NotificationLog row appears
  - Check `/dashboard/incidents` for new incident kinds after intentionally triggering a failure
  - Verify daily summary cron fires at the scheduled time (check logs)

- **Monitoring / alerting:**
  - The daily incident summary cron IS the monitoring layer — it surfaces unresolved incidents to admins
  - Existing Railway deploy logs show cron execution
  - No external monitoring service changes needed

## 9. Sign-off

- **Plan reviewer (eng):** TBD
- **Plan reviewer (security / DPO):** N/A — threat model is low; no new data processing beyond existing IncidentEvent collection
- **Plan approved by operator:** TBD

## Upload path

This file lives at `compliance/plans/REQ-088/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`. The portal's framework-coverage matrix flips ISO 29119 §3.4, ISO 27001 A.8.25, GDPR Art. 25, and EU AI Act Art. 11 to COVERED for this REQ once the upload lands.

Verify the upload at `https://devaudit.metasession.co/projects/<slug>/releases/REQ-088` — the "Evidence by requirement" list should show this plan tagged with `category=planning`.
