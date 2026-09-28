---
title: "[REGRESSION] user-deletion-recreation.spec.ts :: user-deletion-recreation.spec.ts › REQ-027: Admin Deletion & Re-creation › can delete admin and recreate with same username"
incident_id: "INC-20260908-721"
incident_kind: "incident"
source_release: "REQ-027"
source_issue: "721"
source_issue_url: "https://github.com/metasession-dev/wawagardenbar-app/issues/721"
semantic_id: "INC-20260908-721"
severity: "low"
detected_at: "2026-09-08T05:12:06Z"
resolved_at: "2026-09-08T12:52:36Z"
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

# Incident Report — [REGRESSION] user-deletion-recreation.spec.ts :: user-deletion-recreation.spec.ts › REQ-027: Admin Deletion & Re-creation › can delete admin and recreate with same username

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#721](https://github.com/metasession-dev/wawagardenbar-app/issues/721)  
**Detected:** 2026-09-08T05:12:06Z  
**Closed:** 2026-09-08T12:52:36Z  
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

    **Spec file:** user-deletion-recreation.spec.ts
    **Test name:** user-deletion-recreation.spec.ts › REQ-027: Admin Deletion & Re-creation › can delete admin and recreate with same username
    **Final status:** timedOut
    **Error message:**
    ```
    ^[[31mTest timeout of 30000ms exceeded.^[[39m
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

### 2026-09-08T12:52:35Z — @metasession-dev

Self-healed on retry (no repeat failure across subsequent full-regression runs) — closing as flake. Reopen if this recurs.


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
