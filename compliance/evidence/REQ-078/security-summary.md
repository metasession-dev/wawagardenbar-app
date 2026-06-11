# REQ-078 — Security summary

**Requirement ID:** REQ-078
**Risk:** LOW
**Date:** 2026-06-11

## Threat model (STRIDE)

Single 1-file production change: `lib/scheduled-jobs.ts` reads `process.env.DISABLE_INVENTORY_RECONCILIATION_JOB` once at boot, before the in-process scheduler registers the inventory-reconciliation job's `setTimeout` + `setInterval` pair.

| Threat                | Surface examined                                                      | Verdict                                                                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **S** — Spoofing      | Env var is read from `process.env` at server boot                     | Out of scope — `process.env` is controlled by the Railway deploy operator (super-admin equivalent). No user-input pathway feeds into the gate decision.                                                                  |
| **T** — Tampering     | The env var could be mutated mid-process by malicious in-process code | Out of scope at this layer — the gate read happens once at boot. Any attacker who can mutate `process.env` already has code execution on the server; this REQ doesn't expand that surface.                               |
| **R** — Repudiation   | Operator denies turning the job off                                   | Mitigated — every boot logs the gate decision via `console.warn(...inventory-reconcile: ${DISABLED \| 15min}...)`. Railway log retention is the audit trail; the line shows up in the standard service log stream.       |
| **I** — Info exposure | Disabling the job exposes some information                            | N/A — the gate does NOT log values of env vars beyond the boolean state. `errorDetails` / Order JSON / customer data are not in scope.                                                                                   |
| **D** — DoS           | An attacker could perma-disable a critical job                        | Same as **T** — env mutation requires server access. The job itself is a remediation mechanism, not a critical path; manual `<IncidentRetryButton>` from REQ-066 AC10 + per-incident triage are the fallback.            |
| **E** — Elev. priv.   | Disabling the job gives someone elevated capability                   | N/A — disabling halts auto-retry of inventory deduction. The downstream effect (more stuck `inventory_deduction_failed` incidents) is operationally visible via the existing `/dashboard/incidents` (REQ-066 + REQ-077). |

## Dependency audit

No new dependencies. `process.env` is a Node built-in. `npm audit` results unchanged from the develop-baseline pre-REQ-078.

## SAST

No new SAST findings expected — the change adds a boolean read + a conditional `setInterval` call. No string interpolation into queries, no user-input flow into the new code, no `eval` / `Function` construction. The Semgrep scan on the develop push for the integration PR will produce the canonical evidence.

## Framework attribution

| Clause                                        | Coverage                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **ISO 27001 A.8.25** Secure SDLC              | Threat-modelled via STRIDE table above; no new surfaces; fail-safe gate.                                                  |
| **GDPR Art. 25** Data protection by design    | N/A — no personal-data scope. The gate controls an inventory-reconciliation job; no customer / staff PII flows are added. |
| **EU AI Act Art. 11** Technical documentation | N/A — no AI in scope.                                                                                                     |
| **ISO 29119 §3.4** Test Plan                  | Covered via [`test-plan.md`](./test-plan.md) — AC-to-test mapping with 7 vitest cases.                                    |

## Risk register

**No new entries.** Fail-safe by design: env var unset preserves the current (REQ-066) behaviour; mis-configuration (operator forgets to unset after triage) results in stuck `inventory_deduction_failed` incidents that already have the manual `<IncidentRetryButton>` remediation from REQ-066 AC10 + visibility via REQ-077's expandable details panel.

## Sign-off

- **Reviewer:** ostendo-io — 2026-06-11
