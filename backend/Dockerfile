# Build from the repo root: docker build -f backend/Dockerfile -t santa-api .
FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --ignore-scripts
# --ignore-scripts skipped the engine download; migrate deploy needs the schema engine at runtime
RUN npm rebuild @prisma/engines
COPY backend backend
RUN npx prisma generate --schema backend/prisma/schema.prisma \
  && npm run build -w backend \
  && npm run build:seed -w backend
RUN npm prune --omit=dev --workspace backend --include-workspace-root

FROM node:24-alpine
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/openapi.yaml ./openapi.yaml
COPY --from=build /app/backend/package.json ./package.json
USER node
EXPOSE 4000
# Apply pending migrations, seed demo data when SEED_DEMO=true (idempotent), then start the API
CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy && if [ \"$SEED_DEMO\" = \"true\" ]; then node dist/prisma/seed.js; fi && node dist/server.js"]
