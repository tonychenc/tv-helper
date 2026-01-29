FROM node:22-alpine

# Install ADB
RUN apk add --no-cache android-tools

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN cd frontend && npm ci

# Copy source files
COPY . .

# Build backend and frontend
RUN npm run build
RUN npm run build:frontend

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/index.js"]
