import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Clock, Download, Loader2, Music, Search, X } from "lucide-react";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";
import { useGetVideoInfo, type VideoPlatform } from "@/hooks/use-video-info";
import { useDownload } from "@/hooks/use-download";
import { formatBytes } from "@/lib/utils";

const PLATFORM_PATTERNS: Record<string, RegExp> = {
  youtube: /(youtube\.com\/|youtu\.be\/)/i,
  facebook: /(facebook\.com\/|fb\.watch\/|fb\.com\/)/i,
  instagram: /(instagram\.com\/|instagr\.am\/)/i,
};

function detectPlatform(url: string): VideoPlatform | null {
  for (const [name, re] of Object.entries(PLATFORM_PATTERNS))
    if (re.test(url)) return name as VideoPlatform;
  return null;
}

const PLATFORM_META: Record<VideoPlatform, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  youtube:   { icon: FaYoutube,   color: "#FF0000", label: "YouTube"   },
  facebook:  { icon: FaFacebook,  color: "#1877F2", label: "Facebook"  },
  instagram: { icon: FaInstagram, color: "#E4405F", label: "Instagram" },
};

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#dadce0] overflow-hidden">
      <div className="w-full aspect-video bg-[#f1f3f4] animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-[#f1f3f4] rounded animate-pulse w-3/4" />
          <div className="h-3 bg-[#f1f3f4] rounded animate-pulse w-1/3" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-[#f1f3f4] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-14 bg-[#f1f3f4] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [loadingSecs, setLoadingSecs] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const clipboardChecked = useRef(false);

  const videoInfo = useGetVideoInfo();
  const { state: dl, download, cancel } = useDownload();

  const platform = detectPlatform(input);

  const tryClipboard = useCallback(async (onlyIfEmpty = true) => {
    if (onlyIfEmpty && input) return;
    if (!navigator.clipboard?.readText) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text && detectPlatform(text)) setInput(text);
    } catch { /* silent */ }
  }, [input]);

  useEffect(() => {
    if (!clipboardChecked.current) { clipboardChecked.current = true; tryClipboard(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback((url: string) => {
    if (!url || !detectPlatform(url)) return;
    setSubmittedUrl(url);
    videoInfo.mutate(url);
  }, [videoInfo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); submit(input.trim()); }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (text && detectPlatform(text)) setTimeout(() => submit(text), 60);
  };

  const clear = () => {
    setInput(""); setSubmittedUrl("");
    videoInfo.reset();
    inputRef.current?.focus();
  };

  const data = videoInfo.data;
  const isLoading = videoInfo.isPending;
  const isError = videoInfo.isError;
  const errorMsg = (videoInfo.error as any)?.data?.error || "Couldn't fetch this video. Make sure it's public.";
  const isDownloading = dl.id !== null;
  const dlPhase = isDownloading ? (dl as any).phase as string : null;
  const hasResult = data || isError || isLoading;

  useEffect(() => {
    if (!isLoading) { setLoadingSecs(0); return; }
    const t = setInterval(() => setLoadingSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isLoading]);

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#dadce0]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1a73e8] flex items-center justify-center">
            <Download className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[#202124] font-medium text-base">VidGrab</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#5f6368]">
          <span className="hidden sm:flex items-center gap-1.5">
            <FaYoutube className="text-[#FF0000]" />
            <FaFacebook className="text-[#1877F2]" />
            <FaInstagram className="text-[#E4405F]" />
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4">

        {/* Hero section */}
        <AnimatePresence>
          {!hasResult && (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="text-center pt-16 pb-8"
            >
              <h1 className="text-[2.25rem] font-normal text-[#202124] mb-2 tracking-tight">
                Download videos & audio
              </h1>
              <p className="text-base text-[#5f6368]">
                YouTube, Facebook and Instagram — free, no account needed
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {hasResult && <div className="pt-8" />}

        {/* Search bar */}
        <div className="w-full max-w-2xl">
          <div
            className="flex items-center gap-3 rounded-full px-5 py-3 transition-shadow duration-200 bg-white"
            style={{
              border: `1px solid ${focused ? "#1a73e8" : "#dadce0"}`,
              boxShadow: focused
                ? "0 1px 6px rgba(32,33,36,.28)"
                : "0 1px 3px rgba(32,33,36,.12)",
            }}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Left icon */}
            <div className="shrink-0">
              {platform ? (
                (() => {
                  const { icon: Icon, color } = PLATFORM_META[platform];
                  return <Icon className="w-5 h-5" style={{ color }} />;
                })()
              ) : (
                <Search className="w-4 h-4 text-[#9aa0a6]" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { setFocused(true); tryClipboard(true); }}
              onBlur={() => setFocused(false)}
              onPaste={handlePaste}
              placeholder="Paste a video link…"
              className="flex-1 bg-transparent outline-none text-base text-[#202124] placeholder:text-[#9aa0a6]"
            />

            <div className="flex items-center gap-2 shrink-0">
              {input && (
                <button onClick={clear} className="p-1 rounded-full hover:bg-[#f1f3f4] transition-colors">
                  <X className="w-4 h-4 text-[#5f6368]" />
                </button>
              )}
              <button
                onClick={() => submit(input.trim())}
                disabled={isLoading || !input.trim() || !platform}
                className="flex items-center gap-2 bg-[#1a73e8] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#1765cc] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Download className="w-3.5 h-3.5" /><span>Grab</span></>}
              </button>
            </div>
          </div>

          {/* Inline validation */}
          <div className="h-6 mt-1.5 px-5">
            <AnimatePresence mode="wait">
              {input && !platform && (
                <motion.p key="invalid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs text-[#d93025] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Paste a YouTube, Facebook, or Instagram URL
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results */}
        <div className="w-full max-w-2xl mt-2 pb-16">
          <AnimatePresence mode="wait">

            {isLoading && (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Skeleton />
                {loadingSecs >= 8 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-3 text-center text-sm text-[#5f6368]">
                    Fetching… this can take up to 30 s for some links
                  </motion.p>
                )}
              </motion.div>
            )}

            {isError && !isLoading && (
              <motion.div key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 rounded-2xl bg-[#fce8e6] border border-[#f5c6c2]">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#d93025]" />
                <div>
                  <p className="text-sm text-[#202124]">{errorMsg}</p>
                  {(errorMsg.toLowerCase().includes("moment") || errorMsg.toLowerCase().includes("try again")) && (
                    <button onClick={() => submit(input.trim())}
                      className="mt-2 text-sm font-medium text-[#1a73e8] hover:underline">
                      Try again
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {data && !isLoading && (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-[#dadce0] overflow-hidden shadow-sm">

                {/* Thumbnail */}
                {data.thumbnail && (
                  <div className="relative w-full aspect-video bg-[#f1f3f4]">
                    <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {data.duration && data.duration !== "Unknown" && (
                      <span className="absolute bottom-2.5 right-2.5 text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 text-white bg-black/70">
                        <Clock className="w-3 h-3" />{data.duration}
                      </span>
                    )}
                    {data.platform && PLATFORM_META[data.platform] && (() => {
                      const { icon: Icon, color, label } = PLATFORM_META[data.platform];
                      return (
                        <span className="absolute bottom-2.5 left-2.5 text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1.5 text-white bg-black/70">
                          <Icon className="w-3 h-3" style={{ color }} />{label}
                        </span>
                      );
                    })()}
                  </div>
                )}

                <div className="p-5">
                  {/* Title */}
                  <p className="text-[#202124] font-medium text-sm leading-snug line-clamp-2 mb-0.5">{data.title}</p>
                  <p className="text-xs text-[#5f6368] mb-5">{data.uploader}</p>

                  {/* Download progress */}
                  <AnimatePresence>
                    {isDownloading && dlPhase !== "error" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#e8f0fe] border border-[#c5d8fd]">
                          <span className="text-sm text-[#1a73e8] flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Preparing your download…
                          </span>
                          <button onClick={cancel} className="text-xs text-[#5f6368] hover:text-[#202124] transition-colors">Dismiss</button>
                        </div>
                        <div className="mt-1 h-0.5 rounded-full bg-[#e8eaed] overflow-hidden">
                          <motion.div className="h-full bg-[#1a73e8] w-1/3 rounded-full"
                            animate={{ x: ["0%", "200%", "0%"] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
                        </div>
                      </motion.div>
                    )}
                    {dl.id !== null && dlPhase === "error" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 flex items-start gap-2 p-3.5 rounded-xl text-sm bg-[#fce8e6] border border-[#f5c6c2] text-[#d93025] overflow-hidden">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        {(dl as any).message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Format buttons */}
                  {(() => {
                    const videoFmts = data.formats.filter(f => !f.audio_only);
                    const audioFmts = data.formats.filter(f => f.audio_only);
                    return (
                      <div className="space-y-4">
                        {videoFmts.length > 0 && (
                          <section>
                            <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wider mb-2">Video</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {videoFmts.map(fmt => {
                                const active = dl.id === fmt.format_id && isDownloading;
                                return (
                                  <FormatChip key={fmt.format_id}
                                    label={fmt.label}
                                    sub={fmt.filesize ? formatBytes(fmt.filesize) : "mp4"}
                                    active={active}
                                    disabled={isDownloading}
                                    onClick={() => download(submittedUrl, fmt.format_id, data.title, false)} />
                                );
                              })}
                            </div>
                          </section>
                        )}
                        {audioFmts.length > 0 && (
                          <section>
                            <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wider mb-2">Audio</p>
                            <div className="grid grid-cols-2 gap-2">
                              {audioFmts.map(fmt => {
                                const active = dl.id === fmt.format_id && isDownloading;
                                return (
                                  <AudioChip key={fmt.format_id}
                                    label={fmt.label}
                                    ext={fmt.ext}
                                    filesize={fmt.filesize}
                                    active={active}
                                    disabled={isDownloading}
                                    onClick={() => download(submittedUrl, fmt.format_id, data.title, true, fmt.ext)} />
                                );
                              })}
                            </div>
                          </section>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Empty state feature list */}
        {!hasResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
            className="mt-2 flex items-center gap-6 text-sm text-[#5f6368]">
            <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5 text-[#1a73e8]" />HD video</span>
            <span className="w-1 h-1 rounded-full bg-[#dadce0]" />
            <span className="flex items-center gap-1.5"><Music className="w-3.5 h-3.5 text-[#1a73e8]" />MP3 audio</span>
            <span className="w-1 h-1 rounded-full bg-[#dadce0]" />
            <span>No sign-in</span>
          </motion.div>
        )}
      </main>

      <footer className="text-center py-5 text-xs text-[#9aa0a6]">
        VidGrab · powered by yt-dlp
      </footer>
    </div>
  );
}

// ── Chips ─────────────────────────────────────────────────────────────────────
function FormatChip({ label, sub, active, disabled, onClick }: {
  label: string; sub: string; active: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed group"
      style={{ background: active ? "#e8f0fe" : "#f8f9fa", border: `1px solid ${active ? "#c5d8fd" : "#dadce0"}` }}
      onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = "#f1f3f4"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f8f9fa"; }}
    >
      <div>
        <p className="text-sm font-medium text-[#202124]">{label}</p>
        <p className="text-xs text-[#5f6368]">{sub}</p>
      </div>
      <div className="shrink-0 ml-2" style={{ color: active ? "#1a73e8" : "#9aa0a6" }}>
        {active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </div>
    </button>
  );
}

function AudioChip({ label, ext, filesize, active, disabled, onClick }: {
  label: string; ext: string; filesize: number; active: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors w-full disabled:cursor-not-allowed"
      style={{ background: active ? "#e8f0fe" : "#f8f9fa", border: `1px solid ${active ? "#c5d8fd" : "#dadce0"}` }}
      onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = "#f1f3f4"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f8f9fa"; }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: active ? "#1a73e8" : "#e8f0fe", color: active ? "white" : "#1a73e8" }}>
        <Music className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#202124]">{label}</p>
        <p className="text-xs text-[#5f6368]">{filesize ? formatBytes(filesize) : ext.toUpperCase()}</p>
      </div>
      <div className="shrink-0" style={{ color: active ? "#1a73e8" : "#9aa0a6" }}>
        {active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </div>
    </button>
  );
}
