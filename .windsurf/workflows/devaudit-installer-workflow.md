---
description: Branching and merging strategy for the DevAudit-Installer repository (SDLC framework provider)
---

# DevAudit-Installer Workflow

**Repository:** `metasession-dev/DevAudit-Installer`
**Role:** SDLC framework provider — owns the CLI, plugin SDK, first-party plugins, and SDLC templates that consumer projects sync
**Branching model:** GitFlow (pre-1.0)

## Branch Roles

| Branch      | Purpose                                        | Direct push?                |
| ----------- | ---------------------------------------------- | --------------------------- |
| `main`      | Production — stable, tagged framework versions | **No** — PR only            |
| `develop`   | Integration — active work merges here          | **No** — PR only            |
| `feature/*` | New work, branched from `develop`              | Yes (to the feature branch) |
| `fix/*`     | Bug fixes, branched from `develop`             | Yes (to the fix branch)     |
| `hotfix/*`  | Production hotfixes, branched from `main`      | Yes (to the hotfix branch)  |

## Branch Naming

- **Feature:** `feature/<issue#>-<short-slug>` (e.g. `feature/213-fix-terminology`)
- **Fix:** `fix/<issue#>-<short-slug>` (e.g. `fix/205-ci-gate-timeout`)
- **Hotfix:** `hotfix/<issue#>-<short-slug>` (e.g. `hotfix/301-prod-crash`)

## Developing a Feature or Fix

1. Branch from `develop`:
   ```bash
   git checkout develop && git pull
   git checkout -b feature/<issue#>-<short-slug>
   ```
2. Implement the change, committing with Conventional Commits
3. Open a PR into `develop`:
   ```bash
   gh pr create --base develop --head feature/<issue#>-<short-slug>
   ```
4. CI must pass on the PR before merging (Linux, macOS, Windows on node 22)
5. Merge into `develop` (merge commits to preserve audit trail)

## Shipping a Release

1. Open a PR from `develop` into `main`:
   ```bash
   gh pr create --base main --head develop
   ```
2. CI must pass on `develop` before merging to `main`
3. Merge `develop` → `main` (merge commits, not squash)
4. Tag the release:
   ```bash
   git tag sdlc-vX.Y.Z
   ```

## Hotfixing Production

1. Branch from `main`:
   ```bash
   git checkout main && git pull
   git checkout -b hotfix/<issue#>-<short-slug>
   ```
2. Implement the fix
3. Open a PR into `main`:
   ```bash
   gh pr create --base main --head hotfix/<issue#>-<short-slug>
   ```
4. After merge, sync `main` back into `develop`:
   ```bash
   git checkout develop
   git merge main --no-edit
   git push origin develop
   ```

## Commit Conventions

- **Conventional Commits** for all messages: `feat(cli): …`, `fix(sdlc): …`, `docs(sdlc): …`, `chore(docs): …`
- Reference the issue number in the commit body where relevant
- Include `Co-Authored-By:` for AI-assisted commits
- TypeScript strict mode — no `any`, no `as any`
- Tests before behaviour changes — every behaviour-changing PR adds or updates a vitest case

## Compliance Gating

- **None** — the installer is the SDLC framework provider, not a consumer
- CI green (all three OS targets) is the merge bar
- No REQ-XXX tracking, no portal approval, no UAT verification required

## Key Rules

- Never commit directly to `main` or `develop` — always use a feature/fix/hotfix branch
- Never use squash or rebase merges — merge commits only
- CI matrix (Linux, macOS, Windows) must be green on all three before merge
- One PR per logical change — split refactors from behaviour changes
- Pre-1.0 policy: external PRs not accepted without a prior issue conversation
