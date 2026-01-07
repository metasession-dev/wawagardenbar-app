# Environment Variables - Corrections Applied

## Summary

Updated `docker-compose.prod.yml` and `.env.docker.example` to use the correct environment variable names that match the actual codebase.

---

## Changes Made

### 1. **MongoDB Configuration** ✅
```yaml
# BEFORE (incorrect)
- MONGODB_URI=${MONGODB_URI:-mongodb://mongodb:27017/wawa-garden-bar}

# AFTER (correct)
- MONGODB_WAWAGARDENBAR_APP_URI=${MONGODB_WAWAGARDENBAR_APP_URI}
- MONGODB_DB_NAME=${MONGODB_DB_NAME}
```
**Reason**: `lib/mongodb.ts` uses `MONGODB_WAWAGARDENBAR_APP_URI` and `MONGODB_DB_NAME`

---

### 2. **Session Configuration** ✅
```yaml
# BEFORE (incorrect)
- SESSION_SECRET=${SESSION_SECRET}

# AFTER (correct)
- SESSION_PASSWORD=${SESSION_PASSWORD}
- SESSION_COOKIE_NAME=${SESSION_COOKIE_NAME:-wawa_session}
```
**Reason**: `lib/session.ts` uses `SESSION_PASSWORD` and `SESSION_COOKIE_NAME`

---

### 3. **Email Configuration** ✅
```yaml
# BEFORE (incorrect)
- EMAIL_HOST=${EMAIL_HOST}
- EMAIL_PORT=${EMAIL_PORT}
- EMAIL_USER=${EMAIL_USER}
- EMAIL_PASSWORD=${EMAIL_PASSWORD}

# AFTER (correct)
- SMTP_HOST=${SMTP_HOST}
- SMTP_PORT=${SMTP_PORT}
- SMTP_USER=${SMTP_USER}
- SMTP_PASSWORD=${SMTP_PASSWORD}
- EMAIL_FROM=${EMAIL_FROM}  # This one was already correct
```
**Reason**: `lib/email.ts` uses `SMTP_*` prefix for email configuration

---

### 4. **Monnify Payment Gateway** ✅
```yaml
# BEFORE (incomplete)
- MONNIFY_API_KEY=${MONNIFY_API_KEY}
- MONNIFY_SECRET_KEY=${MONNIFY_SECRET_KEY}
- MONNIFY_CONTRACT_CODE=${MONNIFY_CONTRACT_CODE}

# AFTER (complete)
- MONNIFY_API_KEY=${MONNIFY_API_KEY}
- MONNIFY_SECRET_KEY=${MONNIFY_SECRET_KEY}
- MONNIFY_CONTRACT_CODE=${MONNIFY_CONTRACT_CODE}
- MONNIFY_BASE_URL=${MONNIFY_BASE_URL}
- MONNIFY_WEBHOOK_SECRET=${MONNIFY_WEBHOOK_SECRET}
- Wallet_Account_Number=${Wallet_Account_Number}
```
**Reason**: `services/monnify-service.ts` uses `MONNIFY_BASE_URL`, and webhooks need `MONNIFY_WEBHOOK_SECRET`

---

### 5. **Application Configuration** ✅
```yaml
# ADDED (were missing)
- PORT=${PORT:-3002}
- API_URL=${API_URL}
- NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
```
**Reason**: Required by various parts of the application

---

### 6. **Port Configuration** ✅
```yaml
# BEFORE
ports:
  - "3000:3000"

# AFTER
ports:
  - "127.0.0.1:3002:3002"
```
**Reason**: Matches your production setup (port 3002, localhost only)

---

### 7. **Health Check** ✅
```yaml
# BEFORE
test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', ...)"]

# AFTER
test: ["CMD", "node", "-e", "require('http').get('http://localhost:3002/api/health', ...)"]
```
**Reason**: Updated to use correct port 3002

---

### 8. **Network Configuration** ✅
```yaml
# BEFORE
networks:
  wawa-network:
    driver: bridge

# AFTER
networks:
  ostendo-network:
    external: true
```
**Reason**: Matches your production setup using external `ostendo-network`

---

### 9. **MongoDB Service Removed** ✅
Removed the standalone MongoDB service definition since your production uses a shared external `mongo` container.

---

## Complete Environment Variable List

