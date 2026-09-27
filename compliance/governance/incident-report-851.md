---
title: "[REGRESSION] staff-pot.spec.ts :: staff-pot.spec.ts › REQ-015: Staff Pot — Start Date › start date saves and persists"
incident_id: "INC-20260923-851"
incident_kind: "incident"
source_release: "REQ-015"
source_issue: "851"
source_issue_url: "https://github.com/metasession-dev/wawagardenbar-app/issues/851"
semantic_id: "INC-20260923-851"
severity: "REPLACE — low | medium | high | critical"
detected_at: "2026-09-23T13:33:57Z"
resolved_at: "2026-09-27T07:25:02Z"
involves_personal_data: "REPLACE — true | false"
reported_to_supervisory_authority: "REPLACE — true | false | n/a"
notification_window_72h: "REPLACE — within | outside | n/a"
last_reviewed_at: "2026-09-27"
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [REGRESSION] staff-pot.spec.ts :: staff-pot.spec.ts › REQ-015: Staff Pot — Start Date › start date saves and persists

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#851](https://github.com/metasession-dev/wawagardenbar-app/issues/851)  
**Detected:** 2026-09-23T13:33:57Z  
**Closed:** 2026-09-27T07:25:02Z  
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

    **Spec file:** staff-pot.spec.ts
    **Test name:** staff-pot.spec.ts › REQ-015: Staff Pot — Start Date › start date saves and persists
    **Final status:** failed
    **Error message:**
    ```
    Error: ^[[2mexpect(^[[22m^[[31mreceived^[[39m^[[2m).^[[22mtoBe^[[2m(^[[22m^[[32mexpected^[[39m^[[2m) // Object.is equality^[[22m
    ```

    **Classification:** application-defect
    **Classification rationale:** Error is an assertion failure, application error, or unrecognised pattern. Defaulting to application defect (conservative).

    **testExecutionId:** 35863443829
    **Workflow run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/35863443829
    **Git SHA:** cb73291b563bb2096d1a4afc803b3944da7bb632

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

### 2026-09-23T14:59:37Z — @github-actions

Additional failure detected in workflow run https://github.com/metasession-dev/wawagardenbar-app/actions/runs/35877683048 (SHA cb73291b563bb2096d1a4afc803b3944da7bb632). Spec: staff-pot.spec.ts. Classification: application-defect. Rationale: Error is an assertion failure, application error, or unrecognised pattern. Defaulting to application defect (conservative).

### 2026-09-26T20:07:21Z — @metasession-dev

<!-- sdlc-implementer:status -->

**🟢 LAST STEP** — Phase 1 in progress — plan drafted at compliance/plans/REQ-110/implementation-plan.md (MEDIUM, bundle runs at HIGH); root cause investigation pending full single-worker regression re-run

**🔵 NEXT STEP** — Operator action — HIGH risk plan-approval checkpoint; sdlc-implementer halts until approved

---

_Updated by `sdlc-implementer` on every stage transition. The full SDLC trail lives in the comments below; this comment is the always-current pointer._

### 2026-09-27T07:25:02Z — @metasession-dev

Closing as an instance of #832, not an independent application defect — confirmed via 3 full single-worker regression suite runs, with the settings service/action/component round-trip verified correct via direct instrumentation on the run where this spec passed. Full evidence trail posted on #832.


## 4. Sign-off — REPLACE

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander                  | REPLACE | REPLACE |
| Engineering lead                    | REPLACE | REPLACE |
| DPO (if personal data involved)     | REPLACE | REPLACE |
| Security lead                       | REPLACE | REPLACE |

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
