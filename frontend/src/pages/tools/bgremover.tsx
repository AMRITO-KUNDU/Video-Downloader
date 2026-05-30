import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Image, Loader2, Download, AlertCircle, Upload, X, RefreshCw } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

export default function BgRemoverTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<"original" | "result">("result");
  const fileRef = useRef<HTMLInputElement>(null);

  const accentColor = "#0ea5e9";

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setError("Image is too large. Please use an image under 15 MB.");
      return;
    }
    setFile(f);
    setError(null);
    setResultUrl(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const removeBackground = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/bgremove", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || "Background removal failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setView("result");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `swifttools_nobg_${file?.name?.replace(/\.[^.]+$/, "") || "image"}.png`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResultUrl(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <ToolLayout
      icon={<Image className="w-4 h-4" />}
      title="Background"
      subtitle="Remover"
      accentColor={accentColor}
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Background Remover</h2>
        <p className="text-slate-400 text-sm mb-6">
          Remove image backgrounds instantly using local AI — no uploads to third-party servers.
        </p>

        {/* Upload area */}
        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200"
            style={{
              borderColor: dragging ? accentColor : "#e2e8f0",
              background: dragging ? `${accentColor}08` : "white",
              transform: dragging ? "scale(1.01)" : "scale(1)",
            }}
          >
            <div
              className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `${accentColor}15` }}
            >
              <Upload className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <p className="text-slate-700 font-semibold text-sm mb-1">
              {dragging ? "Drop it here!" : "Drop an image or click to browse"}
            </p>
            <p className="text-slate-400 text-xs">PNG, JPG, WEBP · up to 15 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={onInputChange}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {/* Image preview tabs */}
            {(preview || resultUrl) && (
              <div className="border-b border-slate-50 px-4 pt-4">
                <div className="flex items-center gap-1 mb-4">
                  {["original", "result"].map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        if (v === "result" && !resultUrl) return;
                        setView(v as "original" | "result");
                      }}
                      disabled={v === "result" && !resultUrl}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed capitalize"
                      style={
                        view === v
                          ? { background: accentColor, color: "white" }
                          : { background: "#f8fafc", color: "#64748b" }
                      }
                    >
                      {v === "result" ? "Without BG" : "Original"}
                    </button>
                  ))}

                  <button
                    onClick={reset}
                    className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Image display */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {view === "original" && preview && (
                  <motion.img
                    key="original"
                    src={preview}
                    alt="Original"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-h-80 object-contain bg-slate-50"
                  />
                )}
                {view === "result" && resultUrl && (
                  <motion.div
                    key="result-img"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-h-80 flex items-center justify-center"
                    style={{
                      backgroundImage:
                        "repeating-conic-gradient(#e2e8f0 0% 25%, white 0% 50%) 0 0 / 20px 20px",
                    }}
                  >
                    <img
                      src={resultUrl}
                      alt="Background removed"
                      className="max-h-80 object-contain"
                    />
                  </motion.div>
                )}
                {view === "result" && !resultUrl && preview && (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-48 flex items-center justify-center bg-slate-50"
                  >
                    <p className="text-slate-300 text-sm">Click "Remove BG" to see the result</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="p-4 flex items-center gap-3 border-t border-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-600 truncate">{file.name}</p>
                <p className="text-[11px] text-slate-300">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split("/")[1].toUpperCase()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {resultUrl && (
                  <button
                    onClick={removeBackground}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Redo
                  </button>
                )}
                {resultUrl ? (
                  <button
                    onClick={downloadResult}
                    className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl text-white transition-colors"
                    style={{ background: "#10b981" }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>
                ) : (
                  <button
                    onClick={removeBackground}
                    disabled={loading}
                    className="flex items-center gap-2 text-white text-xs font-medium px-5 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: accentColor }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Image className="w-3.5 h-3.5" />
                        Remove BG
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center gap-2 text-sm text-slate-400 justify-center"
          >
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: accentColor }} />
            Running AI background removal — this may take 10–30s on first use (model loading)
          </motion.div>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <p className="text-sm text-slate-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info note */}
      {!file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          className="rounded-xl p-4 text-xs text-slate-400 leading-relaxed"
          style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}22` }}
        >
          <span className="font-semibold" style={{ color: accentColor }}>100% private</span> — images are
          processed locally on the server using the <strong>rembg</strong> AI model. Nothing is sent to
          third-party services.
        </motion.div>
      )}
    </ToolLayout>
  );
}
