import json
import logging
import os
import queue
import re
import threading
import time
import unicodedata
from threading import Lock

import requests
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
    return jsonify({'error': 'Too many requests — please slow down.'}), 429


# ── Constants ─────────────────────────────────────────────────────────────────
PLATFORM_PATTERNS = {
    'youtube': re.compile(
        r'(https?://)?(www\.|m\.)?(youtube\.com/(watch|shorts|embed|v)|youtu\.be/)',
        re.IGNORECASE,
    ),
    'facebook': re.compile(
        r'(https?://)?(www\.|m\.|web\.)?(facebook\.com|fb\.watch|fb\.com)/',
        re.IGNORECASE,
    ),
}

USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/124.0.0.0 Safari/537.36'
)

YDL_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'socket_timeout': 30,
    'noplaylist': True,
    'http_headers': {'User-Agent': USER_AGENT},
    'extractor_args': {
        'youtube': {
            'player_client': ['tv_embedded', 'ios', 'mweb', 'web'],
        }
    },
}

CHUNK_SIZE = 256 * 1024  # 256 KB

STATIC_DIR = os.environ.get(
    'STATIC_DIR',
    os.path.join(os.path.dirname(__file__), 'static'),
)


# ── TTL cache ─────────────────────────────────────────────────────────────────
class _TTLCache:
    def __init__(self, ttl: int = 600, max_size: int = 100):
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


_info_cache = _TTLCache(ttl=600, max_size=100)


# ── Request hooks ─────────────────────────────────────────────────────────────
@app.before_request
def _start_timer():
    g.t0 = time.monotonic()


