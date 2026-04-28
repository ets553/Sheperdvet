# Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Install deps (including dev deps needed to compile TS)
COPY package.json package-lock.json ./
RUN npm ci

# Compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune to production dependencies for the runtime image
RUN npm prune --omit=dev

# Runtime stage
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Drop root
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

USER app

# MCP servers speak JSON-RPC over stdio. The container must be run with
# stdio attached (docker run -i) for an MCP client to talk to it.
ENTRYPOINT ["node", "dist/index.js"]
