import logging
import os
import re
import select
import signal
import subprocess
import time
import unicodedata
from threading import Lock

from flask import Flask, g, request, jsonify, Response, stream_with_context, send_from_directory, abort
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import yt_dlp

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger('vidgrab')

# ── App ───────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://",
)
limiter.init_app(app)


@app.errorhandler(429)
def rate_limit_handler(e):
    return jsonify({'error': 'Too many requests — please slow down and try again.'}), 429


# ── Constants ─────────────────────────────────────────────────────────────────
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

CHUNK_SIZE = 1024 * 256  # 256 KB

STATIC_DIR = os.environ.get(
    'STATIC_DIR',
    os.path.join(os.path.dirname(__file__), 'static'),
)

# ── TTL cache ─────────────────────────────────────────────────────────────────
class _TTLCache:
    """Thread-safe in-memory cache with per-entry TTL and LRU-style eviction."""

    def __init__(self, ttl: int = 300, max_size: int = 100):
        self._store: dict = {}
        self._ttl = ttl
        self._max = max_size
        self._lock = Lock()

    def get(self, key: str):
        with self._lock:
            entry = self._store.get(key)
            if entry:
                value, exp = entry
                if time.monotonic() < exp:
                    return value
                del self._store[key]
        return None

    def set(self, key: str, value):
        with self._lock:
            if len(self._store) >= self._max:
                oldest = min(self._store, key=lambda k: self._store[k][1])
                del self._store[oldest]
            self._store[key] = (value, time.monotonic() + self._ttl)

    def size(self) -> int:
        with self._lock:
            return len(self._store)


# Stores {'response': processed_dict, 'raw': yt_dlp_info_dict}
_info_cache = _TTLCache(ttl=300, max_size=100)

# ── Request hooks ─────────────────────────────────────────────────────────────
@app.before_request
def _start_timer():
    g.t0 = time.monotonic()


