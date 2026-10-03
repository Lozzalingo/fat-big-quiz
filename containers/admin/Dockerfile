# Fat Big Quiz - Admin Module
FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Copy workspace packages needed by admin module
COPY packages/email ./packages/email
COPY packages/analytics ./packages/analytics

# Copy container package.json and install deps
COPY containers/admin/package*.json ./
RUN npm install --omit=dev

# Verify workspace packages are properly linked (symlink + source present)
RUN ls -la node_modules/@lozzalingo/analytics/server/ && ls -la node_modules/@lozzalingo/email/server/

# Copy Prisma schema and generate client
COPY server/prisma ./server/prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Copy server modules and shared code
COPY server/modules/ ./server/modules/
COPY server/middleware/ ./server/middleware/
COPY server/utils/ ./server/utils/
COPY server/services/ ./server/services/
COPY server/lib/ ./server/lib/

COPY containers/admin/server.js ./server.js

EXPOSE 7058

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:7058/health || exit 1

CMD ["node", "server.js"]
