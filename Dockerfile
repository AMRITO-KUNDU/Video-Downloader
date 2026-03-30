FROM node:24-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY backend/ ./backend
COPY --from=frontend-build /app/frontend/dist ./backend/static

ENV PYTHON_PORT=5001
ENV STATIC_DIR=/app/backend/static

EXPOSE 5001

CMD ["python", "backend/app.py"]
