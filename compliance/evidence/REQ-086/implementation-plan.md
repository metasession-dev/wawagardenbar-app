---
title: 'Implementation plan — REQ-086'
requirement_id: 'REQ-086'
risk_class: 'LOW'
change_type: 'feat'
authored_by: 'Cascade (Windsurf) via sdlc-implementer'
authored_at: '2026-06-27'
---

# Implementation plan — REQ-086

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

- **Goal:** Rename the "Express Actions" section to "Admin Order Management" on the orders dashboard, move the Inventory Summary card from "Quick Actions" into the renamed section, update the section icon, and adjust grid layouts for the new card counts.

### Acceptance criteria

| AC  | Description                                                                                                                                                                                                                                               | SRS item it traces to             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| AC1 | Given an admin views the orders dashboard (`/dashboard/orders`), When the page loads, Then the section formerly labeled "Express Actions" now reads "Admin Order Management".                                                                             | REQ-ORDMGT-010 (new — proposed)   |
| AC2 | Given an admin views the orders dashboard, When the "Admin Order Management" section renders, Then the Inventory Summary card appears alongside Create Tab, Create Order, and Close Tab (4 cards total).                                                  | REQ-ORDMGT-010 (new — proposed)   |
| AC3 | Given an admin views the orders dashboard, When the "Quick Actions" section renders, Then it contains only: Open a Order, Open a New Tab, Add to Existing Tab (3 cards).                                                                                  | REQ-ORDMGT-010 (new — proposed)   |
| AC4 | Given the "Admin Order Management" section, When rendered on desktop, Then the grid uses `md:grid-cols-4` (4 cards) and the "Quick Actions" section uses `md:grid-cols-3` (3 cards).                                                                      | @srs-deferred: layout detail      |
| AC5 | Given the "Admin Order Management" section heading, When rendered, Then a neutral icon (ClipboardList) is used instead of the Zap icon.                                                                                                                   | @srs-deferred: icon choice        |
| AC6 | Given the existing E2E test for the orders page, When the test runs, Then it verifies the "Admin Order Management" heading exists and the Quick Actions section still shows its 3 remaining cards.                                                        | @srs-deferred: regression guard   |
| AC7 | Given the SOP manual (`docs/operations/SOP-MANUAL-ADMIN-ORDER-MANAGEMENT.md`), When the rename is applied, Then all references to "Express Actions" are updated to "Admin Order Management" and the Inventory Summary is described under the new section. | @srs-deferred: documentation sync |

## SRS items proposed/touched

| AC      | SRS item                        | Status   | Notes                                                                                                                   |
| ------- | ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| AC1-AC3 | REQ-ORDMGT-010 (new — proposed) | stub     | Admin Order Management section on orders dashboard — contains Create Tab, Create Order, Close Tab, Inventory Summary    |
| AC4-AC7 | @srs-deferred                   | deferred | Layout detail, icon choice, regression guard, documentation sync — not user-observable behaviour changes beyond AC1-AC3 |

**Operator action required:** Edit `docs/SRS.md` to add the new SRS stub REQ-ORDMGT-010 with canonical Given/When/Then prose before plan APPROVAL.

## 2. Scope

- **In scope:**
  - `app/dashboard/orders/page.tsx` — Rename "Express Actions" heading to "Admin Order Management", swap `Zap` icon for `ClipboardList`, move Inventory Summary card from Quick Actions section into Admin Order Management section, adjust grid layouts (`md:grid-cols-4` for 4-card section, `md:grid-cols-3` for 3-card section)
  - `e2e/authenticated.spec.ts` — Update the "orders page shows Quick Actions section" test to verify the new "Admin Order Management" heading and assert Inventory Summary is no longer in Quick Actions
  - `docs/operations/SOP-MANUAL-ADMIN-ORDER-MANAGEMENT.md` — Update all references to "Express Actions" → "Admin Order Management", move Inventory Summary description from Part 5 Quick Actions to the new section
  - `docs/SRS.md` — Add REQ-ORDMGT-010 stub for the new UI section structure
- **Out of scope:**
  - Renaming server action files/functions (`express-actions.ts`, `expressCreateTabAction`, etc.) — internal implementation, no UI impact
  - Renaming route paths (`/dashboard/orders/express/*`) — would break bookmarks and existing links
  - Historical/compliance docs in `compliance/evidence/REQ-009/` — preserved as historical records
  - Any functional behaviour changes — purely UI reorganization

### Surface inventory

| Surface                    | URL / file                                             | Status                           |
| -------------------------- | ------------------------------------------------------ | -------------------------------- |
| Orders dashboard page      | `app/dashboard/orders/page.tsx`                        | In scope                         |
| E2E test — orders page     | `e2e/authenticated.spec.ts`                            | In scope                         |
| SOP manual                 | `docs/operations/SOP-MANUAL-ADMIN-ORDER-MANAGEMENT.md` | In scope                         |
| SRS                        | `docs/SRS.md`                                          | In scope                         |
| Express action route pages | `app/dashboard/orders/express/*`                       | Out of scope (no changes needed) |
| Express server actions     | `app/actions/admin/express-actions.ts`                 | Out of scope (no changes needed) |

## 3. Architecture decisions

- **No ADR needed** — UI-only change renaming a section heading, moving a card between sections, and adjusting grid CSS classes. No structural change, no new pattern, no dependency choice.

## 4. Threat model + security considerations

| Threat                         | Likelihood | Impact | Mitigation                                                          |
| ------------------------------ | ---------- | ------ | ------------------------------------------------------------------- |
| None — UI-only cosmetic change | N/A        | N/A    | No auth, payment, data, or security surfaces touched by this change |

**Secrets / credentials:** No secrets handled by this REQ.

**Dependencies introduced:** None — no new npm packages.

### Risk register entries

This REQ is LOW risk. Risk-register-keeper is skipped per `stage_1_min_risk_class: MEDIUM` default.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ is a UI reorganization (section rename, card move, grid adjustment). It does not introduce new data collection, processing, or storage.

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour. No model inference, prompt engineering, or AI decisioning is involved.

## 7. Rollback plan

- **Reversible via:** `git revert` of the change commit. The change is purely UI — reverting restores the original section names and card placement.
- **Data implications of rollback:** None — no data migration or schema changes.
- **Notification path if rollback during a release:** None needed — UI-only change with no operational impact.

## 8. Verification

- **Unit tests:** No new unit tests needed — UI-only change with no logic changes.
- **E2E coverage:** Update existing test in `e2e/authenticated.spec.ts` to verify new "Admin Order Management" heading and updated Quick Actions content.
- **Manual smoke after deploy:** Navigate to `/dashboard/orders`, verify "Admin Order Management" heading with 4 cards (including Inventory Summary), and "Quick Actions" with 3 cards.
- **Monitoring / alerting:** None needed — UI-only change.

## 9. Sign-off

- **Plan reviewer (eng):** REPLACE — name + date
- **Plan reviewer (security / DPO):** N/A — no personal data or new security surfaces
- **Plan approved by operator:** REPLACE — name + date

## Upload path

This file lives at `compliance/plans/REQ-086/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`. The portal's framework-coverage matrix flips ISO 29119 §3.4, ISO 27001 A.8.25, GDPR Art. 25, and EU AI Act Art. 11 to COVERED for this REQ once the upload lands.
