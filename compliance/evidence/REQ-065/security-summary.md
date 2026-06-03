# REQ-065 — Security summary

## Threat model — STRIDE pass over the changed surfaces

| Category               | Surface                         | Assessment                                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spoofing               | `/api/user/export` session gate | Session cookie required; no API-key path; no anonymous access. Session is the same `iron-session` cookie the rest of the customer app uses — no new auth surface introduced.                                                                                                   |
| Tampering              | Server-side find filters        | Every find query is keyed on `session.userId` at the route handler. A client cannot ask for another user's data by crafting a different payload — there is no client-supplied filter parameter.                                                                                |
| Repudiation            | Export-event logging            | Successful exports already log via the Next.js API route's standard request log. No new persistent audit row added — the export is a read, not a state mutation.                                                                                                               |
| Information disclosure | User-doc secrets                | `verificationPin`, `pinExpiresAt`, `sessionToken` are explicitly projected out of the UserModel.findById response. Verified by the unit test (`__tests__/api/user-export.test.ts:profile shape`).                                                                              |
| Information disclosure | Cross-user reads                | Every find filter uses `session.userId`. Unit test verifies the assertion across all 9 collections.                                                                                                                                                                            |
| Denial of service      | Endpoint flood                  | In-memory rate-limit at 1 request / userId / 60s. Returns 429 with `Retry-After` header. Forward-compatible to Redis (a v2 REQ can swap the backing store without changing call sites). Response size bounded by per-user data footprint — not a worst-case multi-MB scenario. |
| Elevation of privilege | None                            | Endpoint never exposes admin data, never accepts admin-shaped queries, no role-elevation surface.                                                                                                                                                                              |

## Authentication & authorisation

- **No new endpoints with elevated auth.** The export endpoint uses the same customer session the rest of `/api/user/*` uses.
- **No new permission checks.** Customer-self-only by construction (find filters keyed on `session.userId`).
- **No new admin surface.** Staff cannot read another user's export from any UI in this REQ.

## Data protection

- **GDPR Art. 15 / Art. 20 (right of access / data portability) posture.** The endpoint delivers everything in machine-readable JSON. The 9-collection projection is enumerated; future collections that hold user-linked data must be added to the projection — the implementation plan flags this.
- **Cookie banner / Art. 7 (informed consent) posture.** Informational mode is honest about today's reality (no analytics scripts wired). Forward-compatible: a future REQ that adds analytics can extend the consent shape (e.g. `{ acceptedAt, version, analytics?: boolean }`) and gate those scripts on the read. A v2 with granular categories is a separate REQ when warranted.
- **Right-to-be-forgotten posture not in scope here.** That's a separate REQ (account deletion + data purge).

## Dependency audit

- **No new packages.**
- `npm audit --audit-level=high`: 0 vulnerabilities on the changed branch.

## SAST

- ESLint: 0 errors. 950 pre-existing `no-console` warnings unchanged.
- Semgrep / CI Security gate: SUCCESS.

## Rollback

Revert PR #274. The endpoint goes away cleanly (no DB migration to undo). Cookie banner removal leaves `cookieConsent` records in users' localStorage — harmless; a future re-introduction can read them as-is.
