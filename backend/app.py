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

# yt-dlp base options — quiet, fast, no disk writes
BASE_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'socket_timeout': 30,
    'http_headers': {'User-Agent': USER_AGENT},
    # ios → android → web: ios is most reliable for avoiding bot-detection in 2025;
    # android_testsuite was removed/deprecated from yt-dlp.
    'extractor_args': {
        'youtube': {
            'player_client': ['ios', 'android', 'web'],
        }
    },
}

CHUNK_SIZE = 1024 * 256  # 256 KB read per iteration

STATIC_DIR = os.environ.get(
    'STATIC_DIR',
    os.path.join(os.path.dirname(__file__), 'static'),
)

# ── TTL cache ─────────────────────────────────────────────────────────────────
class _TTLCache:
    """Thread-safe in-memory cache with per-entry TTL."""

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


# 10-minute TTL — reduces YouTube API calls and helps avoid rate-limiting
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
    has_size = 1 if (fmt.get('filesize') or fmt.get('filesize_approx')) else 0
    is_avc = 2 if ('avc' in codec or 'h264' in codec) else 0
    return has_size + is_avc + tbr / 10000


def _format_duration(seconds):
    if not seconds:
        return 'Unknown'
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f'{h}:{m:02d}:{s:02d}' if h else f'{m}:{s:02d}'


def _get_formats(info):
    """Return best-per-resolution video formats.

    Pass 1: video-only streams (prefer — muxed with best audio later).
    Pass 2: combined streams (video+audio in one file — FB/IG progressive).
    Pass 3: any stream with a URL, no quality filter.
    """
    best: dict = {}

    # Pass 1: video-only
    for f in info.get('formats', []):
        vcodec = f.get('vcodec') or ''
        if not vcodec or vcodec == 'none':
            continue
        acodec = f.get('acodec') or 'none'
        if acodec != 'none':
            continue  # skip combined in pass 1
        height = f.get('height')
        if not height:
            continue
        if not f.get('url'):
            continue
        fps = f.get('fps') or 30
        key = (height, 60 if fps > 35 else 30)
        if key not in best or _score(f) > _score(best[key]):
            best[key] = f

    # Pass 2: combined streams (e.g. Facebook/Instagram progressive mp4)
    if not best:
        for f in info.get('formats', []):
            vcodec = f.get('vcodec') or ''
            acodec = f.get('acodec') or 'none'
            if not vcodec or vcodec == 'none':
                continue
            if not acodec or acodec == 'none':
                continue
            height = f.get('height')
            if not height:
                continue
            if not f.get('url'):
                continue
            fps = f.get('fps') or 30
            key = (height, 60 if fps > 35 else 30)
            if key not in best or _score(f) > _score(best[key]):
                best[key] = f

    # Pass 3: last resort — any format with a URL
    if not best:
        for f in info.get('formats', []):
            if not f.get('url'):
                continue
            if not (f.get('vcodec') or '') or (f.get('vcodec') or '') == 'none':
                continue
            height = f.get('height') or 0
            fps = f.get('fps') or 30
            key = (height, 60 if fps > 35 else 30)
            if key not in best or _score(f) > _score(best[key]):
                best[key] = f

    return best


def _best_audio_format(info):
    """Return the best audio-only stream (prefers m4a/AAC)."""
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
    if 'age-restricted' in msg or 'age restricted' in msg or 'age_gate' in msg:
        return 'This video is age-restricted and requires a signed-in account.'
    if 'not available in your country' in msg or ('geo' in msg and 'block' in msg):
        return 'This video is not available in this region.'
    if 'not a bot' in msg or 'confirm you' in msg or 'sign in to confirm' in msg:
        return 'YouTube is blocking this server right now. Please try again in a moment.'
    if 'sign in' in msg or 'login required' in msg or 'log in to' in msg:
        return 'This video requires sign-in to access.'
    if 'video unavailable' in msg or 'has been removed' in msg or "doesn't exist" in msg:
        return 'This video is unavailable or has been removed.'
    if 'http error 429' in msg or 'too many requests' in msg:
        return 'Too many requests — please try again in a moment.'
    if 'unable to extract' in msg or 'no video formats' in msg or 'no formats' in msg:
        return 'Could not extract video data — the link may be expired or unsupported.'
    if 'instagram' in msg and ('login' in msg or 'unauthorized' in msg):
        return 'This Instagram content requires a logged-in account to access.'
    return f'Could not process this video. {str(e)}'


