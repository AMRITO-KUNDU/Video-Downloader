import { useCallback, useRef, useState } from "react";

export type DownloadState =
  | { id: null }
  | { id: string; phase: "preparing" }
  | { id: string; phase: "downloading"; progress: number }
  | { id: string; phase: "saving" }
  | { id: string; phase: "error"; message: string };

export function useDownload() {
  const [state, setState] = useState<DownloadState>({ id: null });
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ id: null });
  }, []);

  const download = useCallback(async (
    videoUrl: string,
    formatId: string,
    title: string,
    audioOnly = false,
  ) => {
    setState({ id: formatId, phase: "preparing" });

    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams({ url: videoUrl, format_id: formatId });
    if (audioOnly) params.set("audio_only", "true");
    const apiUrl = `/api/video/download?${params}`;

    const ext = audioOnly ? "mp3" : "mp4";
    const mimeType = audioOnly ? "audio/mpeg" : "video/mp4";
    const safeTitle = title.replace(/[^\w\s\-.]/g, "").trim().slice(0, 80) || "download";
    const safeFilename = `${safeTitle}.${ext}`;

    try {
      const response = await fetch(apiUrl, { signal: controller.signal });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `Server error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Streaming not supported in this browser.");
      }

      const contentLength = response.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      setState({ id: formatId, phase: "downloading", progress: 0 });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          setState({
            id: formatId,
            phase: "downloading",
            progress: Math.min(99, Math.round((received / total) * 100)),
          });
        }
      }

      setState({ id: formatId, phase: "saving" });

      const blob = new Blob(chunks, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      setState({ id: null });
    } catch (err: any) {
      if (err.name === "AbortError") {
        setState({ id: null });
        return;
      }
      setState({ id: formatId, phase: "error", message: err.message ?? "Download failed." });
      setTimeout(() => setState({ id: null }), 5000);
    } finally {
      abortRef.current = null;
    }
  }, []);

  return { state, download, cancel };
}
