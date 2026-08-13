---
title: "[REGRESSION] e2e/critical/daily-report-payments.spec.ts :: REQ-013: Partial payment on open tab appears in daily report › create tab, add order, record partial payment"
incident_id: "INC-20260804-643"
incident_kind: "incident"
source_release: "REQ-013"
source_issue: "643"
source_issue_url: "https://github.com/metasession-dev/wawagardenbar-app/issues/643"
semantic_id: "INC-20260804-643"
severity: "REPLACE — low | medium | high | critical"
detected_at: "2026-08-04T09:49:18Z"
resolved_at: "2026-08-13T14:12:00Z"
involves_personal_data: "REPLACE — true | false"
reported_to_supervisory_authority: "REPLACE — true | false | n/a"
notification_window_72h: "REPLACE — within | outside | n/a"
last_reviewed_at: "2026-08-13"
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [REGRESSION] e2e/critical/daily-report-payments.spec.ts :: REQ-013: Partial payment on open tab appears in daily report › create tab, add order, record partial payment

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#643](https://github.com/metasession-dev/wawagardenbar-app/issues/643)  
**Detected:** 2026-08-04T09:49:18Z  
**Closed:** 2026-08-13T14:12:00Z  
**Reporter:** @metasession-dev  
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

**Spec file:** e2e/critical/daily-report-payments.spec.ts
**Test name:** REQ-013: Partial payment on open tab appears in daily report › create tab, add order, record partial payment
**Final status:** failed
**Error message:**
```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Create New Tab' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

**Classification:** application-defect
**Classification rationale:** Error is an assertion failure, application error, or unrecognised pattern. Defaulting to application defect (conservative).

**testExecutionId:** 30853905071
**Workflow run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30853905071
**Git SHA:** c3d141f081763a9dfe0e16ad5e02ba2f0794ed8d

This regression was detected and classified by the autonomous E2E Regression CI run. A human should confirm the classification, adjust severity if needed, and close once fixed. The `incident` label ensures an `incident_report` will be generated on close.

### Framework attribution

This defect, once closed with the `incident` label, will be auto-exported as `incident_report` evidence and attribute to:

- [x] `ISO29119.3.5.4` (baseline — every incident_report)
- [x] `SOC2.CC7.2` — ops impact: a regression in production-adjacent code is an ops concern
- [ ] `GDPR.Art-33` — personal data scope: no
- [ ] `GDPR.Art-34` — data-subject notification required: no
- [ ] `EUAIA.Art-9 / Art-14 / Art-15` — AI failure: no

Once closed, the `incident-export.yml` workflow exports this issue's body to `compliance/governance/incident-report-<N>.md`.

---

### Note — filed manually, not by the automation

This issue documents a test execution that the automated triage step (`compliance-evidence.yml`'s "Triage and file incidents on E2E Regression failure") should have filed automatically but could not, due to a script bug (crashed with a bash heredoc syntax error before reaching classification — fixed in `wawagardenbar-app#642`). Filed manually with the exact classification/label the script's own logic would have produced (`application-defect` / `incident`), for the human-confirmation this system explicitly expects.

**Investigation context for the human reviewer confirming this classification:** this failure is very likely a pre-existing, unrelated flake, not a REQ-098 regression:
- The failing spec (`daily-report-payments.spec.ts`, REQ-013) has nothing to do with REQ-098's write-off feature — no shared code paths.
- It ran under the `critical` Playwright project, which has `retries: 0` by explicit design (`playwright.config.ts`, incident #352/#336 trade-off) — a single flake fails the whole gate with no retry cushion.
- The very next E2E Regression run on the same branch (`30854773246`) passed cleanly — 304 passed, including this same spec.

Recommend closing as a flake/non-regression once confirmed, rather than treating it as a live application defect.


## 3. Timeline (from issue comments)

### 2026-08-04T10:18:40Z — @metasession-dev

Cross-reference for the DevAudit portal's internal execution record:

**devaudit execution id:** 7b1fd40c-f441-47e1-b2f5-7dac9a6a04b3

(The issue body above uses the GitHub Actions run ID, 30853905071, per the triage script's own template convention. Adding the portal-side execution UUID here explicitly in case that's the key the "documented incident or non-incident triage" check matches against.)

### 2026-08-13T14:11:59Z — @ostendo-io

Confirmed as a one-off flake, not a live application defect. Closing per the issue's own recommendation.

Evidence:
- Same branch, very next `critical`-project run (30854773246, 2026-08-04) passed clean, including this exact spec.
- The auto-triage bug that forced manual filing (#642) merged the same day and has been working since — no new incident has been auto-filed for this spec across ~13 subsequent `critical`/`regression` CI runs between 2026-08-04 and 2026-08-13.
- No code changes to either `e2e/critical/daily-report-payments.spec.ts` or `components/features/admin/tabs/create-tab-dialog.tsx` since the failure — nothing to explain a real regression, and nothing needed fixing for it to stop recurring.
- No related/duplicate incident elsewhere in the repo's history.

Consistent with the `critical` Playwright project's `retries: 0` design (incident #352/#336 trade-off) — a single flake fails the gate with no retry cushion, exactly as happened here.


## 4. Sign-off — REPLACE

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander                  | REPLACE | REPLACE |
| Engineering lead                    | REPLACE | REPLACE |
| DPO (if personal data involved)     | REPLACE | REPLACE |
| Security lead                       | REPLACE | REPLACE |

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
