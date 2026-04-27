# REQ-030 — Security Summary

**Date:** 2026-04-24
**Risk:** HIGH (MEDIUM baseline + AI-involvement +1)

## Threat model

This feature extends the order fulfilment / inventory deduction path to read
`inventoryId` from stored customization options. Two untrusted surfaces:

1. **Admin update form** (`updateMenuItemAction`) — customizations JSON is
   received from the client and persisted to the menu document, so the field
   can be tampered with by anyone with super-admin session cookies.
2. **Stored option data** — the server trusts what is already in MongoDB at
   order-fulfilment time.

## Mitigations implemented

| Threat                                  | Mitigation                                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| NoSQL injection via `inventoryId`       | Zod schema requires 24-character hex string; rejected values never reach `InventoryModel.findById` |
| Arbitrary negative / NaN deduction      | `z.number().finite().positive()` — 0, negatives, NaN, ±Infinity rejected before persistence        |
| Extra/unexpected fields on option       | Zod `.object(...)` default is `.strip()` — only known keys are persisted                           |
| Empty-string inventoryId clutters docs  | `z.literal('').transform(() => undefined)` drops the field so JSON.stringify omits it              |
| Linked deduction exceeds stock          | `Math.max(0, currentStock - delta)` floor preserves existing behaviour                             |
| Missing linked inventory record crashes | `InventoryModel.findById` null-check silently skips the linked entry — base deduction proceeds     |
| Admin action bypass                     | Session check unchanged — only `admin` / `super-admin` roles permitted                             |

## SAST findings

Semgrep run on `app/ lib/ services/ models/` with ERROR + WARNING severities:

- **1 finding**, all in pre-existing `lib/cors.ts`
- **0 new findings attributable to REQ-030**
- Below CI baseline of 6

## Dependency audit

- 4 total vulnerabilities; 1 high-severity (`xlsx`), which is on the CI allowlist
- No new dependencies introduced by REQ-030

## AI involvement disclosure

Per `compliance/evidence/REQ-030/ai-use-note.md`, all planning, tests, code, and
evidence on this REQ were authored by Claude Code. Human code review is required
before merge to `main`; because baseline risk is MEDIUM + AI-involvement +1 =
HIGH, a second human reviewer is required per the AI Use Policy.
