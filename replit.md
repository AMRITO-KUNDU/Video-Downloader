# VidGrab

A full-stack multi-platform video downloader supporting **YouTube, Facebook, and Instagram**. Built with React + Vite (frontend) and Flask + yt-dlp + ffmpeg (backend). UI design inspired by NoteGPT (light theme, blue primary `#2E83FB`, Inter font).

## Architecture

- **Single-server production model**: Flask serves both the REST API and the built React frontend from `backend/static/`.
- **Backend**: Python/Flask with Gunicorn as the WSGI server, running on port 5000.
- **Frontend**: React 19 + Vite + Tailwind CSS v4, built to `frontend/dist/`, then copied to `backend/static/`.
- **ffmpeg**: Used to stream-mux video+audio from YouTube CDN URLs directly to the HTTP response (no temp files on disk).

## Key Files

- `start.sh` — installs deps, builds frontend, copies dist, launches Gunicorn on port 5000
- `backend/app.py` — Flask API with two endpoints: `/api/youtube/video-info` and `/api/youtube/download`
- `backend/requirements.txt` — Flask, flask-cors, yt-dlp, gunicorn
- `frontend/src/pages/home.tsx` — main UI page
- `frontend/src/hooks/` — React Query hooks for API calls
- `Dockerfile` — multi-stage Docker build (Node for frontend, Python for backend)

## Running in Replit

The "Start application" workflow runs `bash start.sh`, which:
1. `pip install` Python dependencies
2. `npm install` + `npm run build` in `frontend/`
3. Copies `frontend/dist/` → `backend/static/`
4. Starts Gunicorn with 2 workers on `0.0.0.0:5000`

## API Endpoints

- `POST /api/video/info` — accepts `{ url }` (YouTube, Facebook, or Instagram), returns `{ platform, title, thumbnail, duration, uploader, formats }`
- `GET|POST /api/video/download` — accepts `{ url, format_id }`, streams a fragmented MP4 response
- `POST /api/youtube/video-info` and `GET|POST /api/youtube/download` — backward-compatible aliases for the legacy YouTube-only routes

## Environment Variables

- `PORT` or `PYTHON_PORT` — server port (defaults to 5000)
- `STATIC_DIR` — path to serve static frontend files from (defaults to `backend/static/`)

## User Preferences

- Port 5000 for Replit webview compatibility
- Gunicorn for production WSGI (not Flask dev server)
- ffmpeg process isolation with `start_new_session=True` for clean cleanup
