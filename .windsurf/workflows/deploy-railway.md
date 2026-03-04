---
description: Deploy code changes and database schema changes to Railway
---

# Deploy to Railway

This workflow deploys both code changes and database schema changes to Railway in a coordinated sequence. It handles migrations, builds, and verification automatically.

## Prerequisites

- Railway CLI installed (`npm i -g @railway/cli`)
- Logged in to Railway (`railway login`)
- Project linked to Railway (`railway status` should show "Wawa Garden Bar")
- Clean working directory on `develop` branch
- All changes committed and tested

## Git Branching Strategy

**Branch Structure:**
- `develop` - Active development branch (where you work)
- `main` - Production-ready branch (what Railway deploys)
- Feature branches - Temporary branches for specific features

**Deployment Flow:**
```
develop (tested changes) → main (production) → Railway (deployed)
```

**Important Rules:**
1. ✅ All development happens on `develop` branch
2. ✅ Only merge to `main` when ready for production deployment
3. ✅ Railway automatically deploys from `main` branch
4. ✅ Never commit directly to `main` - always merge from `develop`
5. ✅ Use `/commit-push-reset-develop` workflow for feature integration

## Context

**Railway Setup:**
- Project: `Wawa Garden Bar`
- Environment: `production`
- Service: `wawagardenbar-app`
- MongoDB: Private network at `mongodb.railway.internal:27017`
- MongoDB Public URL: Available via `hopper.proxy.rlwy.net:36031` (check `railway variables --json | grep MONGO_PUBLIC_URL`)
- App URL: `https://wawagardenbar-app-production.up.railway.app`
- **Deployment Branch:** `main` (Railway watches this branch)

**Important Notes:**
- MongoDB is on Railway's private network — migrations must use the **public proxy URL** when run from local machine
- The app uses `MONGODB_URI` or `MONGODB_WAWAGARDENBAR_APP_URI` environment variables
- Database name is stored in `MONGODB_DB_NAME` (typically `wawagardenbar`)
- Deployment uses multi-stage Dockerfile (takes 3-5 minutes to build)
- Railway auto-deploys when `main` branch is pushed

## Step 0: Pre-Deployment Checklist

**Before starting deployment:**

- [ ] Currently on `develop` branch
- [ ] All changes committed to `develop`
- [ ] Changes pushed to `origin/develop`
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] All tests passing (if applicable)
- [ ] Compliance artifacts complete (if using `/audit-finish`)
- [ ] Human sign-off obtained (if required)

**Verify current state:**
```bash
git status                    # Should show clean working tree
git branch --show-current     # Should show "develop"
npm run build                 # Should compile successfully
```

## Step 1: Identify Changes to Deploy

### 1.1 Review Code Changes

Check what has changed since last deployment:

```bash
git status
git diff origin/main  # or your deployment branch
```

### 1.2 Identify Database Schema Changes

**Check these files for changes:**
- `/models/*.ts` — Mongoose model definitions
- `/interfaces/*.ts` — TypeScript interfaces with schema definitions
- `/constants/api-key-scopes.ts` — API key scope definitions

**Common migration scenarios:**
- ✅ New fields added to Mongoose models
- ✅ New enum values added to model schemas (e.g., API key scopes, order statuses)
- ✅ New indexes or constraints
- ✅ Data transformations required
- ✅ Field renames or type changes
- ✅ New collections/models

### 1.3 Determine Migration Strategy

**If schema changes exist:**
- Proceed to Step 2 (create/run migration)
- Then Step 3 (deploy code)

**If only code changes:**
- Skip to Step 3 (deploy code directly)

**If both code and schema changes:**
- Follow full workflow (Steps 2 → 3 → 4)

## Step 2: Handle Database Schema Changes

### 2.1 Get MongoDB Public URL

Switch to MongoDB service and get the public connection URL:

```bash
railway service MongoDB
railway variables --json | grep MONGO_PUBLIC_URL
```

Copy the MongoDB public URL (format: `mongodb://mongo:PASSWORD@hopper.proxy.rlwy.net:PORT`)

**Example output:**
```
"MONGO_PUBLIC_URL": "mongodb://mongo:pAayMfhDRedaLuehgYWWfJGjhNjJAwMI@hopper.proxy.rlwy.net:36031"
```

### 2.2 Create or Update Migration Script

Migration scripts go in `/scripts/` and must follow this pattern:

```typescript
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local (or .env as fallback)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env or .env.local file found — relying on process env vars');
}

import { connectDB, disconnectFromDatabase } from '../lib/mongodb';
import YourModel from '../models/your-model';

async function migrateYourFeature(): Promise<void> {
  console.log('🔄 Starting migration...\n');
  
  await connectDB();
  
  // Your migration logic here
  
  await disconnectFromDatabase();
}

migrateYourFeature().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
```

**Critical:** The dotenv loading block MUST come before any imports that need MongoDB connection.

### 2.3 Run Migration Against Railway Database

Execute the migration script with the Railway MongoDB public URL:

```bash
MONGODB_URI="<PASTE_PUBLIC_URL_HERE>" MONGODB_DB_NAME="wawagardenbar" npx tsx scripts/your-migration-script.ts
```

**Example:**
```bash
MONGODB_URI="mongodb://mongo:pAayMfhDRedaLuehgYWWfJGjhNjJAwMI@hopper.proxy.rlwy.net:36031" MONGODB_DB_NAME="wawagardenbar" npx tsx scripts/migrate-api-key-scopes.ts
```

**Expected output:**
```
🔑 Starting API key scope migration...
   Found 1 active API key(s)
   ✅ Updated key "metaagent" (wawa_112941ca...)
      Before: [menu:read, orders:write, ...]
      After:  [menu:read, orders:write, ..., tabs:read, tabs:write]
🏁 Migration complete. Updated 1 of 1 key(s).
```

**Verify:**
- Migration script exits with code 0 (success)
- Output shows expected number of records updated
- No error messages in output

**If migration fails:**
- Check MongoDB URL is correct
- Verify `MONGODB_DB_NAME` matches your database
- Check script logic and model imports
- Review error message for specific issue

### 2.4 Switch Back to App Service

```bash
railway service wawagardenbar-app
```

## Step 3: Merge develop to main and Deploy to Railway

### 3.1 Merge develop branch to main

**Important:** Railway deploys from the `main` branch. You must merge your tested changes from `develop` to `main`.

// turbo
```bash
# Switch to main branch
git checkout main

# Pull latest main to ensure you're up to date
git pull origin main

# Merge develop into main
git merge develop --no-ff -m "chore: merge develop to main for production deployment"

# Push to main (triggers Railway auto-deploy)
git push origin main
```

**Expected output:**
```
Switched to branch 'main'
Already up to date.
Merge made by the 'recursive' strategy.
 models/order-model.ts | 5 ++++-
 interfaces/order.interface.ts | 2 +-
 compliance/RTM.md | 150 ++++++++++++++++
 ...
Enumerating objects: 10, done.
To https://github.com/ostendo-io/wawagardenbar-app.git
   b3b88fe..3783594  main -> main
```

**What happens next:**
- Railway detects the push to `main`
- Automatically triggers a new deployment
- Builds Docker image using multi-stage Dockerfile
- Deploys new container when build completes

### 3.2 Return to develop branch

After merging to main, switch back to develop for continued work:

```bash
# Switch back to develop
git checkout develop

# Pull latest develop
git pull origin develop

# Merge main back into develop to keep them in sync
git merge main

# Push updated develop
git push origin develop
```

### 3.3 Verify Railway Configuration

Check that `railway.toml` exists with correct settings:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node_modules/.bin/tsx server.ts"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

If this file doesn't exist, it will be created automatically by the workflow.

### 3.4 Monitor Railway Deployment

**Railway will automatically deploy when you push to `main`.**

You can monitor the deployment progress:

```bash
# View deployment logs
railway logs

# Or watch deployment status in Railway dashboard
# https://railway.app/project/wawagardenbar-app
```

**Deployment Process:**
1. Railway detects push to `main` branch
2. Triggers multi-stage Docker build:
   - **deps stage:** Install all dependencies
   - **builder stage:** Build Next.js app
   - **prod-deps stage:** Install production-only dependencies
   - **runner stage:** Create final production image
3. Runs health check on new container
4. Auto-swaps to new container when healthy (zero-downtime deployment)

**Expected output:**
```
Indexed
Compressed [====================] 100%
Uploaded
Build Logs: https://railway.com/project/fecdbfec-b09f-4d9f-a206-2527954d6b94/service/...
```

**Build time:** 3-5 minutes (first build), 2-3 minutes (cached builds)

### 3.5 Monitor Build Progress

The build takes 3-5 minutes. You can:

**Option A: Watch logs in real-time**
```bash
railway logs
```

**Option B: Check build logs in browser**
Click the build logs URL from the `railway up` output.

**What to look for:**
- ✅ `#1 [internal] load build definition from Dockerfile`
- ✅ `#2 [internal] load metadata for docker.io/library/node:20-alpine`
- ✅ `[deps 1/4] FROM docker.io/library/node:20-alpine`
- ✅ `[builder 2/3] RUN npm run build`
- ✅ `✓ Creating an optimized production build`
- ✅ `✓ Compiled successfully`
- ✅ `[runner 5/6] RUN mkdir -p /app/public/uploads/menu-items`
- ✅ Build complete, pushing image

**If build fails:**
- Check Dockerfile syntax
- Review TypeScript compilation errors
- Verify all dependencies in package.json
- Check build logs for specific error

### 3.6 Wait for Container Deployment

After build completes, Railway automatically deploys the new container. Wait 30-60 seconds for:
1. Old container health check to pass
2. New container to start
3. New container health check to pass
4. Traffic to switch to new container

### 3.7 Verify Deployment

Wait for the new container to start (look for "Starting Container" in logs), then:

```bash
# Check recent logs
railway logs -n 20

# Verify health endpoint
curl -s https://wawagardenbar-app-production.up.railway.app/api/health
```

