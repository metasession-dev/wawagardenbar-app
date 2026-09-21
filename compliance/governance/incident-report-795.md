---
title: "[REGRESSION] requirements-verification.spec.ts :: requirements-verification.spec.ts › Section 4: Customer Authentication › login page displays delivery method descriptions"
incident_id: "INC-20260917-795"
incident_kind: "incident"
source_release: "REPLACE — owning REQ-XXX or vYYYY.MM.DD.N"
source_issue: "795"
source_issue_url: "https://github.com/metasession-dev/wawagardenbar-app/issues/795"
semantic_id: "INC-20260917-795"
severity: "REPLACE — low | medium | high | critical"
detected_at: "2026-09-17T06:40:29Z"
resolved_at: "2026-09-21T19:17:27Z"
involves_personal_data: "REPLACE — true | false"
reported_to_supervisory_authority: "REPLACE — true | false | n/a"
notification_window_72h: "REPLACE — within | outside | n/a"
last_reviewed_at: "2026-09-21"
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [REGRESSION] requirements-verification.spec.ts :: requirements-verification.spec.ts › Section 4: Customer Authentication › login page displays delivery method descriptions

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#795](https://github.com/metasession-dev/wawagardenbar-app/issues/795)  
**Detected:** 2026-09-17T06:40:29Z  
**Closed:** 2026-09-21T19:17:27Z  
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

    **Spec file:** requirements-verification.spec.ts
    **Test name:** requirements-verification.spec.ts › Section 4: Customer Authentication › login page displays delivery method descriptions
    **Final status:** timedOut
    **Error message:**
    ```
    ^[[31mTest timeout of 30000ms exceeded.^[[39m
    ```

    **Classification:** application-defect
    **Classification rationale:** Error is an assertion failure, application error, or unrecognised pattern. Defaulting to application defect (conservative).

    **testExecutionId:** 35189228775
    **Workflow run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/35189228775
    **Git SHA:** d330adec112c8dab5e009a947d9e848591652df4

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

### 2026-09-21T19:17:27Z — @metasession-dev

Not a regression against any shipped code — this issue's `testExecutionId` (35189228775) is a `workflow_dispatch` run on branch `ci/793-e2e-regression-build-not-dev` (confirmed via `gh api .../actions/runs/35189228775` → `head_branch`), a deliberate diagnostic dispatch during the investigation of #793.

**PR #803**'s own description cites this exact run: *"Before: `e2e/requirements-verification.spec.ts` under the `regression` project — 10/10 reproducible `networkidle` timeouts with the build+start approach (run 35189228775)."* That branch tested `npm run build && npm run start` as a candidate fix, found it broke `page.waitForLoadState('networkidle')` suite-wide (~450 uses), and was **reverted** in favor of the route warm-up step that actually shipped. The branch itself was never merged.

This failure is an expected artifact of an abandoned experimental approach, not a defect in any code that reached `develop` or `main`. Closing — no application code to fix.


## 4. Sign-off — REPLACE

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander                  | REPLACE | REPLACE |
| Engineering lead                    | REPLACE | REPLACE |
| DPO (if personal data involved)     | REPLACE | REPLACE |
| Security lead                       | REPLACE | REPLACE |

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
