# Fat Big Quiz - Blog Module
# Build context: monorepo root (lozzalingo-js/)
FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Copy shared package first (needed by npm install)
COPY packages/blog-client ./packages/blog-client

COPY fat-big-quiz/containers/blog/package*.json ./
RUN npm install --omit=dev

# Copy Prisma schema and generate client
COPY fat-big-quiz/server/prisma ./server/prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Copy server modules and shared code
COPY fat-big-quiz/server/modules/ ./server/modules/
COPY fat-big-quiz/server/middleware/ ./server/middleware/
COPY fat-big-quiz/server/utils/ ./server/utils/
COPY fat-big-quiz/server/services/ ./server/services/
COPY fat-big-quiz/server/lib/ ./server/lib/

COPY fat-big-quiz/containers/blog/server.js ./server.js

EXPOSE 7052

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:7052/health || exit 1

CMD ["node", "server.js"]
