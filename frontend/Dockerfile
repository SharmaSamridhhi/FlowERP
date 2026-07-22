FROM node:20.19.0-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --ignore-scripts
FROM deps AS build
ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY packages/shared packages/shared
COPY frontend frontend
RUN npm run build -w packages/shared
RUN npm run build -w frontend
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
