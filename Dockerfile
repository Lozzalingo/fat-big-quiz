# syntax=docker/dockerfile:1.4
# Build stage - builds from lozzalingo-js workspace root
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy all workspace package.json files for dependency resolution
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/email/package.json ./packages/email/
COPY packages/logging/package.json ./packages/logging/
COPY packages/merchandise/package.json ./packages/merchandise/
COPY packages/ops/package.json ./packages/ops/
COPY packages/orders/package.json ./packages/orders/
COPY packages/settings/package.json ./packages/settings/
COPY packages/storage/package.json ./packages/storage/
COPY packages/subscribers/package.json ./packages/subscribers/
COPY fat-big-quiz/package.json ./fat-big-quiz/

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install --workspace=fat-big-quiz --include-workspace-root

# Copy prisma schema and generate client
COPY fat-big-quiz/server/prisma ./fat-big-quiz/server/prisma
RUN npx prisma generate --schema=fat-big-quiz/server/prisma/schema.prisma

# Copy all workspace packages source
COPY packages/ ./packages/

# Copy fat-big-quiz source files
COPY fat-big-quiz/ ./fat-big-quiz/

# Build-time environment variables for Next.js
ENV NEXT_PUBLIC_API_BASE_URL=https://fatbigquiz.com
ENV NEXT_PUBLIC_BASE_URL=https://fatbigquiz.com
ENV NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT=https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com
ENV NEXT_PUBLIC_DO_SPACES_FOLDER=fat-big-quiz

# Build the Next.js app
RUN --mount=type=cache,target=/app/fat-big-quiz/.next/cache \
    cd fat-big-quiz && npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy the standalone output
COPY --from=builder /app/fat-big-quiz/.next/standalone ./

# Copy public and static assets
# Standalone server.js expects these relative to /app/ (the WORKDIR)
COPY --from=builder /app/fat-big-quiz/public ./public
COPY --from=builder /app/fat-big-quiz/.next/static ./.next/static
# Also copy to fat-big-quiz/ paths for any workspace-relative lookups
COPY --from=builder /app/fat-big-quiz/public ./fat-big-quiz/public
COPY --from=builder /app/fat-big-quiz/.next/static ./fat-big-quiz/.next/static

# Copy all node_modules from workspace (standalone tracing misses deps with workspaces)
COPY --from=builder /app/node_modules ./node_modules

# Install sharp in a clean tmp dir then copy
RUN cd /tmp && npm init -y > /dev/null 2>&1 && npm install sharp --no-package-lock && \
    mkdir -p /app/node_modules && cp -r /tmp/node_modules/sharp /app/node_modules/sharp 2>/dev/null; \
    rm -rf /tmp/node_modules /tmp/package.json

# Create cache directories and fix permissions
RUN mkdir -p fat-big-quiz/.next/cache .next/cache && \
    chown -R nextjs:nodejs fat-big-quiz/.next .next

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is at the root of standalone output
CMD ["node", "server.js"]
