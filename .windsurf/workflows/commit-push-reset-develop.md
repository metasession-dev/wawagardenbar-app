# Commit, Push, and Reset to Develop Workflow

**Workflow ID:** commit-push-reset-develop  
**Version:** 1.0  
**Effective Date:** March 4, 2026  
**Applies To:** Feature branches ready for integration

---

## Purpose

This workflow automates the process of:
1. Committing current changes with a standardized message
2. Pushing the branch to remote
3. Resetting to the latest main branch
4. Switching to the develop branch for continued development

**Use Case:** When you've completed a feature/fix and want to integrate it back into the main development flow.

---

## Prerequisites

- You're on a feature branch (not main or develop)
- All changes are staged or ready to commit
- Remote branch exists and is up-to-date
- You have push permissions to the repository

---

## Workflow Steps

### Step 1: Stage and Commit Changes

**Command:** `git add . && git commit -m "feat: [description] - [issue/PR reference]"`

**Commit Message Format:**
```
type(scope): description

- Key change 1
- Key change 2
- Key change 3

Ref: ISSUE-123 or PR-456
```

**Valid Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Example:**
```bash
git add .
git commit -m "feat(sop): add comprehensive API reporting documentation

- Created SOP-API-002 for reporting and analytics
- Added 24+ parameter specifications
- Included JavaScript and Python examples
- Validated against existing API endpoints

Ref: REQ-001"
```

### Step 2: Push to Remote

**Command:** `git push origin [branch-name]`

**Purpose:** Ensure your changes are safely stored on remote before switching branches.

**Example:**
```bash
git push origin SOP
```

### Step 3: Switch to Main Branch

**Command:** `git checkout main`

**Purpose:** Prepare to pull latest changes from main.

### Step 4: Update Main Branch

**Command:** `git pull origin main`

**Purpose:** Ensure you have the latest main branch before resetting.

### Step 5: Switch to Develop Branch

**Command:** `git checkout develop`

**Purpose:** Switch to the development branch where you'll continue work.

### Step 6: Update Develop Branch

**Command:** `git pull origin develop`

**Purpose:** Ensure develop branch is up-to-date with remote changes.

### Step 7: Merge Main into Develop (Optional)

**Command:** `git merge main`

**Purpose:** Sync develop with latest main changes.

**Alternative:** Use `git rebase main` for cleaner history:
```bash
git rebase main
```

### Step 8: Clean Up Feature Branch (Optional)

**Command:** `git branch -D [branch-name]`

**Purpose:** Remove local feature branch after successful integration.

**Remote cleanup (if PR merged):**
```bash
git push origin --delete [branch-name]
```

---

## Complete Workflow Script

### Bash Script Version

```bash
#!/bin/bash

# Commit, Push, and Reset to Develop Workflow
# Usage: ./commit-push-reset-develop.sh "commit message" [branch-name]

set -e  # Exit on any error

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 \"commit message\" [branch-name]"
    echo "Example: $0 \"feat: add API documentation\" feature-branch"
    exit 1
fi

COMMIT_MESSAGE="$1"
BRANCH_NAME="${2:-$(git branch --show-current)}"

echo "🚀 Starting Commit, Push, and Reset to Develop workflow..."
echo "Current branch: $BRANCH_NAME"
echo "Commit message: $COMMIT_MESSAGE"
echo ""

# Step 1: Stage and commit changes
echo "📝 Step 1: Committing changes..."
git add .
git commit -m "$COMMIT_MESSAGE"
echo "✅ Changes committed successfully"
echo ""

# Step 2: Push to remote
echo "📤 Step 2: Pushing to remote..."
git push origin "$BRANCH_NAME"
echo "✅ Branch pushed successfully"
echo ""

# Step 3: Switch to main
echo "🌿 Step 3: Switching to main branch..."
git checkout main
echo "✅ Switched to main"
echo ""

# Step 4: Update main
echo "🔄 Step 4: Updating main branch..."
git pull origin main
echo "✅ Main branch updated"
echo ""

# Step 5: Switch to develop
echo "🌿 Step 5: Switching to develop branch..."
git checkout develop
echo "✅ Switched to develop"
echo ""

# Step 6: Update develop
echo "🔄 Step 6: Updating develop branch..."
git pull origin develop
echo "✅ Develop branch updated"
echo ""

# Step 7: Merge main into develop
echo "🔀 Step 7: Merging main into develop..."
git merge main --no-edit
echo "✅ Main merged into develop"
echo ""

# Step 8: Clean up (optional)
read -p "🧹 Clean up feature branch '$BRANCH_NAME'? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing local feature branch..."
    git branch -D "$BRANCH_NAME"
    
    read -p "🗑️  Remove remote feature branch? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin --delete "$BRANCH_NAME"
        echo "✅ Remote branch removed"
    fi
fi

echo ""
echo "🎉 Workflow completed successfully!"
echo "📍 You are now on the develop branch with latest changes"
echo "📊 Ready for continued development"
```

