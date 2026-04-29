FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy server package files
COPY fat-big-quiz/server/package*.json ./

# Copy workspace package into a local directory
COPY packages/game-engine/ ./local-packages/game-engine/

# Rewrite the workspace dep to point to the local copy, then install
RUN sed -i 's|"@lozzalingo/game-engine": "\*"|"@lozzalingo/game-engine": "file:./local-packages/game-engine"|' package.json && \
    npm install --omit=dev

# Copy server source
COPY fat-big-quiz/server/ .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "app.js"]