@app.after_request
def _finish_request(response: Response) -> Response:
    ms = round((time.monotonic() - g.t0) * 1000)
    logger.info('%s %s → %d  (%d ms)', request.method, request.path, response.status_code, ms)
    h = response.headers
    h['X-Content-Type-Options'] = 'nosniff'
    h['X-Frame-Options'] = 'DENY'
    h['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    h.pop('Server', None)
    return response


# ── Helpers ───────────────────────────────────────────────────────────────────
def detect_platform(url: str):
    for name, pattern in PLATFORM_PATTERNS.items():
        if pattern.search(url):
            return name
    return None


def _validate_url(url: str):
    if not url:
        return None, (jsonify({'error': 'URL is required.'}), 400)
    platform = detect_platform(url)
    if not platform:
        return None, (jsonify({
            'error': 'Please enter a valid YouTube, Facebook, or Instagram URL.'
        }), 400)
    return platform, None


def _format_duration(seconds):
    if not seconds:
        return 'Unknown'
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f'{h}:{m:02d}:{s:02d}' if h else f'{m}:{s:02d}'


def _safe_title(raw: str) -> str:
    normalized = unicodedata.normalize('NFKD', raw).encode('ascii', 'ignore').decode('ascii')
    safe = re.sub(r'[^\w\s\-.]', '', normalized)[:80].strip()
    return safe or 'video'


def _score(fmt):
    codec = (fmt.get('vcodec') or '').lower()
    tbr = fmt.get('tbr') or 0
    has_size = 1 if (fmt.get('filesize') or fmt.get('filesize_approx')) else 0
    is_avc = 2 if ('avc' in codec or 'h264' in codec) else 0
    return has_size + is_avc + tbr / 10000


def _get_video_formats(info: dict) -> dict:
    """Return best progressive (combined video+audio) format per resolution.

    Pass 1: formats with explicit vcodec + acodec (true combined streams).
    Pass 2: fallback for platforms like Instagram with incomplete codec metadata.
    """
    best: dict = {}

    for f in info.get('formats', []):
        vcodec = f.get('vcodec') or ''
        acodec = f.get('acodec') or 'none'
        if not vcodec or vcodec == 'none':
            continue
        if not acodec or acodec == 'none':
            continue
        height = f.get('height')
        if not height or not f.get('url'):
            continue
        fps = f.get('fps') or 30
        key = (height, 60 if fps > 35 else 30)
        if key not in best or _score(f) > _score(best[key]):
            best[key] = f

    if best:
        return best

    for f in info.get('formats', []):
        vcodec = f.get('vcodec') or ''
        if not vcodec or vcodec == 'none':
            continue
        if not f.get('url'):
            continue
        height = f.get('height') or 0
        fps = f.get('fps') or 30
        key = (height, 60 if fps > 35 else 30)
        if key not in best or _score(f) > _score(best[key]):
            best[key] = f

    return best


def _get_best_audio(info: dict):
    """Return the best audio-only format (m4a preferred)."""
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
    if 'private' in msg and 'video' in msg:
        return 'This video is private and cannot be downloaded.'
    if 'age-restricted' in msg or 'age restricted' in msg or 'age_gate' in msg:
        return 'This video is age-restricted and requires a signed-in account.'
    if 'not available in your country' in msg or ('geo' in msg and 'block' in msg):
        return 'This video is not available in this region.'
    if 'video unavailable' in msg or 'has been removed' in msg or "doesn't exist" in msg:
        return 'This video is unavailable or has been removed.'
    if 'http error 429' in msg or 'too many requests' in msg or 'rate-limit' in msg:
        return 'Rate limit reached — please try again in a moment.'
    if 'no video formats found' in msg or 'no formats found' in msg:
        return 'YouTube blocked this request — the server IP is restricted. Please try again in a few minutes.'
    if 'requested format is not available' in msg or 'format is not available' in msg:
        return 'No downloadable format was found for this video. It may be restricted or unavailable.'
    # Bot/sign-in checks — kept after the "no formats" check to avoid false positives
    # from yt-dlp's own "Confirm you are on the latest version" message.
    if 'not a bot' in msg or 'sign in to confirm your age' in msg:
        return 'YouTube is blocking this server right now. Please try again in a few minutes.'
    if 'sign in' in msg or 'login required' in msg:
        return 'This video requires a signed-in account to access.'
    if 'unable to extract' in msg:
        return 'Could not extract video data — the link may be expired or unsupported.'
    return 'Could not fetch this video. Please check the link and try again.'


# Errors that are transient / client-specific and worth retrying on YouTube
_RETRYABLE_YOUTUBE_PHRASES = (
    'not a bot',
    'sign in to confirm',
    'requested format is not available',
    'format is not available',
    'no video formats found',
    'no formats found',
    'http error 403',
    'unable to extract',
)


def _fetch_info(url: str) -> dict:
    """Fetch yt-dlp metadata. Retries YouTube requests with different clients
    when the current client hits bot-detection or format errors."""
    is_youtube = 'youtube.com' in url or 'youtu.be' in url
    client_chains = (
        [
            ['tv_embedded', 'ios', 'mweb', 'web'],
            ['android', 'tv_embedded'],
            ['ios', 'mweb'],
            ['mweb'],
        ]
        if is_youtube else [[]]
    )

    last_error: Exception = RuntimeError('No clients attempted')

    for i, client_list in enumerate(client_chains):
        try:
            extra = (
                {'extractor_args': {'youtube': {'player_client': client_list}}}
                if client_list else {}
            )
            with yt_dlp.YoutubeDL({**YDL_OPTS, **extra}) as ydl:
                info = ydl.extract_info(url, download=False)
            if info.get('_type') == 'playlist' and info.get('entries'):
                info = next((e for e in info['entries'] if e), info)
            return info
        except Exception as e:
            last_error = e
            err_lower = str(e).lower()
            is_retryable = is_youtube and any(p in err_lower for p in _RETRYABLE_YOUTUBE_PHRASES)
            if not is_retryable:
                raise
            if i < len(client_chains) - 1:
                logger.warning('retryable error with client %s: %s — trying next chain (%d/%d)',
                               client_list, str(e)[:80], i + 1, len(client_chains))
                time.sleep(1)

    raise last_error


def _build_response(url: str, platform: str, info: dict) -> dict:
    """Build the JSON response from yt-dlp info and store in cache."""
    best_per_key = _get_video_formats(info)
    if not best_per_key:
        raise ValueError('No downloadable video formats found.')

    formats = []
    for (height, fps_bucket), f in sorted(
        best_per_key.items(), key=lambda x: (x[0][0], x[0][1]), reverse=True
    ):
        label = (f'{height}p' + ('60' if fps_bucket == 60 else '')) if height else 'Auto'
        formats.append({
            'format_id': f['format_id'],
            'label': label,
            'ext': 'mp4',
            'filesize': f.get('filesize') or f.get('filesize_approx', 0),
            'audio_only': False,
        })

    best_audio = _get_best_audio(info)
    if best_audio:
        audio_ext = best_audio.get('ext') or 'm4a'
        formats.append({
            'format_id': 'audio_only',
            'label': 'Audio',
            'ext': audio_ext,
            'filesize': best_audio.get('filesize') or best_audio.get('filesize_approx', 0),
            'audio_only': True,
        })

    thumbnails = info.get('thumbnails') or []
    thumbnail = info.get('thumbnail') or ''
    if not thumbnail and thumbnails:
        with_dims = [t for t in thumbnails if t.get('url') and t.get('width')]
        best_t = max(with_dims, key=lambda t: t.get('width', 0), default=None)
        thumbnail = (best_t or thumbnails[-1]).get('url', '')

    title = info.get('title') or info.get('description') or 'Untitled'
    if len(title) > 200:
        title = title[:200] + '…'

    result = {
        'platform': platform,
        'title': title,
        'thumbnail': thumbnail,
        'duration': _format_duration(info.get('duration')),
        'uploader': (
            info.get('uploader') or info.get('channel')
            or info.get('uploader_id') or 'Unknown'
        ),
        'formats': formats,
    }

    _info_cache.set(url, {'response': result, 'raw': info})
    return result


def _cdn_headers(platform: str) -> dict:
    headers = {'User-Agent': USER_AGENT}
    origins = {
        'youtube': 'https://www.youtube.com',
        'facebook': 'https://www.facebook.com',
    }
    origin = origins.get(platform)
    if origin:
        headers['Referer'] = origin + '/'
        headers['Origin'] = origin
    return headers


def _sse(data: dict) -> str:
    return f'data: {json.dumps(data)}\n\n'


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok', 'cache_entries': _info_cache.size()})


@app.route('/api/video/info', methods=['POST'])
@limiter.limit('20 per minute')
def get_video_info():
    data = request.get_json()
    url = (data or {}).get('url', '').strip()

    platform, err = _validate_url(url)
    if err:
        return err

    def generate():
        cached = _info_cache.get(url)
        if cached:
            logger.info('cache hit: %s', url[:60])
            yield _sse(cached['response'])
            return

        result_q: queue.Queue = queue.Queue()

        def worker():
            try:
                logger.info('fetching info: %s', url[:60])
                info = _fetch_info(url)
                result = _build_response(url, platform, info)
                result_q.put(('ok', result))
            except Exception as exc:
                result_q.put(('error', exc))

        threading.Thread(target=worker, daemon=True).start()

        while True:
            try:
                kind, payload = result_q.get(timeout=5)
                if kind == 'ok':
                    yield _sse(payload)
                else:
                    yield _sse({'error': _classify_error(payload)})
                return
            except queue.Empty:
                yield ': ping\n\n'

    return Response(
        stream_with_context(generate()),
        status=200,
        content_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        },
    )


