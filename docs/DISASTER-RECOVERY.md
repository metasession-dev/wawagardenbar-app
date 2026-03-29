# Disaster Recovery Plan — Wawa Garden Bar

**Document ID:** DR-WGBA-001
**Version:** 1.0
**Date:** 2026-03-29
**Classification:** Internal — Restricted
**Review Frequency:** Quarterly
**Next Review:** 2026-06-29

---

## Recovery Targets

| Scenario                     | RTO (Recovery Time) | RPO (Recovery Point)    |
| ---------------------------- | ------------------- | ----------------------- |
| Application down (Railway)   | 15 minutes          | 0 (stateless app)       |
| Bad deploy / code regression | 30 minutes          | 0 (git history)         |
| Database loss (MongoDB)      | 1 hour              | 24 hours (daily backup) |
| Secret compromise            | 1 hour              | N/A                     |
| Domain/DNS failure           | 4 hours             | N/A                     |
| Data corruption              | 2 hours             | Varies                  |

---

## Scenario 1: Application Down (Railway Service Failure)

### Detection

- Health check fails: `curl -s https://app.wawagardenbar.com/api/health`
- Expected response: `{"status":"healthy","timestamp":"...","uptime":...}`
- Railway dashboard shows service offline

### Recovery Steps

1. **Check Railway status**

   ```bash
   railway status
   railway deployment list | head -5
   ```

2. **Redeploy latest successful deployment**

   ```bash
   railway deployment redeploy --yes
   ```

3. **If Railway platform is down**, deploy from local:

   ```bash
   cd wawagardenbar-app
   railway up --detach
   ```

4. **Verify recovery**

   ```bash
   curl -s https://app.wawagardenbar.com/api/health
   # Wait for uptime > 30s to confirm stability
   ```

5. **If Railway is completely unavailable**, fallback to Docker:
   ```bash
   # Requires Docker host with MongoDB access
   cp .env.docker.example .env.docker
   # Edit .env.docker with production credentials
   docker build -t wawagardenbar-app .
   docker run -p 3000:3000 --env-file .env.docker wawagardenbar-app
   ```

### Escalation

