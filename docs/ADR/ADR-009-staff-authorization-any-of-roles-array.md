---
adr_id: 'ADR-009'
status: 'Accepted'
date: '2026-11-06'
authored_by: 'sdlc-implementer (AI-assisted)'
related_reqs: ['REQ-119']
supersedes: []
superseded_by: null
---

# ADR-009: Staff authorization is any-of over a `roles[]` list through one helper module, with `role` kept as a read-only fallback for one release

## Status

**Accepted** (operator approved the plan on 2026-11-06)

## Context

Staff accounts hold one `role` (`csr`, `admin`, `super-admin`). The WhatsApp programme (#953) needs a person to hold several roles (for example `csr` + `kitchen`), and needs two new roles, `kitchen` and `manager`, that later work targets (WA-11 refund approval, WA-12 staff alerts). The single role is read directly in 261 places across 74 files (`session.role === ...`, `[...].includes(session.role)`), in two duplicated helper modules (`lib/session.ts` and `lib/permissions.ts`), in `proxy.ts`, and in the dashboard navigation. Staff sessions are sealed 7-day cookies that carry a snapshot of the role. See REQ-119 and SRS items REQ-AUTHA-004 to REQ-AUTHA-007.

## Decision

1. Staff accounts and sessions carry `roles: StaffRole[]` (`csr`, `kitchen`, `manager`, `admin`, `super-admin`). Customers keep `role: 'customer'` and `roles: []`.
2. Every authorization check is an any-of check over the roles through one helper module (`lib/session.ts`: `getRoles`, `hasAnyRole`, `isStaff`, `isAdmin`, `isSuperAdmin`). `lib/permissions.ts` and `lib/auth-middleware.ts` delegate to it. No code outside that module compares `session.role`; a unit test fails the build if one does.
3. `isAdmin` keeps its meaning, "csr or above" (`csr`, `manager`, `admin`, `super-admin`), and excludes `kitchen`. `isStaff` means any staff role and gates only the dashboard entry. A `kitchen`-only member reaches only the routes and actions that list `kitchen` explicitly (least privilege).
4. The sweep is done in two steps: first a mechanical, list-for-list replacement that changes no one's access, then deliberate additions of `kitchen` and `manager` where the plan's defaults table says so.
5. `role` stays for one more release as the highest of `roles` and as the fallback: a session, user document or API record that has only `role` is read as `[role]`. The code is therefore correct before, during and after the data migration, and a rollback leaves `role` intact. A later release removes `role`.
6. Effective feature permissions are the union of each role's defaults (defined once in `lib/permissions.ts`) plus the user's existing per-user overrides.

## Consequences

- **Good:** one place to reason about authorization; deploy order and migration timing stop mattering; rollback is a plain revert; least privilege for the new roles; the guard test stops regression to direct comparisons.
- **Bad:** a very wide change (74 files) that must be reviewed carefully; `role` and `roles` coexist for a release, so two fields describe one fact; a role change does not reach an already-signed-in member until the 7-day cookie expires (risk to be recorded; follow-up option is a session version check).
- **Neutral / tradeoffs:** `role` enum grows (`kitchen`, `manager`) only so the fallback value is valid; old code that sees those values denies access, which fails closed.

## Alternatives considered

- **Alternative 1: keep one `role` and add boolean flags per capability.** Ruled out: it spreads the same problem over more fields and does not give `kitchen` and `manager` as targets for alert rules and refund approval.
- **Alternative 2: replace `role` by `roles` at once, with the migration as a hard prerequisite.** Ruled out: it forces an ordered deploy and migration and makes rollback unsafe.
- **Alternative 3: treat `kitchen` and `manager` as members of `isAdmin`.** Ruled out: it silently widens access for a new low-privilege role on every call site that uses `isAdmin`.
- **Alternative 4: re-read the user's roles from the database on every guarded request (fixes stale sessions).** Not chosen for this release because of the per-request cost and wider change; recorded as an option for follow-up.

## Cross-references

- Implementation plan: `compliance/plans/REQ-119/implementation-plan.md`
- SRS items: REQ-AUTHA-004 (updated), REQ-AUTHA-005, REQ-AUTHA-006, REQ-AUTHA-007 (new), REQ-SETTINGS-002 (updated)
- Risk register: to be linked by `risk-register-keeper` (role-check sweep, stale sessions, staff-role migration, role-grant escalation)
- Related ADRs: ADR-008 (customer session lifetime; staff sessions unchanged)
- Supersedes / superseded-by: none
