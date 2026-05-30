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

const PLATFORM_META: Record<VideoPlatform, { icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string; label: string }> = {
  youtube: { icon: FaYoutube, color: "#C00000", label: "YouTube" },
  facebook: { icon: FaFacebook, color: "#0040C4", label: "Facebook" },
  instagram: { icon: FaInstagram, color: "#9E0059", label: "Instagram" },
};

function detectPlatform(url: string): VideoPlatform | null {
  for (const [name, re] of Object.entries(PLATFORM_PATTERNS))
    if (re.test(url)) return name as VideoPlatform;
  return null;
}

/* ── M3 Card skeleton ─────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div
      style={{
        background: "var(--md-surface-container-lowest)",
        borderRadius: "var(--md-shape-lg)",
        boxShadow: "var(--md-elevation-1)",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "16/9", background: "var(--md-surface-container-high)", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 14, borderRadius: 4, background: "var(--md-surface-container-high)", width: "70%", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: 12, borderRadius: 4, background: "var(--md-surface-container-high)", width: "40%", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: 56, borderRadius: 12, background: "var(--md-surface-container-high)", animation: "pulse 1.5s ease-in-out infinite" }} />
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
  const wrongPlatform = !!input && !!detectedPlatform && detectedPlatform !== platform;

  const tryClipboard = useCallback(async (onlyIfEmpty = true) => {
    if (onlyIfEmpty && input) return;
    if (!navigator.clipboard?.readText) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text && detectPlatform(text) === platform) setInput(text);
    } catch {}
  }, [input, platform]);

  useEffect(() => {
    if (!clipboardChecked.current) { clipboardChecked.current = true; tryClipboard(true); }
  }, []); // eslint-disable-line

  const submit = useCallback((url: string) => {
    if (!url || detectPlatform(url) !== platform) return;
    setSubmittedUrl(url);
    videoInfo.mutate(url);
  }, [videoInfo, platform]);

  const clear = () => { setInput(""); setSubmittedUrl(""); videoInfo.reset(); inputRef.current?.focus(); };

  useEffect(() => {
    if (!videoInfo.isPending) { setLoadingSecs(0); return; }
    const t = setInterval(() => setLoadingSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [videoInfo.isPending]);

  const data = videoInfo.data;
  const isLoading = videoInfo.isPending;
  const isError = videoInfo.isError;
  const errorMsg = (videoInfo.error as any)?.data?.error || "Couldn't fetch this video. Make sure it's public.";
  const isDownloading = dl.id !== null;
  const dlPhase = isDownloading ? (dl as any).phase as string : null;
  const hasResult = data || isError || isLoading;

  return (
    <>
      {/* ── M3 Outlined Text Field ──────────────────────────────────────── */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderRadius: "var(--md-shape-xs)",
            border: `${focused ? 2 : 1}px solid ${focused ? accentColor : "var(--md-outline)"}`,
            padding: focused ? "11px 11px 11px 15px" : "12px 12px 12px 16px",
            background: "var(--md-surface-container-lowest)",
            cursor: "text",
            transition: "border-color 150ms",
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <div style={{ flexShrink: 0, color: "var(--md-on-surface-variant)" }}>{icon}</div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(input.trim()); } }}
            onFocus={() => { setFocused(true); tryClipboard(true); }}
            onBlur={() => setFocused(false)}
            onPaste={e => {
              const text = e.clipboardData.getData("text").trim();
              if (text && detectPlatform(text) === platform) setTimeout(() => submit(text), 60);
            }}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "'Roboto', sans-serif",
              fontSize: 16,
              lineHeight: "24px",
              letterSpacing: "0.5px",
              color: "var(--md-on-surface)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {input && (
              <button
                onClick={clear}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--md-shape-full)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--md-on-surface-variant)",
                }}
                className="md-state-layer"
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            )}
            {/* M3 Filled Button */}
            <button
              onClick={() => submit(input.trim())}
              disabled={isLoading || !isPlatformMatch}
              className="md-state-layer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 24px",
                height: 40,
                borderRadius: "var(--md-shape-full)",
                border: "none",
                background: isLoading || !isPlatformMatch ? "var(--md-surface-container-highest)" : accentColor,
                color: isLoading || !isPlatformMatch ? "var(--md-on-surface-variant)" : "#FFFFFF",
                cursor: isLoading || !isPlatformMatch ? "not-allowed" : "pointer",
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "0.1px",
                transition: "background 150ms",
              }}
            >
              {isLoading
                ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                : <><Download style={{ width: 16, height: 16 }} /><span>Grab</span></>
              }
            </button>
          </div>
        </div>

        {/* Supporting text */}
        <AnimatePresence mode="wait">
          {wrongPlatform && (
            <motion.p key="wrong" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md-body-small"
              style={{ marginTop: 4, padding: "0 16px", color: "var(--md-error)", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
              {errorHint || `Please paste a ${platform} link`}
            </motion.p>
          )}
          {input && !detectedPlatform && (
            <motion.p key="invalid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md-body-small"
              style={{ marginTop: 4, padding: "0 16px", color: "var(--md-on-surface-variant)" }}>
              {placeholder}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Results ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Skeleton />
            {loadingSecs >= 8 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="md-body-small"
                style={{ marginTop: 8, textAlign: "center", color: "var(--md-on-surface-variant)" }}>
                Fetching… this can take up to 30s for some links
              </motion.p>
            )}
          </motion.div>
        )}

        {isError && !isLoading && (
          <motion.div key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12, padding: 16,
              borderRadius: "var(--md-shape-md)",
              background: "var(--md-error-container)",
              border: "1px solid",
              borderColor: "var(--md-on-error-container)" + "33",
            }}>
            <AlertCircle style={{ width: 20, height: 20, flexShrink: 0, color: "var(--md-error)", marginTop: 1 }} />
            <div>
              <p className="md-body-medium" style={{ color: "var(--md-on-error-container)" }}>{errorMsg}</p>
              {(errorMsg.toLowerCase().includes("moment") || errorMsg.toLowerCase().includes("try again")) && (
                <button onClick={() => submit(input.trim())}
                  className="md-label-large"
                  style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: accentColor, padding: 0 }}>
                  Try again
                </button>
              )}
            </div>
          </motion.div>
        )}

        {data && !isLoading && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: "var(--md-surface-container-lowest)",
              borderRadius: "var(--md-shape-lg)",
              boxShadow: "var(--md-elevation-1)",
              overflow: "hidden",
            }}>

            {/* Thumbnail */}
            {data.thumbnail && (
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "var(--md-surface-container-high)" }}>
                <img src={data.thumbnail} alt={data.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                {data.duration && data.duration !== "Unknown" && (
                  <span className="md-label-medium"
                    style={{ position: "absolute", bottom: 10, right: 10, padding: "4px 8px", borderRadius: "var(--md-shape-xs)", background: "rgba(0,0,0,0.72)", color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock style={{ width: 12, height: 12 }} />{data.duration}
                  </span>
                )}
                {data.platform && PLATFORM_META[data.platform] && (() => {
                  const { icon: PIcon, color, label } = PLATFORM_META[data.platform];
                  return (
                    <span className="md-label-medium"
                      style={{ position: "absolute", bottom: 10, left: 10, padding: "4px 8px", borderRadius: "var(--md-shape-xs)", background: "rgba(0,0,0,0.72)", color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                      <PIcon style={{ width: 12, height: 12, color }} />{label}
                    </span>
                  );
                })()}
              </div>
            )}

            <div style={{ padding: 20 }}>
              <p className="md-title-small" style={{ color: "var(--md-on-surface)", marginBottom: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{data.title}</p>
              <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)", marginBottom: 16 }}>{data.uploader}</p>

              <AnimatePresence>
                {isDownloading && dlPhase !== "error" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginBottom: 16, overflow: "hidden" }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", borderRadius: "var(--md-shape-sm)",
                      background: accentColor + "15", border: `1px solid ${accentColor}33`,
                    }}>
                      <span className="md-label-large" style={{ color: accentColor, display: "flex", alignItems: "center", gap: 8 }}>
                        <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                        Preparing download…
                      </span>
                      <button onClick={cancel} className="md-label-medium" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--md-on-surface-variant)" }}>
                        Dismiss
                      </button>
                    </div>
                    {/* M3 Linear progress indicator */}
                    <div style={{ height: 4, background: "var(--md-surface-container-high)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                      <motion.div style={{ height: "100%", background: accentColor, borderRadius: 2, width: "40%" }}
                        animate={{ x: ["0%", "160%", "0%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                    </div>
                  </motion.div>
                )}
                {dl.id !== null && dlPhase === "error" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{
                      marginBottom: 16, display: "flex", gap: 10, padding: "12px 16px",
                      borderRadius: "var(--md-shape-sm)",
                      background: "var(--md-error-container)",
                      overflow: "hidden",
                    }}>
                    <AlertCircle style={{ width: 16, height: 16, color: "var(--md-error)", flexShrink: 0, marginTop: 1 }} />
                    <span className="md-body-small" style={{ color: "var(--md-on-error-container)" }}>{(dl as any).message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Format grids */}
              {(() => {
                const videoFmts = data.formats.filter(f => !f.audio_only);
                const audioFmts = data.formats.filter(f => f.audio_only);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {videoFmts.length > 0 && (
                      <section>
                        <p className="md-label-medium" style={{ color: "var(--md-on-surface-variant)", textTransform: "uppercase", marginBottom: 8 }}>Video</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                          {videoFmts.map(fmt => {
                            const active = dl.id === fmt.format_id && isDownloading;
                            return (
                              <FormatChip key={fmt.format_id} label={fmt.label}
                                sub={fmt.filesize ? formatBytes(fmt.filesize) : "mp4"}
                                active={active} disabled={isDownloading} accentColor={accentColor}
                                onClick={() => download(submittedUrl, fmt.format_id, data.title, false)} />
                            );
                          })}
                        </div>
                      </section>
                    )}
                    {audioFmts.length > 0 && (
                      <section>
                        <p className="md-label-medium" style={{ color: "var(--md-on-surface-variant)", textTransform: "uppercase", marginBottom: 8 }}>Audio</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {audioFmts.map(fmt => {
                            const active = dl.id === fmt.format_id && isDownloading;
                            return (
                              <AudioChip key={fmt.format_id} label={fmt.label} ext={fmt.ext}
                                filesize={fmt.filesize} active={active} disabled={isDownloading}
                                accentColor={accentColor}
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

        {!hasResult && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
            style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "var(--md-shape-xl)", margin: "0 auto 16px",
              background: accentColor + "1A", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Download style={{ width: 32, height: 32, color: accentColor }} />
            </div>
            <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>Paste a link above and tap Grab</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── M3 Tonal chip — format button ─────────────────────────────────────────── */
function FormatChip({ label, sub, active, disabled, accentColor, onClick }: {
  label: string; sub: string; active: boolean; disabled: boolean; accentColor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="md-state-layer"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: "var(--md-shape-sm)",
        border: `1px solid ${active ? accentColor + "66" : "var(--md-outline-variant)"}`,
        background: active ? accentColor + "14" : "var(--md-surface-container-low)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "border-color 150ms, background 150ms",
      }}
    >
      <div>
        <p className="md-label-large" style={{ color: "var(--md-on-surface)" }}>{label}</p>
        <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>{sub}</p>
      </div>
      <div style={{ color: active ? accentColor : "var(--md-on-surface-variant)", flexShrink: 0, marginLeft: 8 }}>
        {active ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 16, height: 16 }} />}
      </div>
    </button>
  );
}

function AudioChip({ label, ext, filesize, active, disabled, accentColor, onClick }: {
  label: string; ext: string; filesize: number; active: boolean; disabled: boolean; accentColor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="md-state-layer"
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
        borderRadius: "var(--md-shape-sm)",
        border: `1px solid ${active ? accentColor + "66" : "var(--md-outline-variant)"}`,
        background: active ? accentColor + "14" : "var(--md-surface-container-low)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left", width: "100%",
        transition: "border-color 150ms, background 150ms",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: "var(--md-shape-sm)",
        background: active ? accentColor : accentColor + "1A",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Music style={{ width: 16, height: 16, color: active ? "#fff" : accentColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="md-label-large" style={{ color: "var(--md-on-surface)" }}>{label}</p>
        <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>{filesize ? formatBytes(filesize) : ext.toUpperCase()}</p>
      </div>
      <div style={{ color: active ? accentColor : "var(--md-on-surface-variant)", flexShrink: 0 }}>
        {active ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 16, height: 16 }} />}
      </div>
    </button>
  );
}
