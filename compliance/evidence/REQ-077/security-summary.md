# REQ-077 — Security summary

## Surface review

REQ-077 introduces:

1. A new `IncidentEventService.listWithLinkedOrders()` method that augments the existing `list()` server-side projection with an Order snapshot for incidents whose `entityId` is a valid ObjectId.
2. Two new client components — `<IncidentRow>` (expand/collapse state, URL-hash sync) and `<IncidentDetailsPanel>` (errorDetails JSON renderer + Order snapshot + statusHistory + retry button passthrough).
3. A URL hash mechanism (`#open=<id1>,<id2>`) that drives initial expansion state on page mount.

The existing access gate (`requireRole(['csr','admin','super-admin'])` + `incidentsAccess` permission) is unchanged.

## STRIDE pass

| Threat                                      | Surface                                                                                                              | Status                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**                                | Non-staff accessing the incidents page                                                                               | Page-level `requireRole` + `incidentsAccess` gate is unchanged from REQ-066. No new auth surface in REQ-077.                                                                                                                                                                                                                                |
| **Tampering — UI bypass**                   | Operator modifies the React client state to "expand" a row that the server didn't render                             | Server-rendered HTML enumerates rows from `listWithLinkedOrders`; client expansion is purely cosmetic — it can only reveal panels the server already sent. There is no client-driven fetch path that could expose un-rendered rows.                                                                                                         |
| **Tampering — XSS via URL hash**            | An attacker crafts a URL with hash containing `<script>` or other injection payload, distributes the URL to an admin | **R-004 mitigation.** `parseExpandedFromHash` validates each comma-separated segment against `/^[a-f0-9]+$/` and silently discards non-matching. Validated IDs drive `useState(initial)` ONLY — never `dangerouslySetInnerHTML`, never `eval`, never any DOM-string-injection sink. Pinned by 10 unit-test cases + 1 e2e negative case.     |
| **Repudiation**                             | Admin retry-now click leaves no audit trail                                                                          | `<IncidentRetryButton>` is the existing REQ-066 AC10 component reused unchanged; its action `retryInventoryDeductionAction` writes the existing `incidents.retry_deduction_succeeded` / `incidents.retry_deduction_failed` audit-log entries. REQ-077 does not change this trail.                                                           |
| **Information disclosure**                  | `errorDetails` JSON contains an admin identifier (e.g. `actorUserId`) that leaks beyond intended audience            | The data is already in DB + read by the page server-side under the existing `incidentsAccess` gate. REQ-077 surfaces it to the same audience that already had access via the row's `summary`. No fan-out to customers / unauthenticated routes.                                                                                             |
| **Information disclosure — Order snapshot** | Linked-Order projection (`status`, `paymentStatus`, `total`, `items`) crosses an audit boundary                      | Same audience — admins viewing the incidents page. The Order projection is a SUBSET of what the existing `/dashboard/orders/{id}` page (also admin-gated) shows. No new disclosure class.                                                                                                                                                   |
| **Denial of service**                       | Server response size bloats with large `errorDetails` payloads × 200 rows                                            | Existing 200-row cap from REQ-066 preserved. `errorDetails` is currently `{ message, actorUserId, actorRole }` — small. Order projection is fixed-field. Worst-case response stays well within Next.js's typical RSC envelope.                                                                                                              |
| **Cascading regression**                    | Re-rendering `<IncidentRetryButton>` inside a new container breaks the existing remediation path                     | **R-003 mitigation.** The button is imported and rendered unchanged — same component, same `orderId` prop. Unit test pins the conditional "Retry visible when `inventoryDeducted:false`" branch via the new service join. E2E (R-003 case) pins button reachability + enabled state inside the expansion. Critical-tier gate on PR-to-main. |
| **Elevation of privilege**                  | URL-hash giving access to operations the user isn't authorised for                                                   | Hash drives display state only; it cannot reach any server endpoint, mutate any DB row, or call any action. Inert by design.                                                                                                                                                                                                                |

## Secrets / credentials

N/A — no new secrets handled, stored, or exposed.

## Dependencies introduced

None. Pretty-printing uses native `JSON.stringify(value, null, 2)` rendered inside `<pre>`. No new npm packages.

## SAST + Dependency-audit

Inherits the develop-tip CI Pipeline gate. No new dependency advisories; no new SAST findings on the REQ-077 surface (see CI run [27322979496](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27322979496) — Quality Gates → success).

## Risk register cross-reference

- **R-003** — IncidentRetryButton remediation regression when relocated into expansion container (residual low × high)
- **R-004** — URL-hash-driven expansion state: fidelity + injection-surface defence (residual low × low)

Full canonical entries: [`compliance/risk-register.md`](../../risk-register.md). Per-REQ summary + framework cross-references: [`risk-assessment.md`](./risk-assessment.md).
