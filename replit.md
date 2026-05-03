# VidGrab

A full-stack multi-platform video downloader supporting **YouTube, Facebook, and Instagram**. Built with React + Vite (frontend) and Flask + yt-dlp + ffmpeg (backend).

## Architecture

- **Single-server model**: Flask serves both the REST API and the built React frontend from `backend/static/`
- **Backend**: Python 3.12 / Flask + Gunicorn (gevent, 2 workers) on port 5000
- **Frontend**: React 19 + Vite + Tailwind CSS v4, built to `frontend/dist/`, copied to `backend/static/`
- **ffmpeg**: Stream-muxes video+audio from CDN URLs directly to the HTTP response (no temp files)
- **Cache**: 10-minute in-memory TTL cache for yt-dlp info to reduce YouTube API calls

## Key Files

- `start.sh` — installs deps, builds frontend, copies dist, launches Gunicorn on port 5000
- `backend/app.py` — Flask API: caching, rate limiting, security headers, yt-dlp, ffmpeg streaming
- `backend/requirements.txt` — Flask, flask-cors, flask-limiter, yt-dlp, gunicorn, gevent
- `frontend/src/pages/home.tsx` — main UI
- `frontend/src/hooks/use-download.ts` — fetch+blob streaming with progress, cancel, audioOnly
- `frontend/src/hooks/use-video-info.ts` — React Query mutation; VideoFormat type
- `Dockerfile` — multi-stage build (Node 20 for frontend → Python 3.12 for backend)
- `render.yaml` — one-click Render deployment config

## Running in Replit

The "Start application" workflow runs `bash start.sh`, which:
1. `pip install` Python dependencies
2. `npm install` + `npm run build` in `frontend/`
3. Copies `frontend/dist/` → `backend/static/`
4. Kills any process on port 5000 (prevents stuck-port restarts)
5. Starts Gunicorn with 2 gevent workers on `0.0.0.0:5000`

## Deploying Externally

### Replit Deploy (simplest)
Click the Deploy button — uses `start.sh` as-is, no extra config needed.

### Render (cleanest external option)
1. Push to GitHub
2. New Web Service → Connect repo → Render detects `render.yaml` automatically
3. Click Deploy — Render's Ubuntu environment has Python 3.12, Node.js, npm, and ffmpeg pre-installed
4. Free tier available (spins down after 15 min inactivity; paid keeps it alive)

Uses a native Python web service (no Docker) — `render.yaml` specifies the build command
(pip install + npm build + copy dist) and start command (Gunicorn).

### Docker (Railway / Fly.io / any Docker host)
`docker build -t vidgrab . && docker run -p 5000:5000 vidgrab`
The `Dockerfile` is a self-contained multi-stage build — no extra config needed.

### Why NOT Vercel
Vercel is serverless (10s free / 300s pro timeout). VidGrab downloads stream for 15–90s
and run ffmpeg as a subprocess — both incompatible with serverless function limits.

## API Endpoints

- `POST /api/video/info` — `{ url }` → `{ platform, title, thumbnail, duration, uploader, formats[] }`
- `GET /api/video/download` — `?url=&format_id=&audio_only=` → streaming MP4 or MP3
- `GET /api/health` — `{ status, cache_entries }`

## Environment Variables

- `PORT` — server port (default: 5000)
- `STATIC_DIR` — path to built frontend (default: `backend/static/`)

## Known Limitations

- **YouTube bot detection**: Replit's shared server IPs can get temporarily rate-limited by YouTube after heavy usage. The app retries with 3 different yt-dlp client chains (android_testsuite → tv_embedded → web). Blocks clear within 30–60 min. Facebook/Instagram are unaffected.
- **Non-ASCII filenames**: Handled — Bengali/Arabic/CJK titles are ASCII-normalized before the Content-Disposition header.

## User Preferences

- Port 5000 for Replit webview compatibility
- Gunicorn + gevent for async streaming (not Flask dev server)
- ffmpeg process isolation with `start_new_session=True` for clean cleanup
- No temp files on disk — everything streams pipe:1 → HTTP response
