# syntax=docker/dockerfile:1.7
# AetherTrade web terminal: Next.js standalone server, non-root.
#
# AETHER_BACKEND_URL is resolved at build time (Next.js rewrites are baked into the standalone
# output), so set it to the API address as seen from this container.
# Behind a TLS-inspecting proxy, pass its CA as an optional BuildKit secret: --secret id=extra_ca,src=ca.pem

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --no-audit --no-fund

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ARG AETHER_BACKEND_URL=http://api:8000
ENV AETHER_BACKEND_URL=${AETHER_BACKEND_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 10001 aether && adduser -S -u 10001 -G aether aether
COPY --from=builder --chown=root:root /app/.next/standalone ./
COPY --from=builder --chown=root:root /app/.next/static ./.next/static
# Application files stay root-owned (read-only for the runtime user); only Next's cache is writable.
RUN mkdir -p .next/cache && chown aether:aether .next/cache
USER aether
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/login"]
CMD ["node", "server.js"]
