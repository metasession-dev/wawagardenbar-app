# Security Evidence Summary — REQ-116

**Date:** 2026-11-01
**Risk class:** HIGH (webhook authentication, customer sign-in delivery, consent)

| Control                           | Result                        | Evidence                                                                                                                                                                                                                                                                                    |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                  | PASS                          | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` are unchanged                                                                                                                                                                           |
| SAST                              | PASS (local) / CI             | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                                                                                                              |
| Webhook authenticity              | PASS                          | Without `WHATSAPP_APP_SECRET` the route returns 503 and processes nothing (it used to accept every request). A missing, malformed, wrong-length or wrongly-keyed signature returns 403 without throwing; the length is checked before `timingSafeEqual`. Unit and E2E tests cover each case |
| Secrets in logs                   | PASS                          | The verify token is no longer logged on GET, no signature value is logged, and `handleWebhook` logs counts instead of the raw payload (phone numbers and message bodies). Log-spy unit tests                                                                                                |
| Replay / duplicate delivery       | PASS                          | Insert-first on the unique `wamid` index (ADR-007): a duplicate causes no ticket, reply or consent write                                                                                                                                                                                    |
| Abuse limiting                    | PASS, with a documented limit | 20 messages per 10 minutes per phone; STOP and START are exempt. The limiter is in memory and per instance (R-044, accepted)                                                                                                                                                                |
| Consent handling                  | PASS                          | STOP clears marketing only; START restores it and stamps `communicationPreferencesUpdatedAt` and the source `whatsapp_inbound`. Operator approved the marketing-only policy (R-045)                                                                                                         |
| Account-identity safety           | PASS (unchanged)              | START and STOP act on the verified sender of a signature-validated payload only                                                                                                                                                                                                             |
| Secrets management                | PASS                          | No real secret is added to the repository. `sdlc-config.json` carries a test-only `WHATSAPP_APP_SECRET` for CI (a plain string, like the other E2E credentials); the real secrets are set by the operator in Railway production and `.env.uat.local`                                        |
| New dependencies / external calls | PASS                          | None                                                                                                                                                                                                                                                                                        |

## Data handling

Personal data touched: phone numbers and message bodies, already processed. One field is added, `communicationPreferencesSource`, recording where a consent change came from; it makes consent demonstrable (GDPR Art. 7). The raw webhook payload is no longer written to logs.

## Post-deploy controls

- Reversible by `git revert` of the REQ-116 merge. Rolling back re-opens the fail-open webhook (R-043), so prefer a forward fix.
- The operator confirmed on 2026-11-01 that `WHATSAPP_APP_SECRET` is set in Railway production and `.env.uat.local`. Deploy check: an unsigned POST to `/api/webhooks/whatsapp` returns 403 (503 means the secret is missing on that server).
- AC10: record a live UAT sign-in with a real number.