def _safe_title(raw: str) -> str:
    """ASCII-only, HTTP-header-safe filename stem."""
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


_BOT_PHRASES = ('not a bot', 'confirm you', 'sign in to confirm')

def _is_bot_error(e: Exception) -> bool:
    msg = str(e).lower()
    return any(p in msg for p in _BOT_PHRASES)


def _fetch_info(url: str) -> dict:
    """Fetch yt-dlp info with YouTube client fallback.

    Tries ios → android → web in sequence. Each uses a different API endpoint
    with its own bot-detection threshold. 1.5s pause between retries.
    Non-YouTube URLs use BASE_OPTS as-is (single attempt).
    """
    is_youtube = 'youtube.com' in url or 'youtu.be' in url
    client_chains = (
        [['ios', 'android', 'web'], ['android', 'web'], ['web']]
        if is_youtube else [[]]
    )

    last_error: Exception = RuntimeError('No clients attempted')
    for i, client_list in enumerate(client_chains):
        try:
            extra = (
                {'extractor_args': {'youtube': {'player_client': client_list}}}
                if client_list else {}
            )
            opts = {**BASE_OPTS, **extra}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
            # Unwrap single-item playlists
            if info.get('_type') == 'playlist' and info.get('entries'):
                info = next((e for e in info['entries'] if e), info)
            return info
        except Exception as e:
            last_error = e
            if not _is_bot_error(e):
                raise
            if i < len(client_chains) - 1:
                logger.warning('bot-detection (%s), retrying %d/%d',
                               client_list, i + 1, len(client_chains))
                time.sleep(1.5)

    raise last_error


def _cdn_headers(url: str) -> str:
    """Build HTTP headers string for ffmpeg -headers flag.

    YouTube/Facebook/Instagram CDNs require Referer + Origin from their own
    domain; without this, datacenter IPs get 403 and ffmpeg produces 0 bytes.
    """
    h = f'User-Agent: {USER_AGENT}\r\n'
    if 'youtube.com' in url or 'youtu.be' in url:
        h += 'Referer: https://www.youtube.com/\r\nOrigin: https://www.youtube.com\r\n'
    elif 'facebook.com' in url or 'fb.watch' in url or 'fb.com' in url:
        h += 'Referer: https://www.facebook.com/\r\nOrigin: https://www.facebook.com\r\n'
    elif 'instagram.com' in url:
        h += 'Referer: https://www.instagram.com/\r\nOrigin: https://www.instagram.com\r\n'
    return h


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


def _probe_first_chunk(proc, timeout: int = 20):
    """Wait up to *timeout* s for ffmpeg to produce output BEFORE committing to 200.

    Uses select() on proc.stdout then read1() — both operate on the same
    BufferedReader so there's no fd/buffer mismatch.

    Returns (first_chunk, None) on success, or (None, error_msg) on failure.
    """
    readable, _, _ = select.select([proc.stdout], [], [], timeout)
    if not readable:
        _kill_proc(proc)
        return None, 'Download timed out — the video stream took too long to start. Please try again.'

    # read1(): single underlying raw read, returns what's available immediately.
    # This keeps proc.stdout's internal buffer consistent — no raw fd mixing.
    first_chunk = proc.stdout.read1(CHUNK_SIZE)
    if not first_chunk:
        # ffmpeg exited with no output — read stderr for diagnostics
        stderr_out = b''
        try:
            proc.stdout.close()
            stderr_out = proc.stderr.read(4096)
        except Exception:
            pass
        rc = proc.wait()
        logger.error('ffmpeg no output (rc=%d): %s', rc, stderr_out.decode(errors='replace'))
        _kill_proc(proc)
        return None, 'Could not read the video stream — the format may be temporarily unavailable. Try a different quality or try again.'

    return first_chunk, None


def _kill_proc(proc):
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except Exception:
        pass


