---
description: Merge develop branch to main and push to origin for production deployment via Railway
---

# Deploy to Main

Merges the `develop` branch into `main`, pushes to origin (triggering Railway auto-deploy), and syncs `develop` with `main`.

**Prerequisites:** All changes committed on `develop`. Tests already passed.

## Steps

1. Verify clean working tree (no uncommitted changes)

```bash
git status --porcelain
```

If output is not empty, **abort** and tell the user to commit or stash changes first.

2. Ensure we are on the `develop` branch

```bash
git branch --show-current
```

If not on `develop`, checkout `develop`:

```bash
git checkout develop
```

// turbo
3. Checkout `main` branch

```bash
git checkout main
```

// turbo
4. Pull latest `origin/main`

```bash
git pull origin main
```

// turbo
5. Merge `develop` into `main` with a no-ff merge

```bash
git merge develop --no-ff -m "chore: merge develop to main for production deployment"
```

If there are merge conflicts, **abort** and tell the user to resolve them manually.

6. Push `main` to origin (triggers Railway auto-deploy)

```bash
git push origin main
```

// turbo
7. Checkout `develop` branch

```bash
git checkout develop
```

// turbo
8. Merge `main` back into `develop` to keep branches in sync

```bash
git merge main
```

// turbo
9. Push `develop` to origin

```bash
git push origin develop
```

10. Verify deployment health

```bash
curl -s https://wawagardenbar-app-production.up.railway.app/api/health
```

Report the health status and deployment summary to the user.
