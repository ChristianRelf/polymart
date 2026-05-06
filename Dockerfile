# ── Stage 1: build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source and built frontend
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server/server.js"]
