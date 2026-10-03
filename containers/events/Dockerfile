# Fat Big Quiz - Events Module
FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

COPY containers/events/package*.json ./
RUN npm install --omit=dev

COPY server/prisma ./server/prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

COPY server/modules/ ./server/modules/
COPY server/middleware/ ./server/middleware/
COPY server/utils/ ./server/utils/
COPY server/services/ ./server/services/
COPY server/lib/ ./server/lib/

COPY containers/events/server.js ./server.js

EXPOSE 7055

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:7055/health || exit 1

CMD ["node", "server.js"]
