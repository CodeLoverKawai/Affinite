# syntax=docker/dockerfile:1.7
# ==========================================
# Stage 1: Asset pruning & preparation
# ==========================================
FROM node:22-bookworm-slim AS assets
WORKDIR /app

# Needed for Prisma engine resolution and asset cleanup scripts
RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl ca-certificates && \
  rm -rf /var/lib/apt/lists/*

COPY ./packages/backend/server /app
COPY ./node_modules /app/node_modules
COPY ./packages/backend/native /app/node_modules/@affine/server-native
COPY ./packages/frontend/apps/web/dist /app/static
COPY ./packages/frontend/admin/dist /app/static/admin
COPY ./packages/frontend/apps/mobile/dist /app/static/mobile

ARG TARGETARCH
ARG TARGETVARIANT

RUN AFFINE_DOCKER_CLEAN=1 TARGETARCH="${TARGETARCH}" TARGETVARIANT="${TARGETVARIANT}" node ./scripts/docker-clean.mjs

# ==========================================
# Stage 2: Production lightweight runner
# ==========================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# 1. Install OS runtime libraries before app copy to maximize Docker layer cache
RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl libjemalloc2 ca-certificates && \
  rm -rf /var/lib/apt/lists/*

# 2. Enable jemalloc for high-efficiency memory management in V8
ENV LD_PRELOAD=libjemalloc.so.2
ENV NODE_ENV=production

# 3. Create storage/config directories with proper permissions for unprivileged node user (UID 1000)
RUN mkdir -p /home/node/.affine/storage /home/node/.affine/config /app && \
  chown -R node:node /home/node/.affine /app

# 4. Copy cleaned application files with unprivileged user ownership
COPY --from=assets --chown=node:node /app /app

# 5. Switch to unprivileged user
USER node

# 6. Expose default server ports
EXPOSE 5320 3010

# 7. Native healthcheck using Node.js fetch against the /info endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.AFFINE_SERVER_PORT || 5320) + '/info').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "./dist/main.js"]
