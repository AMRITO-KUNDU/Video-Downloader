from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory, abort
from flask_cors import CORS
import yt_dlp
import subprocess
import os
import re
import signal

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

PLATFORM_PATTERNS = {
    'youtube': re.compile(
        r'(https?://)?(www\.|m\.)?(youtube\.com/(watch\?|shorts/|embed/|v/)|youtu\.be/)',
        re.IGNORECASE,
    ),
    'facebook': re.compile(
        r'(https?://)?(www\.|m\.|web\.|business\.)?(facebook\.com|fb\.watch|fb\.com)/',
        re.IGNORECASE,
    ),
    'instagram': re.compile(
        r'(https?://)?(www\.)?instagram\.com/(p/|reel/|reels/|tv/|stories/)',
        re.IGNORECASE,
    ),
}

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

CHUNK_SIZE = 1024 * 256

STATIC_DIR = os.environ.get(
    "STATIC_DIR",
    os.path.join(os.path.dirname(__file__), "static"),
)


def detect_platform(url: str):
    for name, pattern in PLATFORM_PATTERNS.items():
        if pattern.search(url):
            return name
    return None


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

    # Last-resort: any video format with a direct URL (FB/IG often expose only one)
    if not best_per_key:
        for f in info.get('formats', []):
            vcodec = f.get('vcodec') or ''
            if not vcodec or vcodec == 'none':
                continue
            if not f.get('url'):
                continue
            height = f.get('height') or 0
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
    m4a = [f for f in audio_formats if f.get('ext') == 'm4a']
    pool = m4a if m4a else audio_formats
    best = max(pool, key=lambda f: f.get('abr') or f.get('tbr') or 0)
    return best.get('url')


def _validate_url(url: str):
    if not url:
        return None, (jsonify({'error': 'URL is required.'}), 400)
    platform = detect_platform(url)
    if not platform:
        return None, (jsonify({
            'error': 'Please enter a valid YouTube, Facebook, or Instagram URL.'
        }), 400)
    return platform, None


@app.route('/api/video/info', methods=['POST'])
def get_video_info():
    try:
        data = request.get_json()
        url = (data or {}).get('url', '').strip()

        platform, err = _validate_url(url)
        if err:
            return err

        with yt_dlp.YoutubeDL({**BASE_OPTS}) as ydl:
            info = ydl.extract_info(url, download=False)

        # Some IG/FB pages return a playlist-style result with one entry
        if info.get('_type') == 'playlist' and info.get('entries'):
            info = next((e for e in info['entries'] if e), info)

        best_per_key = _get_formats(info)

        if not best_per_key:
            return jsonify({'error': 'No downloadable formats found for this video.'}), 400

        formats = []
        for (height, fps_bucket), f in sorted(
            best_per_key.items(), key=lambda x: (x[0][0], x[0][1]), reverse=True
        ):
            label = f"{height}p" + ('60' if fps_bucket == 60 else '') if height else 'Auto'
            quality = f"{height}p" if height else 'Auto'
            formats.append({
                'format_id': f.get('format_id'),
                'quality': quality,
                'label': label,
                'ext': 'mp4',
                'filesize': f.get('filesize') or f.get('filesize_approx', 0),
            })

        thumbnails = info.get('thumbnails') or []
        thumbnail = info.get('thumbnail', '') or ''
        if thumbnails and not thumbnail:
            best_thumb = max(
                (t for t in thumbnails if t.get('url') and t.get('width')),
                key=lambda t: t.get('width', 0),
                default=None,
            )
            thumbnail = (best_thumb or thumbnails[-1]).get('url', '')

        title = info.get('title') or info.get('description') or 'Untitled'
        if title and len(title) > 200:
            title = title[:200] + '…'

        return jsonify({
            'platform': platform,
            'title': title,
            'thumbnail': thumbnail,
            'duration': _format_duration(info.get('duration')),
            'uploader': info.get('uploader') or info.get('channel') or info.get('uploader_id') or 'Unknown',
            'formats': formats,
        })

    except Exception as e:
        return jsonify({'error': f'Failed to fetch video info: {str(e)}'}), 500


@app.route('/api/video/download', methods=['GET', 'POST'])
def download_video():
    proc = None
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

        _, err = _validate_url(url)
        if err:
            return err

        with yt_dlp.YoutubeDL({**BASE_OPTS}) as ydl:
            info = ydl.extract_info(url, download=False)

        if info.get('_type') == 'playlist' and info.get('entries'):
            info = next((e for e in info['entries'] if e), info)

        fmt = next(
            (f for f in info.get('formats', []) if f.get('format_id') == format_id),
            None,
        )
        if not fmt or not fmt.get('url'):
            return jsonify({'error': 'Selected format not found or has no direct URL.'}), 400

        video_url = fmt['url']
        video_has_audio = (fmt.get('acodec') or 'none') != 'none'
        audio_url = None if video_has_audio else _best_audio_url(info)

        title = re.sub(r'[^\w\s\-.]', '', info.get('title', 'video'))[:80].strip() or 'video'
        filename = f"{title}.mp4"

        ua_header = f"User-Agent: {USER_AGENT}\r\n"
        cmd = ['ffmpeg', '-y']

        cmd += ['-headers', ua_header, '-i', video_url]

        if audio_url:
            cmd += ['-headers', ua_header, '-i', audio_url]

        cmd += ['-map', '0:v:0']
        if audio_url:
            cmd += ['-map', '1:a:0']
        elif video_has_audio:
            cmd += ['-map', '0:a:0']

        cmd += [
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-f', 'mp4',
            '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
            'pipe:1',
        ]

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )

        def generate():
            try:
                while True:
                    chunk = proc.stdout.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    yield chunk
            finally:
                try:
                    proc.stdout.close()
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                except Exception:
                    pass
                proc.wait()

        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}',
            'Content-Type': 'video/mp4',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
            # Tell Nginx/reverse-proxies NOT to buffer — critical for mobile streaming
            'X-Accel-Buffering': 'no',
            # Allow JS (fetch API) to read these headers cross-context
            'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length',
        }

        return Response(
            stream_with_context(generate()),
            status=200,
            headers=headers,
        )

    except Exception as e:
        if proc:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except Exception:
                pass
        return jsonify({'error': f'Download failed: {str(e)}'}), 500


# Backward-compatible aliases for the old YouTube-only routes
app.add_url_rule(
    '/api/youtube/video-info', endpoint='yt_info',
    view_func=get_video_info, methods=['POST'],
)
app.add_url_rule(
    '/api/youtube/download', endpoint='yt_download',
    view_func=download_video, methods=['GET', 'POST'],
)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        abort(404)

    index_path = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_path):
        return "Frontend not built yet. Run the start script first.", 503

    file_path = os.path.join(STATIC_DIR, path)
    if path and os.path.exists(file_path):
        return send_from_directory(STATIC_DIR, path)

    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', os.environ.get('PYTHON_PORT', 5000)))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
