#!/bin/bash

# Production Migration Runner
# Usage: ./run-prod-migrations.sh

set -e

echo "🚀 Running production database migrations..."

# Check for production env file
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production environment variables"
    echo "You can copy from .env.docker.example:"
    echo "  cp .env.docker.example .env.production"
    exit 1
fi

# Check if production container is running
PROD_CONTAINER=$(docker ps -q -f name=wawa-garden-bar)

if [ -n "$PROD_CONTAINER" ]; then
    echo "📦 Found running production container: $PROD_CONTAINER"
    echo "🔄 Running migrations in existing container..."
    
    # Copy migration script to container and run
    docker cp scripts/run-migrations.sh $PROD_CONTAINER:/app/scripts/
    docker exec -it $PROD_CONTAINER bash /app/scripts/run-migrations.sh
else
    echo "📦 No running production container found"
    echo "🔄 Starting migration container..."
    
    # Run migration as one-off container
    docker-compose -f docker-compose.migration.yml --env-file .env.production up --build migration
fi

echo "✅ Production migrations completed!"
