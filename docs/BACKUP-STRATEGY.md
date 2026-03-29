# Backup Strategy — Wawa Garden Bar

**Document ID:** BK-WGBA-001
**Version:** 1.0
**Date:** 2026-03-29
**Classification:** Internal — Restricted

---

## What is Backed Up

| Data                      | Method                      | Frequency       | Retention    | Location             |
| ------------------------- | --------------------------- | --------------- | ------------ | -------------------- |
| MongoDB (all collections) | Railway automatic snapshots | Daily           | 7 days       | Railway platform     |
| MongoDB (manual export)   | `mongodump`                 | Weekly (manual) | 30 days      | Local secure storage |
| Source code               | Git (GitHub)                | Every commit    | Permanent    | GitHub               |
| Environment variables     | Railway platform            | On change       | Current only | Railway dashboard    |
| Compliance evidence       | META-COMPLY (Supabase)      | On upload       | Permanent    | META-COMPLY portal   |

## What is NOT Backed Up (and why)

| Data                          | Reason                                                    |
| ----------------------------- | --------------------------------------------------------- |
| User session cookies          | Ephemeral — regenerated on login                          |
| Uploaded images (menu photos) | Stored in `/public/uploads/` — included in Railway deploy |
| Socket.IO state               | In-memory only — reconnects automatically                 |

---

## MongoDB Backup

### Automatic (Railway)

Railway provides automatic daily snapshots for MongoDB services. These are accessible via the Railway dashboard under the MongoDB service → Backups tab.

**Limitation:** Railway snapshots are tied to the Railway platform. If the Railway account is compromised, backups are also at risk.

### Manual Export (Weekly)

Run weekly from a machine with MongoDB tools installed:

```bash
# Export full database
mongodump --uri="$MONGODB_URI" --out=/path/to/backups/$(date +%Y-%m-%d)

# Compress
tar -czf wawagardenbar-backup-$(date +%Y-%m-%d).tar.gz /path/to/backups/$(date +%Y-%m-%d)

# Verify backup is valid
mongorestore --uri="mongodb://localhost:27017" \
  --db=wawagardenbar_verify \
  --drop \
  /path/to/backups/$(date +%Y-%m-%d)/wawagardenbar_prod/

# Clean up verification database
mongosh mongodb://localhost:27017 --eval "db.getSiblingDB('wawagardenbar_verify').dropDatabase()"
```

### Restore Procedure

```bash
# From Railway backup:
# Railway dashboard → MongoDB service → Backups → Select backup → Restore

# From manual backup:
mongorestore --uri="$MONGODB_URI" \
  --db=wawagardenbar_prod \
  --drop \
  /path/to/backups/YYYY-MM-DD/wawagardenbar_prod/
```

**Post-restore verification:**

```bash
mongosh "$MONGODB_URI" --eval "
  print('Orders: ' + db.orders.countDocuments());
  print('Tabs: ' + db.tabs.countDocuments());
  print('Menu Items: ' + db.menuitems.countDocuments());
  print('Users: ' + db.users.countDocuments());
  print('Admins: ' + db.admins.countDocuments());
  print('Audit Logs: ' + db.auditlogs.countDocuments());
"
```

---

## Environment Variables Backup

Railway environment variables are the single source of truth for secrets. There is no automatic backup of these.

### Manual Backup Procedure (Monthly)

```bash
# Export current variables (redacted for storage)
railway variables 2>&1 | sed 's/=.*/=<REDACTED>/' > env-backup-$(date +%Y-%m-%d)-keys-only.txt

# Store the FULL values in a password manager or encrypted vault
# NEVER commit full env values to git
```

### Critical Variables to Backup Separately

Store these in a secure password manager (not in git, not in plain text):

1. `SESSION_PASSWORD` — losing this invalidates all sessions
2. `MONGODB_URI` — contains database password
3. `MONNIFY_API_KEY` / `MONNIFY_SECRET_KEY` — payment processing
4. `SMTP_PASSWORD` — email sending
5. `WHATSAPP_ACCESS_TOKEN` — WhatsApp messaging

---

## Source Code Backup

Git provides full history. GitHub is the primary remote.

### Additional Protection

- All developers should have local clones (distributed backup)
- Consider a secondary git remote for critical projects:
  ```bash
  git remote add backup <secondary-git-url>
  git push backup --all
  ```

---

## Compliance Evidence Backup

Compliance documents (RTM, test scope, security summaries) are stored in git. Binary evidence (JSON, screenshots) is uploaded to META-COMPLY (Supabase).

**Supabase backup:** Managed by Supabase platform. For additional protection, periodically export evidence via the META-COMPLY API.

---

## Backup Testing Schedule

| Frequency | Test                                    | Procedure                                  |
| --------- | --------------------------------------- | ------------------------------------------ |
| Monthly   | Verify Railway snapshot exists          | Check Railway dashboard                    |
| Quarterly | Restore test (manual backup → local DB) | Run `mongorestore` to local, verify counts |
| Quarterly | DR drill (see DISASTER-RECOVERY.md)     | Full scenario walkthrough                  |

---

## Document History

| Version | Date       | Author                | Changes                 |
| ------- | ---------- | --------------------- | ----------------------- |
| 1.0     | 2026-03-29 | William + Claude Code | Initial backup strategy |
