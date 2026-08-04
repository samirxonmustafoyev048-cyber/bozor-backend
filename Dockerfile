# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base
WORKDIR /app
# python3/make/g++ are needed to build the better-sqlite3 native addon.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY package.json prisma.config.ts ./
COPY prisma ./prisma

# SQLite file lives here — mount a persistent volume at /app/data on the
# hosting platform (e.g. a Railway Volume) so data survives redeploys.
RUN mkdir -p /app/data
ENV DATABASE_URL="file:/app/data/prod.db"

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
