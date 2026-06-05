# REQ-072 — Security summary

## Surface review

This REQ adds **test code only** — zero changes to production application code. The Socket.IO server, the internal-emit route handler, and the secret-validation logic are all unchanged.

## STRIDE pass on the new test infrastructure

| Threat                     | Surface                                                                             | Status                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | Spec sends `x-internal-auth: ${INTERNAL_API_SECRET}` to `/api/internal/socket/emit` | Same path the existing `lib/socket-emit-helper.ts` uses from server actions. Spec is exercising the production gate, not bypassing it.                                            |
| **Tampering**              | Spec emits synthetic `order-status-update` events with synthetic orderIds           | Synthetic orderIds (`e2e-req072-${Date.now()}-*`) — no real Order document state mutated. Broadcasts land in `order-${orderId}` rooms that no production client is subscribed to. |
| **Repudiation**            | Spec connects 3 short-lived `socket.io-client` connections to UAT                   | Each connection logs a `Client connected: <id>` line at the server (`lib/socket-server.ts:36`). Audit trail preserved. Disconnected at `afterAll`.                                |
| **Information disclosure** | Spec reads back `order-status-update` payloads                                      | Payloads are the synthetic ones the spec itself just sent. No production data ever in the payload.                                                                                |
| **Denial of service**      | 3 sequential socket connections + 3 POST requests per run                           | Negligible UAT load. Configured `mode: 'serial'`.                                                                                                                                 |
| **Elevation of privilege** | Spec invokes the internal-emit endpoint with the shared secret                      | The endpoint only emits Socket.IO events — it can't read or write database state. Blast radius is "broadcast an event to whichever room is in the payload".                       |

## Secret handling

- `INTERNAL_API_SECRET` is read from `process.env.INTERNAL_API_SECRET`. Loaded by `dotenv` from `.env.local` at Playwright startup. Never logged, never persisted to test artefacts.
- If the env var is unset, the spec `test.skip()`s with a clear message naming the missing var. It does NOT proceed with an empty/undefined header that would always 401.

## Finding: UAT `INTERNAL_API_SECRET` appears to be the placeholder

The 2026-06-05 live run used the value from local `.env.local` — `your-secret-key-here` (the file's documented placeholder). UAT's `/api/internal/socket/emit` accepted this value, meaning UAT's Railway `INTERNAL_API_SECRET` environment variable is set to the same placeholder string.

**Honest disclosure**: this is a **production hardening gap unrelated to REQ-072** — the internal-emit endpoint can be triggered by anyone who knows the placeholder string. The blast radius is bounded (Socket.IO event emission only; no DB read/write), but a hostile caller could:

- Broadcast fake `order-status-update` events to subscribed customers (UX confusion, not data loss).
- Broadcast fake `order-created` / `order-updated` / `order-cancelled` events to the admin orders dashboard + kitchen display (UX confusion, possibly transient).

**Suggested remediation (out of scope for REQ-072)**:

- Rotate UAT's `INTERNAL_API_SECRET` to a strong random value via Railway env var management.
- Rotate prod's value too (verify first whether it shares the same placeholder).
- File a follow-up issue. **The spec itself remains valid** regardless of the secret's strength — both the placeholder and any rotated value will continue to work; the spec just needs the value matching whatever Railway is configured with.

This finding is surfaced honestly because the spec's success depends on it, but the underlying gap is **not introduced by this PR** — it predates REQ-072 by however long Railway has had that value.

## What this REQ does NOT change

- Production route handlers: unchanged.
- Production socket server / event handlers: unchanged.
- Production rate limits, auth surfaces, or session handling: unchanged.

## Compliance posture

- **No new auth surface.** Spec uses an existing internal-only endpoint with the existing shared-secret gate.
- **No new data egress.** Synthetic payloads only; no production data read or echoed back.
- **No new packages.** `socket.io-client` was already in `package.json` (used by `lib/socket-client.ts`).
- **Read-only against UAT data.** No DB mutation. Synthetic orderIds only.

## Related

- REQ-069 (MERGED) — webhook signature + idempotency E2E. Established the "Playwright spec + Node fetch + live UAT" pattern this REQ extends to Socket.IO.
- REQ-070 (MERGED) — rewards-pipeline E2E. Established the "import service-layer from spec" pattern (not used here — REQ-072 uses HTTP-only triggers).
- REQ-071 (MERGED) — public API authenticated contracts E2E. Established the "ephemeral creds + revoke on teardown" pattern (not needed here — Socket.IO uses synthetic ids, not credentials).
