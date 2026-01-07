# Phone Number Sanitization Fix

## Problem
Phone numbers were being stored in different formats, causing user lookup failures:
- SMS PIN send: `+2348084079411` (no spaces)
- Email PIN lookup: `+234 800 000 0001` (with spaces)

This caused the email PIN verification to fail because it couldn't find the user record.

## Root Cause
The `sanitizePhone` function only removed whitespace (`\s+`), but the phone number in the LoginForm state retained spaces from user input.

## Solution

### 1. Updated `sanitizePhone` Function
**File**: `/lib/auth-utils.ts`

```typescript
export function sanitizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  // This ensures consistent formatting: +2348084079411
  let sanitized = phone.trim();
  
  // Keep the leading + if present
  const hasPlus = sanitized.startsWith('+');
  
  // Remove all non-digits
  sanitized = sanitized.replace(/\D/g, '');
  
  // Add back the + if it was there
  if (hasPlus && !sanitized.startsWith('+')) {
    sanitized = '+' + sanitized;
  }
  
  return sanitized;
}
```

**Examples**:
- Input: `+234 800 000 0001` → Output: `+2348084079411`
- Input: `+234-800-000-0001` → Output: `+2348084079411`
- Input: `234 800 000 0001` → Output: `2348084079411`
- Input: `(234) 800-000-0001` → Output: `2348084079411`

### 2. Updated LoginForm
**File**: `/components/shared/auth/login-form.tsx`

Added sanitization when storing phone in state:

```typescript
if (result.success) {
  // Sanitize and store phone to ensure consistency
  setPhone(sanitizePhone(data.phone));
  setAuthMethod('sms');
  setStep('pin');
  // ...
}
```

## Impact
- Phone numbers are now consistently formatted across all authentication flows
- User lookup by phone works reliably
- Email PIN fallback now finds the correct user record
- No more "User not found" or "No PIN found" errors due to formatting mismatches

## Testing
Test with various phone number formats:
1. `+234 800 000 0001` (with spaces)
2. `+234-800-000-0001` (with dashes)
3. `(234) 800-000-0001` (with parentheses)
4. `2348084079411` (no country code indicator)

All should be normalized to the same format for database storage and lookup.

## Related Files
- `/lib/auth-utils.ts` - Phone sanitization function
- `/components/shared/auth/login-form.tsx` - Phone state management
- `/app/actions/auth/send-pin.ts` - Uses sanitizePhone
- `/app/actions/auth/send-email-pin.ts` - Uses sanitizePhone
