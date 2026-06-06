# Fat Big Quiz - API (Express)
# Build context: app root (with packages/ checked out alongside)
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma and curl for healthchecks
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Copy shared packages
COPY packages/ ./packages/

# Copy server package files and rewrite workspace deps
COPY server/package*.json ./
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

RUN npm install --omit=dev

# Copy server source
COPY server/ .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "app.js"]
