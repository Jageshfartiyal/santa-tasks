# Build from the repo root: docker build -f backend/Dockerfile -t santa-api .
FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --ignore-scripts
COPY backend backend
RUN npx prisma generate --schema backend/prisma/schema.prisma && npm run build -w backend
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
# Apply pending migrations, then start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