- If not recovered in 15 minutes: check Railway status page (https://status.railway.app)
- If Railway outage > 1 hour: consider temporary Docker deployment

---

## Scenario 2: Bad Deploy (Code Breaks Production)

### Detection

- Post-deploy smoke tests fail (automated via `post-deploy-prod.yml`)
- Users report errors
- Health check returns errors or pages don't load

### Recovery Steps

1. **Identify the breaking commit**

   ```bash
   git log --oneline origin/main -5
   gh run list --branch main --limit 3
   ```

2. **Revert on main**

   ```bash
   git checkout main
   git pull origin main
   git revert HEAD --no-edit
   git push origin main
   # Railway auto-deploys from main
   ```

3. **If Railway auto-deploy doesn't trigger**

   ```bash
   railway deployment redeploy --yes
   ```

4. **If revert is complex (merge commit)**

   ```bash
   # Find the last known good deployment
   railway deployment list
   # Redeploy it (Railway redeploys the last successful build)
   railway deployment redeploy --yes
   ```

5. **Verify recovery**
   ```bash
   curl -s https://app.wawagardenbar.com/api/health
   curl -s -o /dev/null -w "%{http_code}" https://app.wawagardenbar.com/
   ```

### Prevention

- All changes go through develop → CI → UAT → PR → main
- CI gates: TypeScript, SAST, dependency audit, E2E tests, build check
- UAT verification required before merge

---

## Scenario 3: Database Loss (MongoDB)

### Detection

- Application logs: `MongooseServerSelectionError: connect ECONNREFUSED`
- Health check passes but pages show no data
- Railway MongoDB service shows unhealthy

### Recovery Steps

1. **Check MongoDB service status**

   ```bash
   railway service mongodb
   railway logs
   ```

2. **If MongoDB service is down, restart it**
   - Railway dashboard → MongoDB service → Restart

3. **If data is lost, restore from backup**

   ```bash
   # List available Railway backups
   # Railway dashboard → MongoDB → Backups tab

   # Restore from backup (via Railway dashboard)
   # Select the most recent backup → Restore

   # Alternative: restore from manual backup
   mongorestore --uri="$MONGODB_URI" --db=wawagardenbar_prod /path/to/backup/
   ```

4. **Verify data integrity**

   ```bash
   # Connect to MongoDB and check collections
   mongosh "$MONGODB_URI"
   > db.orders.countDocuments()
   > db.tabs.countDocuments()
   > db.menuitems.countDocuments()
   > db.users.countDocuments()
   ```

5. **Notify stakeholders** of any data loss window

### See Also

- `docs/BACKUP-STRATEGY.md` for backup schedule and procedures

---

## Scenario 4: Secret Compromise

### Secret Inventory

| Secret              | Env Var                  | Impact if Compromised           |
| ------------------- | ------------------------ | ------------------------------- |
| Session password    | `SESSION_PASSWORD`       | All user sessions can be forged |
| MongoDB URI         | `MONGODB_URI`            | Full database access            |
| Monnify API key     | `MONNIFY_API_KEY`        | Payment initiation              |
| Monnify secret      | `MONNIFY_SECRET_KEY`     | Payment verification            |
| SMTP password       | `SMTP_PASSWORD`          | Send emails as the business     |
| WhatsApp token      | `WHATSAPP_ACCESS_TOKEN`  | Send WhatsApp messages          |
| Africa's Talking    | `AT_API_KEY`             | Send SMS messages               |
| META-COMPLY keys    | `META_COMPLY_SUPABASE_*` | Compliance evidence access      |
| Internal API secret | `INTERNAL_API_SECRET`    | Internal API access             |

### Recovery Steps

1. **Identify which secret was compromised**

2. **Rotate the compromised secret immediately**

   ```bash
   # Generate new session password
   openssl rand -hex 32

   # Update in Railway
   railway variables set SESSION_PASSWORD=<new-value>

   # Force redeploy to pick up new value
   railway deployment redeploy --yes
   ```

3. **For SESSION_PASSWORD compromise:**
   - All existing user sessions become invalid (users must re-login)
   - This is expected and desired — it invalidates any forged sessions
   - No data loss

4. **For MONGODB_URI compromise:**
   - Change MongoDB password in Railway MongoDB service settings
   - Update `MONGODB_URI` env var with new password
   - Redeploy application
   - Audit database for unauthorized changes:
     ```bash
     # Check recent audit logs
     mongosh "$MONGODB_URI"
     > db.auditlogs.find().sort({createdAt: -1}).limit(20)
     ```

5. **For payment keys (Monnify) compromise:**
   - Log into Monnify dashboard → regenerate API keys
   - Update `MONNIFY_API_KEY` and `MONNIFY_SECRET_KEY` in Railway
   - Redeploy
   - Review recent transactions for unauthorized activity

6. **For email/SMS/WhatsApp compromise:**
   - Rotate credentials in respective provider dashboards
   - Update env vars in Railway
   - Redeploy

7. **Post-incident:**
   - Document the incident (what, when, how discovered, impact)
   - Review access controls — who had access to the compromised secret?
   - Check audit logs for suspicious activity during the exposure window

---

## Scenario 5: Domain/DNS Failure

### Current Configuration

- Production domain: `app.wawagardenbar.com`
- UAT domain: `wawagardenbar-app-uat.up.railway.app`
- Railway auto-assigns: `*.up.railway.app`

### Recovery Steps

1. **Verify DNS resolution**

   ```bash
   dig app.wawagardenbar.com
   nslookup app.wawagardenbar.com
   ```

2. **If DNS is not resolving:**
   - Check domain registrar for expiry
   - Check DNS provider for configuration
   - Verify CNAME/A record points to Railway

3. **Temporary workaround:**
   - Use the Railway-assigned domain directly: `wawagardenbar-app-production.up.railway.app`
   - Communicate fallback URL to staff

4. **If domain expired:**
   - Renew immediately via registrar
   - DNS propagation may take up to 48 hours (TTL dependent)

---

## Scenario 6: Data Corruption

### Detection

- Orders with missing items or incorrect totals
- Tabs with mismatched order references
- Users unable to log in despite valid credentials
- Financial reports showing unexpected numbers

### Recovery Steps

1. **Identify the scope of corruption**

   ```bash
   mongosh "$MONGODB_URI"
   # Check for orphaned orders (tabId references non-existent tab)
   > db.orders.find({ tabId: { $exists: true } }).forEach(o => {
       if (!db.tabs.findOne({ _id: o.tabId })) print("Orphan: " + o._id)
     })

   # Check for tabs with invalid order references
   > db.tabs.find().forEach(t => {
       t.orders.forEach(oid => {
         if (!db.orders.findOne({ _id: oid })) print("Missing order " + oid + " in tab " + t._id)
       })
     })
   ```

2. **For minor corruption (individual records):**
   - Use the admin dashboard audit logs to trace the issue
   - Manually correct records via `mongosh`
   - Document the correction

3. **For widespread corruption:**
   - Restore from the most recent clean backup (see Scenario 3)
   - Accept data loss for the period between backup and corruption

4. **Run maintenance scripts**
   ```bash
   # Available cleanup scripts
   npx tsx scripts/recalculate-tabs.ts
   npx tsx scripts/fix-tab-orders.ts
   npx tsx scripts/cleanup-database.ts
   ```

---

## DR Drill Schedule

| Quarter | Drill Scenario                           | Date | Status  |
| ------- | ---------------------------------------- | ---- | ------- |
| Q2 2026 | Database restore from backup             | TBD  | Planned |
| Q3 2026 | Secret rotation (SESSION_PASSWORD)       | TBD  | Planned |
| Q4 2026 | Full application recovery (Railway down) | TBD  | Planned |
| Q1 2027 | Bad deploy rollback                      | TBD  | Planned |

### Drill Procedure

1. Schedule drill during low-traffic period
2. Document start time
3. Execute recovery steps as written
4. Record actual recovery time vs RTO target
5. Document any issues or gaps in the runbook
6. Update this document with lessons learned

---

## Contact List

| Role             | Name            | Contact                   |
| ---------------- | --------------- | ------------------------- |
| Project Owner    | William         | —                         |
| Railway Account  | Metasession Dev | dev@metasession.co        |
| Domain Registrar | —               | Check registrar dashboard |
| Monnify Support  | —               | support@monnify.com       |

---

## Document History

| Version | Date       | Author                | Changes         |
| ------- | ---------- | --------------------- | --------------- |
| 1.0     | 2026-03-29 | William + Claude Code | Initial DR plan |
