# Fat Big Quiz - Hire Module
FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY containers/hire/package*.json ./
RUN npm install --omit=dev

COPY server/modules/ ./server/modules/

COPY containers/hire/server.js ./server.js

EXPOSE 7054

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:7054/health || exit 1

CMD ["node", "server.js"]
