<!-- SDLC source: META-COMPLY/sdlc/ai-rules/README.md -->
<!-- SDLC version: sdlc-v1.0.0 -->
<!-- Last synced: 2026-03-25 -->

# SDLC AI Rules

Drop-in instruction files that enforce the Metasession SDLC compliance process through AI coding assistants. When added to a project, the AI assistant will guide developers through the SDLC workflow on every code change.

## What These Rules Do

- **Ask which GitHub Issue a change is for** before writing any code
- **Create issues when needed** via `gh issue create`
- **Guide requirement planning** (RTM entry with issue reference, risk classification, test scope)
- **Enforce commit conventions** (Ref: REQ-XXX, Co-Authored-By tags)
- **Run compliance gates** before pushing (TypeScript, SAST, dependencies, E2E)
- **Compile evidence** after implementation (security summary, release ticket)
- **Block anti-patterns** (pushing to main, skipping hooks, committing secrets)

## Setup

### Claude Code

Paste the contents of `claude/CLAUDE.md` into your project's `CLAUDE.md` file under a new section.

```bash
# From your project root
cat path/to/META-COMPLY/sdlc/ai-rules/claude/CLAUDE.md >> CLAUDE.md
```

### Windsurf

Copy the `.windsurfrules` file into your project root.

```bash
cp path/to/META-COMPLY/sdlc/ai-rules/windsurf/.windsurfrules .windsurfrules
```

### Cursor

Copy the `.windsurfrules` content into `.cursorrules` in your project root.

```bash
cp path/to/META-COMPLY/sdlc/ai-rules/windsurf/.windsurfrules .cursorrules
```

## Reference

The full SDLC rules with detailed explanations are in `SDLC_RULES.md`. The tool-specific files are condensed versions optimised for token efficiency while preserving all enforcement behaviour.

## Prerequisites

Projects using these rules must have:

1. **GitHub CLI (`gh`) installed and authenticated** — used to fetch and create issues:
   ```bash
   gh auth status   # verify you're logged in
   ```
2. **SDLC workflow files copied into the project** as `SDLC/` — the AI rules reference these files for detailed steps, templates, and checklists:
   ```bash
   cp -r path/to/META-COMPLY/sdlc/files/ SDLC/
   ```
3. A `compliance/` directory with `RTM.md` (Part B must include the `Issue` column)
4. A `compliance/evidence/` directory
5. A `compliance/pending-releases/` directory
6. A permanent `develop` branch with protected `main`

Use `SDLC/0-project-setup.md` to initialise items 2-5 in a new project.

The AI rules act as guardrails and summaries. The `SDLC/` workflow files contain the full detailed procedures. The AI assistant will read the relevant workflow file at each stage.
