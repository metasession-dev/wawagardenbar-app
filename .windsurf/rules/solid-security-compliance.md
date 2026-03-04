# SOLID Principles, Security & Compliance Ruleset

## SOLID Principles

### Single Responsibility Principle (SRP)
* Each class, function, or module must have ONE and only ONE reason to change
* Separate concerns into distinct modules (e.g., data access, business logic, presentation)
* Services should handle ONE domain area (e.g., `OrderService` only handles orders)
* Components should have a single, well-defined purpose
* If a function does multiple things, split it into smaller functions

### Open/Closed Principle (OCP)
* Code should be open for extension but closed for modification
* Use interfaces and abstract classes to define contracts
* Prefer composition over inheritance
* Use strategy pattern for varying behaviors (e.g., payment providers)
* Extend functionality through new classes, not by modifying existing ones
* Use dependency injection to swap implementations

### Liskov Substitution Principle (LSP)
* Derived classes must be substitutable for their base classes
* Subclasses should not break the contract of the parent class
* Ensure return types and exceptions are compatible
* Maintain behavioral consistency across implementations
* Avoid strengthening preconditions or weakening postconditions

### Interface Segregation Principle (ISP)
* Clients should not depend on interfaces they don't use
* Create small, focused interfaces rather than large, monolithic ones
* Split large interfaces into smaller, role-specific interfaces
* Avoid "fat" interfaces with many unrelated methods
* Each interface should represent a specific capability

### Dependency Inversion Principle (DIP)
* High-level modules should not depend on low-level modules; both should depend on abstractions
* Depend on interfaces/abstractions, not concrete implementations
* Use dependency injection for external dependencies
* Inject services through constructors or parameters
* Avoid direct instantiation of dependencies within classes

---

## Security Best Practices

### Authentication & Authorization
* **NEVER** store passwords in plain text; always use bcrypt with cost factor ≥12
* Implement account lockout after failed login attempts (e.g., 5 attempts = 15 min lockout)
* Enforce strong password policies: 8+ chars, uppercase, lowercase, number, special char
* Use session-based authentication with secure, httpOnly cookies
* Validate user roles and permissions on EVERY protected route/action
* Implement role-based access control (RBAC) consistently
* Use `requireAuth`, `requireAdmin`, `requireSuperAdmin` middleware consistently
* Never trust client-side role checks; always verify server-side

### Input Validation & Sanitization
* **ALWAYS** validate and sanitize ALL user inputs (forms, query params, headers)
* Use Zod schemas for runtime validation on server actions and API routes
* Validate data types, formats, lengths, and ranges
* Sanitize inputs to prevent XSS attacks (escape HTML, JavaScript)
* Use parameterized queries or ORM methods to prevent SQL/NoSQL injection
* Validate file uploads: type, size, content
* Never trust data from the client; validate on the server

### API Security
* Implement rate limiting on ALL API routes (use `/lib/rate-limiter.ts`)
* Use different rate limits based on sensitivity:
  - Strict (5/min): Authentication endpoints
  - Moderate (30/min): Payment, admin, rewards endpoints
  - Relaxed (120/min): Public read endpoints
* Require authentication for ALL sensitive endpoints
* Use API keys for external integrations with scope-based permissions
* Validate API key scopes before allowing access
* Implement CORS with explicit allowed origins (never use `*` in production)
* Add security headers: X-Frame-Options, X-Content-Type-Options, HSTS, CSP
* Validate webhook signatures (HMAC) for external services (Monnify, Paystack, WhatsApp)

### Data Protection
* **NEVER** expose sensitive data in API responses (passwords, API keys, secrets)
* Use environment variables for ALL secrets and configuration
* Never commit `.env` files to version control
* Encrypt sensitive data at rest (use bcrypt for passwords, encryption for PII)
* Use HTTPS in production (enforce with HSTS header)
* Implement proper session management with secure cookies
* Set appropriate cookie flags: `httpOnly`, `secure`, `sameSite`
* Sanitize error messages; never expose stack traces or internal details to clients

