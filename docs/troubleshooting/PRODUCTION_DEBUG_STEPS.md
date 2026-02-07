# Production Debugging Steps for Moniepoint Import

## Current Status
Still getting "An unexpected error occurred" in production after deploying enhanced logging.

## Immediate Actions Required

### 1. Check Browser Console (Most Important)
Open browser DevTools (F12) and check:
- **Console tab**: Look for client-side errors
- **Network tab**: Check the server action request/response
  - Find the request to the server action
  - Check if it returns 200 or error status
  - View the response body to see actual error message

### 2. Check Docker Logs
```bash
# View real-time logs
docker logs -f <container-name>

# Search for our new log messages
docker logs <container-name> 2>&1 | grep "importMoniepointCSVAction"
docker logs <container-name> 2>&1 | grep "XLSX"
docker logs <container-name> 2>&1 | grep "Error"
```

Look for these specific log messages:
- `=== importMoniepointCSVAction called ===`
- `1. Connecting to DB...`
- `2. Getting session...`
- `3. Checking admin access...`
- `4. Extracting file from FormData...`
- `5. Reading file as ArrayBuffer...`
- `6. Validating XLSX structure...`
- `7. Getting existing references...`
- `8. Parsing XLSX...`

### 3. Run Diagnostic Script
```bash
docker exec -it <container-name> npm run check:xlsx
```

This will verify if the XLSX module is properly loaded.

## What to Look For

### Browser Network Tab
1. Open DevTools → Network tab
2. Click "Upload & Import"
3. Find the POST request (usually to a route like `/api/...` or server action)
4. Check:
   - **Status Code**: Should be 200, if 500 there's a server error
   - **Response**: Click on it and view the response body
   - **Timing**: If it times out, might be a memory issue

### Expected vs Actual Behavior

**If logs show nothing:**
- Server action is not being called at all
- Possible client-side issue or routing problem

**If logs show step 1-4 but stop:**
- Issue with file extraction or validation
- Check file size and format

**If logs show step 5-6 but stop:**
- XLSX module issue
- ArrayBuffer conversion problem

**If logs show "XLSX module not available":**
- Package not installed in production
- Need to rebuild Docker image

## Quick Test

Try uploading a MINIMAL Excel file (just 2-3 rows) to rule out:
- Memory issues
- File size problems
- Complex data parsing issues

## Next Steps Based on Findings

### If Browser Console Shows Error
- Copy the exact error message
- Check if it's a network error, CORS, or server error

### If Docker Logs Show Specific Step Failure
- Focus on that specific step
- Check the service/function that step calls

### If No Logs Appear At All
- Server action might not be deployed
- Check if code was properly built and deployed
- Verify Docker image was rebuilt

### If XLSX Module Not Found
```bash
# Check if xlsx is installed
docker exec -it <container-name> ls -la node_modules/xlsx

# Rebuild without cache
docker build --no-cache -t wawa-app .
docker-compose up -d --force-recreate
```

## Common Issues and Solutions

### Issue: "Unauthorized: Admin access required"
**Solution**: Session not properly set, check authentication

### Issue: "No file provided"
**Solution**: FormData not being sent correctly from client

### Issue: "XLSX module not properly loaded"
**Solution**: Rebuild Docker image, ensure xlsx is in dependencies

### Issue: "Failed to read Excel file"
**Solution**: File format issue or XLSX.read failing

### Issue: Request timeout
**Solution**: File too large or memory limit exceeded

## Files Modified for Debugging
1. `app/actions/expenses/csv-import-actions.ts` - Added extensive logging
2. `services/xlsx-parser-service.ts` - Added XLSX module checks
3. `components/features/admin/expenses/csv-import-button.tsx` - Added client error logging
4. `scripts/check-xlsx-module.ts` - Diagnostic script

## Report Back With
1. Browser console errors (screenshot or copy/paste)
2. Docker logs output (especially the numbered steps)
3. Network tab response body
4. Result of diagnostic script
