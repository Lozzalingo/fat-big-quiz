# Fat Big Quiz - Quiz App Module (Standalone Game Engine)
# Self-contained: runs independently of the main FBQ backend.
# Build context must be lozzalingo-js root (one level above fat-big-quiz)
# so we can COPY the shared game-engine package.
FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy the shared game-engine package first (needed by npm install)
COPY packages/game-engine/ ./packages/game-engine/

# Copy container package manifest and install deps
COPY fat-big-quiz/containers/quiz-app/package*.json ./
RUN npm install --omit=dev

# Copy the quiz-app module routes
COPY fat-big-quiz/server/modules/quiz-app/ ./server/modules/quiz-app/

# Copy the container entrypoint
COPY fat-big-quiz/containers/quiz-app/server.js ./server.js

EXPOSE 7056

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:7056/health || exit 1

CMD ["node", "server.js"]
