---
description: Railway-specific deployment reference — infrastructure details, migrations, and troubleshooting
---

# Railway Deployment Reference

**Supplements:** `deploy-main.md` (the primary deployment workflow)

This document contains Railway-specific infrastructure details, migration procedures, and troubleshooting steps. It is NOT a standalone workflow — use `deploy-main.md` for the deployment process.

---

## Railway Configuration

| Setting | Value |
|---------|-------|
| Project | Wawa Garden Bar |
| Environment | production |
| Service | wawagardenbar-app |
| Deploy Branch | `main` (auto-deploy on push) |
| App URL | `https://wawagardenbar-app-production.up.railway.app` |
| Health Endpoint | `/api/health` |
| MongoDB | Private network: `mongodb.railway.internal:27017` |
| MongoDB (external) | `hopper.proxy.rlwy.net:PORT` (for migrations from local) |
| Build | Multi-stage Dockerfile, 3-5 min |
| Runtime | `node_modules/.bin/tsx server.ts` |

### railway.toml

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

---

## Database Migrations

### When to Run Migrations

- **Before merge:** If migration adds data or indexes the new code expects
- **After merge:** If migration removes fields the old code still references
- **Rule:** Never break the currently running production code

### Migration Procedure

```bash
# 1. Get MongoDB public URL
railway service MongoDB
railway variables --json | grep MONGO_PUBLIC_URL

# 2. Run migration with public URL
MONGODB_URI="mongodb://mongo:PASSWORD@hopper.proxy.rlwy.net:PORT" \
  MONGODB_DB_NAME="wawagardenbar" \
  npx tsx scripts/your-migration-script.ts

# 3. Switch back to app service
railway service wawagardenbar-app
```

### Migration Script Template

```typescript
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

import { connectDB, disconnectFromDatabase } from '../lib/mongodb';

async function migrate(): Promise<void> {
  console.log('Starting migration...');
  await connectDB();

  // Migration logic here

  await disconnectFromDatabase();
  console.log('Migration complete.');
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

**Critical:** The `dotenv` loading block MUST come before any imports that need MongoDB.

---

## Monitoring

```bash
# Real-time logs
railway logs

# Recent logs
railway logs -n 50

# Health check
curl -s https://wawagardenbar-app-production.up.railway.app/api/health

# Environment variables
railway variables

# Restart without rebuild
railway restart

# Open Railway dashboard
railway open
```

### Healthy Startup Logs

```
Starting Container
Initializing new Socket.IO server instance...
Socket.IO server initialized successfully
   Path: /api/socket
   CORS origin: https://wawagardenbar-app-production.up.railway.app
> Server listening at http://0.0.0.0:8080 as production
MongoDB connection established
```

---

## Troubleshooting

### Build Fails

```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Common causes: missing dependencies, type errors, import issues
```

### Container Won't Start

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `MongooseServerSelectionError` | MongoDB connection failed | Check `MONGODB_URI` env var |
| `EADDRINUSE` | Port conflict | Railway assigns port — don't hardcode |
| Missing module | Dependency not in production deps | Move from devDependencies to dependencies |

### Old Code Still Running

Railway caches builds. If you see old behavior:

1. Check deployment ID in Railway dashboard
2. Verify new build completed
3. Wait 1-2 minutes for container swap
4. Force restart: `railway restart`

### Migration Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `getaddrinfo ENOTFOUND mongodb.railway.internal` | Using private URL from outside Railway | Use the public MongoDB URL |
| `Validation failed: not a valid enum` | Migration ran before new code deployed | Wait for deployment to complete |

---

## Quick Reference Commands

```bash
railway status                    # Check project/service status
railway service MongoDB           # Switch to MongoDB service
railway service wawagardenbar-app # Switch to app service
railway variables                 # List all env vars
railway logs                      # Stream logs
railway logs -n 50                # Recent 50 lines
railway restart                   # Restart without rebuild
railway open                      # Open dashboard in browser
```