@app.route('/api/video/download', methods=['GET'])
@limiter.limit('15 per minute')
def download_video():
    url = request.args.get('url', '').strip()
    format_id = request.args.get('format_id', '').strip()
    audio_only = request.args.get('audio_only', '').lower() in ('1', 'true', 'yes')

    if not url or not format_id:
        return jsonify({'error': 'url and format_id are required.'}), 400

    platform, err = _validate_url(url)
    if err:
        return err

    try:
        cached = _info_cache.get(url)
        info = cached['raw'] if cached else _fetch_info(url)
        safe_title = _safe_title(info.get('title', 'video'))

        if audio_only or format_id == 'audio_only':
            fmt = _get_best_audio(info)
            if not fmt or not fmt.get('url'):
                return jsonify({'error': 'No audio stream found for this video.'}), 400
            cdn_url = fmt['url']
            audio_ext = fmt.get('ext') or 'm4a'
            content_type = 'audio/mp4' if audio_ext == 'm4a' else 'audio/webm'
            filename = f'{safe_title}.{audio_ext}'
        else:
            fmt = next(
                (f for f in info.get('formats', []) if f.get('format_id') == format_id),
                None,
            )
            if not fmt or not fmt.get('url'):
                return jsonify({'error': 'Selected format not found.'}), 400
            cdn_url = fmt['url']
            content_type = 'video/mp4'
            filename = f'{safe_title}.mp4'

        est_size = fmt.get('filesize') or fmt.get('filesize_approx')
        headers = _cdn_headers(platform)

        logger.info('proxy %s: %s', format_id, safe_title)

        resp = requests.get(cdn_url, headers=headers, stream=True, timeout=60)
        if not resp.ok:
            return jsonify({'error': 'Failed to fetch the media stream from CDN.'}), 502

        response_headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Type': content_type,
            'Cache-Control': 'no-store',
            'X-Accel-Buffering': 'no',
            'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length',
        }
        if est_size:
            response_headers['Content-Length'] = str(int(est_size))

        def generate():
            try:
                for chunk in resp.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        yield chunk
            finally:
                resp.close()

        return Response(
            stream_with_context(generate()),
            status=200,
            headers=response_headers,
        )

    except Exception as e:
        logger.error('download_video error: %s', e)
        return jsonify({'error': _classify_error(e)}), 500


# ── Frontend SPA ──────────────────────────────────────────────────────────────
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
