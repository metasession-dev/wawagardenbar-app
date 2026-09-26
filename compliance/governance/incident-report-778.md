---
title: "[REGRESSION] critical/webhook-idempotency-replay.spec.ts :: critical/webhook-idempotency-replay.spec.ts › REQ-069 / REQ-049 — monnify webhook idempotency replay › replay: 2nd delivery is 200 + no side-effects + idempotency row stays single"
incident_id: "INC-20260915-778"
incident_kind: "incident"
source_release: "REQ-069"
source_issue: "778"
source_issue_url: "https://github.com/metasession-dev/wawagardenbar-app/issues/778"
semantic_id: "INC-20260915-778"
severity: "REPLACE — low | medium | high | critical"
detected_at: "2026-09-15T07:07:51Z"
resolved_at: "2026-09-26T16:50:43Z"
involves_personal_data: "REPLACE — true | false"
reported_to_supervisory_authority: "REPLACE — true | false | n/a"
notification_window_72h: "REPLACE — within | outside | n/a"
last_reviewed_at: "2026-09-26"
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [REGRESSION] critical/webhook-idempotency-replay.spec.ts :: critical/webhook-idempotency-replay.spec.ts › REQ-069 / REQ-049 — monnify webhook idempotency replay › replay: 2nd delivery is 200 + no side-effects + idempotency row stays single

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#778](https://github.com/metasession-dev/wawagardenbar-app/issues/778)  
**Detected:** 2026-09-15T07:07:51Z  
**Closed:** 2026-09-26T16:50:43Z  
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

    **Spec file:** critical/webhook-idempotency-replay.spec.ts
    **Test name:** critical/webhook-idempotency-replay.spec.ts › REQ-069 / REQ-049 — monnify webhook idempotency replay › replay: 2nd delivery is 200 + no side-effects + idempotency row stays single
    **Final status:** failed
    **Error message:**
    ```
    Error: ^[[2mexpect(^[[22m^[[31mreceived^[[39m^[[2m).^[[22mtoMatch^[[2m(^[[22m^[[32mexpected^[[39m^[[2m)^[[22m
    ```

    **Classification:** application-defect
    **Classification rationale:** Error is an assertion failure, application error, or unrecognised pattern. Defaulting to application defect (conservative).

    **testExecutionId:** 34937252563
    **Workflow run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/34937252563
    **Git SHA:** 99ae24844a90b382130303981396621459295a34

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

### 2026-09-26T16:50:43Z — @metasession-dev

Stale — both webhook-idempotency-replay.spec.ts tests pass in the latest full regression run (35863443829, 2026-09-23). Closing as no longer reproducing.


## 4. Sign-off — REPLACE

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander                  | REPLACE | REPLACE |
| Engineering lead                    | REPLACE | REPLACE |
| DPO (if personal data involved)     | REPLACE | REPLACE |
| Security lead                       | REPLACE | REPLACE |

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
