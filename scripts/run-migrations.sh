#!/bin/bash

# Production Migration Runner for Wawa Garden Bar
# This script runs all 9 migration scripts in production Docker environment

set -e

echo "🚀 Starting production database migrations..."

# List of migration scripts to run (in order)
MIGRATIONS=(
    "fix-email-index.ts"
    "migrate-portion-options.ts"
    "migrate-stock-history.ts"
    "cleanup-legacy-inventory-fields.ts"
    "migrate-inventory-snapshots.ts"
    "migrate-location-tracking.ts"
    "migrate-price-override-fields.ts"
    "migrate-profitability-data.ts"
    "migrate-api-key-scopes.ts"
)

# Check if required environment variables are set
if [ -z "$MONGODB_WAWAGARDENBAR_APP_URI" ] && [ -z "$MONGODB_URI" ]; then
    echo "❌ Error: MONGODB_WAWAGARDENBAR_APP_URI or MONGODB_URI environment variable is required"
    exit 1
fi

if [ -z "$MONGODB_DB_NAME" ]; then
    echo "❌ Error: MONGODB_DB_NAME environment variable is required"
    exit 1
fi

echo "📊 Database: $MONGODB_DB_NAME"
echo "🔗 URI: ${MONGODB_WAWAGARDENBAR_APP_URI:-$MONGODB_URI}"
echo ""

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    echo "📋 Running migration: $migration"
    
    if npx tsx "scripts/$migration"; then
        echo "✅ Migration completed: $migration"
    else
        echo "❌ Migration failed: $migration"
        exit 1
    fi
    
    echo ""
done

echo "🎉 All migrations completed successfully!"
echo "📊 Production database is now up to date"
