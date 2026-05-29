import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  Clock,
  Film,
  X,
  Music2,
  Download,
  Sparkles,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";
import { useGetVideoInfo, type VideoPlatform } from "@/hooks/use-video-info";
import { useDownload } from "@/hooks/use-download";
import { formatBytes } from "@/lib/utils";

// ── Platform detection ────────────────────────────────────────────────────────
const PLATFORM_PATTERNS: Record<string, RegExp> = {
  youtube: /(youtube\.com\/|youtu\.be\/)/i,
  facebook: /(facebook\.com\/|fb\.watch\/|fb\.com\/)/i,
  instagram: /(instagram\.com\/|instagr\.am\/)/i,
};

function detectPlatform(url: string): VideoPlatform | null {
  for (const [name, re] of Object.entries(PLATFORM_PATTERNS)) {
    if (re.test(url)) return name as VideoPlatform;
  }
  return null;
}

const PLATFORM_META: Record<
  VideoPlatform,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }
> = {
  youtube: { icon: FaYoutube, color: "#FF0000", bg: "#fff0f0", label: "YouTube" },
  facebook: { icon: FaFacebook, color: "#1877F2", bg: "#f0f4ff", label: "Facebook" },
  instagram: { icon: FaInstagram, color: "#E4405F", bg: "#fff0f4", label: "Instagram" },
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
function VideoSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white shadow-xl shadow-black/5 border border-gray-100">
      <div className="w-full aspect-video animate-pulse bg-gray-100" />
      <div className="p-5 space-y-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl animate-pulse bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 rounded-full animate-pulse bg-gray-100" />
            <div className="h-3 rounded-full animate-pulse bg-gray-100 w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse bg-gray-100" />
          ))}
        </div>
        <div className="h-14 w-full rounded-2xl animate-pulse bg-gray-100" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [clipboardFilled, setClipboardFilled] = useState(false);
  const [loadingSecs, setLoadingSecs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const clipboardChecked = useRef(false);

  const videoInfoMutation = useGetVideoInfo();
  const { state: dlState, download, cancel } = useDownload();

  const detectedPlatform = detectPlatform(inputValue);

  // ── Clipboard auto-fill ───────────────────────────────────────────────────
  const tryClipboard = useCallback(async (onlyIfEmpty = true) => {
    if (onlyIfEmpty && inputValue) return;
    if (!navigator.clipboard?.readText) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text && detectPlatform(text)) {
        setInputValue(text);
        setClipboardFilled(true);
        setTimeout(() => setClipboardFilled(false), 3000);
      }
    } catch {
      // Permission denied — silent fail
    }
  }, [inputValue]);

  useEffect(() => {
    if (!clipboardChecked.current) {
      clipboardChecked.current = true;
      tryClipboard(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit helpers ────────────────────────────────────────────────────────
  const submitUrl = useCallback((url: string) => {
    if (!url || !detectPlatform(url)) return;
    setSubmittedUrl(url);
    videoInfoMutation.mutate(url);
  }, [videoInfoMutation]);

  const handleSubmit = () => submitUrl(inputValue.trim());

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (text && detectPlatform(text)) {
      setTimeout(() => submitUrl(text), 80);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSubmittedUrl("");
    setClipboardFilled(false);
    videoInfoMutation.reset();
    inputRef.current?.focus();
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const videoData = videoInfoMutation.data;
  const isLoading = videoInfoMutation.isPending;
  const isError = videoInfoMutation.isError;
  const errorMsg =
    (videoInfoMutation.error as any)?.data?.error ||
    "Couldn't fetch this video. Make sure it's public.";

  const isDownloading = dlState.id !== null;
  const dlPhase = isDownloading ? (dlState as any).phase as string : null;

  useEffect(() => {
    if (!isLoading) { setLoadingSecs(0); return; }
    const t = setInterval(() => setLoadingSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isLoading]);

  const hasResults = videoData || isError || isLoading;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0f0f13 0%, #16161d 50%, #0f0f13 100%)" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Download className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">VidGrab</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-16">

        {/* Hero — hides once results show */}
        <AnimatePresence>
          {!hasResults && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center pt-16 pb-10 max-w-lg mx-auto"
            >
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                <Sparkles className="w-3.5 h-3.5" />
                Free · No account needed
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4 tracking-tight">
                Download any<br />
                <span style={{ background: "linear-gradient(90deg, #6366f1, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  video or audio
                </span>
              </h1>
              <p className="text-base" style={{ color: "rgba(255,255,255,0.4)" }}>
                YouTube, Facebook & Instagram — paste a link and grab it.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer when results showing */}
        {hasResults && <div className="h-6" />}

        {/* Search bar */}
        <div className="w-full max-w-2xl">
          <div
            className="relative flex items-center rounded-2xl p-1.5 transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: `1.5px solid ${detectedPlatform ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}`,
              boxShadow: detectedPlatform ? "0 0 0 4px rgba(99,102,241,0.1)" : "none",
            }}
          >
            {/* Left icon */}
            <div className="flex items-center pl-2 pr-1 shrink-0">
              <AnimatePresence mode="wait">
                {detectedPlatform ? (
                  <motion.div
                    key={detectedPlatform}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                  >
                    {(() => {
                      const { icon: Icon, color } = PLATFORM_META[detectedPlatform];
                      return <Icon className="w-5 h-5" style={{ color }} />;
                    })()}
                  </motion.div>
                ) : (
                  <motion.div key="link" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Link2 className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => tryClipboard(true)}
              onPaste={handlePaste}
              placeholder="Paste a YouTube, Instagram or Facebook link…"
              className="flex-1 bg-transparent outline-none text-sm px-2 py-2.5"
              style={{ color: "rgba(255,255,255,0.9)", caretColor: "#818cf8" }}
            />

            {/* Right actions */}
            <div className="flex items-center gap-1.5 pr-1">
              <AnimatePresence>
                {clipboardFilled && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: "#34d399" }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pasted
                  </motion.span>
                )}
                {inputValue && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    type="button"
                    onClick={handleClear}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !inputValue.trim() || !detectedPlatform}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", boxShadow: "0 2px 12px rgba(99,102,241,0.4)" }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Grab</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Inline hints */}
          <div className="h-6 mt-1.5 px-1">
            <AnimatePresence mode="wait">
              {inputValue && !detectedPlatform && (
                <motion.p
                  key="invalid"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "#f87171" }}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Only YouTube, Facebook, and Instagram links are supported
                </motion.p>
              )}
              {!inputValue && !hasResults && (
                <motion.p
                  key="tip"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Tip: copied a link? Click the box above — it fills automatically.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Platform pills — only in empty state */}
        {!hasResults && !inputValue && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mt-4"
          >
            {(["youtube", "facebook", "instagram"] as VideoPlatform[]).map((p) => {
              const { icon: Icon, color, bg, label } = PLATFORM_META[p];
              return (
                <div
                  key={p}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  {label}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Results area */}
        <div className="w-full max-w-2xl mt-6">
          <AnimatePresence mode="wait">

            {/* Loading */}
            {isLoading && (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <VideoSkeleton />
                {loadingSecs >= 8 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-center text-xs"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Fetching info… this can take up to 30 s for some links
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* Error */}
            {isError && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-300">{errorMsg}</p>
                  {(errorMsg.toLowerCase().includes('blocking') || errorMsg.toLowerCase().includes('try again') || errorMsg.toLowerCase().includes('moment')) && (
                    <button
                      onClick={() => submitUrl(inputValue.trim())}
                      className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Result card */}
            {videoData && !isLoading && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl overflow-hidden bg-white shadow-2xl shadow-black/30"
              >
                {/* Thumbnail */}
                {videoData.thumbnail && (
                  <div className="relative w-full aspect-video bg-gray-100">
                    <img
                      src={videoData.thumbnail}
                      alt={videoData.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
                    {videoData.duration && videoData.duration !== "Unknown" && (
                      <span className="absolute bottom-3 right-3 text-xs font-mono font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 text-white" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                        <Clock className="w-3 h-3" />
                        {videoData.duration}
                      </span>
                    )}
                    {videoData.platform && PLATFORM_META[videoData.platform] && (() => {
                      const { icon: Icon, color, label } = PLATFORM_META[videoData.platform];
                      return (
                        <span className="absolute bottom-3 left-3 text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1.5 text-white" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                          <Icon className="w-3 h-3" style={{ color }} />
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                )}

                <div className="p-5">
                  {/* Title & uploader */}
                  <div className="mb-5">
                    <p className="font-bold text-base leading-snug text-gray-900 line-clamp-2 mb-1">
                      {videoData.title}
                    </p>
                    <p className="text-sm text-gray-500">{videoData.uploader}</p>
                  </div>

                  {/* Active download banner */}
                  <AnimatePresence>
                    {isDownloading && dlPhase !== "error" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "linear-gradient(135deg, #ede9fe, #e0e7ff)", border: "1px solid #c4b5fd" }}>
                          <span className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                            Preparing your download…
                          </span>
                          <button onClick={cancel} className="text-xs text-violet-400 hover:text-violet-600 transition-colors font-medium">
                            Dismiss
                          </button>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-violet-100">
                          <motion.div
                            className="h-full rounded-full bg-violet-400"
                            style={{ width: "35%" }}
                            animate={{ x: ["0%", "186%", "0%"] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {dlState.id !== null && dlPhase === "error" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 flex items-start gap-2 rounded-2xl p-3.5 text-sm overflow-hidden bg-red-50 border border-red-100 text-red-700"
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                        {(dlState as any).message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Format grid */}
                  {(() => {
                    const videoFormats = videoData.formats.filter((f) => !f.audio_only);
                    const audioFormats = videoData.formats.filter((f) => f.audio_only);
                    return (
                      <div className="space-y-3">
                        {videoFormats.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Video</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {videoFormats.map((fmt) => {
                                const isActive = dlState.id === fmt.format_id && isDownloading;
                                return (
                                  <FormatButton
                                    key={fmt.format_id}
                                    label={fmt.label}
                                    filesize={fmt.filesize}
                                    ext="mp4"
                                    isActive={isActive}
                                    disabled={isDownloading}
                                    onClick={() => download(submittedUrl, fmt.format_id, videoData.title, false)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {audioFormats.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Audio</p>
                            <div className="grid grid-cols-2 gap-2">
                              {audioFormats.map((fmt) => {
                                const isActive = dlState.id === fmt.format_id && isDownloading;
                                return (
                                  <AudioFormatButton
                                    key={fmt.format_id}
                                    label={fmt.label}
                                    ext={fmt.ext}
                                    filesize={fmt.filesize}
                                    isActive={isActive}
                                    disabled={isDownloading}
                                    onClick={() => download(submittedUrl, fmt.format_id, videoData.title, true, fmt.ext)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feature pills — empty state */}
        {!hasResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: Film, label: "HD & 4K quality" },
              { icon: Music2, label: "MP3 audio" },
              { icon: Download, label: "No watermark" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </motion.div>
        )}
      </main>

      <footer className="text-center py-6 text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>
        VidGrab · powered by yt-dlp
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface FormatButtonProps {
  label: string;
  filesize: number;
  ext: string;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
}

function FormatButton({ label, filesize, ext, isActive, disabled, onClick }: FormatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center justify-between rounded-2xl px-3.5 py-3 text-left transition-all disabled:cursor-not-allowed"
      style={{
        background: isActive ? "#ede9fe" : "#f9fafb",
        border: `1.5px solid ${isActive ? "#c4b5fd" : "#e5e7eb"}`,
      }}
      onMouseEnter={(e) => { if (!disabled && !isActive) (e.currentTarget as HTMLElement).style.background = "#f5f3ff"; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
    >
      <div>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{filesize ? formatBytes(filesize) : ext}</p>
      </div>
      <div className="shrink-0 ml-2 w-7 h-7 rounded-xl flex items-center justify-center transition-colors" style={{ background: isActive ? "#7c3aed" : "#e5e7eb", color: isActive ? "white" : "#9ca3af" }}>
        {isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      </div>
    </button>
  );
}

interface AudioFormatButtonProps {
  label: string;
  ext: string;
  filesize: number;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
}

function AudioFormatButton({ label, ext, filesize, isActive, disabled, onClick }: AudioFormatButtonProps) {
  const isMp3 = ext === "mp3";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left w-full transition-all disabled:cursor-not-allowed"
      style={{
        background: isActive ? "#ede9fe" : "#f9fafb",
        border: `1.5px solid ${isActive ? "#c4b5fd" : "#e5e7eb"}`,
      }}
      onMouseEnter={(e) => { if (!disabled && !isActive) (e.currentTarget as HTMLElement).style.background = "#f5f3ff"; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
        style={{ background: isActive ? "#7c3aed" : isMp3 ? "#f0fdf4" : "#f3f4f6", color: isActive ? "white" : isMp3 ? "#16a34a" : "#6b7280" }}
      >
        <Music2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{filesize ? formatBytes(filesize) : ext.toUpperCase()}</p>
      </div>
      <div className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-colors" style={{ background: isActive ? "#7c3aed" : "#e5e7eb", color: isActive ? "white" : "#9ca3af" }}>
        {isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      </div>
    </button>
  );
}
