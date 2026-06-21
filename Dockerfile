FROM node:22-bookworm-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN npm ci --prefix backend --no-audit --no-fund \
    && npm ci --prefix frontend --no-audit --no-fund

COPY . .

EXPOSE 5174 5175

CMD ["sh", "/app/docker/start.sh"]