**Expected healthy response:**
```json
{"status":"healthy","timestamp":"2026-03-04T16:16:49.123Z","uptime":...}
```

**Expected log output:**
```
Starting Container
Initializing new Socket.IO server instance...
✅ Socket.IO server initialized successfully
   Path: /api/socket
   CORS origin: https://wawagardenbar-app-production.up.railway.app
> Server listening at http://0.0.0.0:8080 as production
```

## Step 4: Post-Deployment Verification

### 4.1 Test Critical Endpoints

```bash
# Health check
curl https://wawagardenbar-app-production.up.railway.app/api/health

# Public menu (no auth required)
curl https://wawagardenbar-app-production.up.railway.app/api/public/menu

# Test new API features (requires API key)
curl -H "x-api-key: YOUR_API_KEY" \
  https://wawagardenbar-app-production.up.railway.app/api/public/sales/summary?period=today
```

### 4.2 Check for Errors

```bash
railway logs -n 50
```

Look for:
- ❌ Validation errors
- ❌ MongoDB connection failures
- ❌ Missing environment variables
- ✅ Successful Socket.IO initialization
- ✅ Server listening message

### 4.3 Test in Browser

Visit the production URL and verify:
- [ ] Homepage loads
- [ ] Menu page displays items
- [ ] Login works
- [ ] Dashboard accessible (for admin users)
- [ ] Order placement flow works

## Troubleshooting

### Build Fails

**Check:**
- Dockerfile syntax
- TypeScript compilation errors (`npm run build` locally)
- Missing dependencies in `package.json`

**View detailed build logs:**
```bash
railway logs --deployment <deployment-id>
```

### Container Won't Start

**Common causes:**
- Missing environment variables
- MongoDB connection failure
- Port binding issues

**Debug:**
```bash
railway logs -n 100
railway variables  # Check all env vars are set
```

### Old Code Still Running

Railway caches builds. If you see old behavior:

1. Check deployment ID in logs URL
2. Verify new build completed (check Railway dashboard)
3. Wait 1-2 minutes for container swap
4. Force restart: `railway restart`

### Migration Errors

**"getaddrinfo ENOTFOUND mongodb.railway.internal"**
- You're trying to connect to the private network from outside Railway
- Use the public MongoDB URL from `railway variables --json | grep MONGO_PUBLIC_URL`

**"ApiKey validation failed: scopes.X is not a valid enum value"**
- Migration ran before new code deployed
- This is temporary — wait for new build to complete
- The new code has the updated enum and will accept the new scopes

## Complete Deployment Sequence (Copy-Paste Ready)

### For Code + Schema Changes:

```bash
# 1. Check what's changed
git status
git diff origin/main

# 2. Get MongoDB public URL
railway service MongoDB
railway variables --json | grep MONGO_PUBLIC_URL
# Copy the URL from output

# 3. Run migration (replace URL and script name)
MONGODB_URI="mongodb://mongo:PASSWORD@hopper.proxy.rlwy.net:PORT" \
  MONGODB_DB_NAME="wawagardenbar" \
  npx tsx scripts/your-migration-script.ts

# 4. Switch back to app service
railway service wawagardenbar-app

# 5. Verify TypeScript compiles
npm run build

# 6. Commit changes (if not done)
git add .
git commit -m "feat: your feature description"
git push origin main

# 7. Deploy to Railway
railway up --detach

# 8. Monitor deployment
railway logs

# 9. Verify health
curl -s https://wawagardenbar-app-production.up.railway.app/api/health
```

### For Code-Only Changes:

```bash
# 1. Verify TypeScript compiles
npm run build

# 2. Commit and push
git add .
git commit -m "feat: your feature description"
git push origin main

# 3. Deploy
railway up --detach

# 4. Monitor and verify
railway logs
curl -s https://wawagardenbar-app-production.up.railway.app/api/health
```

## Quick Reference Commands

```bash
# Check Railway status
railway status

# Get MongoDB public URL
railway service MongoDB && railway variables --json | grep MONGO_PUBLIC_URL

# Switch to app service
railway service wawagardenbar-app

# Run migration template
MONGODB_URI="mongodb://..." MONGODB_DB_NAME="wawagardenbar" npx tsx scripts/your-migration.ts

# Deploy
railway up --detach

# Watch logs (real-time)
railway logs

# Check recent logs
railway logs -n 50

# Check health endpoint
curl https://wawagardenbar-app-production.up.railway.app/api/health

# Restart container (without rebuild)
railway restart

# View all environment variables
railway variables

# Open Railway dashboard
railway open
```

## Notes

- **Migration timing:** Always run migrations BEFORE deploying new code if the migration adds data. Run AFTER if the migration removes fields (to avoid breaking the old running code).
- **Zero-downtime:** Railway swaps containers automatically. Brief overlap may occur where old code sees new DB schema (hence the temporary validation errors).
- **Rollback:** Railway keeps previous deployments. Use the dashboard to rollback if needed.
- **Environment variables:** Changes to env vars require a restart (`railway restart`) but not a full redeploy.
