---
title: "[bug] Daily Report tips + checkout selector — 2 specs failing (regression-pack #330 Bucket 3)"
incident_id: "INC-20260609-346"
severity: "REPLACE — low | medium | high | critical"
detected_at: "2026-06-09T10:17:48Z"
resolved_at: "2026-06-19T14:22:14Z"
involves_personal_data: "REPLACE — true | false"
reported_to_supervisory_authority: "REPLACE — true | false | n/a"
notification_window_72h: "REPLACE — within | outside | n/a"
last_reviewed_at: "2026-06-19"
source_issue: "https://github.com/metasession-dev/wawagardenbar-app/issues/346"
source_issue_number: 346
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [bug] Daily Report tips + checkout selector — 2 specs failing (regression-pack #330 Bucket 3)

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#346](https://github.com/metasession-dev/wawagardenbar-app/issues/346)  
**Detected:** 2026-06-09T10:17:48Z  
**Closed:** 2026-06-19T14:22:14Z  
**Reporter:** @ostendo-io  
**Assignees:** _unassigned_  
**Labels:** `incident`

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

Tracking issue for **Bucket 3** of the [#330](https://github.com/metasession-dev/wawagardenbar-app/issues/330) regression-pack triage. **2 specs** with different root causes:

## Symptom 1 — Daily Report tip aggregation

`orders/close-tab-tip-capture.spec.ts` AC7 expects Daily Report Tips Received cash card ≥ ₦250; observed value: ₦0.

The spec:
1. Creates a tab + closes it with a tip
2. Navigates to Daily Report
3. Asserts the cash tips card shows the recorded tip amount

Either:
- The tip aggregation logic regressed (real customer-facing defect — tips not showing in the report)
- The test's seed shape no longer matches what the aggregator expects
- A timing race where the report queries before the tip's persistence completes

## Symptom 2 — Checkout selector drift

`daily-report-payments.spec.ts` — `Proceed to Checkout` button not visible within 5s timeout. The spec creates a tab, adds an order, records a partial payment, then needs to navigate the checkout flow.

Either:
- The button got renamed / restructured
- The flow now needs an extra step before the button appears
- The seeded tab is in an unexpected state

## Investigation plan

For Symptom 1 (tip aggregation):
1. Read `services/financial-report-service.ts:aggregatePartialPayments` — recent changes (REQ-035, REQ-013, REQ-017)
2. Manually walk the test scenario on UAT (create tab → close with tip → view Daily Report)
3. If tips show in production but not in the spec: test-seed bug
4. If tips don't show in production: real customer-facing defect → separate REQ cycle

For Symptom 2 (checkout selector):
1. Compare spec's expected flow against the current `app/dashboard/orders/tabs/[tabId]/checkout/` page
2. Update selector OR adjust seed shape

## Acceptance criteria

- [ ] Both root causes identified + documented
- [ ] If tip aggregation is a real defect: separate defect issue filed + fix REQ scoped
- [ ] Both specs run green on `e2e-regression.yml`
- [ ] No customer-facing tip-display regression in production confirmed

## Risk classification

**MEDIUM**. Tip aggregation regression would be a customer-facing defect affecting operator visibility into earnings.

## Cross-references

- [#330](https://github.com/metasession-dev/wawagardenbar-app/issues/330) — parent triage
- REQ-035 (RELEASED) — tip handling REQ; possible regression source
- REQ-013 (RELEASED) — partial payments REQ; possible regression source

### Framework attribution

- [x] `ISO29119.3.5.4` (baseline)
- [ ] `SOC2.CC7.2` — ops impact: REPLACE — depends on whether tip aggregation is genuinely broken
- [ ] `GDPR.Art-33 / Art-34` — personal data scope: no
- [ ] `EUAIA.Art-9 / Art-14 / Art-15` — AI failure: no

🤖 Filed from regression-pack health review during REQ-076 close-out

## 3. Timeline (from issue comments)

### 2026-06-19T14:22:13Z — @ostendo-io

Daily Report tips + checkout selector spec failures resolved in subsequent fixes. These specs now pass in regression runs.


## 4. Sign-off — REPLACE

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander                  | REPLACE | REPLACE |
| Engineering lead                    | REPLACE | REPLACE |
| DPO (if personal data involved)     | REPLACE | REPLACE |
| Security lead                       | REPLACE | REPLACE |

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
