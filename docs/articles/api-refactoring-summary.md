# Refactoring Wawa Cafe's API for AI Agents — 2-Minute Read

**Date:** March 2026 | [Read the full article →](./api-refactoring-for-ai-agents.md)

---

## The Problem

Wawa Cafe had a solid public API — 18 route files serving menu browsing, order placement, payments, and customer management. It worked well for the web frontend. But when we tried to wire it into an **AI agent** for automated reporting, inventory management, and operations, the gaps became clear:

- **No analytics endpoints.** To answer "What was this week's revenue?", an agent had to paginate through every order and compute totals client-side.
- **No tab management.** Dine-in tabs were only accessible through the frontend's server actions — invisible to external systems.
- **No period presets.** Agents had to compute "last quarter" date ranges themselves, a common source of bugs.
- **No customer creation.** Registration was locked inside the auth flow.

## What We Built

We extended the API from **~35 to ~47 endpoints** across four phases, with zero breaking changes:

**Phase 1 — Infrastructure:** A shared date-period utility supporting 14 presets (`today`, `this-week`, `last-quarter`, `last-30-days`, `custom`, etc.) and new `tabs:read`/`tabs:write` API key scopes.

**Phase 2 — Summary endpoints** that answer business questions in a single call:

| Endpoint | Answers |
|---|---|
| `GET /sales/summary` | Revenue, COGS, profit margins, top items, daily series |
| `GET /inventory/summary` | Stock position, restock needs, category breakdown |
| `GET /orders/summary` | Order volume, peak hours, type/status/payment splits |
| `GET /tabs/summary` | Tab performance, table utilisation, daily activity |
| `GET /customers/summary` | Growth trends, top spenders, loyalty stats |

**Phase 3 — Full tab lifecycle** (list, create, get, update, close, delete) and customer creation via the API.

**Phase 4 — Agent-ready documentation:** OpenAI function-calling schemas, an MCP server skeleton, recommended multi-step agent flows, and a quick-reference card mapping natural language questions to tools.

## Key Decisions

- **Pre-aggregated responses** over raw data — agents get computed totals, not rows to process
- **Period presets** resolved server-side — no client date math, consistent boundaries
- **Single PATCH endpoint** for tab actions (close/rename/tip) — fewer tools for agents to choose from
- **Scope-based access** maps naturally to agent roles (reporting agent vs operations agent)

## The Numbers

| Metric | Before | After |
|---|---|---|
| Route files | 18 | 27 |
| Endpoint methods | ~35 | ~47 |
| API key scopes | 12 | 14 |
| Summary endpoints | 0 | 5 |
| Agent tool definitions | 0 | 25+ |
| Breaking changes | — | 0 |

## Biggest Takeaway

A CRUD API built for a web UI is not an agent-ready API. Agents need **pre-computed answers**, **named time periods**, and **structured tool definitions**. The investment in summary endpoints and machine-readable documentation transformed our API from a data access layer into an **analytics and operations platform** that autonomous systems can use effectively.

---

*For the full technical deep-dive — including architecture decisions, code examples, trade-offs, and the complete file manifest — read the [full article](./api-refactoring-for-ai-agents.md).*
