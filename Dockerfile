FROM node:20-alpine AS builder

# 1. Déclarer les arguments (ce que la CI va envoyer)
ARG VITE_BACKEND_URL

# 2. Les transformer en variables d'environnement pour que Vite les lise
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production image, copy built assets and dependencies
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
RUN npm install -g serve
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Start the server
CMD ["serve", "-s", "dist", "-l", "3000"] 
# TODO: Verifier que le port 3000 est bien celui utilisé par serve, sinon adapter en fonction du port défini dans .env (VITE_PORT)