@app.after_request
def _finish_request(response: Response) -> Response:
    ms = round((time.monotonic() - g.t0) * 1000)
    logger.info('%s %s → %d  (%d ms)', request.method, request.path, response.status_code, ms)

    # Security headers
    h = response.headers
    h['X-Content-Type-Options'] = 'nosniff'
    h['X-Frame-Options'] = 'DENY'
    h['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    h['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    h.pop('Server', None)
    return response

# ── Helpers ───────────────────────────────────────────────────────────────────
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
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f'{h}:{m:02d}:{s:02d}' if h else f'{m}:{s:02d}'


def _get_formats(info):
    """Return best-per-resolution video formats with progressive fallbacks."""
    best: dict = {}

    # Pass 1: video-only streams with known size
    for f in info.get('formats', []):
        vcodec = f.get('vcodec') or ''
        if not vcodec or vcodec == 'none':
            continue
        height = f.get('height')
        if not height:
            continue
        if not (f.get('filesize') or f.get('filesize_approx')):
            continue
        if (f.get('acodec') or 'none') != 'none':
            continue  # prefer video-only in pass 1
        fps = f.get('fps') or 30
        key = (height, 60 if fps > 35 else 30)
        if key not in best or _score(f) > _score(best[key]):
            best[key] = f

    # Pass 2: combined streams (video+audio) with known size
    if not best:
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
            if not (f.get('filesize') or f.get('filesize_approx')):
                continue
            fps = f.get('fps') or 30
            key = (height, 60 if fps > 35 else 30)
            if key not in best or _score(f) > _score(best[key]):
                best[key] = f

    # Pass 3: any video stream with a URL (FB/IG last-resort)
    if not best:
        for f in info.get('formats', []):
            if not (f.get('vcodec') or '') or (f.get('vcodec') or '') == 'none':
                continue
            if not f.get('url'):
                continue
            height = f.get('height') or 0
            fps = f.get('fps') or 30
            key = (height, 60 if fps > 35 else 30)
            if key not in best or _score(f) > _score(best[key]):
                best[key] = f

    return best


def _best_audio_format(info):
    """Return the best audio-only stream dict (prefers m4a/AAC)."""
    audio = [
        f for f in info.get('formats', [])
        if (f.get('acodec') or 'none') != 'none'
        and (f.get('vcodec') or 'none') == 'none'
        and f.get('url')
    ]
    if not audio:
        return None
    m4a = [f for f in audio if f.get('ext') == 'm4a']
    pool = m4a if m4a else audio
    return max(pool, key=lambda f: f.get('abr') or f.get('tbr') or 0)


def _classify_error(e: Exception) -> str:
    msg = str(e).lower()
    if 'private video' in msg or ('private' in msg and 'video' in msg):
        return 'This video is private and cannot be downloaded.'
    if 'age-restricted' in msg or 'age restricted' in msg or 'age_gate' in msg or 'inappropriate' in msg:
        return 'This video is age-restricted and requires a signed-in account.'
    if 'not available in your country' in msg or ('geo' in msg and 'block' in msg):
        return 'This video is not available in this region.'
    if 'not a bot' in msg or 'confirm you' in msg:
        return 'YouTube is blocking this server from downloading right now. Please try again in a moment.'
    if 'sign in' in msg or 'login required' in msg or 'log in to' in msg:
        return 'This video requires sign-in to access.'
    if 'video unavailable' in msg or 'has been removed' in msg or "doesn't exist" in msg:
        return 'This video is unavailable or has been removed.'
    if 'http error 429' in msg or 'too many requests' in msg:
        return 'YouTube rate-limited this request — please try again in a moment.'
    if 'unable to extract' in msg or 'no video formats' in msg or 'no formats' in msg:
        return 'Could not extract video data — the link may be expired or unsupported.'
    return f'Could not process this video. {str(e)}'


def _safe_title(raw: str) -> str:
    """Return an ASCII-only, HTTP-header-safe filename stem.

    Strategy: NFKD decomposition converts accented Latin chars (é→e, ñ→n).
    Non-decomposable scripts (Bengali, Arabic, CJK, etc.) are silently dropped.
    The result is then stripped of any remaining non-word characters.
    """
    normalized = unicodedata.normalize('NFKD', raw).encode('ascii', 'ignore').decode('ascii')
    safe = re.sub(r'[^\w\s\-.]', '', normalized)[:80].strip()
    return safe or 'video'


def _validate_url(url: str):
    if not url:
        return None, (jsonify({'error': 'URL is required.'}), 400)
    platform = detect_platform(url)
    if not platform:
        return None, (jsonify({
            'error': 'Please enter a valid YouTube, Facebook, or Instagram URL.'
        }), 400)
    return platform, None


def _fetch_info(url: str) -> dict:
    """Fetch yt-dlp info, normalising playlist wrappers."""
    with yt_dlp.YoutubeDL({**BASE_OPTS}) as ydl:
        info = ydl.extract_info(url, download=False)
    if info.get('_type') == 'playlist' and info.get('entries'):
        info = next((e for e in info['entries'] if e), info)
    return info


def _stream_headers(filename: str, content_type: str, est_size=None) -> dict:
    h = {
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Content-Type': content_type,
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
        'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length',
    }
    if est_size:
        h['Content-Length'] = str(int(est_size))
    return h


def _make_generator(proc):
    """Yield stdout chunks and guarantee proc cleanup."""
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
            rc = proc.wait()
            if rc not in (0, -15):
                logger.warning('ffmpeg exited with code %d', rc)
    return generate


def _probe_first_chunk(proc, timeout: int = 20):
    """Wait up to *timeout* seconds for ffmpeg to start producing output.

    Returns (first_chunk_bytes, None) on success, or (None, error_message)
    when ffmpeg exits immediately with no output — which happens when the CDN
    URL is blocked, expired, or otherwise inaccessible.

    This must be called *before* the HTTP response headers are sent so that a
    real JSON error can still be returned instead of a silent broken stream.
    """
    readable, _, _ = select.select([proc.stdout], [], [], timeout)
    if not readable:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except Exception:
            pass
        return None, 'Download timed out — the video stream took too long to start. Please try again.'

    first_chunk = os.read(proc.stdout.fileno(), CHUNK_SIZE)
    if not first_chunk:
        stderr_out = b''
        try:
            stderr_out = proc.stderr.read(2000)
        except Exception:
            pass
        rc = proc.wait()
        logger.error('ffmpeg produced no output (rc=%d): %s', rc, stderr_out.decode(errors='replace'))
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except Exception:
            pass
        return None, 'Could not read the video stream — the format may be temporarily unavailable. Try a different quality or try again shortly.'

    return first_chunk, None


def _make_generator_with_head(proc, first_chunk: bytes):
    """Like _make_generator but prepends an already-read first_chunk."""
    def generate():
        try:
            yield first_chunk
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
            rc = proc.wait()
            if rc not in (0, -15):
                logger.warning('ffmpeg exited with code %d', rc)
    return generate


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'vidgrab',
        'cache_entries': _info_cache.size(),
    })


