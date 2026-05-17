# ── Stage 1: build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Vite bakes env vars at build time - pass them as build args
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

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

EXPOSE 4000

CMD ["node", "server/server.js"]
