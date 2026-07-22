FROM node:20.19.0-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --ignore-scripts
FROM deps AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY packages/shared packages/shared
COPY backend backend
RUN npm run build -w packages/shared
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN cd backend && npx prisma generate
RUN npm run build -w backend
RUN cp backend/src/generated/prisma/*.node backend/dist/generated/prisma/
FROM node:20.19.0-slim AS runtime
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --ignore-scripts --omit=dev --workspace=@flowerp/backend --workspace=@flowerp/shared
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/backend/dist backend/dist
COPY backend/prisma.config.ts backend/prisma.config.ts
COPY backend/prisma backend/prisma
RUN cd backend && (DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma migrate deploy || true)
RUN groupadd --system appgroup \
  && useradd --system --gid appgroup --home /app --no-create-home appuser
USER appuser
WORKDIR /app/backend
EXPOSE 4000
CMD ["sh", "-c", "npm run db:migrate:deploy && node dist/server.js"]
