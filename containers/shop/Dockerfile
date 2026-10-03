# Fat Big Quiz - Shop Module
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma and curl for healthchecks
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Copy container package files
COPY containers/shop/package*.json ./

RUN npm install --omit=dev

# Copy Prisma schema and generate client
COPY server/prisma ./server/prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Copy server modules (read-only, not modified)
COPY server/modules/ ./server/modules/
COPY server/middleware/ ./server/middleware/
COPY server/utils/ ./server/utils/
COPY server/services/ ./server/services/
COPY server/lib/ ./server/lib/

# Copy container entry point
COPY containers/shop/server.js ./server.js

EXPOSE 7050

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:7050/health || exit 1

CMD ["node", "server.js"]
