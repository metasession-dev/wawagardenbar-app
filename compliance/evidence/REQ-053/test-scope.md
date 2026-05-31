# REQ-053 — Test scope

**Requirement:** WhatsApp opt-in surface at signup + profile (WA-4 from #117).

## In scope

- **Unit** — two new vitest files:
  1. `__tests__/models/user-model.preferences.test.ts` (4 cases) — schema defaults (`whatsappTransactional` true, `whatsappMarketing` false), explicit override at construction, backwards-compat for existing email/sms/push.
  2. `__tests__/actions/auth/verify-pin-opt-in.test.ts` (4 cases) — `verifyPinAction` persists `optIn` on first verify, marketing opt-out persists `false`, subsequent verify does NOT overwrite, no `optIn` payload is a backwards-compat no-op.
- **Regression** — full vitest suite runs to confirm no impact on existing tests (`feedback_sdlc_all_code_changes`).
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --config auto`, `npm audit --audit-level=high`.
- **E2E (focused)** — `e2e/auth/whatsapp-opt-in.spec.ts` will exercise the full signup → PIN-entry → profile path. **NOTE:** customer PIN-login E2E specs are blocked on provider mocks per project memory `e2e_regression_suite`; this spec is authored but skipped on CI until that infra lands. The unit boundary is the load-bearing gate for REQ-053 acceptance.

## Out of scope

- WA-1 (Meta template submission) — separate workflow, no code.
- WA-2 (`NotificationService.send` wrapper) — separate REQ; will gate sends on the new `whatsappTransactional`/`whatsappMarketing` fields REQ-053 adds.
- P0 #5 (communication preferences enforced on outbound) — also in WA-2's scope.
- Marketing/transactional taxonomy at the template level — defers to WA-1.
- Customer-facing copy review beyond AC3's exact wording (audit-trail-ready text).

## Risk-based depth

MEDIUM risk → unit + e2e (the e2e here is authored-only pending provider-mock infra). The 3-action gate `!phoneVerified && !emailVerified` plus the schema defaults are the load-bearing invariants; unit tests cover both. Profile-side Switch wiring is conventional shadcn — covered by the existing manual review pattern for UI-only changes per `Test_Policy.md` §Risk-Based Testing.