### PowerShell Version

```powershell
# Commit, Push, and Reset to Develop Workflow (PowerShell)
# Usage: .\commit-push-reset-develop.ps1 "commit message" [branch-name]

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage,
    
    [Parameter(Mandatory=$false)]
    [string]$BranchName = (git branch --show-current)
)

Write-Host "🚀 Starting Commit, Push, and Reset to Develop workflow..." -ForegroundColor Green
Write-Host "Current branch: $BranchName" -ForegroundColor Cyan
Write-Host "Commit message: $CommitMessage" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stage and commit changes
Write-Host "📝 Step 1: Committing changes..." -ForegroundColor Yellow
git add .
git commit -m $CommitMessage
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Changes committed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to commit changes" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Push to remote
Write-Host "📤 Step 2: Pushing to remote..." -ForegroundColor Yellow
git push origin $BranchName
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Branch pushed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to push branch" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Switch to main
Write-Host "🌿 Step 3: Switching to main branch..." -ForegroundColor Yellow
git checkout main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Switched to main" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to switch to main" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Update main
Write-Host "🔄 Step 4: Updating main branch..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Main branch updated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to update main" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Switch to develop
Write-Host "🌿 Step 5: Switching to develop branch..." -ForegroundColor Yellow
git checkout develop
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Switched to develop" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to switch to develop" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Update develop
Write-Host "🔄 Step 6: Updating develop branch..." -ForegroundColor Yellow
git pull origin develop
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Develop branch updated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to update develop" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 7: Merge main into develop
Write-Host "🔀 Step 7: Merging main into develop..." -ForegroundColor Yellow
git merge main --no-edit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Main merged into develop" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to merge main into develop" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 8: Clean up (optional)
$cleanup = Read-Host "🧹 Clean up feature branch '$BranchName'? (y/N)"
if ($cleanup -eq 'y' -or $cleanup -eq 'Y') {
    Write-Host "🗑️  Removing local feature branch..." -ForegroundColor Yellow
    git branch -D $BranchName
    
    $remoteCleanup = Read-Host "🗑️  Remove remote feature branch? (y/N)"
    if ($remoteCleanup -eq 'y' -or $remoteCleanup -eq 'Y') {
        git push origin --delete $BranchName
        Write-Host "✅ Remote branch removed" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🎉 Workflow completed successfully!" -ForegroundColor Green
Write-Host "📍 You are now on the develop branch with latest changes" -ForegroundColor Cyan
Write-Host "📊 Ready for continued development" -ForegroundColor Cyan
```

---

## Manual Step-by-Step Commands

### Quick Reference

```bash
# 1. Commit changes
git add .
git commit -m "feat: your feature description"

# 2. Push to remote
git push origin [your-branch]

# 3. Switch to main and update
git checkout main
git pull origin main

# 4. Switch to develop and update
git checkout develop
git pull origin develop

# 5. Merge main into develop
git merge main

# 6. Clean up (optional)
git branch -D [your-branch]
git push origin --delete [your-branch]
```

---

## Error Handling

### Common Issues and Solutions

