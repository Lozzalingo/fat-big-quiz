# syntax=docker/dockerfile:1.4
# Fat Big Quiz - Frontend (Next.js)
# Build context: app root (with packages/ checked out alongside)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared packages
COPY packages/ ./packages/

# Copy app package files and rewrite workspace deps
COPY package*.json ./
RUN node -e " \
  const pkg = require('./package.json'); \
  for (const [k,v] of Object.entries(pkg.dependencies || {})) { \
    if (k.startsWith('@lozzalingo/')) { \
      const name = k.replace('@lozzalingo/', ''); \
      pkg.dependencies[k] = 'file:./packages/' + name; \
    } \
  } \
  require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2)); \
"

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy Prisma schema and generate client
COPY server/prisma ./server/prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Copy source files
COPY . .

# Build-time environment variables for Next.js
ENV NEXT_PUBLIC_API_BASE_URL=https://fatbigquiz.com
ENV NEXT_PUBLIC_BASE_URL=https://fatbigquiz.com
ENV NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT=https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com
ENV NEXT_PUBLIC_DO_SPACES_FOLDER=fat-big-quiz
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=G-T6DDWDZHQ0

# Build Next.js
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma and curl for healthchecks
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./

# Copy public and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy full server app routes (standalone tracing can miss workspace package routes)
COPY --from=builder /app/.next/server ./.next/server

# Copy all node_modules (standalone tracing misses workspace deps)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma client for NextAuth
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install sharp in isolated tmp dir
RUN cd /tmp && npm init -y > /dev/null 2>&1 && npm install sharp --no-package-lock && \
    mkdir -p /app/node_modules && cp -r /tmp/node_modules/sharp /app/node_modules/sharp 2>/dev/null; \
    rm -rf /tmp/node_modules /tmp/package.json

# Create cache directories and fix permissions
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
