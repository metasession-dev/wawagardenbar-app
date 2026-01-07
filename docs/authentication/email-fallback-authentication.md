# Email Fallback Authentication

## Overview
When SMS delivery fails (e.g., due to DND restrictions or sandbox limitations), users can opt to receive their verification PIN via email instead.

## User Flow

### 1. Initial Phone Number Entry
- User enters their phone number
- System attempts to send SMS PIN

### 2. SMS Failure with Email Option
If SMS fails with a recoverable error (DND, service issues, etc.):
- Error alert is displayed with the specific error message
- "Try with Email Instead" button appears
- User can click to switch to email verification

### 3. Email PIN Entry
- User enters their email address
- System sends PIN to email
- User receives PIN in their inbox
- User enters PIN to verify and login

### 4. PIN Verification
- Works identically for both SMS and email PINs
- Session is created upon successful verification
- User is logged in and redirected

## Error Handling

### SMS Errors that Allow Email Fallback
- `DND_REJECTION`: Phone number on Do Not Disturb list
- `SERVICE_DISABLED`: SMS service unavailable
- `INSUFFICIENT_BALANCE`: Account balance too low
- `DELIVERY_FAILED`: Generic delivery failure
- `API_ERROR`: Connection issues

### SMS Errors that Don't Allow Email Fallback
- `INVALID_PHONE`: Invalid phone number format (user should correct phone number first)

## Implementation Details

### New Server Actions

#### `sendEmailPinAction(email: string, phone?: string)`
- Sends verification PIN to email
- Requires phone number to link to existing user
- Updates user's email if not already set
- Returns success/failure with message

#### `verifyEmailPinAction(email: string, pin: string)`
- Verifies PIN sent to email
- Marks email as verified
- Creates user session
- Returns success/failure with message

### Updated Components

#### `LoginForm`
- Added `email` step between `phone` and `pin`
- Tracks `authMethod` (sms or email)
- Shows error alert with email fallback option
- Handles both SMS and email PIN flows
- Dynamic messaging based on auth method

### User Model Updates
- Email field remains optional and sparse
- Email is saved when user provides it during email PIN flow
- `emailVerified` flag is set when email PIN is verified

## Email Template
The verification PIN email includes:
- Wawa Garden Bar branding
- Large, clear PIN display
- Expiration notice (10 minutes)
- Security warning (don't share PIN)
- Support contact information

## Security Considerations
1. **PIN Expiration**: Both SMS and email PINs expire in 10 minutes
2. **Rate Limiting**: Same rate limits apply to both methods
3. **Session Security**: Same session handling for both auth methods
4. **Email Verification**: Email is marked as verified only after successful PIN verification

## Configuration

### Environment Variables Required
```env
# SMTP Configuration for Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
EMAIL_FROM=noreply@wawacafe.com

# SMS Configuration (primary method)
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_API_URL=https://api.sandbox.africastalking.com/version1/messaging
AFRICASTALKING_SENDER_ID=WAWAGARDEN
ENABLE_SMS_NOTIFICATIONS=true
```

## Testing

### Test SMS Failure → Email Fallback
1. Use a phone number that will trigger DND rejection
2. Observe error message with "Try with Email Instead" button
3. Click button to switch to email input
4. Enter email address
5. Check email inbox for PIN
6. Enter PIN to complete login

### Test Direct Email Authentication
Currently, email-only authentication (without phone) is not supported. Users must:
1. Start with phone number
2. If SMS fails, switch to email
3. Email is linked to the phone number provided

## Future Enhancements
- Allow direct email-only signup (without phone requirement)
- Remember user's preferred auth method
- Allow users to switch between SMS and email in profile settings
- Add email verification during profile completion
