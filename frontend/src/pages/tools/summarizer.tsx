import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Loader2, Copy, Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { FaYoutube } from "react-icons/fa";
import ToolLayout from "@/components/ToolLayout";

interface SummaryResult {
  video_id: string;
  summary: string;
  original_words: number;
  summary_words: number;
}

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

  const accentColor = "#7c3aed";
  const isYouTube = /youtube\.com\/|youtu\.be\//i.test(url);

  const submit = async () => {
    if (!url.trim() || !isYouTube) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), sentences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize.");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copySummary = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reduction = result
    ? Math.round((1 - result.summary_words / result.original_words) * 100)
    : 0;

  return (
    <ToolLayout
      icon={<Sparkles className="w-4 h-4" />}
      title="AI"
      subtitle="Summarizer"
      accentColor={accentColor}
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">AI Video Summarizer</h2>
        <p className="text-slate-400 text-sm mb-6">
          Get a concise AI-powered summary of any YouTube video. Works via the video's transcript.
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
            style={{ background: `linear-gradient(135deg, ${accentColor}, #6d28d9)` }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /><span>Summarize</span></>
            )}
          </button>
        </div>

        {url && !isYouTube && (
          <p className="mt-1.5 px-2 text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Please paste a YouTube URL
          </p>
        )}

        {/* Advanced options */}
        <div className="mt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Advanced options
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-4 rounded-xl bg-white border border-slate-100">
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Summary length: <span style={{ color: accentColor }}>{sentences} key sentences</span>
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={sentences}
                    onChange={(e) => setSentences(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-300 mt-1">
                    <span>Shorter</span>
                    <span>Longer</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
              style={{ background: `${accentColor}12` }}
            >
              <Sparkles className="w-6 h-6 animate-pulse" style={{ color: accentColor }} />
            </div>
            <p className="text-slate-500 text-sm">Fetching transcript &amp; summarizing…</p>
            <p className="text-slate-300 text-xs">This may take a few seconds</p>
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
            className="space-y-3"
          >
            {/* Stats bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: `${accentColor}12`, color: accentColor }}
              >
                {result.summary_words} words in summary
              </span>
              <span className="text-xs text-slate-400">
                from {result.original_words.toLocaleString()} original words
              </span>
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: "#ecfdf5", color: "#059669" }}
              >
                {reduction}% shorter
              </span>
            </div>

            {/* Summary card */}
            <div
              className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              style={{ borderColor: `${accentColor}33` }}
            >
              {/* Gradient top strip */}
              <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${accentColor}, #ec4899, #6366f1)` }}
              />

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      AI Summary
                    </span>
                  </div>
                  <button
                    onClick={copySummary}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <p className="text-slate-700 text-[15px] leading-[1.75] whitespace-pre-wrap">
                  {result.summary}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 text-center">
              Generated using extractive AI summarization · results are from the video's captions
            </p>
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
              style={{ background: `${accentColor}12` }}
            >
              <Sparkles className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <p className="text-slate-400 text-sm">Paste a YouTube URL to get an AI summary</p>
            <p className="text-slate-300 text-xs mt-1">Requires a video with English captions</p>
          </motion.div>
        )}
      </AnimatePresence>
    </ToolLayout>
  );
}
