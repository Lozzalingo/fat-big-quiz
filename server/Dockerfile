FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy server package files
COPY fat-big-quiz/server/package*.json ./

# Copy all workspace packages used by the server
COPY packages/core/ ./local-packages/core/
COPY packages/analytics/ ./local-packages/analytics/
COPY packages/auth/ ./local-packages/auth/
COPY packages/bookings/ ./local-packages/bookings/
COPY packages/calendar/ ./local-packages/calendar/
COPY packages/config/ ./local-packages/config/
COPY packages/email/ ./local-packages/email/
COPY packages/game-engine/ ./local-packages/game-engine/
COPY packages/logging/ ./local-packages/logging/
COPY packages/merchandise/ ./local-packages/merchandise/
COPY packages/ops/ ./local-packages/ops/
COPY packages/orders/ ./local-packages/orders/
COPY packages/outreach/ ./local-packages/outreach/
COPY packages/payments/ ./local-packages/payments/
COPY packages/purchases/ ./local-packages/purchases/
COPY packages/settings/ ./local-packages/settings/
COPY packages/storage/ ./local-packages/storage/
COPY packages/subscribers/ ./local-packages/subscribers/

# Rewrite all workspace deps to point to local copies, then install
RUN sed -i 's|"@lozzalingo/core": "\*"|"@lozzalingo/core": "file:./local-packages/core"|' package.json && \
    sed -i 's|"@lozzalingo/analytics": "\*"|"@lozzalingo/analytics": "file:./local-packages/analytics"|' package.json && \
    sed -i 's|"@lozzalingo/auth": "\*"|"@lozzalingo/auth": "file:./local-packages/auth"|' package.json && \
    sed -i 's|"@lozzalingo/calendar": "\*"|"@lozzalingo/calendar": "file:./local-packages/calendar"|' package.json && \
    sed -i 's|"@lozzalingo/config": "\*"|"@lozzalingo/config": "file:./local-packages/config"|' package.json && \
    sed -i 's|"@lozzalingo/email": "\*"|"@lozzalingo/email": "file:./local-packages/email"|' package.json && \
    sed -i 's|"@lozzalingo/game-engine": "\*"|"@lozzalingo/game-engine": "file:./local-packages/game-engine"|' package.json && \
    sed -i 's|"@lozzalingo/logging": "\*"|"@lozzalingo/logging": "file:./local-packages/logging"|' package.json && \
    sed -i 's|"@lozzalingo/merchandise": "\*"|"@lozzalingo/merchandise": "file:./local-packages/merchandise"|' package.json && \
    sed -i 's|"@lozzalingo/ops": "\*"|"@lozzalingo/ops": "file:./local-packages/ops"|' package.json && \
    sed -i 's|"@lozzalingo/orders": "\*"|"@lozzalingo/orders": "file:./local-packages/orders"|' package.json && \
    sed -i 's|"@lozzalingo/settings": "\*"|"@lozzalingo/settings": "file:./local-packages/settings"|' package.json && \
    sed -i 's|"@lozzalingo/storage": "\*"|"@lozzalingo/storage": "file:./local-packages/storage"|' package.json && \
    sed -i 's|"@lozzalingo/bookings": "\*"|"@lozzalingo/bookings": "file:./local-packages/bookings"|' package.json && \
    sed -i 's|"@lozzalingo/outreach": "\*"|"@lozzalingo/outreach": "file:./local-packages/outreach"|' package.json && \
    sed -i 's|"@lozzalingo/payments": "\*"|"@lozzalingo/payments": "file:./local-packages/payments"|' package.json && \
    sed -i 's|"@lozzalingo/purchases": "\*"|"@lozzalingo/purchases": "file:./local-packages/purchases"|' package.json && \
    sed -i 's|"@lozzalingo/subscribers": "\*"|"@lozzalingo/subscribers": "file:./local-packages/subscribers"|' package.json && \
    npm install --omit=dev

# Copy server source
COPY fat-big-quiz/server/ .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "app.js"]
