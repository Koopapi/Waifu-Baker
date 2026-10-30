# syntax=docker/dockerfile:1.7
# Spec 024: imagen de la web para Coolify (contexto: la raíz del repositorio; Dockerfile: apps/web/Dockerfile).
# Debian 13 trae el cliente de PostgreSQL 17, que sirve para las copias (pg_dump) de un servidor 16. `curl` lo usa la
# comprobación de salud de Coolify (`/api/health`).
FROM node:24-trixie-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# El build no se conecta a la base de datos; solo necesita que las variables existan.
RUN cd apps/web && DATABASE_URL=postgres://build/build AUTH_SECRET=solo-para-compilar-0123456789abcdef pnpm build

FROM base AS run
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
# Spec 018: la imagen fija de las cartas por capas se saca con Chromium (playwright-core).
RUN cd /app/apps/web && node_modules/.bin/playwright-core install --with-deps chromium \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/cards /data/backups && chown -R node:node /data /ms-playwright
USER node
WORKDIR /app/apps/web
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=4 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# RF-2: primero las migraciones; si fallan, el contenedor no arranca y Coolify mantiene la versión anterior (RF-3).
CMD ["sh", "-c", "node scripts/migrate.mts && exec node_modules/.bin/next start -p \"$PORT\""]
