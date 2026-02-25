# syntax=docker/dockerfile:1.7

# Base stage with Bun runtime
FROM oven/bun:1-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install system dependencies including curl for health checks
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --production

# Builder stage
FROM base AS builder
# Accept Supabase values as build args for next build

ENV NEXT_PUBLIC_SUPABASE_URL="https://gvhguudtztutbxwolsxd.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGd1dWR0enR1dGJ4d29sc3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Nzc5NzQsImV4cCI6MjA3NTE1Mzk3NH0.ZmAHfbMmdk-HE4evBhWLdxELXlpq7dcJuMPvIPcKqEI"
ENV NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGd1dWR0enR1dGJ4d29sc3hkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3Nzk3NCwiZXhwIjoyMDc1MTUzOTc0fQ.2sDnbsk9Te1bsZ5rN3tOyx83Zl5RsJgVz2N5O_EHXsc"

COPY package.json bun.lock* ./
RUN bun install

COPY . .

# Transpile next.config.ts -> next.config.js at build time so runtime doesn't need typescript
RUN bun install --no-save esbuild \
    && bunx esbuild next.config.ts --bundle --platform=node --format=cjs --target=node20 --outfile=next.config.js \
    && bun run build

# Production stage
FROM oven/bun:1-slim AS production

# Install runtime dependencies and create non-root user
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r appuser \
    && useradd -r -g appuser appuser

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src ./src

# Change ownership to non-root user
RUN chown -R appuser:appuser /app
USER appuser

# Use PORT environment variable (Cloud Run compatibility)
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# Start the application
CMD ["bun", "run", "start"]

