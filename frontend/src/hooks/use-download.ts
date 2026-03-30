import { useCallback, useState } from "react";

export function useDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback((url: string, formatId: string, filename: string) => {
    setDownloadingId(formatId);
    
    // As per implementation notes, use a hidden anchor tag to trigger a GET request
    // to the proxy endpoint, which will stream the response back.
    const downloadUrl = `/api/youtube/download?url=${encodeURIComponent(url)}&format_id=${encodeURIComponent(formatId)}`;
    
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename ? `${filename}.mp4` : "video.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Simulate a brief downloading state to give visual feedback that click registered
    setTimeout(() => {
      setDownloadingId(null);
    }, 2000);
  }, []);

  return { download, downloadingId };
}
