# syntax=docker/dockerfile:1
#
# Reference image that serves BOTH the Bangle.io front-end and the remote
# file-storage API from a single origin. Build from the repository root:
#
#   docker build -f packages/tooling/remote-file-server/Dockerfile -t bangle-io .
#   docker run -p 8000:8000 -v bangle-data:/data bangle-io
#
# Then open http://localhost:8000 — the app talks to the same origin, so no
# server URL configuration is needed.

# ---- Build stage: build the front-end and bundle the server ----
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# Build the browser front-end -> packages/tooling/browser-entry/dist
RUN pnpm build
# Bundle the server into a single self-contained file -> dist/server.mjs
RUN pnpm --filter @bangle.io/remote-file-server build

# ---- Runtime stage: a lean image, no node_modules required ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build /repo/packages/tooling/remote-file-server/dist/server.mjs ./server.mjs
COPY --from=build /repo/packages/tooling/browser-entry/dist ./browser-entry
ENV BANGLE_FILE_SERVER_PORT=8000
ENV BANGLE_FILE_SERVER_HOST=0.0.0.0
ENV BANGLE_FILE_SERVER_ROOT=/data
ENV BANGLE_FILE_SERVER_STATIC_DIR=/app/browser-entry
# Set BANGLE_FILE_SERVER_TOKEN at runtime to require a bearer token.
VOLUME ["/data"]
EXPOSE 8000
CMD ["node", "server.mjs"]
