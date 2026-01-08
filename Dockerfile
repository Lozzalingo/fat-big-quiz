# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema from server folder for generate
COPY server/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source files
COPY . .

# Build-time environment variables for Next.js
ENV NEXT_PUBLIC_API_BASE_URL=https://fatbigquiz.com
ENV NEXT_PUBLIC_BASE_URL=https://fatbigquiz.com
ENV NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT=https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com
ENV NEXT_PUBLIC_DO_SPACES_FOLDER=fat-big-quiz

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma client for NextAuth
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
