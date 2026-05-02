import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  ArrowUp,
  Clock,
  Film,
  X,
  CheckCircle2,
  Music2,
  ClipboardCheck,
} from "lucide-react";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { useGetVideoInfo, type VideoPlatform } from "@/hooks/use-video-info";
import { useDownload } from "@/hooks/use-download";
import { formatBytes } from "@/lib/utils";

// ── Platform detection ────────────────────────────────────────────────────────
const PLATFORM_PATTERNS: Record<string, RegExp> = {
  youtube: /(youtube\.com\/(watch|shorts|embed|v)|youtu\.be\/)/i,
  facebook: /(facebook\.com\/|fb\.watch\/|fb\.com\/)/i,
  instagram: /instagram\.com\/(p|reel|reels|tv)\//i,
};

function detectPlatform(url: string): VideoPlatform | null {
  for (const [name, re] of Object.entries(PLATFORM_PATTERNS)) {
    if (re.test(url)) return name as VideoPlatform;
  }
  return null;
}

const PLATFORM_META: Record<
  VideoPlatform,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  youtube: { icon: FaYoutube, color: "#FF0000", label: "YouTube" },
  facebook: { icon: FaFacebook, color: "#1877F2", label: "Facebook" },
  instagram: { icon: FaInstagram, color: "#E4405F", label: "Instagram" },
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
function VideoSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white shadow-[0_2px_16px_rgba(28,36,55,0.08)]"
      style={{ border: "1.5px solid #ede7e1" }}
    >
      <div className="w-full aspect-video animate-pulse" style={{ background: "#eae4df" }} />
      <div className="px-5 py-4">
        <div className="flex items-start gap-2.5 mb-4">
          <div className="w-4 h-4 mt-0.5 rounded shrink-0 animate-pulse" style={{ background: "#e2dbd6" }} />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 rounded animate-pulse" style={{ background: "#e2dbd6" }} />
            <div className="h-3.5 rounded animate-pulse w-2/3" style={{ background: "#e2dbd6" }} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[62px] rounded-xl animate-pulse" style={{ background: "#eae4df" }} />
          ))}
        </div>
        <div className="h-[62px] w-full rounded-xl animate-pulse" style={{ background: "#eae4df" }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [showClipboardHint, setShowClipboardHint] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const clipboardChecked = useRef(false);

  const videoInfoMutation = useGetVideoInfo();
  const { state: dlState, download, cancel } = useDownload();

  const detectedPlatform = detectPlatform(inputValue);
  const PlatformIcon = detectedPlatform ? PLATFORM_META[detectedPlatform].icon : null;

  // ── Clipboard auto-fill ───────────────────────────────────────────────────
  const tryClipboard = useCallback(async (onlyIfEmpty = true) => {
    if (onlyIfEmpty && inputValue) return;
    if (!navigator.clipboard?.readText) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text && detectPlatform(text)) {
        setInputValue(text);
        setShowClipboardHint(true);
        setTimeout(() => setShowClipboardHint(false), 3000);
      }
    } catch {
      // Permission denied or not available — silent fail
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Paste & go: if the pasted content is a valid platform URL, auto-submit
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (text && detectPlatform(text)) {
      setTimeout(() => submitUrl(text), 80);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSubmittedUrl("");
    setShowClipboardHint(false);
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
  const dlProgress = dlPhase === "downloading" ? (dlState as any).progress as number : null;

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "#F8F4F1" }}>
      {/* Header */}
      <header className="w-full flex items-center px-6 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="VidGrab" className="w-7 h-7" />
          <span className="font-semibold text-base" style={{ color: "#1C2437" }}>VidGrab</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 flex flex-col items-center">
        {/* Hero heading — slides up when results load */}
        <div
          className="w-full text-center transition-all duration-500"
          style={{ marginTop: videoData || isError || isLoading ? "2rem" : "20vh" }}
        >
          <AnimatePresence>
            {!videoData && !isError && !isLoading && (
              <motion.div
                key="hero"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: "#1C2437" }}>
                  Download any video
                </h1>
                <p className="text-base mb-8" style={{ color: "#7a6f6a" }}>
                  YouTube · Facebook · Instagram
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input card */}
        <div className="w-full">
          <div
            className="w-full rounded-2xl bg-white shadow-[0_2px_16px_rgba(28,36,55,0.10)]"
            style={{ border: "1.5px solid #ede7e1" }}
          >
            <div className="relative px-5 pt-4 pb-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => tryClipboard(true)}
                onPaste={handlePaste}
                placeholder="Paste a video link…"
                className="w-full resize-none bg-transparent outline-none text-base leading-relaxed placeholder:text-[#b5aca8] pr-28"
                style={{ color: "#272320" }}
              />

              {/* Platform badge */}
              <AnimatePresence>
                {detectedPlatform && (
                  <motion.div
                    key={detectedPlatform}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1"
                    style={{ background: "#F0DEDC", color: "#1C2437" }}
                  >
                    {PlatformIcon && (
                      <PlatformIcon
                        className="w-3.5 h-3.5"
                        style={{ color: PLATFORM_META[detectedPlatform].color }}
                      />
                    )}
                    {PLATFORM_META[detectedPlatform].label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between px-4 pb-4 pt-1">
              <div className="flex items-center gap-3">
                {!detectedPlatform && (
                  <div className="flex items-center gap-3">
                    <FaYoutube className="w-4 h-4 text-[#b5aca8]" />
                    <FaFacebook className="w-4 h-4 text-[#b5aca8]" />
                    <FaInstagram className="w-4 h-4 text-[#b5aca8]" />
                  </div>
                )}
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs flex items-center gap-1 rounded-lg px-2 py-1 text-[#7a6f6a] hover:bg-[#f0ebe7] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !inputValue.trim() || !detectPlatform(inputValue)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: "#1C2437", color: "white" }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Hint row below the input card */}
          <div className="min-h-[1.5rem] mt-1.5 ml-1">
            <AnimatePresence mode="wait">
              {showClipboardHint && !isLoading && (
                <motion.p
                  key="clipboard"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "#7a6f6a" }}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" style={{ color: "#F98981" }} />
                  URL detected from clipboard
                </motion.p>
              )}
              {inputValue && !detectedPlatform && !showClipboardHint && (
                <motion.p
                  key="invalid"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "#F98981" }}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Paste a YouTube, Facebook, or Instagram link
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results area */}
        <div className="w-full mt-4 pb-10">
          <AnimatePresence mode="wait">

            {/* Loading skeleton */}
            {isLoading && (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <VideoSkeleton />
              </motion.div>
            )}

            {/* Fetch error */}
            {isError && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 rounded-2xl p-4"
                style={{ background: "#fff0ef", border: "1.5px solid #fad4d3" }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F98981" }} />
                <p className="text-sm" style={{ color: "#272320" }}>{errorMsg}</p>
              </motion.div>
            )}

            {/* Video result card */}
            {videoData && !isLoading && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl overflow-hidden bg-white shadow-[0_2px_16px_rgba(28,36,55,0.08)]"
                style={{ border: "1.5px solid #ede7e1" }}
              >
                {/* Thumbnail */}
                {videoData.thumbnail && (
                  <div className="relative w-full aspect-video bg-[#f0ebe7]">
                    <img
                      src={videoData.thumbnail}
                      alt={videoData.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {videoData.duration && videoData.duration !== "Unknown" && (
                      <span
                        className="absolute bottom-2.5 right-2.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                        style={{ background: "rgba(28,36,55,0.80)", color: "white" }}
                      >
                        <Clock className="w-3 h-3" />
                        {videoData.duration}
                      </span>
                    )}
                  </div>
                )}

                <div className="px-5 py-4">
                  {/* Title row */}
                  <div className="flex items-start gap-2.5 mb-4">
                    {videoData.platform && PLATFORM_META[videoData.platform] && (() => {
                      const { icon: Icon, color } = PLATFORM_META[videoData.platform];
                      return <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />;
                    })()}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: "#1C2437" }}>
                        {videoData.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#7a6f6a" }}>
                        {videoData.uploader}
                      </p>
                    </div>
                  </div>

                  {/* Active download banner */}
                  <AnimatePresence>
                    {isDownloading && dlPhase !== "error" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 overflow-hidden"
                      >
                        <div
                          className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
                          style={{ background: "#F0DEDC", border: "1.5px solid #F98981" }}
                        >
                          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "#1C2437" }}>
                            {dlPhase === "saving" ? (
                              <CheckCircle2 className="w-4 h-4" style={{ color: "#4caf50" }} />
                            ) : (
                              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#F98981" }} />
                            )}
                            {dlPhase === "preparing" && "Preparing…"}
                            {dlPhase === "downloading" && (
                              <>Downloading{dlProgress !== null && dlProgress > 0 ? ` ${dlProgress}%` : "…"}</>
                            )}
                            {dlPhase === "saving" && "Saving to device…"}
                          </span>
                          {(dlPhase === "preparing" || dlPhase === "downloading") && (
                            <button
                              onClick={cancel}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors hover:bg-[#fad4d3]"
                              style={{ color: "#7a6f6a" }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        {dlPhase === "downloading" && dlProgress !== null && (
                          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "#ede7e1" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: "#F98981" }}
                              animate={{ width: `${dlProgress}%` }}
                              transition={{ ease: "linear", duration: 0.3 }}
                            />
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Download error */}
                    {dlState.id !== null && dlPhase === "error" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 flex items-start gap-2 rounded-xl p-3 text-sm overflow-hidden"
                        style={{ background: "#fff0ef", border: "1.5px solid #fad4d3", color: "#272320" }}
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F98981" }} />
                        {(dlState as any).message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Format buttons */}
                  {(() => {
                    const videoFormats = videoData.formats.filter((f) => !f.audio_only);
                    const audioFormat = videoData.formats.find((f) => f.audio_only);
                    return (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {videoFormats.map((fmt) => {
                            const isActive = dlState.id === fmt.format_id && isDownloading;
                            const phase = isActive ? dlPhase : null;
                            const progress = isActive && dlPhase === "downloading" ? dlProgress : null;
                            return (
                              <FormatButton
                                key={fmt.format_id}
                                label={fmt.label}
                                filesize={fmt.filesize}
                                isActive={isActive}
                                disabled={isDownloading}
                                phase={phase}
                                progress={progress}
                                onClick={() => download(submittedUrl, fmt.format_id, videoData.title, false)}
                              />
                            );
                          })}
                        </div>
                        {audioFormat && (
                          <div className="mt-2">
                            <AudioButton
                              filesize={audioFormat.filesize}
                              isActive={dlState.id === audioFormat.format_id && isDownloading}
                              disabled={isDownloading}
                              phase={dlState.id === audioFormat.format_id ? dlPhase : null}
                              progress={dlState.id === audioFormat.format_id ? dlProgress : null}
                              onClick={() => download(submittedUrl, audioFormat.format_id, videoData.title, true)}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {!videoData && !isLoading && !isError && !inputValue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-4 text-sm" style={{ color: "#b5aca8" }}>
              <span className="flex items-center gap-1.5"><Film className="w-4 h-4" /> HD quality</span>
              <span className="w-1 h-1 rounded-full bg-current" />
              <span>No account needed</span>
              <span className="w-1 h-1 rounded-full bg-current" />
              <span className="flex items-center gap-1.5"><Music2 className="w-4 h-4" /> MP3 support</span>
            </div>
            <p className="text-xs" style={{ color: "#c9c0bb" }}>
              Tip: copied a link? Tap the box above — it'll be filled automatically.
            </p>
          </motion.div>
        )}
      </main>

      <footer className="w-full text-center py-6 text-xs" style={{ color: "#b5aca8" }}>
        VidGrab · yt-dlp + ffmpeg
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface FormatButtonProps {
  label: string;
  filesize: number;
  isActive: boolean;
  disabled: boolean;
  phase: string | null;
  progress: number | null;
  onClick: () => void;
}

function FormatButton({ label, filesize, isActive, disabled, phase, progress, onClick }: FormatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed overflow-hidden"
      style={{
        background: isActive ? "#F0DEDC" : "#F8F4F1",
        border: `1.5px solid ${isActive ? "#F98981" : "#ede7e1"}`,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = "#F0DEDC"; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#F8F4F1"; }}
    >
      {phase === "downloading" && progress !== null && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ background: "rgba(249,137,129,0.18)", originX: 0, width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.3 }}
        />
      )}
      <div className="relative z-10">
        <p className="text-sm font-semibold" style={{ color: "#1C2437" }}>{label}</p>
        <p className="text-xs" style={{ color: "#7a6f6a" }}>{filesize ? formatBytes(filesize) : "mp4"}</p>
      </div>
      <div className="relative z-10 shrink-0 ml-2" style={{ color: isActive ? "#F98981" : "#b5aca8" }}>
        {phase && phase !== "error" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <DownloadIcon />
        )}
      </div>
    </button>
  );
}

interface AudioButtonProps {
  filesize: number;
  isActive: boolean;
  disabled: boolean;
  phase: string | null;
  progress: number | null;
  onClick: () => void;
}

function AudioButton({ filesize, isActive, disabled, phase, progress, onClick }: AudioButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed overflow-hidden"
      style={{
        background: isActive ? "#F0DEDC" : "#F8F4F1",
        border: `1.5px solid ${isActive ? "#F98981" : "#ede7e1"}`,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = "#F0DEDC"; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#F8F4F1"; }}
    >
      {phase === "downloading" && progress !== null && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ background: "rgba(249,137,129,0.18)", originX: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.3 }}
        />
      )}
      <div className="relative z-10 flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: isActive ? "#F98981" : "#e8e2dd", color: isActive ? "white" : "#7a6f6a" }}
        >
          <Music2 className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#1C2437" }}>MP3 Audio</p>
          <p className="text-xs" style={{ color: "#7a6f6a" }}>{filesize ? formatBytes(filesize) : "192 kbps"}</p>
        </div>
      </div>
      <div className="relative z-10 shrink-0 ml-2" style={{ color: isActive ? "#F98981" : "#b5aca8" }}>
        {phase && phase !== "error" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <DownloadIcon />
        )}
      </div>
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
    </svg>
  );
}