### Database Security
* Use Mongoose schema validation for all models
* Define indexes properly (unique, sparse) to prevent duplicate key errors
* Use `.lean()` for read-only queries to improve performance
* Serialize Mongoose documents before passing to client components: `JSON.parse(JSON.stringify(doc))`
* Validate ObjectIds before querying to prevent BSONError
* Use transactions for operations that modify multiple collections
* Implement soft deletes for sensitive data (audit trail)

### Payment Security
* **NEVER** store credit card details; use payment gateway tokens
* Validate payment webhooks with signature verification
* Implement idempotency keys to prevent duplicate charges
* Log all payment transactions for audit purposes
* Use HTTPS for all payment-related requests
* Validate payment amounts server-side before processing
* Implement proper error handling for payment failures

### File Upload Security
* Validate file types using MIME type and file extension
* Limit file sizes to prevent DoS attacks
* Store uploaded files outside the web root or use cloud storage
* Generate unique, non-guessable filenames
* Scan files for malware if possible
* Serve files with correct Content-Type headers
* Implement access control for uploaded files

---

## Compliance & Data Privacy

### GDPR & Data Protection
* Obtain explicit consent before collecting personal data
* Provide clear privacy policy explaining data usage
* Implement "right to be forgotten" (data deletion requests)
* Allow users to export their data
* Minimize data collection (only collect what's necessary)
* Implement data retention policies
* Anonymize or pseudonymize data where possible
* Secure data transfers (use encryption)

### Audit Logging
* Log ALL security-sensitive actions (login, logout, password changes, role changes)
* Log admin actions (order modifications, user management, settings changes)
* Include: userId, action, timestamp, IP address, metadata
* Use `AuditLogService.createLog()` consistently
* Never log sensitive data (passwords, payment details)
* Implement log retention policies
* Protect logs from tampering (write-only access)

### Data Deletion
* Verify user has no open tabs or active orders before deletion
* Send confirmation email before deleting account
* Permanently delete user data (not just soft delete)
* Remove user from all related collections
* Log deletion requests and approvals
* Require admin approval for deletion requests (optional)

---

## Code Quality & Maintainability

### Error Handling
* Use try-catch blocks for ALL async operations
* Return structured error responses: `{ success: false, error: 'message' }`
* Log errors server-side with context (user, action, timestamp)
* Never expose internal error details to clients
* Use custom error classes for different error types
* Handle edge cases explicitly (null, undefined, empty arrays)
* Validate function inputs and return types

### Type Safety
* Use TypeScript for ALL code (no JavaScript files)
* Define interfaces for ALL data structures
* Avoid `any` type; use `unknown` if type is truly unknown
* Use strict TypeScript configuration (`strict: true`)
* Define return types for all functions
* Use generics for reusable components and functions
* Validate types at runtime with Zod schemas

### Testing
* Write unit tests for business logic (services, utilities)
* Write integration tests for API routes and server actions
* Write E2E tests for critical user flows (checkout, payment, order tracking)
* Test error cases and edge cases
* Mock external dependencies (payment gateways, email services)
* Achieve minimum 80% code coverage for critical paths
* Run tests in CI/CD pipeline before deployment

### Code Organization
* Follow the project structure defined in DIRECTORY-STRUCTURE.md
* Group related files in feature folders
* Use barrel exports (`index.ts`) for cleaner imports
* Keep files focused and under 300 lines
* Extract reusable logic into utilities or hooks
* Separate client and server code clearly
* Use consistent naming conventions (see code-style-guide.md)

### Documentation
* Use JSDoc for public functions and classes
* Document complex algorithms or business logic
* Keep README files up to date
* Document API endpoints with request/response examples
* Maintain CHANGELOG for significant changes
* Document environment variables in `.env.example`
* Add inline comments for non-obvious code

---

## Performance & Scalability

### Database Optimization
* Use indexes for frequently queried fields
* Use `.lean()` for read-only queries
* Implement pagination for large datasets (max 100 items per page)
* Use aggregation pipelines for complex queries
* Avoid N+1 queries; use `.populate()` wisely
* Cache frequently accessed data (Redis, in-memory)
* Monitor query performance and optimize slow queries

### Frontend Optimization
* Use React Server Components by default
* Minimize `use client` directives
* Implement code splitting and lazy loading
* Optimize images (WebP format, lazy loading, size data)
* Use Suspense for async components
* Minimize bundle size (tree shaking, dynamic imports)
* Implement proper loading and error states

### API Optimization
* Implement caching headers (Cache-Control, ETag)
* Use compression (gzip, brotli)
* Minimize response payload size
* Implement pagination and filtering
* Use HTTP/2 for multiplexing
* Optimize database queries before sending responses

---

## Deployment & DevOps

### Environment Configuration
* Use separate environments: development, staging, production
* Never use production credentials in development
* Use environment-specific configuration files
* Validate required environment variables on startup
* Use secrets management for sensitive data (AWS Secrets Manager, Vault)

### Monitoring & Logging
* Implement application monitoring (errors, performance)
* Set up alerts for critical errors
* Monitor database performance and connections
* Track API response times and error rates
* Implement health check endpoints
* Use structured logging (JSON format)

### CI/CD
* Run tests automatically on every commit
* Implement automated code quality checks (ESLint, Prettier)
* Use automated deployment pipelines
* Implement rollback mechanisms
* Use feature flags for gradual rollouts
* Perform security scans on dependencies

---

## Specific Rules for This Project

### Next.js 16 Specifics
* Use `proxy.ts` instead of `middleware.ts` for all middleware logic
* Implement rate limiting in proxy.ts
* Add CORS headers in proxy.ts
* Use App Router patterns (Server Components, Server Actions)
* Implement proper error boundaries (`error.tsx`, `not-found.tsx`)

### MongoDB & Mongoose
* Always call `connectDB()` before database operations
* Use `JSON.parse(JSON.stringify())` to serialize Mongoose docs for client components
* Validate ObjectIds before querying: `mongoose.Types.ObjectId.isValid(id)`
* Use sparse indexes for optional unique fields (e.g., email)
* Implement proper error handling for duplicate key errors (E11000)

### Payment Integration
* Support multiple payment providers (Monnify, Paystack)
* Use facade pattern in `PaymentService` to route to correct provider
* Validate webhook signatures for ALL payment webhooks
* Implement idempotency for payment operations
* Log all payment transactions in audit log

### Real-Time Features
* Use Socket.IO for real-time updates (orders, kitchen display)
* Implement proper room management for targeted updates
* Emit events with complete data payloads
* Handle connection errors gracefully
* Implement reconnection logic on client

### Admin Dashboard
* Enforce role-based permissions on ALL admin routes
* Use `requireAdmin` or `requireSuperAdmin` middleware
* Log all admin actions in audit log
* Implement confirmation dialogs for destructive actions
* Validate admin actions server-side (never trust client)

---

## Checklist for Every Code Change

Before committing code, verify:

- [ ] Code follows SOLID principles
- [ ] All inputs are validated and sanitized
- [ ] Authentication and authorization are enforced
- [ ] Sensitive data is not exposed
- [ ] Error handling is implemented
- [ ] Types are properly defined (no `any`)
- [ ] Code is tested (unit, integration, or E2E)
- [ ] Documentation is updated
- [ ] Security best practices are followed
- [ ] Performance is considered
- [ ] Audit logging is implemented (if applicable)
- [ ] Rate limiting is applied (if API route)
- [ ] CORS is configured correctly
- [ ] Environment variables are used for secrets
- [ ] Code is formatted (Prettier) and linted (ESLint)

---

## Security Incident Response

If a security vulnerability is discovered:

1. **Assess severity**: Critical, High, Medium, Low
2. **Contain the issue**: Disable affected feature if necessary
3. **Fix the vulnerability**: Apply patch immediately
4. **Test the fix**: Ensure vulnerability is resolved
5. **Deploy the fix**: Use expedited deployment process
6. **Notify affected users**: If data breach occurred
7. **Document the incident**: Root cause analysis, lessons learned
8. **Review similar code**: Check for similar vulnerabilities
9. **Update security practices**: Prevent recurrence

---

## References

* OWASP Top 10: https://owasp.org/www-project-top-ten/
* SOLID Principles: https://en.wikipedia.org/wiki/SOLID
* TypeScript Best Practices: https://www.typescriptlang.org/docs/handbook/
* Next.js Security: https://nextjs.org/docs/app/building-your-application/security
* GDPR Compliance: https://gdpr.eu/
