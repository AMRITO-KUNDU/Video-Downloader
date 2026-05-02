import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  ArrowUp,
  Clock,
  Film,
  X,
  CheckCircle2,
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
  const { state: dlState, download } = useDownload();

  const detectedPlatform = detectPlatform(inputValue);
  const PlatformIcon = detectedPlatform ? PLATFORM_META[detectedPlatform].icon : null;

  const handleSubmit = () => {
    const url = inputValue.trim();
    if (!url || !detectPlatform(url)) return;
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

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "#F8F4F1" }}>
      {/* Header */}
      <header className="w-full flex items-center px-6 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="VidGrab" className="w-7 h-7" />
          <span className="font-semibold text-base" style={{ color: "#1C2437" }}>
            VidGrab
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 flex flex-col items-center">
        {/* Heading */}
        <div
          className="w-full text-center transition-all duration-500"
          style={{ marginTop: videoData || isError ? "2rem" : "20vh" }}
        >
          {!videoData && !isError && (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: "#1C2437" }}>
                Download any video
              </h1>
              <p className="text-base mb-8" style={{ color: "#7a6f6a" }}>
                YouTube · Facebook · Instagram
              </p>
            </>
          )}
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
                placeholder="Paste a video link…"
                className="w-full resize-none bg-transparent outline-none text-base leading-relaxed placeholder:text-[#b5aca8]"
                style={{ color: "#272320" }}
              />
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
        </div>

        {/* Results */}
        <div className="w-full mt-5 pb-10">
          <AnimatePresence mode="wait">

            {/* Fetch error */}
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

            {/* Video result */}
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
                  {/* Title */}
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

                  {/* Download error banner */}
                  <AnimatePresence>
                    {dlState.id !== null && dlState.phase === "error" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 flex items-start gap-2 rounded-xl p-3 text-sm"
                        style={{ background: "#fff0ef", border: "1.5px solid #fad4d3", color: "#272320" }}
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F98981" }} />
                        {dlState.message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quality grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {videoData.formats.map((fmt) => {
                      const isActive = dlState.id === fmt.format_id && dlState.id !== null;
                      const phase = isActive && dlState.id !== null ? dlState.phase : null;
                      const progress = isActive && phase === "downloading" ? (dlState as any).progress as number : null;

                      let label: React.ReactNode;
                      if (phase === "preparing") {
                        label = <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</>;
                      } else if (phase === "downloading") {
                        label = <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {progress}%</>;
                      } else if (phase === "saving") {
                        label = <><CheckCircle2 className="w-3.5 h-3.5" /> Saving…</>;
                      } else {
                        label = null;
                      }

                      return (
                        <button
                          key={fmt.format_id}
                          onClick={() => download(submittedUrl, fmt.format_id, videoData.title)}
                          disabled={dlState.id !== null}
                          className="relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all disabled:cursor-not-allowed overflow-hidden"
                          style={{
                            background: isActive ? "#F0DEDC" : "#F8F4F1",
                            border: `1.5px solid ${isActive ? "#F98981" : "#ede7e1"}`,
                          }}
                          onMouseEnter={(e) => {
                            if (dlState.id === null)
                              (e.currentTarget as HTMLElement).style.background = "#F0DEDC";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive)
                              (e.currentTarget as HTMLElement).style.background = "#F8F4F1";
                          }}
                        >
                          {/* Progress bar fill */}
                          {phase === "downloading" && progress !== null && (
                            <div
                              className="absolute inset-0 rounded-xl transition-all duration-300"
                              style={{
                                background: "rgba(249,137,129,0.18)",
                                width: `${progress}%`,
                              }}
                            />
                          )}

                          <div className="relative z-10">
                            <p className="text-sm font-semibold" style={{ color: "#1C2437" }}>
                              {fmt.label}
                            </p>
                            <p className="text-xs" style={{ color: "#7a6f6a" }}>
                              {fmt.filesize ? formatBytes(fmt.filesize) : "mp4"}
                            </p>
                          </div>

                          <div
                            className="relative z-10 flex items-center gap-1.5 text-xs font-medium shrink-0 ml-2"
                            style={{ color: isActive ? "#F98981" : "#7a6f6a" }}
                          >
                            {label ?? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Empty state hint */}
        {!videoData && !isLoading && !isError && !inputValue && (
          <div className="mt-8 flex items-center gap-4 text-sm" style={{ color: "#b5aca8" }}>
            <span className="flex items-center gap-1.5">
              <Film className="w-4 h-4" /> HD quality
            </span>
            <span className="w-1 h-1 rounded-full bg-current" />
            <span>No account needed</span>
            <span className="w-1 h-1 rounded-full bg-current" />
            <span>Free</span>
          </div>
        )}
      </main>

      <footer className="w-full text-center py-6 text-xs" style={{ color: "#b5aca8" }}>
        VidGrab · yt-dlp + ffmpeg
      </footer>
    </div>
  );
}
