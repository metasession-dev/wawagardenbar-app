# Test Case Template

Use this template when creating new test cases for the Wawa Garden Bar platform.

---

## Test Case Information

**Test ID**: [CATEGORY-XXX]  
**Test Name**: [Descriptive name of what is being tested]  
**Priority**: [Critical | High | Medium | Low]  
**Category**: [Auth | Menu | Cart | Order | Payment | Admin | etc.]  
**Created By**: [Your Name]  
**Date Created**: [YYYY-MM-DD]  
**Last Updated**: [YYYY-MM-DD]

---

## Test Description

**Objective**: [What is this test validating?]

**User Story**: [As a [role], I want to [action], so that [benefit]]

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Prerequisites

**Test Data Required**:
- [ ] Test user account (specify role)
- [ ] Menu items seeded
- [ ] Specific database state
- [ ] Other dependencies

**Environment Setup**:
- [ ] Test database initialized
- [ ] Test server running
- [ ] Mock services configured
- [ ] Environment variables set

---

## Test Steps

### Step 1: [Action]
**Action**: [What to do]  
**Expected Result**: [What should happen]

```typescript
// Code example if applicable
await page.goto('/menu');
await expect(page.locator('h1')).toHaveText('Menu');
```

### Step 2: [Action]
**Action**: [What to do]  
**Expected Result**: [What should happen]

### Step 3: [Action]
**Action**: [What to do]  
**Expected Result**: [What should happen]

---

## Test Implementation

### File Location
`tests/e2e/[category]/[test-file].spec.ts`

### Code Template

```typescript
import { test, expect } from '@playwright/test';
// or import { test, expect } from '../fixtures/auth.fixture';

test.describe('[Category Name]', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('[TEST-ID]: [Test Name]', async ({ page }) => {
    // Step 1: [Description]
    await page.goto('/path');
    
    // Step 2: [Description]
    await page.click('button');
    
    // Step 3: [Description]
    await expect(page.locator('text=Success')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup after each test
  });
});
```

---

## Test Data

### Input Data
```typescript
const testData = {
  email: 'test@example.com',
  name: 'Test User',
  // Add other test data
};
```

### Expected Output
```typescript
const expectedResult = {
  status: 'success',
  message: 'Operation completed',
  // Add expected values
};
```

---

## Assertions

### Primary Assertions
- [ ] Element visibility
- [ ] Text content
- [ ] URL navigation
- [ ] Data persistence
- [ ] Status codes

### Secondary Assertions
- [ ] Error handling
- [ ] Edge cases
- [ ] Performance
- [ ] Accessibility

---

## Edge Cases & Variations

