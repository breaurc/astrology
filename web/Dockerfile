# Next.js site, built as a standalone Node server.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
# ENGINE_URL is read at runtime by the route handlers (lib/server/config.ts); compose sets it to http://engine:8080.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 ENGINE_URL=http://engine:8080
RUN addgroup -S astro && adduser -S astro -G astro
COPY --from=build --chown=astro:astro /app/.next/standalone ./
COPY --from=build --chown=astro:astro /app/.next/static ./.next/static
COPY --from=build --chown=astro:astro /app/public ./public
# Users, questions, threads and the credit ledger live here; mounted as a volume so they survive redeploys.
RUN mkdir -p /app/.data && chown astro:astro /app/.data
USER astro
EXPOSE 3000
CMD ["node", "server.js"]
