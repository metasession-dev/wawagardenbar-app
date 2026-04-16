# Wawa Garden Bar — CLAUDE.md

## Repository Overview

Wawa Garden Bar is a Next.js web application for a restaurant/bar with online ordering, menu management, admin dashboard, and loyalty rewards. Stack: Next.js (App Router), TypeScript, MongoDB, TailwindCSS, Socket.IO.

## Build & Run Commands

```bash
npm install              # Install dependencies
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Vitest unit tests
npx playwright test      # E2E tests (Playwright)
```

## Key Directories

```
app/                     # Next.js App Router pages + API routes
components/              # React components
lib/                     # Utilities, MongoDB client
models/                  # Mongoose models
services/                # Business logic
interfaces/              # TypeScript interfaces
e2e/                     # Playwright E2E tests
compliance/              # RTM, evidence, release tickets
SDLC/                    # SDLC workflow templates
```

## Project Standards

All project rules, architectural standards, and development workflows are consolidated in:
👉 **[INSTRUCTIONS.md](./INSTRUCTIONS.md)**

Please refer to `INSTRUCTIONS.md` as the **Single Source of Truth** for:

- Tech Stack & Architecture
- Code Style & Formatting
- Security & Compliance
- SDLC Development Process & Quality Gates
