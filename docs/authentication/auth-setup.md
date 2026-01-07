# Authentication System - Setup Guide

## ⚠️ Action Required

Before the authentication system can be used, complete these steps:

---

## 1. Install Missing Shadcn Component

The `AuthDialog` component requires the Tabs component:

```bash
npx shadcn@latest add tabs
```

This will create `/components/ui/tabs.tsx` which is required for the auth dialog.

---

## 2. Configure Environment Variables

Create or update `.env.local` with the following:

```bash
# Session Configuration (REQUIRED)
SESSION_PASSWORD=your-very-secure-password-at-least-32-characters-long-random-string
SESSION_COOKIE_NAME=wawa_session

# Zoho Email Configuration (REQUIRED)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-zoho-app-password
EMAIL_FROM=noreply@wawacafe.com

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# MongoDB (already configured)
MONGODB_URI=mongodb://localhost:27017/wawagardenbar
MONGODB_DB_NAME=wawagardenbar
```

### Generating SESSION_PASSWORD

Use one of these methods to generate a secure session password:

**Option 1: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Online Generator**
Use a password generator to create a 64-character random string.

### Setting Up Zoho Email

1. **Create Zoho Account:**
   - Go to https://www.zoho.com/mail/
   - Sign up for a free account

2. **Get App Password:**
   - Go to Zoho Mail Settings
   - Navigate to Security → App Passwords
   - Generate a new app password
   - Use this as `SMTP_PASSWORD`

3. **Configure Domain (Optional):**
   - For production, use your own domain
   - Update `EMAIL_FROM` to match your domain

---

## 3. Test Email Delivery

Create a test file to verify email configuration:

```typescript
// test-email.ts
import { sendVerificationPinEmail } from '@/lib/email';

async function testEmail() {
  try {
    await sendVerificationPinEmail('your-test-email@example.com', '1234');
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
}

testEmail();
```

Run with:
```bash
npx tsx test-email.ts
```

---

## 4. Verify MongoDB Connection

Ensure MongoDB is running and accessible:

```bash
# Check if MongoDB is running
mongosh mongodb://localhost:27017/wawagardenbar-app

# Or if using MongoDB Atlas, test the connection string
```

---

## 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and test the authentication flow.

---

## Quick Test Checklist

- [ ] Install tabs component
- [ ] Set SESSION_PASSWORD (32+ characters)
- [ ] Configure Zoho SMTP credentials
- [ ] Test email delivery
- [ ] Verify MongoDB connection
- [ ] Start dev server
- [ ] Test login flow (send PIN)
- [ ] Check email inbox for PIN
- [ ] Verify PIN and login
- [ ] Test guest checkout
- [ ] Test logout

---

## Troubleshooting

### Email Not Sending

**Problem:** PIN email not received

**Solutions:**
1. Check SMTP credentials in `.env.local`
2. Verify Zoho app password (not regular password)
3. Check spam/junk folder
4. Verify SMTP_HOST and SMTP_PORT
5. Check Zoho account status
6. Review server logs for errors

### Session Not Persisting

**Problem:** User logged out on page refresh

**Solutions:**
1. Verify SESSION_PASSWORD is set (32+ chars)
2. Check cookie settings in browser
3. Ensure cookies are enabled
4. Verify iron-session configuration
5. Check for HTTPS in production

### PIN Expired Immediately

**Problem:** PIN shows as expired right away

**Solutions:**
1. Check server time/timezone
2. Verify `getPinExpirationTime()` logic
3. Check database time storage
4. Ensure server and database times match

### MongoDB Connection Failed

**Problem:** Cannot connect to database

**Solutions:**
1. Verify MongoDB is running
2. Check MONGODB_URI in `.env.local`
3. Verify database name
4. Check network/firewall settings
5. Review MongoDB logs

---

## Production Considerations

### Before Deploying

1. **Use Strong SESSION_PASSWORD**
   - Generate new password for production
   - Never commit to git
   - Store in environment variables

2. **Configure Production Email**
   - Use production domain for EMAIL_FROM
   - Consider transactional email service (SendGrid, AWS SES)
   - Set up SPF, DKIM, DMARC records

3. **Enable HTTPS**
   - Required for secure cookies
   - Update cookie settings for production

4. **Set Up Monitoring**
   - Monitor email delivery rates
   - Track failed login attempts
   - Log authentication errors

5. **Implement Rate Limiting**
   - Limit PIN requests per email
   - Prevent brute force attacks
   - Add CAPTCHA if needed

---

## Next Steps After Setup

Once authentication is working:

1. **Create Auth Pages**
   - `/app/(auth)/login/page.tsx`
   - `/app/(auth)/register/page.tsx`

2. **Add Protected Routes**
   - Middleware for auth checking
   - Redirect logic for unauthenticated users

3. **Implement Profile Management**
   - Update user details
   - Manage addresses
   - Manage payment methods

4. **Add Order History**
   - Link orders to users
   - Display past orders
   - Reorder functionality

---

## Support

If you encounter issues:

1. Check the logs in terminal
2. Review browser console for errors
3. Verify all environment variables
4. Test each component individually
5. Refer to AUTH-IMPLEMENTATION.md for details

---

*Last updated: November 13, 2025*
