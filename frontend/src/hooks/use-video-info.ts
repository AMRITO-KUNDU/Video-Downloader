import { useMutation } from "@tanstack/react-query";

export type VideoFormat = {
  format_id: string;
  quality: string;
  label: string;
  ext: string;
  filesize: number;
  audio_only: boolean;
};

export type VideoChapter = {
  title: string;
  start_time: number;
  end_time: number;
};

export type VideoPlatform = "youtube" | "facebook" | "instagram";

export type VideoInfo = {
  platform: VideoPlatform;
  title: string;
  thumbnail: string;
  duration: string;
  uploader: string;
  formats: VideoFormat[];
  chapters: VideoChapter[];
};

export function useGetVideoInfo() {
  return useMutation<VideoInfo, Error & { data?: any }, string>({
    mutationFn: async (url: string) => {
      const response = await fetch("/api/video/info", {
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