@app.route('/api/video/info', methods=['POST'])
@limiter.limit('20 per minute')
def get_video_info():
    try:
        data = request.get_json()
        url = (data or {}).get('url', '').strip()

        platform, err = _validate_url(url)
        if err:
            return err

        # Serve from cache if available
        cache_key = url
        cached = _info_cache.get(cache_key)
        if cached:
            logger.info('cache hit for %s', url[:60])
            return jsonify(cached['response'])

        logger.info('fetching info for %s', url[:60])
        info = _fetch_info(url)

        best_per_key = _get_formats(info)
        if not best_per_key:
            return jsonify({'error': 'No downloadable formats found for this video.'}), 400

        formats = []
        for (height, fps_bucket), f in sorted(
            best_per_key.items(), key=lambda x: (x[0][0], x[0][1]), reverse=True
        ):
            label = (f'{height}p' + ('60' if fps_bucket == 60 else '')) if height else 'Auto'
            formats.append({
                'format_id': f.get('format_id'),
                'quality': f'{height}p' if height else 'Auto',
                'label': label,
                'ext': 'mp4',
                'filesize': f.get('filesize') or f.get('filesize_approx', 0),
                'audio_only': False,
            })

        best_audio = _best_audio_format(info)
        if best_audio:
            formats.append({
                'format_id': 'audio_only',
                'quality': 'MP3',
                'label': 'MP3',
                'ext': 'mp3',
                'filesize': best_audio.get('filesize') or best_audio.get('filesize_approx', 0),
                'audio_only': True,
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
        if len(title) > 200:
            title = title[:200] + '…'

        result = {
            'platform': platform,
            'title': title,
            'thumbnail': thumbnail,
            'duration': _format_duration(info.get('duration')),
            'uploader': info.get('uploader') or info.get('channel') or info.get('uploader_id') or 'Unknown',
            'formats': formats,
        }

        _info_cache.set(cache_key, {'response': result, 'raw': info})
        return jsonify(result)

    except Exception as e:
        logger.error('get_video_info error: %s', e)
        return jsonify({'error': _classify_error(e)}), 500


@app.route('/api/video/download', methods=['GET', 'POST'])
@limiter.limit('15 per minute')
def download_video():
    proc = None
    try:
        if request.method == 'GET':
            url = request.args.get('url', '').strip()
            format_id = request.args.get('format_id', '').strip()
            audio_only = request.args.get('audio_only', '').lower() in ('1', 'true', 'yes')
        else:
            data = request.get_json()
            url = (data or {}).get('url', '').strip()
            format_id = (data or {}).get('format_id', '').strip()
            audio_only = str((data or {}).get('audio_only', '')).lower() in ('1', 'true', 'yes')

        if not url or not format_id:
            return jsonify({'error': 'url and format_id are required.'}), 400

        _, err = _validate_url(url)
        if err:
            return err

        # Reuse cached yt-dlp info when available — avoids a second network round-trip
        cached = _info_cache.get(url)
        if cached:
            logger.info('download using cached info for %s', url[:60])
            info = cached['raw']
        else:
            logger.info('download fetching info for %s', url[:60])
            info = _fetch_info(url)

        safe_title = _safe_title(info.get('title', 'video'))

        # Build platform-aware headers for ffmpeg.
        # YouTube CDN requires Referer + Origin; without them requests are 403'd
        # from datacenter IPs and ffmpeg silently produces 0 bytes.
        ua_header = f'User-Agent: {USER_AGENT}\r\n'
        if 'youtube.com' in url or 'youtu.be' in url:
            ua_header += 'Referer: https://www.youtube.com/\r\nOrigin: https://www.youtube.com\r\n'
        elif 'facebook.com' in url or 'fb.watch' in url or 'fb.com' in url:
            ua_header += 'Referer: https://www.facebook.com/\r\nOrigin: https://www.facebook.com\r\n'
        elif 'instagram.com' in url:
            ua_header += 'Referer: https://www.instagram.com/\r\nOrigin: https://www.instagram.com\r\n'

        # ── Audio-only (MP3) ──────────────────────────────────────────────────
        if audio_only or format_id == 'audio_only':
            best_audio = _best_audio_format(info)
            if not best_audio or not best_audio.get('url'):
                return jsonify({'error': 'No audio stream found for this video.'}), 400

            est_size = best_audio.get('filesize') or best_audio.get('filesize_approx')
            cmd = [
                'ffmpeg', '-y',
                '-headers', ua_header,
                '-i', best_audio['url'],
                '-vn',
                '-c:a', 'libmp3lame',
                '-b:a', '192k',
                '-f', 'mp3',
                'pipe:1',
            ]
            logger.info('spawning ffmpeg (mp3) for %s', safe_title)
            proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                start_new_session=True,
            )
            first_chunk, err = _probe_first_chunk(proc, timeout=20)
            if first_chunk is None:
                return jsonify({'error': err}), 500
            return Response(
                stream_with_context(_make_generator_with_head(proc, first_chunk)()),
                status=200,
                headers=_stream_headers(f'{safe_title}.mp3', 'audio/mpeg', est_size),
            )

        # ── Video (mp4) ───────────────────────────────────────────────────────
        fmt = next(
            (f for f in info.get('formats', []) if f.get('format_id') == format_id),
            None,
        )
        if not fmt or not fmt.get('url'):
            return jsonify({'error': 'Selected format not found or has no direct URL.'}), 400

        video_url = fmt['url']
        video_has_audio = (fmt.get('acodec') or 'none') != 'none'
        audio_fmt = None if video_has_audio else _best_audio_format(info)
        audio_url = audio_fmt['url'] if audio_fmt else None

        video_size = fmt.get('filesize') or fmt.get('filesize_approx') or 0
        audio_size = (
            (audio_fmt.get('filesize') or audio_fmt.get('filesize_approx') or 0)
            if audio_fmt else 0
        )
        est_size = (video_size + audio_size) if video_size else None

        cmd = ['ffmpeg', '-y', '-headers', ua_header, '-i', video_url]
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
        logger.info('spawning ffmpeg (mp4 %s) for %s', format_id, safe_title)
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            start_new_session=True,
        )
        first_chunk, err = _probe_first_chunk(proc, timeout=20)
        if first_chunk is None:
            return jsonify({'error': err}), 500
        return Response(
            stream_with_context(_make_generator_with_head(proc, first_chunk)()),
            status=200,
            headers=_stream_headers(f'{safe_title}.mp4', 'video/mp4', est_size),
        )

    except Exception as e:
        if proc:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except Exception:
                pass
        logger.error('download_video error: %s', e)
        return jsonify({'error': _classify_error(e)}), 500


# ── Legacy route aliases ──────────────────────────────────────────────────────
app.add_url_rule('/api/youtube/video-info', endpoint='yt_info',
                 view_func=get_video_info, methods=['POST'])
app.add_url_rule('/api/youtube/download', endpoint='yt_download',
                 view_func=download_video, methods=['GET', 'POST'])


# ── Frontend SPA catch-all ────────────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        abort(404)

    index_path = os.path.join(STATIC_DIR, 'index.html')
    if not os.path.exists(index_path):
        return 'Frontend not built. Run start.sh first.', 503

    file_path = os.path.join(STATIC_DIR, path)
    if path and os.path.exists(file_path):
        return send_from_directory(STATIC_DIR, path)

    return send_from_directory(STATIC_DIR, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', os.environ.get('PYTHON_PORT', 5000)))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
