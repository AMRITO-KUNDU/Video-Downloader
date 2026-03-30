# Video Downloader

Simplified full-stack YouTube downloader:

- React + Vite frontend in `frontend/`
- Flask + yt-dlp backend in `backend/` (also serves the built frontend)

## Local Development

1. Start the backend:

```bash
python backend/app.py
```

2. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. API calls proxy to `http://localhost:5001`.

## Production Build (no Docker)

```bash
cd frontend
npm install
npm run build
```

Copy `frontend/dist` into `backend/static` (or set `STATIC_DIR` to that folder), then run:

```bash
python backend/app.py
```

Open `http://localhost:5001`.

## Docker Deploy

```bash
docker build -t yt-downloader .
docker run -p 5001:5001 yt-downloader
```

Open `http://localhost:5001`.

## Notes

- The backend requires `ffmpeg`.
- All API routes live under `/api/youtube/*`.
