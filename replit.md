# VidGrab

A clean video downloader app supporting YouTube, Facebook, and Instagram.

## Architecture

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: Flask + gunicorn (sync workers) + yt-dlp
- **Served**: Flask serves the built React SPA as static files

## Structure

```
backend/
  app.py              # Flask API (~280 lines, clean & production-ready)
  requirements.txt    # Python deps: flask, yt-dlp, gunicorn, requests
  static/             # Built frontend (copied here at build time)
frontend/
  src/
    pages/home.tsx    # Main UI page
    hooks/
      use-video-info.ts  # SSE-based video info fetching
      use-download.ts    # Native anchor-click download trigger
start.sh              # Dev/Replit startup script
render-build.sh       # Render build script
render.yaml           # Render deployment config
```

## API Endpoints

- `GET  /api/health` — health check
- `POST /api/video/info` — fetch video metadata (SSE stream, keeps Render alive)
- `GET  /api/video/download?url=&format_id=&audio_only=` — stream file to browser

## Key Design Decisions

1. **Sync gunicorn workers + threads** — avoids gevent/threading conflicts. 1 worker, 4 threads handles concurrency well on free tier (512MB RAM).

2. **SSE for /api/video/info** — yt-dlp can take 10-30s. SSE pings every 5s prevent Render's 55s idle-connection timeout from dropping the request.

3. **No ffmpeg** — audio is served as the best native format (m4a/webm) directly from the CDN. This eliminates a binary dependency that isn't on Render free tier.

4. **requests library for CDN proxy** — `requests.get(stream=True)` is simple, reliable, and gevent-compatible. Replaces the old urllib approach.

5. **TTL cache** — stores yt-dlp raw info + response for 10 min / 100 entries. Download endpoint reuses cached info without re-fetching.

## Gunicorn Config (production/Render)

```
--worker-class sync
--workers 1
--threads 4
--timeout 120
--keep-alive 75
--max-requests 200
--max-requests-jitter 20
```

## Running Locally

```bash
bash start.sh
```

## Deploying to Render

Push to GitHub — Render auto-deploys via `render.yaml`.
