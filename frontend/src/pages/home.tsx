import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  AlertCircle,
  Loader2,
  ArrowUp,
  Clock,
  Film,
  X,
} from "lucide-react";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { useGetVideoInfo, type VideoPlatform } from "@/hooks/use-video-info";
import { useDownload } from "@/hooks/use-download";
import { formatBytes } from "@/lib/utils";

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

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const videoInfoMutation = useGetVideoInfo();
  const { download, downloadingId } = useDownload();

  const detectedPlatform = detectPlatform(inputValue);

  const handleSubmit = () => {
    const url = inputValue.trim();
    if (!url) return;
    const platform = detectPlatform(url);
    if (!platform) {
      videoInfoMutation.reset();
      return;
    }
    setSubmittedUrl(url);
    videoInfoMutation.mutate(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSubmittedUrl("");
    videoInfoMutation.reset();
    inputRef.current?.focus();
  };

  const videoData = videoInfoMutation.data;
  const isLoading = videoInfoMutation.isPending;
  const isError = videoInfoMutation.isError;
  const errorMsg =
    (videoInfoMutation.error as any)?.data?.error ||
    "Couldn't fetch this video. Make sure it's public.";

  const PlatformIcon = detectedPlatform
    ? PLATFORM_META[detectedPlatform].icon
    : null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start"
      style={{ background: "#F8F4F1" }}
    >
      {/* Minimal header */}
      <header className="w-full flex items-center px-6 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="VidGrab" className="w-7 h-7" />
          <span className="font-semibold text-base" style={{ color: "#1C2437" }}>
            VidGrab
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 flex flex-col items-center">
        {/* Heading — moves up when results are showing */}
        <motion.div
          layout
          className="w-full text-center"
          style={{ marginTop: videoData || isError ? "2rem" : "20vh" }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
        >
          {!videoData && !isError && (
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl font-bold mb-2"
              style={{ color: "#1C2437" }}
            >
              Download any video
            </motion.h1>
          )}
          {!videoData && !isError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-base mb-8"
              style={{ color: "#7a6f6a" }}
            >
              YouTube · Facebook · Instagram
            </motion.p>
          )}
        </motion.div>

        {/* Input card */}
        <motion.div layout className="w-full">
          <div
            className="w-full rounded-2xl bg-white shadow-[0_2px_16px_rgba(28,36,55,0.10)]"
            style={{ border: "1.5px solid #ede7e1" }}
          >
            {/* Text area */}
            <div className="relative px-5 pt-4 pb-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste a video link…"
                className="w-full resize-none bg-transparent outline-none text-base leading-relaxed placeholder:text-[#b5aca8]"
                style={{ color: "#272320" }}
              />
              {/* Detected platform badge */}
              <AnimatePresence>
                {detectedPlatform && (
                  <motion.div
                    key={detectedPlatform}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
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

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 pb-4 pt-1">
              <div className="flex items-center gap-2">
                {/* Subtle platform hints */}
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
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !inputValue.trim()}
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

          {/* Validation hint */}
          <AnimatePresence>
            {inputValue && !detectedPlatform && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 ml-1 text-xs flex items-center gap-1.5"
                style={{ color: "#F98981" }}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Paste a YouTube, Facebook, or Instagram link
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results */}
        <div className="w-full mt-5">
          <AnimatePresence mode="wait">

            {/* Error */}
            {isError && (
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

            {/* Success */}
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
                  {/* Title + channel */}
                  <div className="flex items-start gap-3 mb-4">
                    {videoData.platform && PLATFORM_META[videoData.platform] && (() => {
                      const { icon: Icon, color } = PLATFORM_META[videoData.platform];
                      return <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />;
                    })()}
                    <div className="min-w-0">
                      <p
                        className="font-semibold text-sm leading-snug line-clamp-2"
                        style={{ color: "#1C2437" }}
                      >
                        {videoData.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#7a6f6a" }}>
                        {videoData.uploader}
                      </p>
                    </div>
                  </div>

                  {/* Quality grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {videoData.formats.map((fmt) => {
                      const isDownloading = downloadingId === fmt.format_id;
                      return (
                        <button
                          key={fmt.format_id}
                          onClick={() => download(submittedUrl, fmt.format_id, videoData.title)}
                          disabled={isDownloading}
                          className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all disabled:opacity-60"
                          style={{
                            background: isDownloading ? "#F0DEDC" : "#F8F4F1",
                            border: "1.5px solid #ede7e1",
                          }}
                          onMouseEnter={(e) =>
                            !isDownloading &&
                            (e.currentTarget.style.background = "#F0DEDC")
                          }
                          onMouseLeave={(e) =>
                            !isDownloading &&
                            (e.currentTarget.style.background = "#F8F4F1")
                          }
                        >
                          <div>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: "#1C2437" }}
                            >
                              {fmt.label}
                            </p>
                            <p className="text-xs" style={{ color: "#7a6f6a" }}>
                              {fmt.filesize ? formatBytes(fmt.filesize) : "mp4"}
                            </p>
                          </div>
                          {isDownloading ? (
                            <Loader2
                              className="w-4 h-4 animate-spin shrink-0"
                              style={{ color: "#F98981" }}
                            />
                          ) : (
                            <Download
                              className="w-4 h-4 shrink-0"
                              style={{ color: "#7a6f6a" }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Empty-state hint */}
        {!videoData && !isLoading && !isError && !inputValue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex items-center gap-4 text-sm"
            style={{ color: "#b5aca8" }}
          >
            <span className="flex items-center gap-1.5">
              <Film className="w-4 h-4" /> HD quality
            </span>
            <span className="w-1 h-1 rounded-full bg-current" />
            <span>No account needed</span>
            <span className="w-1 h-1 rounded-full bg-current" />
            <span>Free</span>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs" style={{ color: "#b5aca8" }}>
        VidGrab · yt-dlp + ffmpeg
      </footer>
    </div>
  );
}