### Variation 1: [Scenario]
**Description**: [What's different]  
**Expected Behavior**: [How it should behave]

### Variation 2: [Scenario]
**Description**: [What's different]  
**Expected Behavior**: [How it should behave]

---

## Error Scenarios

### Error Case 1: [Invalid Input]
**Trigger**: [How to cause error]  
**Expected Error**: [Error message/behavior]  
**Recovery**: [How user can recover]

### Error Case 2: [Network Failure]
**Trigger**: [How to cause error]  
**Expected Error**: [Error message/behavior]  
**Recovery**: [How user can recover]

---

## Dependencies

**Depends On**:
- [ ] [TEST-ID]: [Test Name]
- [ ] [TEST-ID]: [Test Name]

**Blocks**:
- [ ] [TEST-ID]: [Test Name]
- [ ] [TEST-ID]: [Test Name]

---

## Browser/Device Coverage

- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] Tablet

---

## Performance Criteria

**Expected Execution Time**: [X seconds]  
**Page Load Time**: [< X seconds]  
**API Response Time**: [< X ms]

---

## Accessibility Requirements

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

---

## Notes & Comments

### Known Issues
- [Issue description and tracking link]

### Future Improvements
- [Potential enhancement]

### Related Documentation
- [Link to requirements]
- [Link to design specs]

---

## Test Execution History

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
| YYYY-MM-DD | [Name] | Pass/Fail | [Comments] |
| YYYY-MM-DD | [Name] | Pass/Fail | [Comments] |

---

## Example: Complete Test Case

Below is a complete example following this template:

---

## Test Case Information

**Test ID**: AUTH-001  
**Test Name**: User can request PIN via email  
**Priority**: Critical  
**Category**: Authentication  
**Created By**: QA Team  
**Date Created**: 2025-12-11  
**Last Updated**: 2025-12-11

---

## Test Description

**Objective**: Verify that users can successfully request a login PIN via email

**User Story**: As a customer, I want to request a login PIN via email, so that I can authenticate without a password

**Acceptance Criteria**:
- [ ] Email input field is visible and functional
- [ ] Valid email triggers PIN generation
- [ ] Success message is displayed
- [ ] PIN is sent to email (or logged in test environment)
- [ ] Invalid email shows appropriate error

---

## Prerequisites

**Test Data Required**:
- [x] Test user account with email: customer@test.com
- [ ] Email service configured (or mocked)

**Environment Setup**:
- [x] Test database initialized
- [x] Test server running on localhost:3000
- [x] Environment variables set in .env.test

---

## Test Steps

### Step 1: Navigate to Login Page
**Action**: Open browser and navigate to `/login`  
**Expected Result**: Login page loads with email input field visible

```typescript
await page.goto('/login');
await expect(page.locator('input[name="email"]')).toBeVisible();
```

### Step 2: Enter Valid Email
**Action**: Type `customer@test.com` into email field  
**Expected Result**: Email is accepted without validation errors

```typescript
await page.fill('input[name="email"]', 'customer@test.com');
```

### Step 3: Click Request PIN Button
**Action**: Click "Request PIN" button  
**Expected Result**: Loading state shown, then success message appears

```typescript
await page.click('button:has-text("Request PIN")');
await expect(page.locator('text=PIN sent to your email')).toBeVisible();
```

### Step 4: Verify PIN Input Field Appears
**Action**: Wait for PIN input field to appear  
**Expected Result**: 4-digit PIN input field is visible and focused

```typescript
await expect(page.locator('input[name="pin"]')).toBeVisible();
await expect(page.locator('input[name="pin"]')).toBeFocused();
```

---

## Test Implementation

### File Location
`tests/e2e/auth/customer-login.spec.ts`

### Code Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Customer Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('AUTH-001: User can request PIN via email', async ({ page }) => {
    // Step 1: Verify login page loaded
    await expect(page.locator('input[name="email"]')).toBeVisible();
    
    // Step 2: Enter email
    await page.fill('input[name="email"]', 'customer@test.com');
    
    // Step 3: Request PIN
    await page.click('button:has-text("Request PIN")');
    
    // Step 4: Verify success message
    await expect(page.locator('text=PIN sent to your email')).toBeVisible();
    
    // Step 5: Verify PIN input appears
    await expect(page.locator('input[name="pin"]')).toBeVisible();
  });
});
```

---

## Test Data

### Input Data
```typescript
const testData = {
  validEmail: 'customer@test.com',
  invalidEmail: 'invalid-email',
  nonExistentEmail: 'nonexistent@test.com'
};
```

### Expected Output
```typescript
const expectedResult = {
  successMessage: 'PIN sent to your email',
  pinInputVisible: true,
  pinLength: 4
};
```

---

## Assertions

### Primary Assertions
- [x] Email input field is visible
- [x] Request PIN button is clickable
- [x] Success message appears after request
- [x] PIN input field becomes visible

### Secondary Assertions
- [ ] Loading state is shown during request
- [ ] Email is validated before submission
- [ ] Rate limiting prevents spam requests

---

## Edge Cases & Variations

### Variation 1: Invalid Email Format
**Description**: User enters malformed email  
**Expected Behavior**: Validation error shown, PIN not sent

### Variation 2: Non-Existent Email
**Description**: User enters email not in database  
**Expected Behavior**: New user account created, PIN sent

### Variation 3: Rate Limiting
**Description**: User requests PIN multiple times rapidly  
**Expected Behavior**: Rate limit error after 3 requests in 5 minutes

---

## Error Scenarios

### Error Case 1: Invalid Email Format
**Trigger**: Enter "invalid-email" and click Request PIN  
**Expected Error**: "Please enter a valid email address"  
**Recovery**: Correct email format and retry

### Error Case 2: Network Failure
**Trigger**: Disconnect network and request PIN  
**Expected Error**: "Unable to send PIN. Please check your connection."  
**Recovery**: Reconnect and retry

---

## Dependencies

**Depends On**:
- [ ] Email service configured
- [ ] User model in database

**Blocks**:
- [x] AUTH-002: User can login with valid PIN
- [x] AUTH-003: User cannot login with invalid PIN

---

## Browser/Device Coverage

- [x] Desktop Chrome
- [x] Desktop Firefox
- [x] Desktop Safari
- [x] Mobile Chrome
- [x] Mobile Safari
- [ ] Tablet (lower priority)

---

## Performance Criteria

**Expected Execution Time**: 3-5 seconds  
**Page Load Time**: < 2 seconds  
**API Response Time**: < 500ms for PIN generation

---

## Accessibility Requirements

- [x] Keyboard navigation works (Tab to email, Tab to button, Enter to submit)
- [x] Screen reader announces "Email input" and "Request PIN button"
- [x] ARIA labels present on form elements
- [x] Color contrast meets WCAG AA (4.5:1 for text)
- [x] Focus indicators visible on all interactive elements

---

## Notes & Comments

### Known Issues
- None currently

### Future Improvements
- Add SMS option for PIN delivery
- Implement biometric authentication

### Related Documentation
- Requirements: `/.windsurf/rules/requirements.md` (Authentication section)
- API Docs: `/docs/API.md` (Auth endpoints)

---

## Test Execution History

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
| 2025-12-11 | QA Team | Not Run | Test case created |
| - | - | - | - |

---

## Checklist Before Submitting Test Case

- [ ] Test ID is unique and follows naming convention
- [ ] All sections are filled out
- [ ] Test steps are clear and reproducible
- [ ] Code examples are provided
- [ ] Edge cases are identified
- [ ] Accessibility requirements are considered
- [ ] Dependencies are documented
- [ ] Test is reviewed by peer
- [ ] Test is added to test suite
- [ ] Documentation is updated

---

**Template Version**: 1.0  
**Last Updated**: 2025-12-11
