import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Loader2, Copy, Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { FaYoutube } from "react-icons/fa";
import ToolLayout from "@/components/ToolLayout";

interface SummaryResult {
  video_id: string; summary: string; original_words: number; summary_words: number;
}

const ACCENT = "#6750A4";

export default function SummarizerTool() {
  const [url, setUrl] = useState("");
  const [sentences, setSentences] = useState(8);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isYouTube = /youtube\.com\/|youtu\.be\//i.test(url);

  const submit = async () => {
    if (!url.trim() || !isYouTube) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), sentences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize.");
      setResult(data);
    } catch (e: any) { setError(e.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  const copySummary = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.summary);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const reduction = result ? Math.round((1 - result.summary_words / result.original_words) * 100) : 0;

  return (
    <ToolLayout icon={<Sparkles style={{ width: 16, height: 16 }} />} title="AI" subtitle="Summarizer" accentColor={ACCENT}>

      <div>
        <h2 className="md-headline-small" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>AI Video Summarizer</h2>
        <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>
          Get an intelligent summary of any YouTube video via its transcript. Requires English captions.
        </p>
      </div>

      {/* M3 Outlined Text Field */}
      <div>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            borderRadius: "var(--md-shape-xs)",
            border: `${focused ? 2 : 1}px solid ${focused ? ACCENT : "var(--md-outline)"}`,
            padding: focused ? "11px 11px 11px 15px" : "12px 12px 12px 16px",
            background: "var(--md-surface-container-lowest)",
            cursor: "text", transition: "border-color 150ms",
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <FaYoutube style={{ width: 20, height: 20, color: "var(--md-on-surface-variant)", flexShrink: 0 }} />
          <input
            ref={inputRef} type="text" value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="Paste a YouTube URL…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontFamily: "'Roboto', sans-serif", fontSize: 16, lineHeight: "24px",
              letterSpacing: "0.5px", color: "var(--md-on-surface)",
            }}
          />
          <button
            onClick={submit} disabled={loading || !isYouTube}
            className="md-state-layer"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "0 24px", height: 40,
              borderRadius: "var(--md-shape-full)", border: "none",
              background: loading || !isYouTube ? "var(--md-surface-container-highest)" : ACCENT,
              color: loading || !isYouTube ? "var(--md-on-surface-variant)" : "#fff",
              cursor: loading || !isYouTube ? "not-allowed" : "pointer",
              fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 500, letterSpacing: "0.1px",
              flexShrink: 0, transition: "background 150ms",
            }}
          >
            {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              : <><Sparkles style={{ width: 16, height: 16 }} /><span>Summarize</span></>}
          </button>
        </div>
        {url && !isYouTube && (
          <p className="md-body-small" style={{ marginTop: 4, padding: "0 16px", color: "var(--md-error)", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle style={{ width: 14, height: 14 }} /> Please paste a YouTube URL
          </p>
        )}
      </div>

      {/* Advanced — M3 Expansion tile pattern */}
      <div style={{ background: "var(--md-surface-container-low)", borderRadius: "var(--md-shape-sm)", overflow: "hidden" }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="md-state-layer"
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", border: "none", background: "transparent", cursor: "pointer",
          }}
        >
          <span className="md-title-small" style={{ color: "var(--md-on-surface)" }}>Advanced options</span>
          {showAdvanced
            ? <ChevronUp style={{ width: 20, height: 20, color: "var(--md-on-surface-variant)" }} />
            : <ChevronDown style={{ width: 20, height: 20, color: "var(--md-on-surface-variant)" }} />}
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
              <div style={{ padding: "0 16px 16px" }}>
                <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)", marginBottom: 8 }}>
                  Summary length: <strong style={{ color: ACCENT }}>{sentences} key sentences</strong>
                </p>
                <input
                  type="range" min={3} max={15} value={sentences}
                  onChange={e => setSentences(Number(e.target.value))}
                  style={{ width: "100%", accentColor: ACCENT }}
                />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="md-label-small" style={{ color: "var(--md-on-surface-variant)" }}>Shorter</span>
                  <span className="md-label-small" style={{ color: "var(--md-on-surface-variant)" }}>Longer</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 24px",
              background: "var(--md-surface-container-lowest)", borderRadius: "var(--md-shape-lg)",
              boxShadow: "var(--md-elevation-1)",
            }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--md-shape-xl)", background: ACCENT + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles style={{ width: 24, height: 24, color: ACCENT }} className="animate-pulse" />
            </div>
            <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>Fetching transcript &amp; summarizing…</p>
            <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>This may take a few seconds</p>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: "var(--md-shape-md)", background: "var(--md-error-container)" }}>
            <AlertCircle style={{ width: 20, height: 20, color: "var(--md-error)", flexShrink: 0, marginTop: 1 }} />
            <p className="md-body-medium" style={{ color: "var(--md-on-error-container)" }}>{error}</p>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* M3 Assist chips row — stats */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="md-label-medium" style={{ padding: "4px 12px", borderRadius: "var(--md-shape-full)", background: ACCENT + "1A", color: ACCENT }}>
                {result.summary_words} words
              </span>
              <span className="md-label-medium" style={{ color: "var(--md-on-surface-variant)" }}>
                from {result.original_words.toLocaleString()} original
              </span>
              <span className="md-label-medium" style={{ padding: "4px 12px", borderRadius: "var(--md-shape-full)", background: "#BBEDCB", color: "#006D3A" }}>
                {reduction}% shorter
              </span>
            </div>

            {/* Summary card — M3 Elevated Card */}
            <div style={{
              background: "var(--md-surface-container-lowest)", borderRadius: "var(--md-shape-lg)",
              boxShadow: "var(--md-elevation-1)", overflow: "hidden",
            }}>
              {/* Tonal strip */}
              <div style={{ height: 4, background: `linear-gradient(90deg, ${ACCENT}, #9C89C8)` }} />
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "var(--md-shape-sm)", background: ACCENT + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Sparkles style={{ width: 16, height: 16, color: ACCENT }} />
                    </div>
                    <span className="md-title-small" style={{ color: "var(--md-on-surface)" }}>AI Summary</span>
                  </div>
                  <button onClick={copySummary} className="md-state-layer md-label-large"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "0 16px", height: 36, borderRadius: "var(--md-shape-full)",
                      border: "1px solid var(--md-outline)", background: "transparent",
                      cursor: "pointer", color: "var(--md-on-surface-variant)",
                      fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 500,
                    }}>
                    {copied ? <Check style={{ width: 14, height: 14, color: ACCENT }} /> : <Copy style={{ width: 14, height: 14 }} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="md-body-large" style={{ color: "var(--md-on-surface)", lineHeight: "28px", whiteSpace: "pre-wrap" }}>
                  {result.summary}
                </p>
              </div>
            </div>

            <p className="md-body-small" style={{ textAlign: "center", color: "var(--md-on-surface-variant)" }}>
              Generated using extractive AI summarization · results are based on the video's captions
            </p>
          </motion.div>
        )}

        {!result && !loading && !error && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
            style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "var(--md-shape-xl)", margin: "0 auto 16px", background: ACCENT + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles style={{ width: 32, height: 32, color: ACCENT }} />
            </div>
            <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>Paste a YouTube URL to get an AI-powered summary</p>
            <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)", marginTop: 4 }}>Requires a video with English captions</p>
          </motion.div>
        )}
      </AnimatePresence>
    </ToolLayout>
  );
}
