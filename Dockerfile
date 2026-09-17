# ---- Build stage: compile the Vite app -------------------------------------
FROM node:20-alpine AS builder

# Backend URL baked into the bundle at build time (Vite reads VITE_* variables).
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

WORKDIR /app

# Install dependencies first so the layer is cached while sources change.
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files (see .dockerignore for what is excluded) and build.
COPY . .
RUN npm run build

# ---- Runtime stage: static file server only ---------------------------------
# The built bundle is plain static files: none of the app's npm dependencies
# are needed at runtime, only `serve`.
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g serve@14.2.1
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# `-s` rewrites unknown paths to index.html so React Router deep links work.
CMD ["serve", "-s", "dist", "-l", "3000"]