def _make_generator(proc, first_chunk: bytes):
    """Yield first_chunk then stream remaining stdout; guarantee cleanup."""
    def generate():
        try:
            yield first_chunk
            while True:
                # read1(): non-blocking single raw read — consistent with probe.
                chunk = proc.stdout.read1(CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk
        finally:
            try:
                proc.stdout.close()
            except Exception:
                pass
            _kill_proc(proc)
            rc = proc.wait()
            if rc not in (0, -15):
                logger.warning('ffmpeg exited %d', rc)
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

        cached = _info_cache.get(url)
        if cached:
            logger.info('cache hit: %s', url[:60])
            return jsonify(cached['response'])

        logger.info('fetching info: %s', url[:60])
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

        # Best thumbnail
        thumbnails = info.get('thumbnails') or []
        thumbnail = info.get('thumbnail') or ''
        if thumbnails and not thumbnail:
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
        return jsonify(result)

    except Exception as e:
        logger.error('get_video_info: %s', e)
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
            data = request.get_json() or {}
            url = data.get('url', '').strip()
            format_id = data.get('format_id', '').strip()
            audio_only = str(data.get('audio_only', '')).lower() in ('1', 'true', 'yes')

        if not url or not format_id:
            return jsonify({'error': 'url and format_id are required.'}), 400

        _, err = _validate_url(url)
        if err:
            return err

        # Reuse cached info — avoids a second yt-dlp round-trip
        cached = _info_cache.get(url)
        info = cached['raw'] if cached else _fetch_info(url)

        safe_title = _safe_title(info.get('title', 'video'))

        # ffmpeg HTTP headers — required for CDN 403 prevention
        vid_headers = _cdn_headers(url)

        # ── Audio-only (MP3) ──────────────────────────────────────────────────
        if audio_only or format_id == 'audio_only':
            best_audio = _best_audio_format(info)
            if not best_audio or not best_audio.get('url'):
                return jsonify({'error': 'No audio stream found for this video.'}), 400

            aud_headers = _cdn_headers(best_audio['url'])
            est_size = best_audio.get('filesize') or best_audio.get('filesize_approx')
            cmd = [
                'ffmpeg', '-y',
                '-headers', aud_headers,
                '-i', best_audio['url'],
                '-vn',
                '-c:a', 'libmp3lame',
                '-b:a', '192k',
                '-f', 'mp3',
                'pipe:1',
            ]
            logger.info('ffmpeg mp3: %s', safe_title)
            proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                start_new_session=True,
            )
            first_chunk, err_msg = _probe_first_chunk(proc)
            if first_chunk is None:
                return jsonify({'error': err_msg}), 500
            return Response(
                stream_with_context(_make_generator(proc, first_chunk)()),
                status=200,
                headers=_stream_headers(f'{safe_title}.mp3', 'audio/mpeg', est_size),
            )

        # ── Video (MP4) ───────────────────────────────────────────────────────
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

        # Build ffmpeg command — headers before each -i for per-input CDN auth
        cmd = [
            'ffmpeg', '-y',
            '-headers', _cdn_headers(video_url),
            '-i', video_url,
        ]
        if audio_url:
            cmd += ['-headers', _cdn_headers(audio_url), '-i', audio_url]

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
            # frag_keyframe+empty_moov: fragmented MP4 streamable from byte 0.
            # default_base_moof: RFC-compliant fragments, required for some players.
            '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
            'pipe:1',
        ]
        logger.info('ffmpeg mp4 %s: %s', format_id, safe_title)
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            start_new_session=True,
        )
        first_chunk, err_msg = _probe_first_chunk(proc)
        if first_chunk is None:
            return jsonify({'error': err_msg}), 500
        return Response(
            stream_with_context(_make_generator(proc, first_chunk)()),
            status=200,
            headers=_stream_headers(f'{safe_title}.mp4', 'video/mp4', est_size),
        )

    except Exception as e:
        if proc:
            _kill_proc(proc)
        logger.error('download_video: %s', e)
        return jsonify({'error': _classify_error(e)}), 500


# ── Legacy aliases ────────────────────────────────────────────────────────────
app.add_url_rule('/api/youtube/video-info', endpoint='yt_info',
                 view_func=get_video_info, methods=['POST'])
app.add_url_rule('/api/youtube/download', endpoint='yt_download',
                 view_func=download_video, methods=['GET', 'POST'])


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
