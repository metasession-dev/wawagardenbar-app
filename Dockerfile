# Dependencies stage - for better caching
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files and vendored tarballs needed by file: dependencies
COPY package.json package-lock.json* ./
COPY vendor ./vendor

# Install ALL dependencies (needed for build)
RUN npm ci

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application with standalone output
RUN npm run build

# Production dependencies stage
FROM node:20-alpine AS prod-deps
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files and vendored tarballs needed by file: dependencies
COPY package.json package-lock.json* ./
COPY vendor ./vendor

# Install ONLY production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only production dependencies (excludes dev deps like TypeScript, ESLint, etc.)
# --chown here (and below) sets ownership per-layer during the copy itself,
# instead of one final `chown -R /app` that has to walk the entire tree
# (including all of node_modules) as an uncacheable, single-threaded step —
# that final chown was observed taking 80+ minutes under host I/O
# contention despite the copy itself being fast.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Copy custom server (tsx will compile on-the-fly but it's in prod deps)
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib

# Copy scripts directory for database management
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/models ./models
COPY --from=builder --chown=nextjs:nodejs /app/interfaces ./interfaces
COPY --from=builder --chown=nextjs:nodejs /app/services ./services

# Create uploads directory with proper ownership (empty dir — cheap either way)
RUN mkdir -p /app/public/uploads/menu-items && \
    chown -R nextjs:nodejs /app/public/uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "server.ts"]
