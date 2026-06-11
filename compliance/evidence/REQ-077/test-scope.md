# REQ-077 — Test scope

## In scope (this PR)

### Production code

- `services/incident-event-service.ts` — new `listWithLinkedOrders()` method that projects Order snapshot fields in one query (dedupes ObjectId entityIds first); new `IncidentEventLean` / `IncidentLinkedOrderSnapshot` / `IncidentWithLinkedOrder` types
- `components/features/admin/incident-row.tsx` (NEW) — client component owning expand/collapse state, chevron, keyboard handlers, URL-hash sync via `history.replaceState`. Exports `parseExpandedFromHash` for unit testing.
- `components/features/admin/incident-details-panel.tsx` (NEW) — presentational panel rendering `errorDetails` JSON (via `JSON.stringify` + `<pre>`, never `dangerouslySetInnerHTML`), Order snapshot, statusHistory trail, retry button passthrough.
- `app/dashboard/incidents/page.tsx` — swaps inline `<TableRow>` rendering to `<IncidentRow>`; switches data source from `list()` + inline join to `listWithLinkedOrders()`.

### Unit tests

- `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` — 8 cases pinning the join contract: empty event list / kind filter / ObjectId dedup across rows / non-ObjectId skip / snapshot projection / statusHistory shape / missing-Order null fallback / pagination passthrough.
- `__tests__/components/incident-row.hash-parse.test.ts` — 10 cases pinning the regex-validation contract for `parseExpandedFromHash`: empty / missing `open=` / single ObjectId / multi comma-separated / garbage discarded / length-flexible / trailing commas / cross-key isolation / `#`-prefix tolerance / all-invalid graceful default.

### E2E specs

- `e2e/critical/incidents-expansion.spec.ts` (NEW, critical tier) — 9 cases authored by `e2e-test-engineer` skill:
  - AC1 — click toggle + chevron rotate
  - AC1 — keyboard Space + Enter
  - AC1 — multi-row simultaneous expansion
  - AC2+AC3 — errorDetails JSON + entityId link + Order snapshot fields
  - AC4 (R-003) — retry button visible inside expansion for undeducted incidents
  - AC4 (REQ-INV-016) — stale_paid_order status-history trail chronologically
  - AC5 — no `/api/incidents/*` request on expand
  - AC6 — `#open=<id>` URL hash round-trip on reload
  - AC6 (R-004) — malformed-hash silently ignored, no XSS dialog fired

### Compliance

- `docs/SRS.md` — 4 new rows under Feature Area 14 (INV): REQ-INV-014 / 015 / 016 / 017 + detailed sections
- `compliance/RTM.md` — REQ-077 IN PROGRESS row
- `compliance/plans/REQ-077/implementation-plan.md` + mirrored evidence copy
- `compliance/risk-register.md` — R-003 + R-004 entries
- `compliance/evidence/REQ-077/{test-plan,test-execution-summary,test-scope,security-summary,ai-prompts,ai-use-note,srs-alignment,architecture-decision,risk-assessment}.md` — 9-doc pack
- `compliance/pending-releases/RELEASE-TICKET-REQ-077.md`

## SRS items covered

| SRS ID                       | Covered by                                                | Status                                      |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| REQ-INV-014 (NEW)            | e2e (3 AC1 cases) + unit (hash-parse 10 cases)            | **Pinned** (e2e pending CI critical run)    |
| REQ-INV-015 (NEW)            | unit (8 cases) + e2e (AC2+AC3 case)                       | **Pinned**                                  |
| REQ-INV-016 (NEW)            | e2e (AC4 status-history case)                             | **Pinned**                                  |
| REQ-INV-017 (NEW)            | unit (10 hash-parse cases) + e2e (AC6 round-trip + R-004) | **Pinned**                                  |
| REQ-INV-013 (existing trace) | e2e (AC4 R-003 retry visible)                             | Reachability re-pinned (no contract change) |

## Out of scope (deferred to follow-up REQs)

| Item                                                | Why deferred                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Bulk actions on incidents (clear-all, mark-as-read) | Heavier scope; would change the audit-trail contract — incidents are append-only today. Separate REQ if operator wants it. |
| Pagination beyond 200 rows                          | Current cap has not surfaced as a real bottleneck; no admin reports paging through hundreds of incidents.                  |
| Email/SMS notifications on new incidents            | Adjacent concern (REQ-066 surfaces them on the page; this REQ doesn't broaden the notification surface).                   |
| New incident kinds                                  | REQ-077 only changes the rendering of existing kinds; future kinds (e.g. `payment_webhook_unverified`) are their own REQs. |
| Charts / trend view of incidents over time          | V1 ships tables-only; charts can land in a follow-up REQ if requested.                                                     |
