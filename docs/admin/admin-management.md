# Admin Management System - Requirements & Implementation Guide

## Overview

This document outlines the requirements and implementation plan for a comprehensive admin management system that allows super-admins to create, manage, and authenticate admin users via username/password credentials. This system runs parallel to the existing passwordless customer authentication.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Requirements](#requirements)
3. [Database Schema](#database-schema)
4. [Authentication Flow](#authentication-flow)
5. [Implementation Plan](#implementation-plan)
6. [Security Considerations](#security-considerations)
7. [Testing Checklist](#testing-checklist)

---

## System Architecture

### Dual Authentication System

The application will support two parallel authentication flows:

```
┌─────────────────────────────────────────────────────────────┐
│                    DUAL AUTHENTICATION SYSTEM                │
└─────────────────────────────────────────────────────────────┘

CUSTOMER FLOW (Existing)          ADMIN FLOW (New)
─────────────────────              ─────────────────
Email → PIN → Session              Username + Password → Session
Guest Checkout Available           No Guest Access
Role: customer                     Role: admin | super-admin
```

### Key Differences

| Feature | Customer Auth | Admin Auth |
|---------|--------------|------------|
| Method | Email + PIN | Username + Password |
| Registration | Self-service | Super-admin only |
| Guest Access | Yes | No |
| Password | None | Hashed with bcrypt |
| Session Duration | 7 days | 7 days |
| Role Options | customer | admin, super-admin |

---

## Requirements

### Functional Requirements

#### FR-1: Admin User Creation
- **FR-1.1:** Super-admins can create new admin users via dashboard
- **FR-1.2:** Required fields: username, password, role (admin/super-admin)
- **FR-1.3:** Optional fields: email, full name
- **FR-1.4:** Username must be unique (case-insensitive)
- **FR-1.5:** Password must meet complexity requirements:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character
- **FR-1.6:** System generates audit log on admin creation

#### FR-2: Admin Authentication
- **FR-2.1:** Admin users login via username + password
- **FR-2.2:** Separate login page for admins (`/admin/login`)
- **FR-2.3:** Failed login attempts are logged
- **FR-2.4:** Session created on successful authentication
- **FR-2.5:** Session includes userId, username, role, isAdmin flag
- **FR-2.6:** Audit log created on login/logout

#### FR-3: Admin Management Dashboard
- **FR-3.1:** New section "Manage Admins" in dashboard settings
- **FR-3.2:** List all admin users (admin + super-admin roles)
- **FR-3.3:** Display: username, email, role, status, last login, created date
- **FR-3.4:** Search and filter capabilities
- **FR-3.5:** Sort by username, role, last login, created date
- **FR-3.6:** Pagination for large admin lists

#### FR-4: Password Management
- **FR-4.1:** Super-admins can reset any admin's password
- **FR-4.2:** Password reset generates new temporary password
- **FR-4.3:** Admin must change temporary password on next login
- **FR-4.4:** Admins can change their own password via profile
- **FR-4.5:** Password change requires current password verification
- **FR-4.6:** Audit log created on password reset/change

#### FR-5: Admin Status Management
- **FR-5.1:** Super-admins can activate/deactivate admin accounts
- **FR-5.2:** Deactivated admins cannot login
- **FR-5.3:** Deactivated admins' sessions are invalidated
- **FR-5.4:** Super-admins can delete admin accounts
- **FR-5.5:** Deletion requires confirmation
- **FR-5.6:** Audit log created on status changes

#### FR-6: Role Management
- **FR-6.1:** Super-admins can change admin roles
- **FR-6.2:** Role changes: customer ↔ admin ↔ super-admin
- **FR-6.3:** Cannot demote the last super-admin
- **FR-6.4:** Role change invalidates current session
- **FR-6.5:** Audit log created on role changes

### Non-Functional Requirements

#### NFR-1: Security
- **NFR-1.1:** Passwords hashed with bcrypt (cost factor: 12)
- **NFR-1.2:** No plain-text password storage
- **NFR-1.3:** Password fields excluded from query results by default
- **NFR-1.4:** Session tokens encrypted with iron-session
- **NFR-1.5:** Rate limiting on login attempts (5 attempts per 15 min)
- **NFR-1.6:** Brute force protection with account lockout

#### NFR-2: Performance
- **NFR-2.1:** Admin list loads in < 1 second
- **NFR-2.2:** Login authentication completes in < 500ms
- **NFR-2.3:** Password hashing doesn't block event loop

#### NFR-3: Usability
- **NFR-3.1:** Clear error messages for validation failures
- **NFR-3.2:** Password strength indicator on creation
- **NFR-3.3:** Confirmation dialogs for destructive actions
- **NFR-3.4:** Loading states for async operations

#### NFR-4: Auditability
- **NFR-4.1:** All admin actions logged to audit system
- **NFR-4.2:** Audit logs include: who, what, when, IP address
- **NFR-4.3:** Audit logs immutable (no deletion)
- **NFR-4.4:** Audit logs retained indefinitely

---

## Database Schema

### User Model Updates

Add new fields to existing `User` model:

```typescript
// interfaces/user.interface.ts

export interface IUser {
  // ... existing fields ...
  
  // Admin Authentication Fields (new)
  username?: string;              // Unique username for admin login
  password?: string;              // Hashed password (bcrypt)
  isAdmin: boolean;               // Flag to identify admin users
  mustChangePassword?: boolean;   // Force password change on next login
  passwordChangedAt?: Date;       // Track password change history
  failedLoginAttempts?: number;   // Track failed login attempts
  accountLockedUntil?: Date;      // Account lockout timestamp
  
  // ... rest of existing fields ...
}
```

### Schema Definition

```typescript
// models/user-model.ts

const userSchema = new Schema<IUser>({
  // ... existing fields ...
  
  // Admin Authentication
  username: {
    type: String,
    unique: true,
    sparse: true,  // Allows null for non-admin users
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  password: {
    type: String,
    select: false,  // Never return in queries by default
    minlength: 8,
  },
  isAdmin: {
    type: Boolean,
    default: false,
    index: true,
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: {
    type: Date,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  accountLockedUntil: {
    type: Date,
  },
  
  // ... rest of existing fields ...
});

// Indexes
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ isAdmin: 1, accountStatus: 1 });
```

### Audit Log Updates

Add new audit actions:

```typescript
// interfaces/audit-log.interface.ts

export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.delete_request'
  | 'user.role-change'
  | 'user.password-reset'        // NEW
  | 'user.password-change'       // NEW
  | 'user.status-change'         // NEW
  | 'admin.create'               // NEW
  | 'admin.login'                // existing
  | 'admin.logout'               // existing
  | 'admin.login-failed'         // NEW
  | 'admin.account-locked'       // NEW
  // ... rest of existing actions ...
```

---

## Authentication Flow

### Admin Login Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN LOGIN FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. Admin navigates to /admin/login
   ↓
2. Admin enters username + password
   ↓
3. Server Action: adminLoginAction()
   - Find user by username
   - Check account status (active/suspended/locked)
   - Verify password with bcrypt.compare()
   - Check failed login attempts
   ↓
4. If valid:
   - Reset failed login attempts
   - Update lastLoginAt
   - Create iron-session
   - Create audit log (admin.login)
   - Check mustChangePassword flag
   ↓
5. If mustChangePassword:
   - Redirect to /admin/change-password
   Else:
   - Redirect to /dashboard
   ↓
6. Admin authenticated ✓

FAILURE CASES:
- Invalid credentials → Increment failedLoginAttempts
- 5 failed attempts → Lock account for 15 minutes
- Account suspended → Show error, create audit log
- Account locked → Show error with unlock time
```

### Admin Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN CREATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. Super-admin navigates to /dashboard/settings/admins
   ↓
2. Super-admin clicks "Create Admin"
   ↓
3. Form displayed with fields:
   - Username (required)
   - Password (required)
   - Email (optional)
   - Full Name (optional)
   - Role (admin/super-admin)
   ↓
4. Super-admin submits form
   ↓
5. Server Action: createAdminAction()
   - Validate username uniqueness
   - Validate password strength
   - Hash password with bcrypt
   - Create user document
   - Set isAdmin = true
   - Set role = selected role
   - Create audit log (admin.create)
   ↓
6. Admin created ✓
   - Show success message
   - Refresh admin list
   - Send welcome email (optional)
```

### Password Reset Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PASSWORD RESET FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. Super-admin selects admin from list
   ↓
2. Super-admin clicks "Reset Password"
   ↓
3. Confirmation dialog shown
   ↓
4. Super-admin confirms
   ↓
5. Server Action: resetAdminPasswordAction()
   - Generate secure temporary password
   - Hash password with bcrypt
   - Update user document
   - Set mustChangePassword = true
   - Invalidate existing sessions
   - Create audit log (user.password-reset)
   ↓
6. Password reset ✓
   - Show temporary password to super-admin
   - Super-admin shares password with admin
   - Admin must change on next login
```

---

## Implementation Plan

### Phase 1: Database & Core Services (2-3 hours)

#### 1.1 Update User Model
- Add new fields to `IUser` interface
- Update `UserModel` schema
- Add indexes for username and isAdmin
- Create migration script for existing users
- Test model changes

**Files to modify:**
- `/interfaces/user.interface.ts`
- `/models/user-model.ts`

#### 1.2 Install Dependencies
```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```

#### 1.3 Create Admin Service
- Create `AdminService` class
- Implement password hashing utilities
- Implement password validation
- Implement admin creation logic
- Implement admin listing/filtering
- Implement password reset logic
- Implement status management

**New file:**
- `/services/admin-service.ts`

### Phase 2: Server Actions (2-3 hours)

#### 2.1 Create Admin Actions
- `createAdminAction` - Create new admin user
- `listAdminsAction` - List all admins with filters
- `resetAdminPasswordAction` - Reset admin password
- `changePasswordAction` - Change own password
- `updateAdminStatusAction` - Activate/suspend admin
- `deleteAdminAction` - Delete admin user

**New file:**
- `/app/actions/admin/admin-management-actions.ts`

#### 2.2 Create Admin Login Action
- `adminLoginAction` - Authenticate admin user
- Handle failed login attempts
- Create audit logs
- Manage account lockout

**New file:**
- `/app/actions/auth/admin-login.ts`

### Phase 3: UI Components (3-4 hours)

#### 3.1 Admin Login Page
- Create admin login page at `/admin/login`
- Username + password form
- Error handling
- Redirect logic

**New file:**
- `/app/admin/login/page.tsx`
- `/components/features/admin/admin-login-form.tsx`

#### 3.2 Admin Management Page
- Create admin management page at `/dashboard/settings/admins`
- Admin list with search/filter
- Create admin dialog
- Admin actions dropdown

**New files:**
- `/app/dashboard/settings/admins/page.tsx`
- `/components/features/admin/admin-list.tsx`
- `/components/features/admin/create-admin-dialog.tsx`
- `/components/features/admin/admin-actions-dropdown.tsx`

#### 3.3 Password Change Page
- Create password change page at `/admin/change-password`
- Force password change for new admins
- Current password verification

**New file:**
- `/app/admin/change-password/page.tsx`
- `/components/features/admin/change-password-form.tsx`

#### 3.4 Update Settings Page
- Add "Manage Admins" link to settings page
- Update navigation

**File to modify:**
- `/app/dashboard/settings/page.tsx`

### Phase 4: Testing & Documentation (1-2 hours)

#### 4.1 Testing
- Test admin creation
- Test admin login
- Test password reset
- Test account lockout
- Test role permissions
- Test audit logging

#### 4.2 Documentation
- Update README with admin setup instructions
- Document environment variables
- Create admin user guide

---

## Security Considerations

### Password Security
- **Bcrypt hashing:** Cost factor of 12 for strong security
- **Password complexity:** Enforced via validation
- **No plain-text storage:** Passwords never stored in plain text
- **Select: false:** Password field excluded from queries by default

### Account Security
- **Account lockout:** 5 failed attempts = 15 minute lockout
- **Session invalidation:** Sessions cleared on password reset/status change
- **Audit logging:** All admin actions logged with details
- **Rate limiting:** Login attempts rate limited (future enhancement)

### Session Security
- **iron-session:** Encrypted session cookies
- **HTTP-only cookies:** Not accessible via JavaScript
- **7-day expiration:** Sessions expire after 7 days
- **Secure flag:** HTTPS-only in production

### Authorization
- **Role-based access:** Super-admin only for admin management
- **Middleware protection:** Dashboard routes protected by middleware
- **Session validation:** Every request validates session
- **Last super-admin protection:** Cannot delete last super-admin

---

## Testing Checklist

### Admin Creation
- [ ] Create admin with valid credentials
- [ ] Create super-admin with valid credentials
- [ ] Reject duplicate username
- [ ] Reject weak password
- [ ] Validate email format
- [ ] Audit log created

### Admin Login
- [ ] Login with valid credentials
- [ ] Reject invalid username
- [ ] Reject invalid password
- [ ] Account lockout after 5 failed attempts
- [ ] Unlock account after 15 minutes
- [ ] Redirect to change password if mustChangePassword
- [ ] Audit log created on success
- [ ] Audit log created on failure

### Password Management
- [ ] Reset password generates temp password
- [ ] Temp password meets complexity requirements
- [ ] Admin forced to change password on next login
- [ ] Change password requires current password
- [ ] Change password validates new password strength
- [ ] Audit log created on reset
- [ ] Audit log created on change

### Status Management
- [ ] Suspend admin account
- [ ] Suspended admin cannot login
- [ ] Activate suspended account
- [ ] Delete admin account
- [ ] Cannot delete last super-admin
- [ ] Audit log created on status change

### UI/UX
- [ ] Admin list loads quickly
- [ ] Search filters work correctly
- [ ] Role filter works correctly
- [ ] Status filter works correctly
- [ ] Pagination works correctly
- [ ] Loading states display correctly
- [ ] Error messages display correctly
- [ ] Success toasts display correctly

---

## File Structure

```
app/
├── actions/
│   ├── admin/
│   │   └── admin-management-actions.ts (NEW)
│   └── auth/
│       └── admin-login.ts (NEW)
├── admin/
│   ├── login/
│   │   └── page.tsx (NEW)
│   └── change-password/
│       └── page.tsx (NEW)
└── dashboard/
    └── settings/
        ├── admins/
        │   └── page.tsx (NEW)
        └── page.tsx (UPDATED)

components/
└── features/
    └── admin/
        ├── admin-login-form.tsx (NEW)
        ├── admin-list.tsx (NEW)
        ├── create-admin-dialog.tsx (NEW)
        ├── admin-actions-dropdown.tsx (NEW)
        └── change-password-form.tsx (NEW)

interfaces/
├── user.interface.ts (UPDATED)
└── audit-log.interface.ts (UPDATED)

models/
└── user-model.ts (UPDATED)

services/
└── admin-service.ts (NEW)

scripts/
├── create-super-admin.ts (NEW)
└── update-admin-credentials.ts (NEW)

package.json (UPDATED - added scripts)
├── "setup:admin": "tsx scripts/create-super-admin.ts"
└── "update:admin": "tsx scripts/update-admin-credentials.ts"
```

---

## Environment Variables

No new environment variables required. Uses existing:
- `SESSION_PASSWORD` - For iron-session encryption
- `SESSION_COOKIE_NAME` - Cookie name
- `MONGODB_URI` - Database connection

---

## Creating the Initial Super-Admin

Since admin management requires super-admin access, you need to create the first super-admin user manually. This is a one-time setup process.

### Method 1: Using a Setup Script (Recommended)

Create a setup script to initialize your first super-admin user.

#### Step 1: Create the Script

Create a new file: `scripts/create-super-admin.ts`

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { connectDB } from '@/lib/mongodb';
import { AdminService } from '@/services/admin-service';
import { UserModel } from '@/models';

async function createSuperAdmin() {
  try {
    console.log('🔧 Connecting to database...');
    await connectDB();

    // Check if any super-admin already exists
    const existingSuperAdmin = await UserModel.findOne({
      role: 'super-admin',
      accountStatus: 'active',
    });

    if (existingSuperAdmin) {
      console.log('⚠️  A super-admin already exists:');
      console.log(`   Username: ${existingSuperAdmin.username}`);
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log('\n✅ No action needed.');
      process.exit(0);
    }

    // Prompt for super-admin details
    console.log('\n📝 Creating initial super-admin user...\n');

    const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123!';
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@wawagardenbar.com';
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

    // Create system user for audit trail (if doesn't exist)
    let systemUser = await UserModel.findOne({ email: 'system@wawagardenbar.com' });
    
    if (!systemUser) {
      systemUser = await UserModel.create({
        email: 'system@wawagardenbar.com',
        firstName: 'System',
        lastName: 'User',
        role: 'super-admin',
        isAdmin: false,
        accountStatus: 'active',
        emailVerified: true,
        phoneVerified: false,
        phone: `system_${Date.now()}`,
      });
    }

    // Create super-admin
    const admin = await AdminService.createAdmin({
      username,
      password,
      email,
      firstName,
      lastName,
      role: 'super-admin',
      createdBy: systemUser._id.toString(),
    });

    console.log('\n✅ Super-admin created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log(`\n🔐 Login URL: http://localhost:3000/admin/login`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error creating super-admin:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();
```

#### Step 2: Add Script to package.json

Add the following script to your `package.json`:

```json
{
  "scripts": {
    "setup:admin": "tsx scripts/create-super-admin.ts"
  }
}
```

#### Step 3: Install tsx (if not already installed)

```bash
npm install -D tsx
```

#### Step 4: Ensure Environment Variables are Set

Make sure your `.env.local` file contains the required MongoDB connection string:

```env
MONGODB_WAWAGARDENBAR_APP_URI=mongodb://localhost:27017
MONGODB_DB_NAME=wawagardenbar
```

The script automatically loads environment variables from `.env.local`.

#### Step 5: Run the Script

**Option A: Using default credentials**

```bash
npm run setup:admin
```

This will create a super-admin with:
- Username: `superadmin`
- Password: `Admin@123!`
- Email: `admin@wawagardenbar.com`

**Option B: Using custom credentials via environment variables**

```bash
SUPER_ADMIN_USERNAME=myadmin \
SUPER_ADMIN_PASSWORD=MySecurePass123! \
SUPER_ADMIN_EMAIL=admin@example.com \
SUPER_ADMIN_FIRST_NAME=John \
SUPER_ADMIN_LAST_NAME=Doe \
npm run setup:admin
```

**Option C: Using .env.local**

Add to your `.env.local` file:

```env
SUPER_ADMIN_USERNAME=myadmin
SUPER_ADMIN_PASSWORD=MySecurePass123!
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_FIRST_NAME=John
SUPER_ADMIN_LAST_NAME=Doe
```

Then run:

```bash
npm run setup:admin
```

#### Step 6: Login and Change Password

1. Navigate to: `http://localhost:3000/admin/login`
2. Login with the credentials shown in the script output
3. You will be prompted to change your password (if using temporary password)
4. Access the dashboard and create additional admin users as needed

### Method 2: Using MongoDB Directly

If you prefer to create the super-admin directly in MongoDB:

```javascript
// Run this in MongoDB shell or Compass
db.users.insertOne({
  username: "superadmin",
  password: "$2b$12$YOUR_HASHED_PASSWORD_HERE", // Use bcrypt to hash
  email: "admin@wawagardenbar.com",
  firstName: "Super",
  lastName: "Admin",
  role: "super-admin",
  isAdmin: true,
  accountStatus: "active",
  emailVerified: true,
  phoneVerified: false,
  phone: "admin_" + Date.now(),
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

**To hash a password with bcrypt:**

```bash
# Install bcrypt-cli
npm install -g bcrypt-cli

# Hash your password
bcrypt-cli "YourPassword123!" 12
```

### Method 3: Using Node.js REPL

```bash
# Start Node.js with TypeScript support
npx tsx

# Then run:
```

```typescript
import bcrypt from 'bcrypt';
import { connectDB } from './lib/mongodb';
import { UserModel } from './models';

await connectDB();

const hashedPassword = await bcrypt.hash('Admin@123!', 12);

const admin = await UserModel.create({
  username: 'superadmin',
  password: hashedPassword,
  email: 'admin@wawagardenbar.com',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'super-admin',
  isAdmin: true,
  accountStatus: 'active',
  emailVerified: true,
  phoneVerified: false,
  phone: `admin_${Date.now()}`,
  failedLoginAttempts: 0,
});

console.log('Super-admin created:', admin.username);
```

### Security Best Practices

1. **Change Default Password Immediately**
   - Never use default credentials in production
   - Change password after first login

2. **Use Strong Passwords**
   - Minimum 8 characters
   - Include uppercase, lowercase, numbers, and special characters
   - Use a password manager

3. **Secure the Setup Script**
   - Delete or secure the setup script after use
   - Never commit credentials to version control
   - Use environment variables for sensitive data

4. **Limit Super-Admin Accounts**
   - Create only necessary super-admin accounts
   - Use regular admin accounts for day-to-day operations
   - Audit super-admin actions regularly

### Method 4: Update Existing Super-Admin with Username/Password

If you already have a super-admin user without a username (created via the passwordless system), you can add admin credentials using the update script.

#### Use Case
This is useful when:
- You have an existing super-admin created through the customer authentication flow
- The user doesn't have a username set
- You want to enable admin login for this user

#### Running the Update Script

**Option A: Using default credentials**

```bash
npm run update:admin
```

This will update the user with email from `ADMIN_EMAIL` env var (or `william@ostendo.io` by default) with:
- Username: `superadmin`
- Password: `Admin@123!`

**Option B: Specify credentials via command line**

```bash
npm run update:admin <email> <username> <password>
```

Example:
```bash
npm run update:admin william@ostendo.io myadmin MySecurePass123!
```

**Option C: Using environment variables**

Add to your `.env.local`:
```env
ADMIN_EMAIL=william@ostendo.io
ADMIN_USERNAME=william
ADMIN_PASSWORD=MySecurePass123!
```

Then run:
```bash
npm run update:admin
```

#### Expected Output

```
🔧 Connecting to database...

📝 Updating admin credentials for: william@ostendo.io

✅ Admin credentials updated successfully!

📋 Login Credentials:
   Email: william@ostendo.io
   Username: superadmin
   Password: Admin@123!

🔐 Login URL: http://localhost:3000/admin/login

⚠️  IMPORTANT: Change the password after first login!
```

#### What the Script Does

1. Finds the super-admin user by email
2. Checks if the username is available
3. Hashes the password using bcrypt (cost factor 12)
4. Updates the user with:
   - `username`
   - `password` (hashed)
   - `isAdmin: true`
   - `mustChangePassword: false`
   - `passwordChangedAt: now`
   - Resets `failedLoginAttempts` and `accountLockedUntil`
5. Saves the updated user to the database

### Troubleshooting

**Error: "Username already exists"**
- A super-admin with that username already exists
- Use a different username or check existing admins

**Error: "Password validation failed"**
- Ensure password meets complexity requirements
- Check the password validation rules in AdminService

**Error: "Cannot connect to database"**
- Verify MongoDB is running
- Check MONGODB_URI in .env.local
- Ensure database connection is configured correctly

**Error: "No super-admin found with email"**
- The email provided doesn't match any super-admin user
- Check the list of available super-admins shown in the error output
- Verify the email is correct

**Script runs but no admin created**
- Check console output for errors
- Verify database connection
- Check MongoDB logs

**Warning: "A super-admin already exists: Username: undefined"**
- This means you have a super-admin without a username
- Use `npm run update:admin` to add credentials to this user

---

## Next Steps

1. **Phase 1:** Update database schema and create AdminService ✅
2. **Phase 2:** Implement server actions for admin management ✅
3. **Phase 3:** Build UI components and pages ✅
4. **Phase 4:** Create initial super-admin using setup script
5. **Phase 5:** Test thoroughly and document

---

*Document created: December 11, 2024*
*Last updated: December 11, 2024*
