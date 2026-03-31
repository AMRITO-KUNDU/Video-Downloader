# YTDownloader

A full-stack YouTube video downloader built with React + Vite (frontend) and Flask + yt-dlp + ffmpeg (backend).

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

- `POST /api/youtube/video-info` — accepts `{ url }`, returns title, thumbnail, duration, uploader, and available formats
- `GET|POST /api/youtube/download` — accepts `{ url, format_id }`, streams a fragmented MP4 response

## Environment Variables

- `PORT` or `PYTHON_PORT` — server port (defaults to 5000)
- `STATIC_DIR` — path to serve static frontend files from (defaults to `backend/static/`)

## User Preferences

- Port 5000 for Replit webview compatibility
- Gunicorn for production WSGI (not Flask dev server)
- ffmpeg process isolation with `start_new_session=True` for clean cleanup
