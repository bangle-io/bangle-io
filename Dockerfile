# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable

ARG GITHUB_SHA=dockerlocal
ARG GITHUB_REF_NAME=main
ENV GITHUB_SHA=$GITHUB_SHA
ENV GITHUB_REF_NAME=$GITHUB_REF_NAME

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /opt/bangle
ENV NODE_ENV=production
ENV PORT=8080
ENV SERVER_FS_ROOT=/mnt
ENV STATIC_DIR=/opt/bangle/dist

COPY --from=builder /app/packages/tooling/browser-entry/dist /opt/bangle/dist
COPY server.mjs /opt/bangle/server.mjs

EXPOSE 8080
VOLUME ["/mnt"]
CMD ["node", "/opt/bangle/server.mjs"]
