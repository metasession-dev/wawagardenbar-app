# Test plan — REQ-117

| Test file                                               | Type          | ACs                     |
| ------------------------------------------------------- | ------------- | ----------------------- |
| `__tests__/actions/auth/send-whatsapp-pin.test.ts`      | unit          | AC5, AC9                |
| `__tests__/actions/auth/verify-whatsapp-pin.test.ts`    | unit (update) | AC5, AC8                |
| `__tests__/lib/auth-utils.pin-hash.test.ts`             | unit          | AC5                     |
| `__tests__/lib/session.customer-ttl.test.ts`            | unit          | AC7                     |
| `__tests__/lib/scheduled-jobs.unverified-purge.test.ts` | unit          | AC6                     |
| `__tests__/api/whatsapp-webhook-no-session.test.ts`     | unit          | AC10                    |
| `__tests__/actions/auth/pin-intercept.test.ts`          | unit (update) | AC5                     |
| `e2e/critical/customer-signin-whatsapp-only.spec.ts`    | e2e           | AC1 to AC5, AC7 to AC10 |
| `e2e/customer/auth-pin-happy-path.spec.ts`              | e2e (update)  | AC1                     |
| `e2e/smoke/customer-auth.spec.ts`                       | e2e (update)  | AC1                     |
| `e2e/customer/auth-guest-flow.spec.ts`                  | e2e (update)  | AC4                     |
| `e2e/requirements-verification.spec.ts`                 | e2e (update)  | AC1, AC4                |
| `e2e/smoke/req-084-checkout-separation.spec.ts`         | e2e (update)  | AC4                     |
| `e2e/smoke/consent-split-pin-entry.spec.ts`             | e2e (update)  | AC2                     |
| `e2e/critical/customer-pin-six-digits.spec.ts`          | e2e (update)  | AC1                     |
| `e2e/helpers/customer-auth.ts`, `e2e/smoke/helpers.ts`  | e2e infra     | AC5, AC9                |

The two notices that depend on a failed Meta send (AC3, AC9) are driven by `mockSendPinResult`, which rewrites the server action's result in the browser. The action's own result shapes and the Incident for AC9 are covered by `__tests__/actions/auth/send-whatsapp-pin.test.ts`. AC6 (purge) and the PIN request limit of AC5 are covered by unit tests; AC10 is covered at the transport boundary in the critical spec as well as by `__tests__/api/whatsapp-webhook-no-session.test.ts`.
