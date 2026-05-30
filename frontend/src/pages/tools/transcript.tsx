import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Copy, Check, AlertCircle, Download, Clock } from "lucide-react";
import { FaYoutube } from "react-icons/fa";
import ToolLayout from "@/components/ToolLayout";

interface TranscriptEntry { text: string; start: number; }
interface TranscriptResult {
  video_id: string; title: string; entries: TranscriptEntry[];
  full_text: string; word_count: number;
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
}

const ACCENT = "#006D3A";

export default function TranscriptTool() {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isYouTube = /youtube\.com\/|youtu\.be\//i.test(url);

  const submit = async () => {
    if (!url.trim() || !isYouTube) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/transcript", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch transcript.");
      setResult(data);
    } catch (e: any) { setError(e.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  const copyText = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.full_text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result.full_text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.title || result.video_id}_transcript.txt`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <ToolLayout icon={<FileText style={{ width: 16, height: 16 }} />} title="Transcript" subtitle="Generator" accentColor={ACCENT}>

      {/* Page heading */}
      <div>
        <h2 className="md-headline-small" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>Transcript Generator</h2>
        <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>
          Extract full captions from any YouTube video with English subtitles.
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
          {/* M3 Filled Button */}
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
              : <><FileText style={{ width: 16, height: 16 }} /><span>Extract</span></>}
          </button>
        </div>
        {url && !isYouTube && (
          <p className="md-body-small" style={{ marginTop: 4, padding: "0 16px", color: "var(--md-error)", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle style={{ width: 14, height: 14 }} /> Please paste a YouTube URL
          </p>
        )}
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
              <Loader2 style={{ width: 24, height: 24, color: ACCENT, animation: "spin 1s linear infinite" }} />
            </div>
            <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>Fetching transcript…</p>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12, padding: 16,
              borderRadius: "var(--md-shape-md)", background: "var(--md-error-container)",
            }}>
            <AlertCircle style={{ width: 20, height: 20, color: "var(--md-error)", flexShrink: 0, marginTop: 1 }} />
            <p className="md-body-medium" style={{ color: "var(--md-on-error-container)" }}>{error}</p>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: "var(--md-surface-container-lowest)", borderRadius: "var(--md-shape-lg)",
              boxShadow: "var(--md-elevation-1)", overflow: "hidden",
            }}>
            {/* Card header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--md-outline-variant)" }}>
              {result.title && (
                <p className="md-title-small" style={{ color: "var(--md-on-surface)", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {result.title}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {/* Assist chip */}
                <span className="md-label-medium" style={{
                  padding: "4px 12px", borderRadius: "var(--md-shape-full)",
                  background: ACCENT + "1A", color: ACCENT,
                }}>
                  {result.word_count.toLocaleString()} words
                </span>
                <button onClick={() => setShowTimestamps(!showTimestamps)}
                  className="md-label-medium"
                  style={{
                    display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                    cursor: "pointer", color: "var(--md-on-surface-variant)", padding: 0,
                    fontFamily: "'Roboto', sans-serif",
                  }}>
                  <Clock style={{ width: 14, height: 14 }} />
                  {showTimestamps ? "Hide" : "Show"} timestamps
                </button>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  {/* M3 Outlined Button */}
                  <button onClick={copyText} className="md-state-layer md-label-large"
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
                  {/* M3 Filled Button */}
                  <button onClick={downloadTxt} className="md-state-layer md-label-large"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "0 16px", height: 36, borderRadius: "var(--md-shape-full)",
                      border: "none", background: ACCENT, cursor: "pointer", color: "#fff",
                      fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 500,
                    }}>
                    <Download style={{ width: 14, height: 14 }} /> .txt
                  </button>
                </div>
              </div>
            </div>

            {/* Transcript body */}
            <div style={{ padding: 20, maxHeight: "28rem", overflowY: "auto" }}>
              {showTimestamps ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.entries.map((entry, i) => (
                    <div key={i} style={{ display: "flex", gap: 12 }}>
                      <span className="md-label-medium" style={{ color: ACCENT, fontFamily: "'Roboto Mono', monospace", flexShrink: 0, paddingTop: 2 }}>
                        {formatTime(entry.start)}
                      </span>
                      <span className="md-body-medium" style={{ color: "var(--md-on-surface)" }}>{entry.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="md-body-medium" style={{ color: "var(--md-on-surface)", lineHeight: "28px", whiteSpace: "pre-wrap" }}>
                  {result.full_text}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {!result && !loading && !error && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
            style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "var(--md-shape-xl)", margin: "0 auto 16px", background: ACCENT + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText style={{ width: 32, height: 32, color: ACCENT }} />
            </div>
            <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>Paste a YouTube URL to extract the full transcript</p>
          </motion.div>
        )}
      </AnimatePresence>
    </ToolLayout>
  );
}
