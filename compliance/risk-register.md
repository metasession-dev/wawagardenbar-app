# Risk Register — WGB (wawagardenbar-app)

Accepted residual risks, each with date accepted, rationale, compensating control, and target close. Sits alongside `compliance/RTM.md` (requirements) — this tracks accepted risks. Closed risks move to "Closed" with their resolution.

---

## Open

### R-001 — Pre-onboarding baseline: REQ-038/039/040 + REQ-042/043/044/045 deployed before the DevAudit gated flow

**Accepted:** 2026-05-24 (at DevAudit re-onboarding); **scope expanded** 2026-05-25 to cover a second batch.
**Severity:** Medium aggregate
**Owner:** WGB maintainer

**The gap (batch 1, 2026-05-17):** REQ-038 (#84, MEDIUM), REQ-039 (#88, MEDIUM) and REQ-040 (#89, LOW) — a bundled set — were implemented and **merged to `main` (production) on 2026-05-17**, during the window when WGB's DevAudit integration had been removed. They have repo-side evidence (`compliance/evidence/REQ-038|039|040/`) and release tickets, but **no DevAudit release record, no four-eyes review, and no uploaded gate evidence**.

**The gap (batch 2, 2026-05-23):** REQ-042 (#113, MEDIUM — super-admin tab delete with optional inventory revert), REQ-043 (#114, LOW — delete-dialog radio UX), REQ-044 (#115, MEDIUM — `trackByLocation` inventory routing fix), and REQ-045 (#116, LOW — the release PR bundling the above) were **merged to `main` on 2026-05-23** via release PR #116 (`bba04c8`), still within the pre-re-onboarding window. They had neither repo-side evidence nor release tickets at deploy time — they were authored on the false assumption (stale assistant memory) that the SDLC had been retired permanently. RTM scaffolding has been **backfilled retroactively** on 2026-05-25 (rows added with `PRE-ONBOARDING BASELINE` markers; minimal evidence placeholders).

**Decision:** Grandfather both batches as a pre-onboarding baseline rather than fabricate a retroactive "gated" approval (which would be dishonest — the gate did not run before deploy). RTM rows for all seven REQs are marked `PRE-ONBOARDING BASELINE` referencing this entry.

**Compensating controls:**

1. Code is in `main` and observed in production (batch 1 since 2026-05-17, batch 2 since 2026-05-23) — no incidents attributed.
2. Batch 1 has repo-side evidence; batch 2 has retroactive RTM scaffolding + the PR descriptions themselves (which carry detailed change rationale, test plans, and UAT walk-throughs preserved on GitHub).
3. The DevAudit gated flow (CI gates → UAT four-eyes → prod four-eyes → released) is now active and applies to **every new requirement from REQ-046 onward**. No further work ships ungated. REQ-046 (PR #124, IG-1 cadence schema) is the first post-batch-2 gated REQ.

**Target close:** N/A (historical baseline). Bounded — applies only to REQ-038/039/040 and REQ-042/043/044/045.

---

### R-003 — IncidentRetryButton remediation regression when relocated into expansion container (REQ-077)

**Opened:** 2026-06-10 (REQ-077, plan APPROVAL)
**Severity:** Inherent medium × high → Residual low × high
**Owner:** WGB maintainer

**The risk:** REQ-077 wraps each `/dashboard/incidents` row in a new `<IncidentRow>` client component to deliver expand/collapse behaviour. The existing `<IncidentRetryButton>` — load-bearing for REQ-066 AC10 retry-now remediation of stuck inventory deductions — is reused inside the new expansion panel. If the relocation regresses the button's behaviour (event handlers don't fire, props don't propagate, or the action's idempotency guard breaks), admins cannot remediate stuck deductions until the next deploy cycle. Inherent likelihood medium (refactor surface), inherent impact high (loss of operational remediation path for a known failure class).

**Mitigations applied in this REQ:**

1. `<IncidentRetryButton>` is imported and rendered unchanged — same component, same `orderId` prop, no wrapping changes its rendering or event handlers.
2. Unit test in `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` pins the `inventoryDeducted` join logic so the conditional "Retry now visible vs ✓ Deducted" branch keeps firing.
3. E2E spec at `e2e/critical/incidents-expansion.spec.ts` (delegated to `e2e-test-engineer`) covers AC4: "Given an undeducted `inventory_deduction_failed` incident, When I expand the row, Then `<IncidentRetryButton>` is visible inside the expansion AND clicking it triggers the existing `retryInventoryDeductionAction` flow with no regression".
4. Critical-tier project (`retries: 0` per #352) gates the e2e on PR-to-main — a regression here fails the release gate.

**Residual:** low likelihood (controls demonstrably preserve behaviour; component is referentially identical), high impact (the operational remediation path stays load-bearing — if the controls did fail, the consequence is unchanged from inherent).

**Framework cross-references:**

- ISO 27001 A.8.25 — Secure development life cycle (regression risk on existing security control)
- SOC 2 CC8.1 — Change management

**Review due:** 2027-06-10 (default 365d for MITIGATED entries on a UI surface; OPEN until residual demonstrated effective by the post-merge regression run on `main`).

**Cross-links:** [REQ-077 implementation plan](plans/REQ-077/implementation-plan.md); REQ-066 (originating REQ for retry mechanism); REQ-INV-013 (SRS item for retry-now behaviour).

---

### R-004 — URL-hash-driven expansion state: fidelity + injection-surface defence (REQ-077)

**Opened:** 2026-06-10 (REQ-077, plan APPROVAL)
**Severity:** Inherent medium × medium → Residual low × low
**Owner:** WGB maintainer

**The risk:** REQ-077 introduces a URL hash mechanism (`#open=<id1>,<id2>`) so an admin sharing a URL preserves the set of expanded rows. Two failure classes share this surface:

1. **State fidelity:** if the hash is read or written incorrectly, expanded rows collapse on reload (breaking AC6) or unrelated rows expand. UX regression, not a security issue.
2. **Injection surface:** the hash is user-controlled input. If a hash segment is interpolated into the DOM via `dangerouslySetInnerHTML` or passed unsanitised into an `eval`/`new Function`-like sink, this is a stored-XSS class on a privileged page (`incidentsAccess` permission required, but staff own that permission). Inherent impact medium because the audience is admins.

**Mitigations applied in this REQ:**

1. Hash segments validated against `/^[a-f0-9]+$/` ObjectId regex inside `<IncidentRow>` parse path. Non-matching segments are silently discarded.
2. Validated hash IDs drive `useState(initial)` for expansion state ONLY — never `dangerouslySetInnerHTML`, never `eval`, never any DOM-string-injection sink.
3. On parse failure (no valid IDs found) the page defaults to all rows collapsed — graceful degradation, no errored UI.
4. E2E spec at `e2e/critical/incidents-expansion.spec.ts` AC6 covers a round-trip: navigate with `?kind=...#open=<id>` → reload → assert expanded state persisted for the named ID. AC6 negative path: `#open=<garbage>` → assert no-op + page renders.
5. Unit test in `__tests__/components/incident-row.hash-parse.test.tsx` pins the regex-validation contract.

**Residual:** low likelihood (regex-validated, controls demonstrably keep the surface clean), low impact (no DOM-injection sink in the parsed-hash path; failures degrade to "no rows expanded" rather than to a security or correctness regression).

**Framework cross-references:**

- ISO 27001 A.8.28 — Secure coding (regex-validated user-input on a privileged page)
- OWASP ASVS V4 §5 — Validation, sanitisation, and encoding (input validation at the boundary)

**Review due:** 2027-06-10 (default 365d for MITIGATED entries; OPEN until residual demonstrated effective by the post-merge regression run on `main`).

**Cross-links:** [REQ-077 implementation plan](plans/REQ-077/implementation-plan.md); REQ-INV-017 (SRS item for the URL-hash behaviour).

### R-005 — Category cascade hides valid sellable items or disrupts express order context (REQ-081)

**Opened:** 2026-06-15 (REQ-081, plan APPROVAL)
**Severity:** Inherent medium × medium → Residual low × medium
**Owner:** WGB maintainer
**Review due:** 2027-06-15

**The risk:** REQ-081 changes the way staff and admins discover menu items in the express order, menu management, and sellable inventory surfaces. If the cascade derives categories incorrectly, fails to handle legacy rows, or drops local state during back navigation, staff may be unable to find valid sellable items or may lose an in-progress express order/cart context. Inherent likelihood medium (shared UI/data-selection change across multiple admin surfaces); inherent impact medium (front-of-house order-entry friction and admin management mistakes, but no direct payment or data-loss path).

**Controls / mitigations:**

- Use `CategoryService.getCategories()` / configured registry data as the source of truth rather than hardcoded category lists.
- Keep server-side express search filtering explicit on both `mainCategory` and `category` while retaining `kind:'menu-item'` and availability filters.
- Keep selected order/cart/task items independent from category navigation state; changing main clears stale sub-category/item selection only.
- Add empty states for no enabled sub-categories and no available items so valid zero-result states are observable rather than silent failures.
- Add automated coverage for express cascade, back navigation, cross-main item selection, and at least one admin management surface.

**Residual risk after controls:** low likelihood x medium impact. Remaining risk is stale/incorrect category metadata in production; the UI will make empty states visible and the registry/settings flow remains the correction path.

**Cross-links:** [REQ-081 implementation plan](plans/REQ-081/implementation-plan.md); [#387](https://github.com/metasession-dev/wawagardenbar-app/issues/387); SRS REQ-ORDMGT-008 / REQ-MENUMGT-007 / REQ-INV-018.

---

## Closed

### R-002 — `xlsx` (SheetJS) high advisory — CLOSED (REQ-041, 2026-05-24)

**Original gap (accepted at onboarding 2026-05-24):** `xlsx` `^0.18.5` carried two high CVEs — CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS) — reachable via the expense-import parse path (`XLSX.read` on uploaded files in `app/actions/expenses/csv-import-actions.ts`). No fix exists on the npm registry (SheetJS publishes patched builds only via its CDN), so `npm audit fix` could not resolve it; `xlsx` was whitelisted in `sdlc-config.json` `accepted_dep_risks` to let onboarding proceed.

**Resolution (REQ-041, 2026-05-24):** Pinned `xlsx` to the patched SheetJS CDN build **0.20.3** (≥ 0.19.3 and ≥ 0.20.2, fixing both CVEs) in `package.json`; lockfile refreshed. `npm audit --audit-level=high` now exits 0 — `xlsx` is no longer flagged at any level (7 residual moderate advisories remain, below the `--audit-level=high` gate). `xlsx` removed from `accepted_dep_risks` and `ci.yml` regenerated, so the dependency-audit gate is now fully strict (hard-fails on any unaccepted high/critical). Evidence: `compliance/evidence/REQ-041/`.
