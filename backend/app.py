from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory, abort
from flask_cors import CORS
import yt_dlp
import subprocess
import os
import re
import shlex

app = Flask(__name__)
CORS(app)

YOUTUBE_RE = re.compile(
    r'(https?://)?(www\.)?(youtube\.com/(watch\?|shorts/|embed/|v/)|youtu\.be/)'
)

USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/124.0.0.0 Safari/537.36'
)

BASE_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'socket_timeout': 30,
    'http_headers': {'User-Agent': USER_AGENT},
}

CHUNK_SIZE = 1024 * 256  # 256 KB chunks

STATIC_DIR = os.environ.get(
    "STATIC_DIR",
    os.path.join(os.path.dirname(__file__), "static"),
)


def _score(fmt):
    codec = (fmt.get('vcodec') or '').lower()
    tbr = fmt.get('tbr') or 0
    exact = 1 if fmt.get('filesize') else 0
    avc = 2 if ('avc' in codec or 'h264' in codec) else 0
    return exact + avc + tbr / 10000


def _format_duration(seconds):
    if not seconds:
        return 'Unknown'
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def _get_formats(info):
    """Return best-per-resolution video-only formats, falling back to combined."""
    best_per_key = {}

    # Pass 1: video-only streams (will be merged with separate audio)
    for f in info.get('formats', []):
        vcodec = f.get('vcodec') or ''
        if not vcodec or vcodec == 'none':
            continue
        height = f.get('height')
        if not height:
            continue
        filesize = f.get('filesize') or f.get('filesize_approx')
        if not filesize or filesize <= 0:
            continue
        fps = f.get('fps') or 30
        key = (height, 60 if fps > 35 else 30)
        if key not in best_per_key or _score(f) > _score(best_per_key[key]):
            best_per_key[key] = f

    # Pass 2: fall back to combined (audio+video) streams
    if not best_per_key:
        for f in info.get('formats', []):
            vcodec = f.get('vcodec') or ''
            acodec = f.get('acodec') or ''
            if not vcodec or vcodec == 'none':
                continue
            if not acodec or acodec == 'none':
                continue
            height = f.get('height')
            if not height:
                continue
            filesize = f.get('filesize') or f.get('filesize_approx')
            if not filesize or filesize <= 0:
                continue
            fps = f.get('fps') or 30
            key = (height, 60 if fps > 35 else 30)
            if key not in best_per_key or _score(f) > _score(best_per_key[key]):
                best_per_key[key] = f

    return best_per_key


def _best_audio_url(info):
    """Pick the best audio-only stream URL (prefers m4a/AAC)."""
    audio_formats = [
        f for f in info.get('formats', [])
        if (f.get('acodec') or 'none') != 'none'
        and (f.get('vcodec') or 'none') == 'none'
        and f.get('url')
    ]
    if not audio_formats:
        return None
    # Prefer m4a (AAC) for clean copy-mux into MP4
    m4a = [f for f in audio_formats if f.get('ext') == 'm4a']
    pool = m4a if m4a else audio_formats
    best = max(pool, key=lambda f: f.get('abr') or f.get('tbr') or 0)
    return best.get('url')


@app.route('/api/youtube/video-info', methods=['POST'])
def get_video_info():
    try:
        data = request.get_json()
        url = (data or {}).get('url', '').strip()

        if not url:
            return jsonify({'error': 'URL is required.'}), 400
        if not YOUTUBE_RE.search(url):
            return jsonify({'error': 'Please enter a valid YouTube URL.'}), 400

        with yt_dlp.YoutubeDL({**BASE_OPTS}) as ydl:
            info = ydl.extract_info(url, download=False)

        best_per_key = _get_formats(info)

        if not best_per_key:
            return jsonify({'error': 'No downloadable formats found for this video.'}), 400

        formats = []
        for (height, fps_bucket), f in sorted(
            best_per_key.items(), key=lambda x: (x[0][0], x[0][1]), reverse=True
        ):
            label = f"{height}p" + ('60' if fps_bucket == 60 else '')
            formats.append({
                'format_id': f.get('format_id'),
                'quality': f"{height}p",
                'label': label,
                'ext': 'mp4',
                'filesize': f.get('filesize') or f.get('filesize_approx', 0),
            })

        thumbnails = info.get('thumbnails') or []
        thumbnail = ''
        if thumbnails:
            best_thumb = max(
                (t for t in thumbnails if t.get('url') and t.get('width')),
                key=lambda t: t.get('width', 0),
                default=None,
            )
            thumbnail = (best_thumb or thumbnails[-1]).get('url', '')

        return jsonify({
            'title': info.get('title', 'Unknown'),
            'thumbnail': thumbnail,
            'duration': _format_duration(info.get('duration')),
            'uploader': info.get('uploader') or info.get('channel', 'Unknown'),
            'formats': formats,
        })

    except Exception as e:
        return jsonify({'error': f'Failed to fetch video info: {str(e)}'}), 500


