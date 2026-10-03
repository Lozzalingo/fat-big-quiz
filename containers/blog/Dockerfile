# Fat Big Quiz - Blog Module
FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

COPY containers/blog/package*.json ./
RUN npm install --omit=dev

# Copy Prisma schema and generate client
COPY server/prisma ./server/prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Copy server modules and shared code
COPY server/modules/ ./server/modules/
COPY server/middleware/ ./server/middleware/
COPY server/utils/ ./server/utils/
COPY server/services/ ./server/services/
COPY server/lib/ ./server/lib/

COPY containers/blog/server.js ./server.js

EXPOSE 7052

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:7052/health || exit 1

CMD ["node", "server.js"]
