import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Loader2, Copy, Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { FaYoutube } from "react-icons/fa";
import ToolLayout from "@/components/ToolLayout";

interface SummaryResult {
  video_id: string; summary: string; original_words: number; summary_words: number;
}

const accentColor = "#8b5cf6";

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
    <ToolLayout icon={<Sparkles className="w-4 h-4" />} title="AI" subtitle="Summarizer" accentColor={accentColor}>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">AI Video Summarizer</h2>
        <p className="text-slate-400 text-sm mb-6">
          Get an intelligent summary of any YouTube video via its transcript. Requires English captions.
        </p>

        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-3.5 bg-white transition-shadow duration-200"
          style={{
            border: `1.5px solid ${focused ? accentColor : "#e2e8f0"}`,
            boxShadow: focused ? `0 0 0 3px ${accentColor}22, 0 1px 4px rgba(0,0,0,0.08)` : "0 1px 4px rgba(0,0,0,0.06)",
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <FaYoutube className="w-5 h-5 text-slate-300 shrink-0" />
          <input
            ref={inputRef} type="text" value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="Paste a YouTube URL…"
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-300"
          />
          <button
            onClick={submit} disabled={loading || !isYouTube}
            className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: accentColor }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /><span>Summarize</span></>}
          </button>
        </div>

        {url && !isYouTube && (
          <p className="mt-1.5 px-2 text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Please paste a YouTube URL
          </p>
        )}
      </div>

      {/* Advanced options */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>Advanced options</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-5 pb-4 border-t border-slate-50">
                <p className="text-xs text-slate-400 mt-3 mb-2">
                  Summary length: <span className="font-semibold" style={{ color: accentColor }}>{sentences} key sentences</span>
                </p>
                <input type="range" min={3} max={15} value={sentences} onChange={(e) => setSentences(Number(e.target.value))}
                  className="w-full" style={{ accentColor }} />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Shorter</span><span>Longer</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}15` }}>
              <Sparkles className="w-6 h-6 animate-pulse" style={{ color: accentColor }} />
            </div>
            <p className="text-slate-500 text-sm">Fetching transcript &amp; summarizing…</p>
            <p className="text-slate-400 text-xs">This may take a few seconds</p>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <p className="text-sm text-slate-700">{error}</p>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3">
            {/* Stats chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${accentColor}15`, color: accentColor }}>
                {result.summary_words} words
              </span>
              <span className="text-xs text-slate-400">from {result.original_words.toLocaleString()} original</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                {reduction}% shorter
              </span>
            </div>

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, #ec4899)` }} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">AI Summary</span>
                  </div>
                  <button onClick={copySummary}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400">
              Generated using extractive AI summarization · based on the video's captions
            </p>
          </motion.div>
        )}

        {!result && !loading && !error && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="text-center py-12">
            <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${accentColor}15` }}>
              <Sparkles className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <p className="text-slate-400 text-sm">Paste a YouTube URL to get an AI-powered summary</p>
            <p className="text-slate-300 text-xs mt-1">Requires a video with English captions</p>
          </motion.div>
        )}
      </AnimatePresence>
    </ToolLayout>
  );
}
