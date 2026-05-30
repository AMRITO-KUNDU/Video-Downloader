import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Image, Loader2, Download, AlertCircle, Upload, X, RefreshCw } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

const accentColor = "#0ea5e9";

export default function BgRemoverTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<"original" | "result">("result");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload a valid image file (PNG, JPG, WEBP)."); return; }
    if (f.size > 15 * 1024 * 1024) { setError("Image is too large. Maximum 15 MB."); return; }
    setFile(f); setError(null); setResultUrl(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const removeBackground = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResultUrl(null);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/bgremove", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || "Background removal failed.");
      }
      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
      setView("result");
    } catch (e: any) { setError(e.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `swifttools_nobg_${file?.name?.replace(/\.[^.]+$/, "") || "image"}.png`;
    a.click();
  };

  const reset = () => { setFile(null); setPreview(null); setResultUrl(null); setError(null); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <ToolLayout icon={<Image className="w-4 h-4" />} title="Background" subtitle="Remover" accentColor={accentColor}>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Background Remover</h2>
        <p className="text-slate-400 text-sm mb-6">
          Remove image backgrounds with a local AI model — 100% private, no third-party servers.
        </p>
      </div>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragging ? accentColor : "#e2e8f0",
            background: dragging ? `${accentColor}08` : "#f8fafc",
          }}
        >
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${accentColor}15` }}>
            <Upload className="w-6 h-6" style={{ color: accentColor }} />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">
            {dragging ? "Drop it here!" : "Drop an image or click to browse"}
          </p>
          <p className="text-xs text-slate-400">PNG, JPG, WEBP · up to 15 MB</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/jpg" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-100">
            {(["original", "result"] as const).map((v) => (
              <button key={v}
                onClick={() => { if (v === "result" && !resultUrl) return; setView(v); }}
                disabled={v === "result" && !resultUrl}
                className="px-5 py-3 text-sm font-medium transition-colors border-b-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  color: view === v ? accentColor : "#64748b",
                  borderBottomColor: view === v ? accentColor : "transparent",
                }}
              >
                {v === "original" ? "Original" : "Without BG"}
              </button>
            ))}
            <button onClick={reset} className="ml-auto mr-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image */}
          <AnimatePresence mode="wait">
            {view === "original" && preview && (
              <motion.img key="original" src={preview} alt="Original"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full max-h-72 object-contain bg-slate-50" />
            )}
            {view === "result" && resultUrl && (
              <motion.div key="result-view"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full max-h-72 flex items-center justify-center"
                style={{ backgroundImage: "repeating-conic-gradient(#f1f5f9 0% 25%, white 0% 50%) 0 0 / 20px 20px" }}>
                <img src={resultUrl} alt="No background" className="max-h-72 object-contain" />
              </motion.div>
            )}
            {view === "result" && !resultUrl && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-48 flex items-center justify-center bg-slate-50">
                <p className="text-slate-400 text-sm">Process the image to see the result here</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-slate-50 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split("/")[1]?.toUpperCase()}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {resultUrl && (
                <button onClick={removeBackground} disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-40">
                  <RefreshCw className="w-3.5 h-3.5" /> Redo
                </button>
              )}
              {resultUrl ? (
                <button onClick={downloadResult}
                  className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg text-white transition-colors"
                  style={{ background: "#10b981" }}>
                  <Download className="w-3.5 h-3.5" /> Download PNG
                </button>
              ) : (
                <button onClick={removeBackground} disabled={loading}
                  className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2 rounded-xl transition-opacity disabled:opacity-60"
                  style={{ background: accentColor }}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Image className="w-4 h-4" /> Remove BG</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-center text-xs text-slate-400">
          Running AI model — first run may take 10–30s while the model loads
        </p>
      )}

      {error && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <p className="text-sm text-slate-700">{error}</p>
          </motion.div>
        </AnimatePresence>
      )}

      {!file && (
        <p className="text-center text-xs text-slate-400 px-4">
          <span style={{ color: accentColor }} className="font-medium">100% private</span> — processed locally using the rembg AI model. Nothing is sent to external servers.
        </p>
      )}
    </ToolLayout>
  );
}
