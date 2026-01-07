# Email Fallback Authentication - Troubleshooting Guide

## Common Issues and Solutions

### Issue: "No verification PIN found. Please request a new one."

**Cause**: User's email was not saved to the database before attempting verification.

**Solution**: 
- The `sendEmailPinAction` now always saves the email to the user record before sending the PIN
- The email is saved even if the user already has an email (it updates it)
- Check server logs for "Email PIN saved for user" message to confirm

**Debug Steps**:
1. Check server console for log: `Email PIN saved for user: { userId, email, phone, pinSet }`
2. Verify the email matches what user entered (case-insensitive)
3. Check that user exists with the phone number provided
4. Confirm PIN was generated and saved

### Issue: "User not found. Please start over."

**Cause**: Phone number from initial SMS attempt doesn't match any user in database.

**Possible Reasons**:
1. User was not created during SMS PIN attempt
2. Phone number format mismatch (sanitization issue)
3. Database connection issue

**Solution**:
- Phone numbers are now sanitized using `sanitizePhone()` before lookup
- Check server logs for "User not found for phone: [number]"
- Verify user was created in first step (SMS PIN send)

### Issue: Email not received

**Cause**: SMTP configuration or email service issue.

**Debug Steps**:
1. Check environment variables:
   ```
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_user
   SMTP_PASSWORD=your_smtp_password
   EMAIL_FROM=noreply@wawacafe.com
   ```
2. Check server logs for "Failed to send email PIN" error
3. Verify SMTP credentials are correct
4. Check spam/junk folder
5. Test SMTP connection separately

### Issue: PIN expired

**Cause**: User took longer than 10 minutes to enter PIN.

**Solution**: Click "Resend PIN" to get a new one.

## Logging and Debugging

### Server Logs to Monitor

1. **Email PIN Generation**:
   ```
   Email PIN saved for user: { userId, email, phone, pinSet }
   ```

2. **Email PIN Verification**:
   ```
   Verifying email PIN for user: { userId, email, phone, hasPIN, pinExpiry }
   ```

3. **User Lookup Failures**:
   ```
   User not found for phone: [sanitized_phone]
   User not found for email: [email]
   ```

4. **PIN Validation**:
   ```
   No PIN found for user: [userId]
   ```

### Testing the Flow

1. **Start with phone number**: `+2348084079411`
2. **SMS fails with DND**: Error alert appears
3. **Click "Try with Email Instead"**: Email form shown
4. **Enter email**: `test@example.com`
5. **Check logs**: Should see "Email PIN saved for user"
6. **Check email inbox**: PIN should arrive
7. **Enter PIN**: Should see "Verifying email PIN for user"
8. **Success**: User logged in

## Database Verification

### Check User Record
```javascript
// In MongoDB shell or Compass
db.users.findOne({ phone: "+2348084079411" })

// Should show:
{
  _id: ObjectId("..."),
  phone: "+2348084079411",
  email: "test@example.com",  // ← Should be set
  verificationPin: "1234",     // ← Should exist
  pinExpiresAt: ISODate("..."), // ← Should be in future
  emailVerified: false,         // ← Will be true after verification
  phoneVerified: false
}
```

## Environment Setup Checklist

- [ ] `SMTP_HOST` configured
- [ ] `SMTP_PORT` configured (usually 587 or 465)
- [ ] `SMTP_USER` configured
- [ ] `SMTP_PASSWORD` configured
- [ ] `EMAIL_FROM` configured
- [ ] SMTP credentials tested and working
- [ ] Email template renders correctly
- [ ] Server logs show successful email sending

## Flow Diagram

```
1. User enters phone → SMS PIN attempted
                    ↓
2. SMS fails (DND) → Error alert + "Try Email" button
                    ↓
3. User clicks button → Email form shown
                    ↓
4. User enters email → sendEmailPinAction called
                    ↓
5. Find user by phone → Update user.email
                    ↓
6. Generate PIN → Save to user.verificationPin
                    ↓
7. Send email → User receives PIN
                    ↓
8. User enters PIN → verifyEmailPinAction called
                    ↓
9. Find user by email → Verify PIN matches
                    ↓
10. Mark emailVerified → Create session → Login success
```

## Quick Fixes

### Reset User's PIN
```javascript
// If user is stuck, reset their PIN state
db.users.updateOne(
  { phone: "+2348084079411" },
  { 
    $unset: { 
      verificationPin: "",
      pinExpiresAt: "" 
    }
  }
)
```

### Manually Set Email
```javascript
// If email wasn't saved
db.users.updateOne(
  { phone: "+2348084079411" },
  { 
    $set: { 
      email: "test@example.com"
    }
  }
)
```

### Check Recent Users
```javascript
// Find users created in last hour
db.users.find({
  createdAt: { 
    $gte: new Date(Date.now() - 3600000) 
  }
}).sort({ createdAt: -1 })
```