Here's the complete list of environment variables your application needs:

### **Required Variables**
```bash
# Database
MONGODB_WAWAGARDENBAR_APP_URI=mongodb://user:password@mongo:27017/wawagardenbar-app?authSource=admin
MONGODB_DB_NAME=wawagardenbar-app

# Session
SESSION_PASSWORD=your_secure_random_session_secret_at_least_32_characters_long
SESSION_COOKIE_NAME=wawa_session

# Application
NODE_ENV=production
PORT=3002
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
API_URL=https://your-domain.com/api

# Monnify Payment
MONNIFY_API_KEY=your_monnify_api_key
MONNIFY_SECRET_KEY=your_monnify_secret_key
MONNIFY_CONTRACT_CODE=your_monnify_contract_code
MONNIFY_BASE_URL=https://api.monnify.com
MONNIFY_WEBHOOK_SECRET=your_monnify_webhook_secret
Wallet_Account_Number=your_wallet_account_number

# Paystack Payment
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
EMAIL_FROM=Wawa Garden Bar <noreply@wawagardenbar.com>
```

### **Optional Variables**
```bash
# Instagram Integration
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret

# GitHub Container Registry
GITHUB_REPOSITORY=ostendo-io/wawagardenbar-app
```

---

## Files Updated

1. ✅ **`docker-compose.prod.yml`**
   - Fixed all environment variable names
   - Updated port configuration (3002, localhost only)
   - Fixed health check port
   - Changed to external `ostendo-network`
   - Removed standalone MongoDB service

2. ✅ **`.env.docker.example`**
   - Updated all variable names to match codebase
   - Added missing variables
   - Updated default values
   - Added helpful comments

---

## Migration Guide

If you have an existing `.env` file with the old variable names, here's how to migrate:

### **Variable Name Changes**
```bash
# Old Name → New Name
MONGODB_URI → MONGODB_WAWAGARDENBAR_APP_URI
SESSION_SECRET → SESSION_PASSWORD
EMAIL_HOST → SMTP_HOST
EMAIL_PORT → SMTP_PORT
EMAIL_USER → SMTP_USER
EMAIL_PASSWORD → SMTP_PASSWORD
```

### **New Variables to Add**
```bash
MONGODB_DB_NAME=wawagardenbar-app
SESSION_COOKIE_NAME=wawa_session
PORT=3002
API_URL=http://localhost:3002/api
NEXT_PUBLIC_API_URL=http://localhost:3002/api
MONNIFY_BASE_URL=https://api.monnify.com
MONNIFY_WEBHOOK_SECRET=your_webhook_secret
Wallet_Account_Number=your_wallet_account
```

---

## Verification

To verify your environment variables are correct:

1. **Check MongoDB connection**:
   ```bash
   docker exec wawa-garden-bar env | grep MONGODB
   ```

2. **Check session configuration**:
   ```bash
   docker exec wawa-garden-bar env | grep SESSION
   ```

3. **Check email configuration**:
   ```bash
   docker exec wawa-garden-bar env | grep SMTP
   ```

4. **Test the application**:
   ```bash
   curl http://127.0.0.1:3002/api/health
   ```

---

## Troubleshooting

### **MongoDB Connection Fails**
- Verify `MONGODB_WAWAGARDENBAR_APP_URI` is set correctly
- Verify `MONGODB_DB_NAME` matches your database name
- Check if `mongo` container is running: `docker ps | grep mongo`

### **Session Errors**
- Verify `SESSION_PASSWORD` is at least 32 characters
- Check `SESSION_COOKIE_NAME` is set

### **Email Not Sending**
- Verify all `SMTP_*` variables are set correctly
- Test SMTP credentials manually
- Check firewall/network allows SMTP traffic

### **Payment Gateway Errors**
- Verify all `MONNIFY_*` variables are set
- Check `MONNIFY_BASE_URL` points to correct environment (sandbox vs production)
- Verify webhook secret matches Monnify dashboard

---

## Next Steps

1. **Update your production `.env` file** with the correct variable names
2. **Redeploy the application** using the updated `docker-compose.prod.yml`
3. **Test all functionality** (database, auth, email, payments)
4. **Monitor logs** for any environment variable related errors

```bash
# Redeploy command
./deploy-prod.sh

# Check logs
docker logs -f wawa-garden-bar
```
