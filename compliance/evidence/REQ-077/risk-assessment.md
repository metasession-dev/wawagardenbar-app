---
req: REQ-077
generated_by: risk-register-keeper
generated_at: 2026-06-11T04:30:00Z
---

# Risk assessment — REQ-077

## Summary

This REQ opened the following entries in [`compliance/risk-register.md`](../../risk-register.md):

| RISK-NNN | Title                                                                              | Status this cycle                           | Residual L × I |
| -------- | ---------------------------------------------------------------------------------- | ------------------------------------------- | -------------- |
| R-003    | IncidentRetryButton remediation regression when relocated into expansion container | OPEN (opened this REQ; mitigations applied) | low × high     |
| R-004    | URL-hash-driven expansion state: fidelity + injection-surface defence              | OPEN (opened this REQ; mitigations applied) | low × low      |

## Mitigations applied (this REQ)

### R-003 — IncidentRetryButton regression

1. `<IncidentRetryButton>` imported and rendered unchanged — same component, same `orderId` prop, no wrapping changes its rendering or event handlers.
2. Unit test in `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` pins the `inventoryDeducted` join logic so the conditional "Retry now visible vs ✓ Deducted" branch keeps firing.
3. E2E spec at `e2e/critical/incidents-expansion.spec.ts` AC4(R-003) case covers button reachability + enabled state inside the new expansion container.
4. Critical-tier project (`retries: 0` per #352) gates the e2e on PR-to-main — a regression here fails the release gate.

### R-004 — URL-hash injection-surface defence + state fidelity

1. Hash segments validated against `/^[a-f0-9]+$/` ObjectId regex inside `<IncidentRow>` parse path. Non-matching segments silently discarded.
2. Validated hash IDs drive `useState(initial)` for expansion state ONLY — never `dangerouslySetInnerHTML`, never `eval`, never any DOM-string-injection sink.
3. On parse failure (no valid IDs found) the page defaults to all rows collapsed — graceful degradation.
4. 10 unit-test cases in `__tests__/components/incident-row.hash-parse.test.ts` pin the regex-validation contract.
5. E2E spec at `e2e/critical/incidents-expansion.spec.ts` AC6(R-004) case verifies a malicious hash payload doesn't fire a script dialog and doesn't expand any rows.

## Risks examined and `@risk-deferred`

Three threats from the implementation plan's §4 STRIDE table were considered but did not warrant register entries:

| Threat                                          | Rationale for `@risk-deferred`                                                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthorised access to the incidents page       | Inherited from REQ-066 RBAC (`requireRole` + `incidentsAccess` permission). REQ-077 doesn't change the gate. Existing register coverage applies if needed. |
| `errorDetails` JSON containing actor field leak | Same audience (admins viewing the incidents page) as today. No fan-out to customers / unauthenticated routes. Already-accessible data.                     |
| Large payload bloat (200 rows × N items)        | Existing 200-row cap bounds the surface. `errorDetails` is `{ message, actorUserId, actorRole }` — small. Order projection fixed-field.                    |

## Framework cross-references

| Clause                                                    | RISK-NNN coverage                                       |
| --------------------------------------------------------- | ------------------------------------------------------- |
| **ISO 27001 A.8.25** — Secure development life cycle      | R-003 (regression risk on existing security control)    |
| **ISO 27001 A.8.28** — Secure coding                      | R-004 (regex-validated user-input on a privileged page) |
| **SOC 2 CC8.1** — Change management                       | R-003                                                   |
| **OWASP ASVS V4 §5** — Validation, sanitisation, encoding | R-004                                                   |

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence — R-003 + R-004 controls are demonstrably effective via unit + e2e tests.
- [ ] OPEN entries have a follow-up tracking: review-due 2027-06-10 on both; the post-merge regression run on `main` will demonstrate residual effectiveness; entries can flip to MITIGATED at that point.
- [ ] No `solo_with_gap` control-gap entry needed (project's `approval.mode = dual_actor`).

**Reviewer:** ostendo-io
**Date:** 2026-06-11

## Framework attribution

This artefact uploads with `evidence_type=risk_assessment`. Per META-COMPLY's `framework-registry-auditor` v1 review, clause attribution is **orphan-by-design** in v1 — visible in the portal's Documents tab + audit-pack export, but does NOT close any framework clause as COVERED. The framework cross-references table above is the operator-facing mapping; Phase B will pair the evidence type with `SOC2.CC3.2` (Risk identification and assessment) attribution once the auditor's framework-registry update ships.

## Refs

- Canonical risk-register entries: [`compliance/risk-register.md`](../../risk-register.md) — R-003 + R-004
- Implementation plan: [`compliance/plans/REQ-077/implementation-plan.md`](../../plans/REQ-077/implementation-plan.md) §4 — STRIDE pass + Risk register entries sub-section
- Sibling artefacts: [`srs-alignment.md`](./srs-alignment.md), [`architecture-decision.md`](./architecture-decision.md)
