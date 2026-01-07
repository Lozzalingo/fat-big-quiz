FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "app.js"]