#### Issue: "Changes not staged for commit"
```bash
# Solution: Stage all changes
git add .
# Or stage specific files
git add file1.js file2.js
```

#### Issue: "Push rejected - non-fast-forward"
```bash
# Solution: Pull latest changes first
git pull origin [branch-name]
# Then push
git push origin [branch-name]
```

#### Issue: "Merge conflicts during git merge main"
```bash
# Solution: Resolve conflicts manually
git status  # See conflicted files
# Edit conflicted files, resolve conflicts
git add .
git commit -m "resolve merge conflicts"
```

#### Issue: "Branch not found"
```bash
# Solution: Create develop branch if it doesn't exist
git checkout -b develop
git push origin develop
```

---

## Best Practices

### Before Running Workflow

1. **Ensure clean working directory:**
   ```bash
   git status
   # Should show no uncommitted changes
   ```

2. **Verify current branch:**
   ```bash
   git branch --show-current
   # Should not be main or develop
   ```

3. **Check remote status:**
   ```bash
   git remote -v
   # Verify remote exists
   ```

### During Workflow

1. **Use meaningful commit messages**
2. **Verify push succeeded before switching branches**
3. **Resolve any merge conflicts before continuing**
4. **Backup important changes if uncertain**

### After Workflow

1. **Verify you're on develop branch:**
   ```bash
   git branch --show-current
   # Should show "develop"
   ```

2. **Check develop branch is up-to-date:**
   ```bash
   git log --oneline -5
   ```

3. **Verify feature branch is merged:**
   ```bash
   git log --oneline --grep="[feature-description]"
   ```

---

## Integration with CI/CD

### GitHub Actions Integration

```yaml
# .github/workflows/feature-integration.yml
name: Feature Integration

on:
  push:
    branches-ignore:
      - main
      - develop

jobs:
  integrate-feature:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Run tests
        run: npm test
        
      - name: Build project
        run: npm run build
        
      - name: Create PR to develop
        uses: peter-evans/create-pull-request@v5
        with:
          title: "feat: ${{ github.event.head_commit.message }}"
          body: "Automated PR for feature integration"
          base: develop
          head: ${{ github.ref }}
```

---

## Troubleshooting Checklist

### Pre-Flight Checklist

- [ ] Current branch is not main or develop
- [ ] All changes are staged
- [ ] Commit message follows conventional format
- [ ] Remote connection is working
- [ ] No merge conflicts in working directory

### Post-Flight Checklist

- [ ] Changes pushed successfully
- [ ] Main branch updated
- [ ] Develop branch updated
- [ ] Main merged into develop
- [ ] Feature branch cleaned up (if desired)
- [ ] Currently on develop branch

---

## Customization Options

### Alternative Branch Names

If your project uses different branch names, modify these variables:

```bash
MAIN_BRANCH="main"        # or "master"
DEVELOP_BRANCH="develop"  # or "dev", "staging"
```

### Alternative Merge Strategy

Instead of merge, use rebase for cleaner history:

```bash
# Replace Step 7 with:
git rebase main
```

### Skip Cleanup

To skip branch cleanup, remove Step 8 or set environment variable:

```bash
SKIP_CLEANUP=true ./commit-push-reset-develop.sh "message"
```

---

## Usage Examples

### Example 1: Simple Feature Completion

```bash
./commit-push-reset-develop.sh "feat: add user authentication"
```

### Example 2: Bug Fix with Issue Reference

```bash
./commit-push-reset-develop.sh "fix: resolve login timeout issue

- Increased session timeout to 30 minutes
- Added error handling for network failures
- Updated user feedback messages

Ref: ISSUE-123" feature/login-fix
```

### Example 3: Documentation Update

```bash
./commit-push-reset-develop.sh "docs: update API documentation for v2.0"
```

---

## Related Workflows

- `/audit-finish` - For compliance and audit requirements
- `/create-pull-request` - For creating PRs with templates
- `/merge-main-to-develop` - For syncing branches

---

**Document Control:**
- Version: 1.0
- Classification: Internal
- Review Frequency: Quarterly
- Maintained By: Development Team
