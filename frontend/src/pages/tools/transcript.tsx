import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Copy, Check, AlertCircle, Download, Clock } from "lucide-react";
import { FaYoutube } from "react-icons/fa";
import ToolLayout from "@/components/ToolLayout";

interface TranscriptEntry {
  text: string;
  start: number;
}

interface TranscriptResult {
  video_id: string;
  title: string;
  entries: TranscriptEntry[];
  full_text: string;
  word_count: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TranscriptTool() {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentColor = "#10b981";

  const isYouTube = /youtube\.com\/|youtu\.be\//i.test(url);

  const submit = async () => {
    if (!url.trim() || !isYouTube) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch transcript.");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.full_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result.full_text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.title || result.video_id}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <ToolLayout
      icon={<FileText className="w-4 h-4" />}
      title="Transcript"
      subtitle="Generator"
      accentColor={accentColor}
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Transcript Generator</h2>
        <p className="text-slate-400 text-sm mb-6">
          Extract the full transcript from any YouTube video with English captions.
        </p>

        {/* Input */}
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
          <FaYoutube className="w-5 h-5 text-slate-300 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Paste a YouTube URL…"
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-300"
          />
          <button
            onClick={submit}
            disabled={loading || !isYouTube}
            className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: accentColor }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-3.5 h-3.5" /><span>Extract</span></>}
          </button>
        </div>

        {url && !isYouTube && (
          <p className="mt-1.5 px-2 text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Please paste a YouTube URL
          </p>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-3 shadow-sm"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${accentColor}15` }}
            >
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
            </div>
            <p className="text-slate-500 text-sm">Fetching transcript…</p>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <p className="text-sm text-slate-700">{error}</p>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm"
          >
            {/* Result header */}
            <div className="px-5 pt-5 pb-4 border-b border-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {result.title && (
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1 mb-1">
                      {result.title}
                    </p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${accentColor}15`, color: accentColor }}
                    >
                      {result.word_count.toLocaleString()} words
                    </span>
                    <button
                      onClick={() => setShowTimestamps(!showTimestamps)}
                      className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {showTimestamps ? "Hide" : "Show"} timestamps
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={copyText}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={downloadTxt}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
                    style={{ background: accentColor }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    .txt
                  </button>
                </div>
              </div>
            </div>

            {/* Transcript body */}
            <div className="p-5 max-h-[28rem] overflow-y-auto">
              {showTimestamps ? (
                <div className="space-y-2">
                  {result.entries.map((entry, i) => (
                    <div key={i} className="flex gap-3">
                      <span
                        className="text-[11px] font-mono shrink-0 pt-0.5"
                        style={{ color: accentColor }}
                      >
                        {formatTime(entry.start)}
                      </span>
                      <span className="text-sm text-slate-600 leading-relaxed">{entry.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {result.full_text}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {!result && !loading && !error && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.1 } }}
            className="text-center py-12"
          >
            <div
              className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `${accentColor}15` }}
            >
              <FileText className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <p className="text-slate-400 text-sm">Paste a YouTube URL above to extract the transcript</p>
          </motion.div>
        )}
      </AnimatePresence>
    </ToolLayout>
  );
}
