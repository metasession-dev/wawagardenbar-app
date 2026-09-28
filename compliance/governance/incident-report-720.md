---
title: "[REGRESSION] menu-category-cascade.spec.ts :: menu-category-cascade.spec.ts › REQ-082: progressive category display › express order shows items on landing grouped by category, search filters items, and cart persists across category changes"
incident_id: "INC-20260908-720"
incident_kind: "incident"
source_release: "REQ-082"
source_issue: "720"
source_issue_url: "https://github.com/metasession-dev/wawagardenbar-app/issues/720"
semantic_id: "INC-20260908-720"
severity: "low"
detected_at: "2026-09-08T05:12:04Z"
resolved_at: "2026-09-08T12:52:10Z"
involves_personal_data: "false"
reported_to_supervisory_authority: "n/a"
notification_window_72h: "n/a"
last_reviewed_at: "2026-09-08"
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [REGRESSION] menu-category-cascade.spec.ts :: menu-category-cascade.spec.ts › REQ-082: progressive category display › express order shows items on landing grouped by category, search filters items, and cart persists across category changes

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#720](https://github.com/metasession-dev/wawagardenbar-app/issues/720)  
**Detected:** 2026-09-08T05:12:04Z  
**Closed:** 2026-09-08T12:52:10Z  
**Reporter:** @app/github-actions  
**Assignees:** _unassigned_  
**Labels:** `incident`, `application-defect`

## 1. Personal data scope (GDPR triage)

| Question | Answer |
| --- | --- |
| Did the incident involve personal data? | N — CI-caught pre-merge test regression against fixture/seed data, no live user data involved |
| If Y: estimated number of data subjects affected | N/A |
| If Y: categories of personal data involved | N/A |
| If Y: likely consequences for data subjects | N/A |
| Notify supervisory authority (Art. 33)? | N/A — no personal data scope |
| Notify data subjects (Art. 34)? | N/A — no personal data scope |
| 72-hour notification window | N/A |

## 2. Narrative (from the GitHub issue)

    ## E2E Regression Failure — application-defect

    **Spec file:** menu-category-cascade.spec.ts
    **Test name:** menu-category-cascade.spec.ts › REQ-082: progressive category display › express order shows items on landing grouped by category, search filters items, and cart persists across category changes
    **Final status:** failed
    **Error message:**
    ```
    Error: ^[[2mexpect(^[[22m^[[31mlocator^[[39m^[[2m).^[[22mtoBeVisible^[[2m(^[[22m^[[2m)^[[22m failed
    ```

    **Classification:** application-defect
    **Classification rationale:** Error is an assertion failure, application error, or unrecognised pattern. Defaulting to application defect (conservative).

    **testExecutionId:** 34184980490
    **Workflow run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/34184980490
    **Git SHA:** f20c4ee889f13834f7a25b8f7019ec1f1963684d

    This regression was detected and classified by the autonomous E2E Regression CI run. A human should confirm the classification, adjust severity if needed, and close once fixed. The `incident` label ensures an `incident_report` will be generated on close.

    ### Framework attribution

    This defect, once closed with the `incident` label, will be auto-exported as `incident_report` evidence and attribute to:

    - [x] `ISO29119.3.5.4` (baseline — every incident_report)
    - [x] `SOC2.CC7.2` — ops impact: a regression in production-adjacent code is an ops concern
    - [ ] `GDPR.Art-33` — personal data scope: <REPLACE — yes/no>
    - [ ] `GDPR.Art-34` — data-subject notification required: <REPLACE — yes/no>
    - [ ] `EUAIA.Art-9 / Art-14 / Art-15` — AI failure: <REPLACE — yes/no, which article(s)>

    Once closed, the `incident-export.yml` workflow exports this issue's body to `compliance/governance/incident-report-<N>.md`.

## 3. Timeline (from issue comments)

### 2026-09-08T12:52:09Z — @metasession-dev

Fixed by PR #725 (merged to develop) / #726 (merged to main, commit 9b09651). Root cause: the test picked the alphabetically/DOM-first express-order item regardless of stock state, then asserted an in-stock match existed after searching for it — deterministically fails once enough prior tests in a full regression run deplete that item's stock. Fixed by scoping selection to [aria-disabled="false"] specifically. Verified 6/6 passing locally.


## 4. Sign-off

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander | N/A — bulk-triaged, see note below | 2026-09-28 |
| Engineering lead | N/A — bulk-triaged, see note below | 2026-09-28 |
| DPO (if personal data involved) | N/A — bulk-triaged, see note below | 2026-09-28 |
| Security lead | N/A — bulk-triaged, see note below | 2026-09-28 |

> **Bulk triage note:** this auto-filed CI regression incident was one of a batch of 30 reviewed together on 2026-09-28, per explicit operator instruction (see [devaudit-installer#899](https://github.com/metasession-dev/DevAudit-Installer/issues/899) for the root-cause fix preventing this backlog from recurring). Confirmed: no personal data involved (test/fixture data only, not live user data), not a live production incident (caught pre-merge in CI), routine test regression already resolved (issue closed).

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
