import { FaInstagram } from "react-icons/fa";
import ToolLayout from "@/components/ToolLayout";
import VideoDownloaderTool from "@/components/VideoDownloaderTool";

export default function InstagramTool() {
  return (
    <ToolLayout
      icon={<FaInstagram className="w-4 h-4" />}
      title="Instagram"
      subtitle="Video Downloader"
      accentColor="#e4405f"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Instagram Video</h2>
        <p className="text-slate-400 text-sm mb-6">
          Download reels, posts and videos from Instagram. Works best with public accounts.
        </p>
        <VideoDownloaderTool
          platform="instagram"
          accentColor="#e4405f"
          placeholder="Paste an Instagram URL (reel, post, or video)…"
          errorHint="Please paste an Instagram URL"
          icon={<FaInstagram className="w-5 h-5 text-slate-300" />}
        />
      </div>
    </ToolLayout>
  );
}
