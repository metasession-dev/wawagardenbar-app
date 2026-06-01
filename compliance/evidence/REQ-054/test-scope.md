# REQ-054 — Test scope

**Requirement:** NotificationService.send() channel-fallback wrapper (#117 WA-2).

## In scope

- **Unit** — two new vitest files:
  1. `__tests__/lib/notification-templates.test.ts` (6 cases) — every key has a valid category, the 13 active templates from `docs/whatsapp-templates.md` are all covered, and the category for each per-row template matches the doc.
  2. `__tests__/services/notification-service.test.ts` (10 cases) — channel ordering (WA → email → SMS), per-category consent (transactional / marketing / authentication), backwards-compat path (no `optIn`), explicit category override, unknown templateKey throws, full fallback chain (WA fail → email fail → SMS).
- **Regression** — full vitest suite runs to confirm no impact on existing tests (`feedback_sdlc_all_code_changes`).
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --config auto`, `npm audit --audit-level=high`.
- **Caller refactor verification** — `app/actions/communication/communication-actions.ts:80` switched from direct `sendOrderConfirmationEmail` to `NotificationService.send` with the email closure carrying the same content shape (no UX regression when WA fails / consent off / template unapproved).

## Out of scope

- `NotificationLog` persistent model + delivery-status webhook handling → WA-5.
- Rewards-earned + rewards-expiring email refactor → naturally adopted when WA-6 touches those code paths.
- Support-reply outbound path → WA-3 owns inbound; outbound is trivially `NotificationService.send` once needed.
- Per-channel marketing/transactional split for email + SMS → future REQ once data justifies it.
- Verification-PIN refactor → the three `send*-pin` actions already pick a channel per the user's chosen auth method; no value adding NotificationService.send there in v1.
- E2E spec → the orchestrator surface is best-covered by the unit boundary; an e2e wrapper would only exercise the email fallback (matches today's UX), so no incremental signal.

## Risk-based depth

MEDIUM risk → unit + integration. 16 unit cases cover the full surface: channel order, consent (3 categories), opt-out (all 3 channels), backwards-compat, override semantics, error paths, fallback chain. The integration point is the single caller refactor in `communication-actions.ts:80` — covered by the existing manual review pattern for server-action-only changes per `Test_Policy.md` §Risk-Based Testing.
