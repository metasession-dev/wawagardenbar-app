# SMS Error Handling Documentation

## Overview
Enhanced error handling for Africa's Talking SMS integration with detailed error codes and user-friendly messages.

## Error Codes

### `SERVICE_DISABLED`
- **Cause**: SMS service is disabled in environment variables
- **Solution**: Set `ENABLE_SMS_NOTIFICATIONS=true` in `.env.local`

### `MISSING_API_KEY`
- **Cause**: Africa's Talking API key is not configured
- **Solution**: Set `AFRICASTALKING_API_KEY` in `.env.local`

### `DND_REJECTION`
- **Cause**: Phone number cannot receive SMS messages
- **Reasons**:
  - **Sandbox Mode**: Phone number not registered in Africa's Talking sandbox dashboard
  - **Production**: Phone number is on Nigeria's Do Not Disturb (DND) registry
- **Solutions**:
  - **Sandbox**: Register the phone number at https://account.africastalking.com/apps/sandbox/test/numbers
  - **Production**: User must opt-in to receive messages or use a different number

### `INVALID_PHONE`
- **Cause**: Phone number format is invalid
- **Solution**: Ensure phone number is in E.164 format (e.g., +2348012345678)

### `INSUFFICIENT_BALANCE`
- **Cause**: Africa's Talking account has insufficient balance
- **Solution**: Top up your Africa's Talking account

### `DELIVERY_FAILED`
- **Cause**: Generic delivery failure from Africa's Talking
- **Solution**: Check Africa's Talking dashboard for specific error details

### `API_ERROR`
- **Cause**: Failed to connect to Africa's Talking API
- **Solution**: Check network connectivity and API URL configuration

### `UNKNOWN_ERROR`
- **Cause**: Unexpected error during SMS sending
- **Solution**: Check server logs for detailed error information

## User-Facing Messages

### Authentication Flow
When SMS PIN fails to send during login/signup:

- **DND_REJECTION**: "Unable to send SMS to this number. If you are using sandbox mode, please register your phone number in the Africa's Talking sandbox dashboard. Otherwise, this number may be on a Do Not Disturb list."
- **INVALID_PHONE**: "The phone number format is invalid. Please check and try again."
- **SERVICE_DISABLED**: "SMS service is currently unavailable. Please contact support."
- **INSUFFICIENT_BALANCE**: "SMS service is temporarily unavailable. Please contact support."
- **Default**: "Failed to send verification PIN. Please try again."

### Admin Dashboard (Test SMS)
When testing SMS from notification settings:

- **DND_REJECTION**: "[Error message] - For sandbox mode, register this phone number in your Africa's Talking dashboard."
- **SERVICE_DISABLED**: "[Error message] - Check ENABLE_SMS_NOTIFICATIONS in your environment variables."
- **MISSING_API_KEY**: "[Error message] - Check AFRICASTALKING_API_KEY in your environment variables."

## Implementation Details

### SMSResult Interface
```typescript
export interface SMSResult {
  success: boolean;
  message?: string;
  errorCode?: string;
  details?: any;
}
```

### Updated Methods
All SMS methods now return `SMSResult` instead of `boolean`:
- `SMSService.sendSMS()`
- `SMSService.sendVerificationPinSMS()`
- `SMSService.sendOrderConfirmationSMS()`
- `SMSService.sendOrderStatusSMS()`

### Error Detection
The service checks the `status` field in Africa's Talking API response:
- `Success` or `Queued`: SMS sent successfully
- `DoNotDisturbRejection`: DND error
- `InvalidPhoneNumber`: Invalid phone format
- `InsufficientBalance`: Account balance too low
- Other statuses: Generic delivery failure

## Testing

### Sandbox Mode Testing
1. Go to https://account.africastalking.com/apps/sandbox
2. Navigate to "Test Credentials" → "Test Numbers"
3. Add your phone number
4. Try login/signup with the registered number

### Production Testing
1. Ensure `AFRICASTALKING_API_URL` points to production: `https://api.africastalking.com/version1/messaging`
2. Use a live API key and username
3. Test with real phone numbers

## Monitoring
All SMS errors are logged to console with detailed information:
- Error code
- Error message
- Full API response (in `details` field)

Check server logs for debugging SMS delivery issues.