@app.route('/api/youtube/download', methods=['GET', 'POST'])
def download_video():
    try:
        if request.method == 'GET':
            url = request.args.get('url', '').strip()
            format_id = request.args.get('format_id', '').strip()
        else:
            data = request.get_json()
            url = (data or {}).get('url', '').strip()
            format_id = (data or {}).get('format_id', '').strip()

        if not url or not format_id:
            return jsonify({'error': 'URL and format_id are required.'}), 400
        if not YOUTUBE_RE.search(url):
            return jsonify({'error': 'Please enter a valid YouTube URL.'}), 400

        # Step 1: extract CDN stream URLs via yt-dlp — no downloading
        with yt_dlp.YoutubeDL({**BASE_OPTS}) as ydl:
            info = ydl.extract_info(url, download=False)

        # Find the selected video format
        fmt = next(
            (f for f in info.get('formats', []) if f.get('format_id') == format_id),
            None,
        )
        if not fmt or not fmt.get('url'):
            return jsonify({'error': 'Selected format not found or has no direct URL.'}), 400

        video_url = fmt['url']
        video_has_audio = (fmt.get('acodec') or 'none') != 'none'
        audio_url = None if video_has_audio else _best_audio_url(info)

        title = re.sub(r'[^\w\s\-.]', '', info.get('title', 'video'))[:80].strip()
        filename = f"{title}.mp4"

        # Step 2: build ffmpeg command that pulls from CDN URLs and pipes to stdout
        # -headers must come before each -i to pass User-Agent to each request
        ua_header = f"User-Agent: {USER_AGENT}\r\n"
        cmd = ['ffmpeg', '-y']

        # Video input
        cmd += ['-headers', ua_header, '-i', video_url]

        # Audio input (separate stream, if needed)
        if audio_url:
            cmd += ['-headers', ua_header, '-i', audio_url]

        # Map + encode: copy both streams, output fragmented MP4 to stdout
        cmd += [
            '-map', '0:v:0',
        ]
        if audio_url:
            cmd += ['-map', '1:a:0']
        elif video_has_audio:
            cmd += ['-map', '0:a:0']

        cmd += [
            '-c:v', 'copy',
            # Always re-encode audio to AAC so any input codec (opus, vorbis, mp3)
            # muxes cleanly into the MP4 container — zero risk of stream rejection.
            '-c:a', 'aac',
            '-b:a', '128k',
            '-f', 'mp4',
            # frag_keyframe+empty_moov makes MP4 streamable without seeking
            '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
            'pipe:1',
        ]

        # Step 3: spawn ffmpeg, pipe stdout directly to the HTTP response
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )

        def generate():
            try:
                while True:
                    chunk = proc.stdout.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    yield chunk
            finally:
                proc.stdout.close()
                proc.wait()

        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Type': 'video/mp4',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-cache',
        }

        return Response(
            stream_with_context(generate()),
            status=200,
            headers=headers,
            direct_passthrough=True,
        )

    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        abort(404)

    index_path = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_path):
        return "Frontend not built. Build the React app first.", 404

    file_path = os.path.join(STATIC_DIR, path)
    if path and os.path.exists(file_path):
        return send_from_directory(STATIC_DIR, path)

    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
