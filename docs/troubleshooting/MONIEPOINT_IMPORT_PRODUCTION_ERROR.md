# Moniepoint Excel Import - Production Error Troubleshooting

## Issue Description

**Error:** "An unexpected error occurred" when uploading Moniepoint Excel files in production
**Environment:** Production (Docker)
**Status:** Works in local development, fails in production
**Logs:** No errors showing in Docker logs

## Changes Made for Debugging

### 1. Enhanced Error Logging in Server Action

**File:** `app/actions/expenses/csv-import-actions.ts`

Added detailed error capture:
- Full error stack traces
- Error type identification (ReferenceError, TypeError, etc.)
- Specific logging for common error types

```typescript
catch (error) {
  console.error('XLSX import error:', error);
  console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
  console.error('Error type:', error?.constructor?.name);
  
  // Returns detailed error message with error type
  return {
    success: false,
    error: `${errorMessage}${errorDetails ? ` (${error?.constructor?.name})` : ''}`,
  };
}
```

### 2. XLSX Module Availability Checks

**File:** `services/xlsx-parser-service.ts`

Added multiple safeguards:

1. **Module import verification:**
```typescript
// At top of file
if (!XLSX || !XLSX.read) {
  console.error('CRITICAL: XLSX module not properly loaded!');
  console.error('XLSX object:', XLSX);
}
```

2. **Runtime check before parsing:**
```typescript
if (!XLSX || typeof XLSX.read !== 'function') {
  console.error('XLSX module not available or read function missing');
  return {
    success: false,
    errors: ['XLSX module not properly loaded. This is a server configuration issue.'],
  };
}
```

3. **Isolated XLSX.read error handling:**
```typescript
try {
  workbook = XLSX.read(fileBuffer, { type: 'array' });
} catch (xlsxError) {
  console.error('XLSX.read failed:', xlsxError);
  return {
    success: false,
    errors: [`Failed to read Excel file: ${xlsxError.message}`],
  };
}
```

### 3. Diagnostic Script

**File:** `scripts/check-xlsx-module.ts`

Created diagnostic script to verify XLSX module in production:

```bash
# Run in production container
npm run check:xlsx
# or
tsx scripts/check-xlsx-module.ts
```

This script checks:
- ✓ XLSX module can be imported
- ✓ XLSX.read function exists
- ✓ Can create and read test Excel files
- ✓ node_modules/xlsx directory exists
- ✓ Package version and files

## Possible Root Causes

### 1. **Missing xlsx Package in Production** (Most Likely)
- Package not installed during Docker build
- Check: `npm ci --omit=dev` might be excluding it incorrectly
- Solution: Verify package.json has `xlsx` in `dependencies` (not `devDependencies`)

### 2. **Memory Limits**
- Large Excel files exceeding container memory
- Check: Docker container memory limits
- Solution: Increase memory allocation or add file size validation

### 3. **File Buffer Handling**
- ArrayBuffer conversion failing in production
- Check: `await file.arrayBuffer()` compatibility
- Solution: Use alternative buffer conversion method

### 4. **Module Resolution Issues**
- XLSX package not being copied to production image
- Check: Dockerfile COPY commands
- Solution: Ensure node_modules is properly copied

### 5. **Native Dependencies**
- XLSX might have native dependencies not available in Alpine Linux
- Check: Dockerfile uses `node:20-alpine`
- Solution: Install additional system dependencies or use full node image

## Diagnostic Steps

### Step 1: Check Docker Logs with Verbose Output

```bash
# View real-time logs
docker logs -f <container-name>

# Check for CRITICAL or XLSX errors
docker logs <container-name> 2>&1 | grep -i "xlsx\|critical\|error"
```

### Step 2: Run Diagnostic Script in Container

```bash
# Execute in running container
docker exec -it <container-name> tsx scripts/check-xlsx-module.ts

# Or add to package.json and run
docker exec -it <container-name> npm run check:xlsx
```

### Step 3: Verify Package Installation

```bash
# Check if xlsx is installed
docker exec -it <container-name> ls -la node_modules/xlsx

# Check package version
docker exec -it <container-name> cat node_modules/xlsx/package.json | grep version
```

### Step 4: Test File Upload with Smaller File

Try uploading a minimal Excel file (2-3 rows) to isolate if it's a memory/size issue.

### Step 5: Check Application Logs

Look for the new detailed error messages:
- "XLSX module not properly loaded"
- "Failed to read Excel file: [specific error]"
- Error type in parentheses (ReferenceError, TypeError, etc.)

## Quick Fixes to Try

### Fix 1: Add xlsx to package.json scripts

Add to `package.json`:
```json
"scripts": {
  "check:xlsx": "tsx scripts/check-xlsx-module.ts"
}
```

### Fix 2: Rebuild Docker Image

```bash
# Clear build cache and rebuild
docker build --no-cache -t wawa-app .
docker-compose up -d --force-recreate
```

### Fix 3: Verify Dockerfile Copies Services

Ensure Dockerfile line 72 is present:
```dockerfile
COPY --from=builder /app/services ./services
```

### Fix 4: Add System Dependencies (if needed)

If XLSX requires native modules, add to Dockerfile:
```dockerfile
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++
```

## Expected Error Messages (After Changes)

With the enhanced logging, you should now see one of these specific errors:

1. **Module Not Loaded:**
   ```
   XLSX module not properly loaded. This is a server configuration issue.
   ```

2. **Read Function Missing:**
   ```
   XLSX module not available or read function missing
   ```

3. **File Read Error:**
   ```
   Failed to read Excel file: [specific error message]
   ```

4. **Generic Error with Type:**
   ```
   [Error message] (ReferenceError)
   [Error message] (TypeError)
   ```

## Next Steps

1. **Deploy the changes** to production
2. **Attempt file upload** again
3. **Check Docker logs** for the new detailed error messages
4. **Run diagnostic script** in production container
5. **Report back** with specific error message

## Package Verification

Current package.json (line 74):
```json
"xlsx": "^0.18.5"
```

This is correctly in `dependencies` (not `devDependencies`), so it should be installed in production.

## Additional Resources

- XLSX.js Documentation: https://docs.sheetjs.com/
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- Docker Multi-stage Builds: https://docs.docker.com/build/building/multi-stage/

## Contact

If issue persists after trying these steps, provide:
1. Full error message from Docker logs
2. Output from diagnostic script
3. Docker container memory limits
4. Excel file size being uploaded
