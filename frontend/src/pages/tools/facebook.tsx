import { FaFacebook } from "react-icons/fa";
import ToolLayout from "@/components/ToolLayout";
import VideoDownloaderTool from "@/components/VideoDownloaderTool";

export default function FacebookTool() {
  return (
    <ToolLayout
      icon={<FaFacebook className="w-4 h-4" />}
      title="Facebook"
      subtitle="Video Downloader"
      accentColor="#1877f2"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Facebook Video</h2>
        <p className="text-slate-400 text-sm mb-6">
          Download videos from Facebook and Facebook Watch in HD or SD.
        </p>
        <VideoDownloaderTool
          platform="facebook"
          accentColor="#1877f2"
          placeholder="Paste a Facebook video URL (facebook.com or fb.watch)…"
          errorHint="Please paste a Facebook URL"
          icon={<FaFacebook className="w-5 h-5 text-slate-300" />}
        />
      </div>
    </ToolLayout>
  );
}
