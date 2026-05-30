import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Image, Loader2, Download, AlertCircle, Upload, X, RefreshCw } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

const ACCENT = "#006A6A";

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
    reader.onload = e => setPreview(e.target?.result as string);
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
    <ToolLayout icon={<Image style={{ width: 16, height: 16 }} />} title="Background" subtitle="Remover" accentColor={ACCENT}>

      <div>
        <h2 className="md-headline-small" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>Background Remover</h2>
        <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>
          Remove image backgrounds with a local AI model — 100% private, no third-party servers.
        </p>
      </div>

      {/* Upload area / Image preview */}
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? ACCENT : "var(--md-outline-variant)"}`,
            borderRadius: "var(--md-shape-lg)",
            padding: "48px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? ACCENT + "08" : "var(--md-surface-container-low)",
            transition: "border-color 150ms, background 150ms",
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: "var(--md-shape-xl)", margin: "0 auto 16px", background: ACCENT + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Upload style={{ width: 28, height: 28, color: ACCENT }} />
          </div>
          <p className="md-title-small" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>
            {dragging ? "Drop it here!" : "Drop an image or click to browse"}
          </p>
          <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>PNG, JPG, WEBP · up to 15 MB</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/jpg" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      ) : (
        <div style={{
          background: "var(--md-surface-container-lowest)", borderRadius: "var(--md-shape-lg)",
          boxShadow: "var(--md-elevation-1)", overflow: "hidden",
        }}>
          {/* M3 Tab bar */}
          <div style={{
            display: "flex", alignItems: "center", padding: "0 16px",
            borderBottom: "1px solid var(--md-outline-variant)", background: "var(--md-surface-container-lowest)",
          }}>
            {(["original", "result"] as const).map(v => (
              <button
                key={v}
                onClick={() => { if (v === "result" && !resultUrl) return; setView(v); }}
                disabled={v === "result" && !resultUrl}
                style={{
                  padding: "14px 16px", border: "none", background: "transparent",
                  cursor: v === "result" && !resultUrl ? "not-allowed" : "pointer",
                  fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 500, letterSpacing: "0.1px",
                  color: view === v ? ACCENT : "var(--md-on-surface-variant)",
                  borderBottom: view === v ? `2px solid ${ACCENT}` : "2px solid transparent",
                  opacity: v === "result" && !resultUrl ? 0.38 : 1,
                  transition: "color 150ms",
                }}
              >
                {v === "original" ? "Original" : "Without BG"}
              </button>
            ))}
            <button onClick={reset}
              className="md-state-layer"
              style={{ marginLeft: "auto", width: 40, height: 40, borderRadius: "var(--md-shape-full)", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--md-on-surface-variant)" }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Image display */}
          <AnimatePresence mode="wait">
            {view === "original" && preview && (
              <motion.img key="original" src={preview} alt="Original"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ width: "100%", maxHeight: 320, objectFit: "contain", background: "var(--md-surface-container-low)", display: "block" }} />
            )}
            {view === "result" && resultUrl && (
              <motion.div key="result-view"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  width: "100%", maxHeight: 320, display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundImage: "repeating-conic-gradient(var(--md-surface-container) 0% 25%, var(--md-surface-container-lowest) 0% 50%) 0 0 / 20px 20px",
                }}>
                <img src={resultUrl} alt="No background" style={{ maxHeight: 320, objectFit: "contain", display: "block" }} />
              </motion.div>
            )}
            {view === "result" && !resultUrl && preview && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--md-surface-container-low)" }}>
                <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>Process the image to see the result here</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card actions */}
          <div style={{
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
            borderTop: "1px solid var(--md-outline-variant)",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="md-label-large" style={{ color: "var(--md-on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
              <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split("/")[1]?.toUpperCase()}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {resultUrl && (
                <button onClick={removeBackground} disabled={loading} className="md-state-layer md-label-large"
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "0 16px", height: 36,
                    borderRadius: "var(--md-shape-full)", border: "1px solid var(--md-outline)",
                    background: "transparent", cursor: loading ? "not-allowed" : "pointer",
                    color: "var(--md-on-surface-variant)", fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 500,
                    opacity: loading ? 0.38 : 1,
                  }}>
                  <RefreshCw style={{ width: 14, height: 14 }} /> Redo
                </button>
              )}
              {resultUrl ? (
                <button onClick={downloadResult} className="md-state-layer md-label-large"
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "0 16px", height: 36,
                    borderRadius: "var(--md-shape-full)", border: "none", background: "#006D3A",
                    cursor: "pointer", color: "#fff", fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 500,
                  }}>
                  <Download style={{ width: 14, height: 14 }} /> Download PNG
                </button>
              ) : (
                <button onClick={removeBackground} disabled={loading} className="md-state-layer md-label-large"
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "0 24px", height: 36,
                    borderRadius: "var(--md-shape-full)", border: "none",
                    background: loading ? "var(--md-surface-container-highest)" : ACCENT,
                    color: loading ? "var(--md-on-surface-variant)" : "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 500,
                    transition: "background 150ms",
                  }}>
                  {loading ? <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Processing…</>
                    : <><Image style={{ width: 14, height: 14 }} /> Remove BG</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <Loader2 style={{ width: 16, height: 16, color: ACCENT, animation: "spin 1s linear infinite" }} />
          <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>
            Running AI model — first run may take 10–30s while the model loads
          </p>
        </motion.div>
      )}

      {error && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: "var(--md-shape-md)", background: "var(--md-error-container)" }}>
            <AlertCircle style={{ width: 20, height: 20, color: "var(--md-error)", flexShrink: 0, marginTop: 1 }} />
            <p className="md-body-medium" style={{ color: "var(--md-on-error-container)" }}>{error}</p>
          </motion.div>
        </AnimatePresence>
      )}

      {/* M3 Outlined info banner */}
      {!file && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15 } }}
          style={{
            padding: 16, borderRadius: "var(--md-shape-sm)",
            border: "1px solid var(--md-outline-variant)",
            background: "var(--md-surface-container-low)",
          }}>
          <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>
            <span style={{ color: ACCENT, fontWeight: 500 }}>100% private</span> — images are processed
            locally on the server using the <strong>rembg</strong> AI model. Nothing is sent to external services.
          </p>
        </motion.div>
      )}
    </ToolLayout>
  );
}
