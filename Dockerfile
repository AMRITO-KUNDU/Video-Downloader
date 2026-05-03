FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend
COPY --from=frontend-build /app/frontend/dist ./backend/static

ENV PORT=5000
ENV STATIC_DIR=/app/backend/static

EXPOSE 5000

CMD gunicorn \
    --worker-class gevent \
    --workers 2 \
    --worker-connections 100 \
    --bind 0.0.0.0:${PORT} \
    --timeout 3600 \
    --keep-alive 5 \
    --chdir backend \
    "app:app"
