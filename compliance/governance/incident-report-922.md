---
title: "[REGRESSION] pending-expenses.spec.ts :: pending-expenses.spec.ts › REQ-026: Expense Form — Multi-line submission › admin submits multi-line expense group — appears on pending page"
incident_id: "INC-20261017-922"
incident_kind: "incident"
source_release: "REQ-026"
source_issue: "922"
source_issue_url: "https://github.com/metasession-dev/wawagardenbar-app/issues/922"
semantic_id: "INC-20261017-922"
severity: "REPLACE — low | medium | high | critical"
detected_at: "2026-10-17T10:10:43Z"
resolved_at: "2026-10-17T18:45:00Z"
involves_personal_data: "REPLACE — true | false"
reported_to_supervisory_authority: "REPLACE — true | false | n/a"
notification_window_72h: "REPLACE — within | outside | n/a"
last_reviewed_at: "2026-10-17"
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [REGRESSION] pending-expenses.spec.ts :: pending-expenses.spec.ts › REQ-026: Expense Form — Multi-line submission › admin submits multi-line expense group — appears on pending page

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#922](https://github.com/metasession-dev/wawagardenbar-app/issues/922)  
**Detected:** 2026-10-17T10:10:43Z  
**Closed:** 2026-10-17T18:45:00Z  
**Reporter:** @app/github-actions  
**Assignees:** _unassigned_  
**Labels:** `incident`, `application-defect`

## 1. Personal data scope (GDPR triage) — REPLACE

| Question | Answer |
| --- | --- |
| Did the incident involve personal data? | REPLACE — Y / N |
| If Y: estimated number of data subjects affected | REPLACE |
| If Y: categories of personal data involved | REPLACE |
| If Y: likely consequences for data subjects | REPLACE |
| Notify supervisory authority (Art. 33)? | REPLACE — required if Y and risk to rights/freedoms |
| Notify data subjects (Art. 34)? | REPLACE — required if high risk to rights/freedoms |
| 72-hour notification window | REPLACE — within / outside / n/a |

## 2. Narrative (from the GitHub issue)

    ## E2E Regression Failure — application-defect

    **Spec file:** pending-expenses.spec.ts
    **Test name:** pending-expenses.spec.ts › REQ-026: Expense Form — Multi-line submission › admin submits multi-line expense group — appears on pending page
    **Final status:** failed
    **Error message:**
    ```
    Error: ^[[2mexpect(^[[22m^[[31mlocator^[[39m^[[2m).^[[22mtoBeVisible^[[2m(^[[22m^[[2m)^[[22m failed
    ```

    **Classification:** application-defect
    **Classification rationale:** Error is an assertion failure, application error, or unrecognised pattern. Defaulting to application defect (conservative).

    **testExecutionId:** 39021079897
    **Workflow run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/39021079897
    **Git SHA:** 51e0f8390b51ad252cbbe0138e268e42139c31d8

    This regression was detected and classified by the autonomous E2E Regression CI run. A human should confirm the classification, adjust severity if needed, and close once fixed. The `incident` label ensures an `incident_report` will be generated on close.

    ### Framework attribution

    This defect, once closed with the `incident` label, will be auto-exported as `incident_report` evidence and attribute to:

    - [x] `ISO29119.3.5.4` (baseline — every incident_report)
    - [ ] `SOC2.CC7.2` — ops impact: <!-- devaudit-installer#899: this is a CI-caught, pre-merge regression — contained by definition, not a live incident. Tick only if you confirm this actually reached production or caused a real monitoring/incident-response event; touching production-adjacent code is not itself ops impact. -->
    - [ ] `GDPR.Art-33` — personal data scope: <REPLACE — yes/no>
    - [ ] `GDPR.Art-34` — data-subject notification required: <REPLACE — yes/no>
    - [ ] `EUAIA.Art-9 / Art-14 / Art-15` — AI failure: <REPLACE — yes/no, which article(s)>

    Once closed, the `incident-export.yml` workflow exports the body of this issue to `compliance/governance/incident-report-<N>.md`.

## 3. Timeline (from issue comments)

### 2026-10-17T18:44:59Z — @ostendo-io

Closed via #925 — root cause confirmed and fixed. The regression failure on this spec traced to the unsharded full-regression run (reverted by the 2026-10-16 devaudit 1.8.0 template sync, which silently dropped the #832 sharding fix) hitting memory exhaustion (cgroup `memory.events.high` = 415,707) and the resulting resource degradation.

#925 restored sharding via a new `e2e/ci-reliability/regression-run.sh` hook (PR #927, merged). Validated across **3 independent full sharded `workflow_dispatch` runs** (39049263425, 39052796163, 39055898995): this spec passed cleanly in all 3 (one run needed a single Playwright retry that then passed — ordinary test-flake tolerance, not a suite-level failure).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TEfPAqfoXcPnaQefLaPszq


## 4. Sign-off — REPLACE

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander                  | REPLACE | REPLACE |
| Engineering lead                    | REPLACE | REPLACE |
| DPO (if personal data involved)     | REPLACE | REPLACE |
| Security lead                       | REPLACE | REPLACE |

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
