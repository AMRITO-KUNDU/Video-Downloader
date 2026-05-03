import { useMutation } from "@tanstack/react-query";

export type VideoFormat = {
  format_id: string;
  label: string;
  ext: string;
  filesize: number;
  audio_only: boolean;
};

export type VideoPlatform = "youtube" | "facebook";

export type VideoInfo = {
  platform: VideoPlatform;
  title: string;
  thumbnail: string;
  duration: string;
  uploader: string;
  formats: VideoFormat[];
};

/**
 * Fetch video info via a Server-Sent Events stream.
 *
 * The backend sends `: ping` comments every 5 s while yt-dlp works, keeping
 * Render's 55-second idle-connection timeout from dropping the request.
 * When yt-dlp finishes (or fails) it sends a single `data: {...}` line.
 */
async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const response = await fetch("/api/video/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  // Validation errors (400) come back as plain JSON before the SSE stream starts
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err: Error & { data?: unknown } = new Error(
      (data as { error?: string })?.error || "Failed to fetch video information.",
    );
    (err as { data?: unknown }).data = data;
    throw err;
  }

  // Read the SSE stream until we get a `data:` line
  if (!response.body) {
    throw new Error("Streaming not supported in this browser — please try a different browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6)) as { error?: string } & VideoInfo;
      if (payload.error) {
        const err: Error & { data?: unknown } = new Error(payload.error);
        (err as { data?: unknown }).data = payload;
        throw err;
      }
      return payload as VideoInfo;
    }
  }

  throw new Error("Server closed the connection without returning video data. Please try again.");
}

export function useGetVideoInfo() {
  return useMutation<VideoInfo, Error & { data?: unknown }, string>({
    mutationFn: fetchVideoInfo,
  });
}
