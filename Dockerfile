# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# LyoDex — production image
#
# Builds the API server and the web SPA in one image. The API serves the built
# SPA as static files, so a single container is enough to run the whole product.
#
#   docker build -t lyodex .
#   docker run --env-file .env -p 8080:8080 lyodex
#
# The mobile (Expo) artifact is intentionally excluded — it is not part of the
# server deployment.
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=24-slim

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# Copy only manifests first so this layer caches across source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/lyodex/package.json ./artifacts/lyodex/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
COPY lib/object-storage-web/package.json ./lib/object-storage-web/
COPY scripts/package.json ./scripts/

# --ignore-scripts avoids running lifecycle scripts from transitive packages
# during image build; nothing in this workspace depends on them.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .

# The mobile artifact needs the Expo toolchain, which is not installed here.
ENV BUILD_MOBILE=false
ENV NODE_ENV=production

RUN pnpm run typecheck:libs \
 && pnpm --filter @workspace/api-server run build \
 && pnpm --filter @workspace/lyodex run build

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as the unprivileged user that the node image already provides.
USER node

# node_modules is required at runtime, not just at build time: the esbuild
# bundle externalises several packages (nodemailer, @google-cloud/*, pg-native
# and friends — see artifacts/api-server/build.mjs) which are therefore resolved
# from disk when the server starts.
#
# The whole tree is copied in one layer because pnpm links workspace packages
# through relative symlinks into node_modules/.pnpm; copying the directories
# separately would break those links.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=build --chown=node:node /app/lib ./lib

COPY --from=build --chown=node:node /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build --chown=node:node /app/artifacts/lyodex/dist ./artifacts/lyodex/dist

# PORT is read by the server at startup and must be set; 8080 is the default
# the compose file and most PaaS hosts expect.
ENV PORT=8080
EXPOSE 8080

# Fails the container health check if the API stops responding.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
