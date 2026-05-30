import { FaYoutube } from "react-icons/fa";
import ToolLayout from "@/components/ToolLayout";
import VideoDownloaderTool from "@/components/VideoDownloaderTool";

export default function YouTubeTool() {
  return (
    <ToolLayout
      icon={<FaYoutube className="w-4 h-4" />}
      title="YouTube"
      subtitle="Downloader"
      accentColor="#ef4444"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">YouTube Downloader</h2>
        <p className="text-slate-400 text-sm mb-6">
          Download any public YouTube video in HD or grab MP3 audio.
        </p>
        <VideoDownloaderTool
          platform="youtube"
          accentColor="#ef4444"
          placeholder="Paste a YouTube URL (youtube.com or youtu.be)…"
          errorHint="Please paste a YouTube URL"
          icon={<FaYoutube className="w-5 h-5 text-slate-300" />}
        />
      </div>
    </ToolLayout>
  );
}
