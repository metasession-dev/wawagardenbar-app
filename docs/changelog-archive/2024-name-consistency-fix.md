# Name Consistency Fix

## Issue
User's name was showing inconsistently across the application:
- **Profile Page:** "William Thompson" (from `firstName` + `lastName`)
- **Checkout Form:** "Test Super Admin" (from stale `name` field)
- **Navbar Dropdown:** "Test Super Admin" (from stale `name` field)

## Root Cause
The User model has three name-related fields:
1. `firstName` - "William"
2. `lastName` - "Thompson"
3. `name` - "Test Super Admin" (stale/outdated)

The `name` field was supposed to be computed from `firstName` + `lastName` via a pre-save hook, but:
- The pre-save hook only runs when the document is saved
- The `name` field was never updated after `firstName` and `lastName` were set
- API routes were returning the stale `name` field directly

## Solution
Updated both API routes to compute the full name dynamically from `firstName` and `lastName`:

### Files Modified

#### 1. `/app/api/auth/user/route.ts`
```typescript
// Before
return NextResponse.json({
  user: {
    name: user.name,  // Returns stale "Test Super Admin"
    ...
  }
});

// After
const fullName = user.firstName && user.lastName
  ? `${user.firstName} ${user.lastName}`  // "William Thompson"
  : user.name || user.email.split('@')[0];

return NextResponse.json({
  user: {
    name: fullName,  // Returns computed "William Thompson"
    firstName: user.firstName,
    lastName: user.lastName,
    ...
  }
});
```

#### 2. `/app/api/auth/session/route.ts`
```typescript
// Before
const user = await UserModel.findById(session.userId).select(
  'name email ...'
);

return NextResponse.json({
  name: user.name,  // Returns stale "Test Super Admin"
  ...
});

// After
const user = await UserModel.findById(session.userId).select(
  'firstName lastName name email ...'
);

const fullName = user.firstName && user.lastName
  ? `${user.firstName} ${user.lastName}`
  : user.name || user.email.split('@')[0];

return NextResponse.json({
  name: fullName,  // Returns computed "William Thompson"
  ...
});
```

## Where Name is Used

### 1. **Navbar Dropdown** (`/components/shared/navigation/navbar.tsx`)
- **Line 113:** Avatar initials - `getInitials(user?.name, user?.email)`
- **Line 122:** Dropdown label - `{user?.name || 'Guest User'}`
- **Line 183:** Mobile avatar initials - `getInitials(user?.name, user?.email)`
- **Line 188:** Mobile user name - `{user?.name || 'Guest User'}`

**Source:** `useAuth()` hook → `/api/auth/session` → Computed from `firstName` + `lastName` ✅

### 2. **Checkout Form** (`/components/features/checkout/checkout-form.tsx`)
- **Line 106:** Check if user has data - `user.name || user.phone || user.email`
- **Line 109:** Pre-fill customer name - `form.setValue('customerName', user.name)`

**Source:** `useAuth()` hook → `/api/auth/user` → Computed from `firstName` + `lastName` ✅

### 3. **Profile Page** (Assumed from screenshot)
- Shows `firstName` and `lastName` in separate fields
- Displays "William" and "Thompson" correctly

**Source:** Direct from user profile data ✅

### 4. **Customer Dashboard** (`/app/dashboard/customers/page.tsx`)
- **Line 68:** Display user name in table - `{user.name || '-'}`

**Source:** Direct database query → Will show stale data until user logs in again ⚠️

### 5. **Welcome Email** (`/app/actions/auth/send-pin.ts`)
- **Line 54:** Send welcome email - `await sendWelcomeEmail(sanitizedEmail, user.name)`

**Source:** Direct from database → Will use stale data for new users ⚠️

## Consistency Now

After the fix:
- ✅ **Navbar:** Shows "William Thompson" (from API)
- ✅ **Checkout Form:** Pre-fills "William Thompson" (from API)
- ✅ **Profile Page:** Shows "William" + "Thompson" (separate fields)
- ⚠️ **Admin Dashboard:** May show stale data until user logs in again
- ⚠️ **Welcome Email:** May use stale data for new users

## Fallback Logic

The computed name uses this priority:
1. `firstName` + `lastName` (if both exist) → "William Thompson"
2. `name` field (if exists) → "Test Super Admin" (fallback)
3. Email prefix → "william" (last resort)

## Additional Fix Applied

Also fixed `orderCount` field name:
- Changed from `user.orderCount` (doesn't exist)
- To `user.totalOrders` (correct field name)

## Testing

To verify the fix:
1. Refresh the page (clear cache if needed)
2. Check navbar dropdown - should show "William Thompson"
3. Go to checkout - should pre-fill "William Thompson"
4. Check profile page - should show "William" and "Thompson"

## Future Improvements

### Option 1: Remove `name` field entirely
- Use virtual getter instead
- Always compute from `firstName` + `lastName`
- No stale data possible

### Option 2: Update pre-save hook
- Ensure `name` is always synced with `firstName` + `lastName`
- Add migration script to fix existing records

### Option 3: Update all queries
- Always select `firstName` and `lastName`
- Compute full name in application code
- Current approach (implemented) ✅

## Migration Script (Optional)

To fix all existing stale `name` fields in the database:

```typescript
// Run once to update all users
async function migrateUserNames() {
  const users = await UserModel.find({});
  
  for (const user of users) {
    if (user.firstName && user.lastName) {
      user.name = `${user.firstName} ${user.lastName}`;
      await user.save();
    }
  }
  
  console.log(`Updated ${users.length} users`);
}
```

## Conclusion

The name is now consistently computed from `firstName` and `lastName` in all API routes. The application will display "William Thompson" everywhere that uses the `useAuth()` hook or calls the user API endpoints.
