import { useCallback, useRef, useState } from "react";

export type DownloadState =
  | { id: null }
  | { id: string; phase: "preparing" }
  | { id: string; phase: "error"; message: string };

export function useDownload() {
  const [state, setState] = useState<DownloadState>({ id: null });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ id: null });
  }, []);

  const download = useCallback((
    videoUrl: string,
    formatId: string,
    title: string,
    audioOnly = false,
    ext = audioOnly ? "m4a" : "mp4",
  ) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ id: formatId, phase: "preparing" });

    const safeTitle = title.replace(/[^\w\s\-.]/g, "").trim().slice(0, 80) || "download";
    const safeFilename = `${safeTitle}.${ext}`;

    const params = new URLSearchParams({ url: videoUrl, format_id: formatId });
    if (audioOnly) params.set("audio_only", "true");

    const a = document.createElement("a");
    a.href = `/api/video/download?${params}`;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    timerRef.current = setTimeout(() => setState({ id: null }), 3000);
  }, []);

  return { state, download, cancel };
}
