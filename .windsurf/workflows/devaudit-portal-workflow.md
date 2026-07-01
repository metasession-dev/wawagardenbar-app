---
description: Branching and merging strategy for the DevAudit Portal repository (META-COMPLY)
---

# DevAudit Portal Workflow

**Repository:** `metasession-dev/devaudit` (formerly `META-COMPLY`)
**Role:** Self-hosted compliance evidence portal — Next.js application on Railway
**Branching model:** GitFlow

## Branch Roles

| Branch      | Purpose                                       | Direct push?                |
| ----------- | --------------------------------------------- | --------------------------- |
| `main`      | Production release branch. Deployed to prod.  | **No** — PR only            |
| `develop`   | Integration branch. Features accumulate here. | **No** — PR only            |
| `feature/*` | Feature work, branched from `develop`         | Yes (to the feature branch) |
| `fix/*`     | Bug fixes, branched from `develop`            | Yes (to the fix branch)     |
| `hotfix/*`  | Urgent prod fixes, branched from `main`       | Yes (to the hotfix branch)  |

## Branch Naming

- **Feature:** `feature/<issue#>-<short-slug>` (e.g. `feature/535-test-cycles-portal`)
- **Fix:** `fix/<issue#>-<short-slug>`
- **Hotfix:** `hotfix/<issue#>-<short-slug>`

## Developing a Feature or Fix

1. Branch from `develop`:
   ```bash
   git checkout develop && git pull
   git checkout -b feature/<issue#>-<short-slug>
   ```
2. Implement the change, committing with Conventional Commits
3. Merge the feature branch into `develop`:
   ```bash
   git checkout develop
   git merge --no-ff feature/<issue#>-<short-slug>
   git push origin develop
   ```
4. CI must pass on `develop`

## Shipping a Release

1. Merge `develop` → `main`:
   ```bash
   git checkout main
   git merge --no-ff develop
   git push origin main
   ```
2. CI must pass on `develop` before merging to `main`
3. Railway auto-deploys from `main`

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
4. After merge, sync `main` back into `develop`

## Commit Conventions

- **Conventional Commits** for all messages, referencing the GitHub issue number
- Include `Co-Authored-By:` for AI-assisted commits
- PR titles in Conventional Commits format (e.g. `feat: add AGENT.md (#156, refs #155)`)

## Compliance Gating

- **None** — the portal is explicitly NOT an SDLC consumer
- Per the self-release policy: "The portal does not gate its own releases through itself; CI green is the merge bar"
- No REQ-XXX tracking, no portal approval, no UAT verification required
- The SDLC framework that gates other consumers lives in DevAudit-Installer

## Quality Gates (CI)

| Check              | Command                        | Threshold                             |
| ------------------ | ------------------------------ | ------------------------------------- |
| TypeScript compile | `npx tsc --noEmit`             | 0 errors                              |
| Lint               | `npm run lint`                 | 0 errors, 0 warnings on changed files |
| Format             | `npx prettier --check .`       | clean                                 |
| Unit tests         | `npx vitest run`               | all pass; new logic covered           |
| E2E tests          | `npx playwright test`          | all green on changed routes           |
| SAST               | `semgrep scan --config auto`   | 0 high/critical                       |
| Dep audit          | `npm audit --audit-level=high` | 0 high/critical                       |

## Key Rules

- Never commit directly to `main` or `develop` — always use a feature/fix/hotfix branch
- Never use squash or rebase merges — `--no-ff` merge commits only
- CI must pass on `develop` before merging to `main`
- Branch protection enforced on both `main` and `develop` via GitHub rules
- AI agents must follow this workflow as documented in `AGENT.md`
