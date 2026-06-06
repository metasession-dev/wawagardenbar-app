# REQ-074 — Security summary

## Surface review

This REQ adds a small production code change (3 auth-action files, ~15 lines total) that gates a short-circuit behind an env flag. The change is upstream of the SMS / WhatsApp / Email provider dispatch and downstream of the PIN-persist step. PIN generation, expiry, validation, rate-limiting, and session creation are all unchanged.

## STRIDE pass on the new bypass

| Threat                     | Surface                                                                 | Status                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | An attacker triggering the bypass via a customer-supplied input         | Not possible — the bypass is env-only (`process.env.ENABLE_E2E_PIN_INTERCEPT === 'true'`). No HTTP header, cookie, query parameter, or form field can enable it.    |
| **Tampering**              | An attacker tampering with the env var                                  | Same surface as any other env var (Railway dashboard access, deploy secrets). Existing operational controls apply.                                                  |
| **Repudiation**            | An action-layer audit log no longer recording the send-attempt          | Existing audit logging on PIN events is at the verify-pin layer, not send-pin. No change.                                                                           |
| **Information disclosure** | The bypass leaking the PIN to test code                                 | The PIN is already in Mongo regardless of the bypass — the spec's read is the same data path a real customer's verify-pin action takes. No new information surface. |
| **Denial of service**      | Real customers seeing fake "PIN sent" success when SMS is actually down | Only when the env var is set on a production deploy. Operator-controlled. Default-off.                                                                              |
| **Elevation of privilege** | The bypass somehow granting elevated access                             | The bypass returns the same `{ success, message, isNewUser }` shape; downstream code path (verify-pin, session creation) is unchanged. No elevation.                |

## Secret handling

- `ENABLE_E2E_PIN_INTERCEPT` is a boolean string flag, not a secret. Adding it to `.env.example` would be safe; we added it only to `.env.local` with an inline doc comment naming the production-must-not-set rule.
- No new credentials introduced.

## Default-off discipline

- The flag defaults to `false` (any value other than the literal string `'true'` falls through to the existing provider dispatch path).
- Variable name carries `E2E` for visibility in any env-var audit (`git grep ENABLE_E2E_PIN_INTERCEPT` surfaces every reference).
- Production deploys (Railway main environment) MUST leave it unset. This is documented in:
  - The inline doc comment in each of the 3 action files
  - The doc comment in `.env.local` next to the flag
  - The test-scope.md and this security-summary
  - The release ticket's pre-deploy checklist

## Mitigation if accidentally enabled in production

If a misconfiguration sets `ENABLE_E2E_PIN_INTERCEPT=true` on Railway's production environment, the consequence is **UX failure, not security failure**:

- Customers entering their phone number would see "PIN sent" success but never receive the PIN
- They could not log in (no PIN to type)
- They would retry, see the same success-with-no-SMS pattern, and report it as broken

**They would not:**

- Have their account taken over by a third party (the PIN is still random per request, expiry-gated, per-user)
- Have their session impersonated
- Have their phone number harvested

Recovery is immediate (unset the flag, redeploy). Operationally noisy (high support volume), not security-critical.

## What this REQ does NOT change

- PIN generation algorithm (`generatePin`) — unchanged
- PIN expiry (`getPinExpirationTime`) — unchanged
- Verify-pin action — completely unchanged
- Session creation — completely unchanged
- Rate-limiting on send-pin — completely unchanged
- AuditLog writes from any other auth surface — completely unchanged

## Compliance posture

- **No new auth surface.** The bypass sits inside an existing action behind an env gate.
- **No new data egress.** Spec reads existing User.verificationPin field.
- **No new packages.** Uses existing `process.env` and the existing `mongodb` driver.
- **UAT only.** Helper enforces UAT-only DB writes per `feedback_no_prod_db_touches`.

## Related

- REQ-069 (RELEASED v2026.06.05) — webhook signature/idempotency E2E; established the "Playwright spec + UAT live + Mongo helper" pattern this REQ extends.
- REQ-070 (RELEASED v2026.06.05) — established the MongoClient seed/cleanup pattern.
- REQ-072 (RELEASED v2026.06.05) — established the env-gated test infrastructure pattern (INTERNAL_API_SECRET intercept).
