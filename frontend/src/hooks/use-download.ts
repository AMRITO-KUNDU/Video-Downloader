import { useCallback, useState } from "react";

export type DownloadState =
  | { id: null }
  | { id: string; phase: "preparing" }
  | { id: string; phase: "downloading"; progress: number }
  | { id: string; phase: "saving" }
  | { id: string; phase: "error"; message: string };

export function useDownload() {
  const [state, setState] = useState<DownloadState>({ id: null });

  const download = useCallback(async (
    videoUrl: string,
    formatId: string,
    title: string,
  ) => {
    setState({ id: formatId, phase: "preparing" });

    const apiUrl =
      `/api/video/download?url=${encodeURIComponent(videoUrl)}` +
      `&format_id=${encodeURIComponent(formatId)}`;

    const safeFilename = `${title.replace(/[^\w\s\-.]/g, "").trim().slice(0, 80) || "video"}.mp4`;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `Server error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body — your browser may not support streaming downloads.");
      }

      // Stream the response into memory, tracking progress
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

      // Build a Blob from the chunks — Blob URLs are always saved as files
      // on every browser (desktop + mobile Chrome/Safari/Firefox)
      const blob = new Blob(chunks, { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Keep the blob alive briefly so the browser can read it, then free memory
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

      setState({ id: null });
    } catch (err: any) {
      setState({ id: formatId, phase: "error", message: err.message ?? "Download failed" });
      setTimeout(() => setState({ id: null }), 4000);
    }
  }, []);

  return { state, download };
}
