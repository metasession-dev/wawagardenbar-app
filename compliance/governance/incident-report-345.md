---
title: "[bug] Express-order creation flow — 4 specs time out at 30s (regression-pack #330 Bucket 2)"
incident_id: "INC-20260609-345"
severity: "REPLACE — low | medium | high | critical"
detected_at: "2026-06-09T10:17:19Z"
resolved_at: "2026-06-19T14:21:59Z"
involves_personal_data: "REPLACE — true | false"
reported_to_supervisory_authority: "REPLACE — true | false | n/a"
notification_window_72h: "REPLACE — within | outside | n/a"
last_reviewed_at: "2026-06-19"
source_issue: "https://github.com/metasession-dev/wawagardenbar-app/issues/345"
source_issue_number: 345
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [bug] Express-order creation flow — 4 specs time out at 30s (regression-pack #330 Bucket 2)

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#345](https://github.com/metasession-dev/wawagardenbar-app/issues/345)  
**Detected:** 2026-06-09T10:17:19Z  
**Closed:** 2026-06-19T14:21:59Z  
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

Tracking issue for **Bucket 2** of the [#330](https://github.com/metasession-dev/wawagardenbar-app/issues/330) regression-pack triage. **4 specs** all fail at the same step (express-order creation): 30s timeout.

## Symptom

All four specs share the same failure mode — Playwright times out at 30s during the express-order creation step:

| Spec | Step that hangs |
|---|---|
| `orders/express-tip-capture.spec.ts` | AC1 + AC4 — record ₦500 cash tip on a card-paid express order |
| `dashboard-revenue.spec.ts` | create express order paid with cash |
| `express-order-report.spec.ts` | create express order paid with cash |
| `reconciliation.spec.ts` | standalone orders show reconciliation checkbox |

## Hypothesis

All 4 hit the same code path (express-order creation via the admin dashboard). Likely either:
1. **Shared helper / page object** that drifted (one fix resolves all 4)
2. **API call slow / blocked** during express-order creation against UAT
3. **Selector drift** in the order creation form

The fact that 4 specs share the failure mode suggests a single root cause.

## Investigation plan

1. Identify the shared helper / page object used by all 4 specs
2. Compare against the actual page rendered (use Playwright's error-context.md snapshots)
3. Either fix the shared helper OR file a downstream defect if the page itself is broken

## Acceptance criteria

- [ ] Root cause identified + documented in a follow-up comment
- [ ] If shared helper: single PR fixes all 4 specs
- [ ] If product defect: separate defect issue filed; this issue stays open until the specs pass
- [ ] All 4 specs run green on `e2e-regression.yml` (CI run before merge)

## Risk classification

**MEDIUM**. Investigation could surface a real product defect (express-order flow regression) — which would need its own scoped fix.

## Cross-references

- [#330](https://github.com/metasession-dev/wawagardenbar-app/issues/330) — parent triage issue
- [#344](https://github.com/metasession-dev/wawagardenbar-app/pull/344) — Bucket 1 fix (already in flight)

### Framework attribution

This defect, once closed with the `incident` label, will be auto-exported as `incident_report` evidence and attribute to:

- [x] `ISO29119.3.5.4` (baseline)
- [ ] `SOC2.CC7.2` — ops impact: REPLACE — depends on whether the root cause is a product defect (yes) or a test-bug (no)
- [ ] `GDPR.Art-33 / Art-34` — personal data scope: no
- [ ] `EUAIA.Art-9 / Art-14 / Art-15` — AI failure: no

🤖 Filed from regression-pack health review during REQ-076 close-out

## 3. Timeline (from issue comments)

### 2026-06-19T14:21:58Z — @ostendo-io

Express-order creation flow timeouts fixed via revealFirstExpressMenuCard helper using AC11 cross-category search to bypass non-deterministic inventory seeding (PR #395). E2E regression run 27747493670 passed all express-order specs.


## 4. Sign-off — REPLACE

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander                  | REPLACE | REPLACE |
| Engineering lead                    | REPLACE | REPLACE |
| DPO (if personal data involved)     | REPLACE | REPLACE |
| Security lead                       | REPLACE | REPLACE |

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
