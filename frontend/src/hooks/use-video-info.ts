import { useMutation } from "@tanstack/react-query";

export type VideoFormat = {
  format_id: string;
  quality: string;
  label: string;
  ext: string;
  filesize: number;
};

export type VideoInfo = {
  title: string;
  thumbnail: string;
  duration: string;
  uploader: string;
  formats: VideoFormat[];
};

export function useGetVideoInfo() {
  return useMutation<VideoInfo, Error & { data?: any }, string>({
    mutationFn: async (url: string) => {
      const response = await fetch("/api/youtube/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const err: Error & { data?: any } = new Error(
          data?.error || "Failed to fetch video information.",
        );
        err.data = data;
        throw err;
      }

      return data as VideoInfo;
    },
  });
}
