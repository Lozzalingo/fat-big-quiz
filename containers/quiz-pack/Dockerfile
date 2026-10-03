# Fat Big Quiz - Quiz Pack Module
FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY containers/quiz-pack/package*.json ./
RUN npm install --omit=dev

# Copy server modules
COPY server/modules/ ./server/modules/

# Copy container entry point
COPY containers/quiz-pack/server.js ./server.js

EXPOSE 7051

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:7051/health || exit 1

CMD ["node", "server.js"]
