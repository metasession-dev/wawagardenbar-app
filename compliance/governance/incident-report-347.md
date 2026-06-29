---
title: "[bug] REQ-064 support ticket flow — 2 specs failing post-release (regression-pack #330 Bucket 4)"
incident_id: "INC-20260609-347"
severity: "REPLACE — low | medium | high | critical"
detected_at: "2026-06-09T10:18:23Z"
resolved_at: "2026-06-28T12:34:03Z"
involves_personal_data: "REPLACE — true | false"
reported_to_supervisory_authority: "REPLACE — true | false | n/a"
notification_window_72h: "REPLACE — within | outside | n/a"
last_reviewed_at: "2026-06-28"
source_issue: "https://github.com/metasession-dev/wawagardenbar-app/issues/347"
source_issue_number: 347
---

> ℹ️ Auto-exported by Incident Export workflow on issue close.
> The narrative below is the original issue body + comments.
> **Operator must replace the REPLACE markers in the frontmatter and
> in the GDPR triage / sign-off sections before this PR merges** —
> a personal-data triage decision is load-bearing; an auto-generated
> answer is not defensible. Auditors will reject auto-generated
> stubs without human attestation.

# Incident Report — [bug] REQ-064 support ticket flow — 2 specs failing post-release (regression-pack #330 Bucket 4)

**Framework coverage:**

- `ISO29119.3.5.4` (Test incident report)
- `SOC2.CC7.2` (System monitoring and incident response)
- `GDPR.Art-33` (Notification of a personal data breach to the supervisory authority — 72h)
- `GDPR.Art-34` (Communication of a personal data breach to the data subject)

**Source:** [#347](https://github.com/metasession-dev/wawagardenbar-app/issues/347)  
**Detected:** 2026-06-09T10:18:23Z  
**Closed:** 2026-06-28T12:34:03Z  
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

Tracking issue for **Bucket 4** of the [#330](https://github.com/metasession-dev/wawagardenbar-app/issues/330) regression-pack triage. **2 specs** covering REQ-064 (released 2026-06-03) now failing in CI.

REQ-064 shipped a working WhatsApp-fed support ticket queue + staff reply flow. These specs passed at REQ-064 close-out. They're now failing on the nightly cron + on the REQ-076 release PR's CI runs. **Something downstream broke REQ-064.**

## Symptoms

### Spec 1 — `support-ticket-whatsapp-inbound.spec.ts` AC3

Inbound `support_text` WhatsApp message should auto-create a SupportTicket. Spec calls `readTicketByMessage(body)` after sending — gets `null`. Ticket not created.

### Spec 2 — `support-ticket-staff-flow.spec.ts` AC4+AC5

Staff replies to a seeded ticket; status should flip to `resolved`. Spec asserts status — observed `open` (unchanged).

## Hypothesis

Likely causes (in order of suspicion):

1. **REQ-074 PIN-flow** (released 2026-06-06) — touched the auth surface that the inbound webhook lands through. May have broken inbound user-creation path.
2. **REQ-075 main-category registry** (released 2026-06-08) — changed `IMenuSettings` shape + `MainCategory` schema. Could have broken something downstream of `MainCategoryService` usage in unexpected places.
3. **Test environment drift** — UAT data or seed shape changed in a way that no longer matches the spec's expectations
4. **REQ-064 itself** had a marginal pass at close-out (per the close-out notes, screenshots were retrieved post-release) — could be a latent flake that's now showing reliably

## Investigation plan

1. Run each spec locally against fresh CI-style Mongo + dev server (rules out UAT-specific drift)
2. If still fails: check git log for changes to `WhatsAppInboundService.handle` + `SupportTicketService` since REQ-064 RELEASED on 2026-06-03
3. Diff against the working state at REQ-064 close-out tip
4. Identify which downstream REQ broke it + assess impact

## Acceptance criteria

- [ ] Root cause identified + linked to the breaking REQ
- [ ] If real product defect: separate fix REQ scoped + landed
- [ ] Both specs run green on `e2e-regression.yml`
- [ ] Customer support ticket creation + reply flow verified end-to-end in production

## Risk classification

**HIGH**. Support tickets are customer-facing AND staff-facing. If REQ-064 broke in production, customers' WhatsApp messages aren't reaching the staff queue + replies aren't flipping ticket status. This is operational impact.

**Recommended next action**: spot-check production support ticket flow IMMEDIATELY (look for WhatsApp inbound traffic that should be creating tickets but isn't, check ticket status distribution). If broken in prod, fix takes priority over regression-pack cleanup.

## Cross-references

- [#330](https://github.com/metasession-dev/wawagardenbar-app/issues/330) — parent triage
- REQ-064 — original support ticket REQ (RELEASED 2026-06-03)
- REQ-074 — PIN-flow REQ (RELEASED 2026-06-06) — possible breaker
- REQ-075 — main categories REQ (RELEASED 2026-06-08) — possible breaker

### Framework attribution

- [x] `ISO29119.3.5.4` (baseline)
- [x] `SOC2.CC7.2` — ops impact: yes — if real, customer messages bypass staff queue
- [ ] `GDPR.Art-33` — personal data scope: REPLACE — depends on whether messages contain PII that's mishandled
- [ ] `GDPR.Art-34` — data-subject notification: no
- [ ] `EUAIA.Art-9 / Art-14 / Art-15` — AI failure: no

🤖 Filed from regression-pack health review during REQ-076 close-out

## 3. Timeline (from issue comments)

### 2026-06-28T12:34:03Z — @ostendo-io

Fixed by PR #348 (commit aedd8dc: `test: align REQ-064 specs with documented routing matrix [#347]`). REQ-064 specs now aligned and passing.


## 4. Sign-off — REPLACE

| Role                                | Name    | Date    |
| ----------------------------------- | ------- | ------- |
| Incident Commander                  | REPLACE | REPLACE |
| Engineering lead                    | REPLACE | REPLACE |
| DPO (if personal data involved)     | REPLACE | REPLACE |
| Security lead                       | REPLACE | REPLACE |

---

_Source: auto-exported by `.github/workflows/incident-export.yml` when the originating issue was closed._
