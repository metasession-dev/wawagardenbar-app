# WhatsApp Environment Setup (UAT / Production)

## Overview

Tracking issue: [#933](https://github.com/metasession-dev/wawagardenbar-app/issues/933) — UAT WhatsApp setup, the three registration-flow templates (`welcome_new_user`, `welcome_back`, `account_recovery`), and `account_recovery` routing code.

This guide is organized **by environment**, since each one has a different Meta App/WABA and a different place its env vars actually live. Read your environment's section top to bottom — don't mix values between sections.

**Only two environments are in scope: UAT and Production.** A separate "dev" Meta App + ngrok tunnel was considered but dropped — the account_recovery routing code (#933 Sections D/E) is pure logic tested against a short-circuited `WhatsAppService` (`ENABLE_WHATSAPP_NOTIFICATIONS=false` → zero real network calls, see `lib/whatsapp.ts`), so it needs no live Meta App at all. A live round-trip test, when wanted, has a home already: UAT is a real, persistent, publicly-reachable environment — no ngrok rotating-URL dance required. Add a dev Meta App + ngrok later only if local live-testing against a real webhook becomes a recurring need; it's a ~10-minute addition, not a prerequisite for #933.

**Why separate Meta Apps per environment:** Meta allows exactly one Callback URL + Verify Token per App/WABA. UAT and production each need their own Meta App (→ their own WABA + phone number) so their webhooks don't fight over that one field. Never reuse an access token, app secret, or verify token across environments.

|                         | UAT                                                                                  | Production                                                      |
| ----------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **Runs on**             | k3s Deployment `wawagardenbar-uat-app` (namespace `apps`, `ostendo-server`)          | Railway (`wawagardenbar-app`, environment `production`)         |
| **Public URL for Meta** | `https://wawagardenbar-uat.ostendo.io` (existing Cloudflare Tunnel — already public) | `https://app.wawagardenbar.com` (already live)                  |
| **Env vars live in**    | k8s Secret `wawagardenbar-uat-env` (namespace `apps`) — **not** `.env.uat.local`     | Railway dashboard/CLI variables on the `production` environment |
| **Status**              | to be created per this guide                                                         | ✅ already verified and working                                 |

Known pre-existing issue this guide does **not** fix: a real-looking WhatsApp access token is committed in `.env.test` and duplicated in `.env.uat.local`. Don't copy values out of either file — rotate/scrub that token independently of this work.

---

## UAT environment

**UAT already has a public HTTPS endpoint — no tunnel needed.** It's an existing Cloudflare Tunnel at `https://wawagardenbar-uat.ostendo.io`, unauthenticated, forwarding straight to the app's `/api/webhooks/whatsapp` route. `wawagardenbar-app-uat.ostendo.lan` is a separate LAN-only hostname for the same box — not what Meta talks to.

**`.env.uat.local` is NOT what's deployed.** It's a local-dev convenience file in this repo that mirrors UAT's variable shape for reference. The actual running UAT pod reads its environment from the Kubernetes Secret `wawagardenbar-uat-env` (namespace `apps`). Editing `.env.uat.local` alone does nothing to the live UAT app — you must apply the values to the k8s Secret and restart the deployment (step 3 below). Treat `.env.uat.local`'s existing WhatsApp values as untrustworthy — don't reuse them (leaked-token caveat above).

### 1. Create the UAT Meta App

Same process as dev (§Dev, 1.1–1.6), named **"Wawa Garden Bar — UAT"**, generating a **fresh** verify token distinct from dev's and prod's. Note: UAT Phone Number ID, UAT WABA ID, UAT App Secret, UAT access token, UAT verify token.

### 2. Confirm the endpoint is reachable (before changing anything)

```bash
curl -i https://wawagardenbar-uat.ostendo.io/api/webhooks/whatsapp
```

Expect `403 Forbidden` with a JSON body from the app (the webhook route's own expected rejection when `hub.mode`/`hub.verify_token`/`hub.challenge` are absent — `app/api/webhooks/whatsapp/route.ts:52-53`), not an nginx/Cloudflare error page. That confirms the tunnel forwards this path correctly before you touch config.

### 3. Set these exact values on the k8s Secret

For local reference, keep `.env.uat.local` in sync with these same 7 keys/values (so the two never drift):

```env
ENABLE_WHATSAPP_NOTIFICATIONS=true
WHATSAPP_PROVIDER=cloud
WHATSAPP_PHONE_NUMBER_ID=<UAT Phone Number ID>
WHATSAPP_BUSINESS_ACCOUNT_ID=<UAT WABA ID>
WHATSAPP_ACCESS_TOKEN=<UAT access token>
WHATSAPP_APP_SECRET=<UAT App Secret>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<UAT verify token>
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_URL=https://graph.facebook.com
WHATSAPP_PIN_TEMPLATE_NAME=verification_pin
```

Then apply to the actual deployment:

```bash
kubectl -n apps edit secret wawagardenbar-uat-env
# add/update the WHATSAPP_* keys above (base64-handled automatically by `edit`)

kubectl -n apps rollout restart deployment/wawagardenbar-uat-app
```

If the pod doesn't pick up the new values cleanly after a rollout restart (documented gotcha), force it:

```bash
kubectl -n apps delete pod -l app.kubernetes.io/name=wawagardenbar-uat-app
```

### 4. Verify the webhook

1. Meta dashboard (UAT App) → WhatsApp → Configuration → Webhook → **Edit**.
2. Callback URL: `https://wawagardenbar-uat.ostendo.io/api/webhooks/whatsapp`
3. Verify Token: value from §UAT 1 (the fresh UAT token now live in the Secret).
4. **Verify and Save** — should succeed with no banner error.
5. Subscribe to `messages`, `message_status`.

### 5. Watch for the Railway-adjacent deploy-skip gotcha

Not applicable to UAT's current k3s setup directly, but if UAT or any related service is ever moved back behind Railway's "Wait for CI" gating, know that an env-var change can silently `SKIP` the deploy meant to pick it up (confirmed on both the old Railway-hosted UAT and on production, 2026-10-18) — always confirm via `railway deployment list`, not just that the variable was saved.

---

## Production environment

**Already set up and verified — this section is reference only**, for comparison/rotation, not a to-do.

- **Runs on:** Railway, service `wawagardenbar-app`, environment `production`.
- **Public URL:** `https://app.wawagardenbar.com` (already live, Meta webhook already verified).
- **Env vars live in:** Railway's dashboard (Variables tab) or CLI — **never a repo file**. Same 7 keys as dev/UAT:

```env
ENABLE_WHATSAPP_NOTIFICATIONS=true
WHATSAPP_PROVIDER=cloud
WHATSAPP_PHONE_NUMBER_ID=<prod Phone Number ID>
WHATSAPP_BUSINESS_ACCOUNT_ID=<prod WABA ID>
WHATSAPP_ACCESS_TOKEN=<prod access token>
WHATSAPP_APP_SECRET=<prod App Secret>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<prod verify token>
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_URL=https://graph.facebook.com
WHATSAPP_PIN_TEMPLATE_NAME=verification_pin
```

Set via CLI (requires Railway auth + project link):

```bash
railway variables --set "WHATSAPP_WEBHOOK_VERIFY_TOKEN=<value>" --service wawagardenbar-app --environment production
```

**The deploy-skip gotcha — confirmed here on 2026-10-18:** setting a variable on `production` should auto-trigger a redeploy, but Railway's "Wait for CI" gate can race GitHub's webhook and mark that redeploy `SKIPPED`, leaving the live app on the old build (and old env var value) for hours with no obvious error — Meta's webhook verification just fails with a generic "couldn't be validated" message. After any production env var change:

```bash
railway deployment list --service wawagardenbar-app --environment production
# if the expected deploy shows SKIPPED instead of SUCCESS:
railway redeploy --service wawagardenbar-app --environment production --yes
# then poll deployment list again until the new deployment ID shows SUCCESS
```

Only then retry webhook verification in Meta's dashboard.

---

## Templates (all environments)

Three registration-flow templates are in scope: `welcome_new_user`, `welcome_back`, `account_recovery`. Exact field values are in `docs/whatsapp-templates.md`. `verification_pin` is already approved — don't resubmit it.

**Current state:** the submission scripts (`scripts/whatsapp-submit-templates.ts` / `whatsapp-check-template-status.ts`, tracked in #933) aren't built yet. Until then, submit manually per environment:

1. Meta App (UAT, then prod if ever needed again) → **WhatsApp → Message Templates → Create Template**.
2. Copy Name/Category/Language/Body/Footer/Buttons exactly from `docs/whatsapp-templates.md`.
3. Submit — approval is async, typically 24–48h. Templates are scoped per-WABA, so this is a separate submission per environment's WABA, not one.
4. Check status under Message Templates until `APPROVED`. A referenced-but-unapproved template fails to send — expected, documented in `compliance/RTM.md`.

## account_recovery routing (code gap)

As of this writing, `services/whatsapp-inbound-service.ts` has no detection for "this inbound phone doesn't match the account on file" — this is being built as part of #933 Sections D/E (routing logic + unit tests + new Playwright spec). Until that lands, there's nothing to manually exercise for `account_recovery` beyond confirming the template itself is approved.

## E2E testing

The existing Playwright pattern (`e2e/support-ticket-whatsapp-inbound.spec.ts`) posts a simulated Meta webhook payload directly to `/api/webhooks/whatsapp` and asserts on the resulting `IncomingMessage.actionTaken` in MongoDB — no real outbound WhatsApp call, since `ENABLE_WHATSAPP_NOTIFICATIONS=false` in the test env makes `WhatsAppService.sendMessage()` short-circuit before any network call. This means e2e coverage doesn't need live Meta credentials or either environment's webhook to be verified. The new spec `e2e/whatsapp-inbound-registration-templates.spec.ts` (tracked in #933) extends this to the three registration states:

```bash
npx playwright test whatsapp-inbound-registration-templates
```

For a **real** round-trip (not simulated), use the manual tests in each environment's section above.

## Checklist

- [ ] UAT: Meta App created, k8s Secret `wawagardenbar-uat-env` updated + deployment restarted, webhook verified via `wawagardenbar-uat.ostendo.io`, one real round-trip.
- [ ] `welcome_new_user` / `welcome_back` / `account_recovery` submitted for UAT's WABA.
- [ ] All three show `APPROVED` (24–48h after submission) for UAT.
- [ ] #933 Sections D/E code (routing + tests + e2e spec) merged.
- [ ] Production's existing config reviewed/rotated if the leaked-token issue is actioned.
- [ ] (Optional, later) Dev Meta App + ngrok, only if recurring local live-testing becomes necessary.

## Related Documentation

- `docs/authentication/whatsapp-setup-guide.md` — general Meta App / token / template creation walkthrough (this doc assumes familiarity and focuses on per-environment specifics).
- `docs/whatsapp-templates.md` — exact field values for all templates.
- `docs/authentication/whatsapp-pin.md`, `docs/authentication/whatsapp-quick-reference.md` — PIN delivery flow details.
- [#933](https://github.com/metasession-dev/wawagardenbar-app/issues/933) — tracking issue for the work this guide documents.
