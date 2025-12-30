FROM node:18-alpine

WORKDIR /app

# Install dependencies based on package-lock.json (if available) or package.json
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
