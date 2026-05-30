import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Clock, Download, Loader2, Music, X } from "lucide-react";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { useGetVideoInfo, type VideoPlatform } from "@/hooks/use-video-info";
import { useDownload } from "@/hooks/use-download";
import { formatBytes } from "@/lib/utils";
import type { ReactNode } from "react";

const PLATFORM_PATTERNS: Record<string, RegExp> = {
  youtube: /(youtube\.com\/|youtu\.be\/)/i,
  facebook: /(facebook\.com\/|fb\.watch\/|fb\.com\/)/i,
  instagram: /(instagram\.com\/|instagr\.am\/)/i,
};

const PLATFORM_META: Record<
  VideoPlatform,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  youtube: { icon: FaYoutube, color: "#FF0000", label: "YouTube" },
  facebook: { icon: FaFacebook, color: "#1877F2", label: "Facebook" },
  instagram: { icon: FaInstagram, color: "#E4405F", label: "Instagram" },
};

function detectPlatform(url: string): VideoPlatform | null {
  for (const [name, re] of Object.entries(PLATFORM_PATTERNS))
    if (re.test(url)) return name as VideoPlatform;
  return null;
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="w-full aspect-video bg-slate-100 animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

interface Props {
  platform: VideoPlatform;
  accentColor: string;
  placeholder: string;
  errorHint?: string;
  icon: ReactNode;
}

export default function VideoDownloaderTool({ platform, accentColor, placeholder, errorHint, icon }: Props) {
  const [input, setInput] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [loadingSecs, setLoadingSecs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const clipboardChecked = useRef(false);

  const videoInfo = useGetVideoInfo();
  const { state: dl, download, cancel } = useDownload();

  const detectedPlatform = detectPlatform(input);
  const isPlatformMatch = detectedPlatform === platform;

  const tryClipboard = useCallback(
    async (onlyIfEmpty = true) => {
      if (onlyIfEmpty && input) return;
      if (!navigator.clipboard?.readText) return;
      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (text && detectPlatform(text) === platform) setInput(text);
      } catch {}
    },
    [input, platform]
  );

  useEffect(() => {
    if (!clipboardChecked.current) {
      clipboardChecked.current = true;
      tryClipboard(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(
    (url: string) => {
      if (!url || detectPlatform(url) !== platform) return;
      setSubmittedUrl(url);
      videoInfo.mutate(url);
    },
    [videoInfo, platform]
  );

  const clear = () => {
    setInput("");
    setSubmittedUrl("");
    videoInfo.reset();
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!videoInfo.isPending) { setLoadingSecs(0); return; }
    const t = setInterval(() => setLoadingSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [videoInfo.isPending]);

  const data = videoInfo.data;
  const isLoading = videoInfo.isPending;
  const isError = videoInfo.isError;
  const errorMsg =
    (videoInfo.error as any)?.data?.error || "Couldn't fetch this video. Make sure it's public.";
  const isDownloading = dl.id !== null;
  const dlPhase = isDownloading ? (dl as any).phase as string : null;
  const hasResult = data || isError || isLoading;

  const wrongPlatform = input && detectedPlatform && detectedPlatform !== platform;
  const validInput = isPlatformMatch;

  return (
    <>
      {/* Search bar */}
      <div>
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-3.5 bg-white transition-shadow duration-200"
          style={{
            border: `1.5px solid ${focused ? accentColor : "#e2e8f0"}`,
            boxShadow: focused
              ? `0 0 0 3px ${accentColor}22, 0 1px 4px rgba(0,0,0,0.08)`
              : "0 1px 4px rgba(0,0,0,0.06)",
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <div className="shrink-0 text-slate-300">{icon}</div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(input.trim()); } }}
            onFocus={() => { setFocused(true); tryClipboard(true); }}
            onBlur={() => setFocused(false)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text").trim();
              if (text && detectPlatform(text) === platform) setTimeout(() => submit(text), 60);
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-300"
          />
          <div className="flex items-center gap-2 shrink-0">
            {input && (
              <button onClick={clear} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
            <button
              onClick={() => submit(input.trim())}
              disabled={isLoading || !validInput}
              className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: accentColor }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Grab</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="h-5 mt-1.5 px-2">
          <AnimatePresence mode="wait">
            {wrongPlatform && (
              <motion.p
                key="wrong"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-amber-600 flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {errorHint || `Please paste a ${platform} URL`}
              </motion.p>
            )}
            {input && !detectedPlatform && (
              <motion.p
                key="invalid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-slate-400 flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {placeholder}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div>
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Skeleton />
              {loadingSecs >= 8 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-center text-sm text-slate-400"
                >
                  Fetching… this can take up to 30s for some links
                </motion.p>
              )}
            </motion.div>
          )}

          {isError && !isLoading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm text-slate-700">{errorMsg}</p>
                {(errorMsg.toLowerCase().includes("moment") ||
                  errorMsg.toLowerCase().includes("try again")) && (
                  <button
                    onClick={() => submit(input.trim())}
                    className="mt-2 text-sm font-medium hover:underline"
                    style={{ color: accentColor }}
                  >
                    Try again
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {data && !isLoading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm"
            >
              {data.thumbnail && (
                <div className="relative w-full aspect-video bg-slate-100">
                  <img
                    src={data.thumbnail}
                    alt={data.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {data.duration && data.duration !== "Unknown" && (
                    <span className="absolute bottom-2.5 right-2.5 text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 text-white bg-black/70">
                      <Clock className="w-3 h-3" />
                      {data.duration}
                    </span>
                  )}
                  {data.platform && PLATFORM_META[data.platform] && (() => {
                    const { icon: PIcon, color, label } = PLATFORM_META[data.platform];
                    return (
                      <span className="absolute bottom-2.5 left-2.5 text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1.5 text-white bg-black/70">
                        <PIcon className="w-3 h-3" style={{ color }} />
                        {label}
                      </span>
                    );
                  })()}
                </div>
              )}

              <div className="p-5">
                <p className="text-slate-800 font-semibold text-sm leading-snug line-clamp-2 mb-0.5">
                  {data.title}
                </p>
                <p className="text-xs text-slate-400 mb-5">{data.uploader}</p>

                <AnimatePresence>
                  {isDownloading && dlPhase !== "error" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between px-4 py-3 rounded-xl border"
                        style={{ background: `${accentColor}11`, borderColor: `${accentColor}33` }}
                      >
                        <span className="text-sm flex items-center gap-2" style={{ color: accentColor }}>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Preparing your download…
                        </span>
                        <button
                          onClick={cancel}
                          className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="mt-1 h-0.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full w-1/3"
                          style={{ background: accentColor }}
                          animate={{ x: ["0%", "200%", "0%"] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                    </motion.div>
                  )}
                  {dl.id !== null && dlPhase === "error" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 flex items-start gap-2 p-3.5 rounded-xl text-sm bg-red-50 border border-red-100 text-red-500 overflow-hidden"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {(dl as any).message}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Format buttons */}
                {(() => {
                  const videoFmts = data.formats.filter((f) => !f.audio_only);
                  const audioFmts = data.formats.filter((f) => f.audio_only);
                  return (
                    <div className="space-y-4">
                      {videoFmts.length > 0 && (
                        <section>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                            Video
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {videoFmts.map((fmt) => {
                              const active = dl.id === fmt.format_id && isDownloading;
                              return (
                                <FormatChip
                                  key={fmt.format_id}
                                  label={fmt.label}
                                  sub={fmt.filesize ? formatBytes(fmt.filesize) : "mp4"}
                                  active={active}
                                  disabled={isDownloading}
                                  accentColor={accentColor}
                                  onClick={() =>
                                    download(submittedUrl, fmt.format_id, data.title, false)
                                  }
                                />
                              );
                            })}
                          </div>
                        </section>
                      )}
                      {audioFmts.length > 0 && (
                        <section>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                            Audio
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {audioFmts.map((fmt) => {
                              const active = dl.id === fmt.format_id && isDownloading;
                              return (
                                <AudioChip
                                  key={fmt.format_id}
                                  label={fmt.label}
                                  ext={fmt.ext}
                                  filesize={fmt.filesize}
                                  active={active}
                                  disabled={isDownloading}
                                  accentColor={accentColor}
                                  onClick={() =>
                                    download(submittedUrl, fmt.format_id, data.title, true, fmt.ext)
                                  }
                                />
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

          {!hasResult && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.15 } }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white"
                style={{ background: accentColor }}>
                <Download className="w-7 h-7" />
              </div>
              <p className="text-slate-400 text-sm">Paste a link above and hit Grab</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function FormatChip({
  label, sub, active, disabled, accentColor, onClick,
}: {
  label: string; sub: string; active: boolean; disabled: boolean; accentColor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
      style={{
        background: active ? `${accentColor}15` : "#f8fafc",
        border: `1px solid ${active ? `${accentColor}44` : "#e2e8f0"}`,
      }}
    >
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      <div className="shrink-0 ml-2" style={{ color: active ? accentColor : "#94a3b8" }}>
        {active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </div>
    </button>
  );
}

function AudioChip({
  label, ext, filesize, active, disabled, accentColor, onClick,
}: {
  label: string; ext: string; filesize: number; active: boolean; disabled: boolean; accentColor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors w-full disabled:cursor-not-allowed"
      style={{
        background: active ? `${accentColor}15` : "#f8fafc",
        border: `1px solid ${active ? `${accentColor}44` : "#e2e8f0"}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white"
        style={{ background: active ? accentColor : `${accentColor}22` }}
      >
        <Music className="w-4 h-4" style={{ color: active ? "white" : accentColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{filesize ? formatBytes(filesize) : ext.toUpperCase()}</p>
      </div>
      <div className="shrink-0" style={{ color: active ? accentColor : "#94a3b8" }}>
        {active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </div>
    </button>
  );
}
