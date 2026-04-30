import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  AlertCircle,
  Clock,
  Loader2,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Film,
  Sparkles,
  ClipboardPaste,
  Link2,
  Users,
  Globe,
} from "lucide-react";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGetVideoInfo, type VideoPlatform } from "@/hooks/use-video-info";
import { useDownload } from "@/hooks/use-download";
import { formatBytes } from "@/lib/utils";

const platformPattern =
  /(youtube\.com\/(watch|shorts|embed|v)|youtu\.be\/|facebook\.com\/|fb\.watch\/|fb\.com\/|instagram\.com\/(p|reel|reels|tv)\/)/i;

const formSchema = z.object({
  url: z
    .string()
    .min(1, "Please paste a video URL")
    .url("Please enter a valid URL")
    .regex(platformPattern, "Must be a YouTube, Facebook, or Instagram URL"),
});

type FormValues = z.infer<typeof formSchema>;

const PLATFORMS: {
  id: VideoPlatform | "all";
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  example: string;
}[] = [
  {
    id: "all",
    name: "All Platforms",
    icon: Globe,
    color: "text-slate-600",
    example: "https://www.youtube.com/watch?v=...",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: FaYoutube,
    color: "text-[#FF0000]",
    example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: FaFacebook,
    color: "text-[#1877F2]",
    example: "https://www.facebook.com/watch?v=...",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: FaInstagram,
    color: "text-[#E4405F]",
    example: "https://www.instagram.com/reel/...",
  },
];

const PLATFORM_BADGE: Record<VideoPlatform, { label: string; color: string }> = {
  youtube: { label: "YouTube", color: "bg-red-50 text-red-600 ring-red-200" },
  facebook: { label: "Facebook", color: "bg-blue-50 text-blue-600 ring-blue-200" },
  instagram: { label: "Instagram", color: "bg-pink-50 text-pink-600 ring-pink-200" },
};

export default function Home() {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [activePlatform, setActivePlatform] = useState<VideoPlatform | "all">("all");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  const videoInfoMutation = useGetVideoInfo();
  const { download, downloadingId } = useDownload();

  const onSubmit = (data: FormValues) => {
    setCurrentUrl(data.url);
    videoInfoMutation.mutate(data.url);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setValue("url", text, { shouldValidate: true });
    } catch {
      /* clipboard not available */
    }
  };

  const videoData = videoInfoMutation.data;
  const isLoading = videoInfoMutation.isPending;
  const isError = videoInfoMutation.isError;
  const errorMsg =
    (videoInfoMutation.error as any)?.data?.error ||
    "Failed to fetch video information.";

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Navbar */}
      <nav className="w-full sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="VidGrab" className="w-9 h-9" />
            <span className="font-bold text-xl tracking-tight text-slate-900">VidGrab</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Free Forever
            </span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 w-full">
        {/* Hero */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-full px-3 py-1 text-xs font-medium text-slate-700 shadow-sm mb-5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2E83FB]" />
                Free • No signup • HD quality
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight text-slate-900"
              >
                Your All-in-One{" "}
                <span className="text-gradient-brand">Video Downloader</span>{" "}
                for the Web
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-5 text-lg text-slate-600 max-w-xl"
              >
                Download videos from YouTube, Facebook, and Instagram in HD with a single click.
                No ads, no signup, no software to install.
              </motion.p>

              {/* Platform Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-7 flex flex-wrap gap-2"
              >
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  const active = activePlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActivePlatform(p.id)}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ring-1 ${
                        active
                          ? "bg-[#EFF6FF] text-[#2E83FB] ring-[#BFDBFE] shadow-sm"
                          : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-[#2E83FB]" : p.color}`} />
                      {p.name}
                    </button>
                  );
                })}
              </motion.div>

              {/* Input */}
              <motion.form
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onSubmit={handleSubmit(onSubmit)}
                className="mt-5"
              >
                <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-2 flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      {...register("url")}
                      placeholder={
                        PLATFORMS.find((p) => p.id === activePlatform)?.example ||
                        "Paste video URL here..."
                      }
                      className="pl-12 pr-28 h-14 bg-transparent border-0 shadow-none text-base focus-visible:ring-0 placeholder:text-slate-400"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E83FB] hover:text-[#1d6fe6] bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-100 rounded-lg px-2.5 py-1.5"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Paste
                    </button>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-14 px-7 rounded-xl bg-[#2E83FB] hover:bg-[#1d6fe6] text-white font-semibold text-base btn-glow"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Fetching…
                      </>
                    ) : (
                      <>
                        Download
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
                {errors.url && (
                  <p className="mt-3 ml-2 text-sm text-red-600 font-medium flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1.5" />
                    {errors.url.message}
                  </p>
                )}
              </motion.form>

              {/* Trust */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600"
              >
                <span className="flex items-center"><Check className="w-4 h-4 text-emerald-500 mr-1.5" /> Up to 4K quality</span>
                <span className="flex items-center"><Check className="w-4 h-4 text-emerald-500 mr-1.5" /> No watermarks</span>
                <span className="flex items-center"><Check className="w-4 h-4 text-emerald-500 mr-1.5" /> Lightning fast</span>
              </motion.div>
            </div>

            {/* Right column: stats card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="glass-card rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-semibold text-slate-700">Trusted Worldwide</span>
                  </div>
                  <span className="text-xs font-medium text-slate-400">Live</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <StatBlock value="2M+" label="Downloads" icon={Download} />
                  <StatBlock value="180+" label="Countries" icon={Globe} />
                  <StatBlock value="500K+" label="Happy users" icon={Users} />
                </div>

                <div className="mt-6 border-t border-slate-100 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                    Supported Platforms
                  </p>
                  <div className="flex items-center gap-3">
                    <PlatformPill icon={FaYoutube} name="YouTube" color="text-[#FF0000]" />
                    <PlatformPill icon={FaFacebook} name="Facebook" color="text-[#1877F2]" />
                    <PlatformPill icon={FaInstagram} name="Instagram" color="text-[#E4405F]" />
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                      <Shield className="w-[18px] h-[18px] text-[#2E83FB]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">100% Private</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        We don't store your videos or track your downloads.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Results */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6">
          <AnimatePresence mode="wait">
            {isError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <Card className="border border-red-200 bg-red-50 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      Couldn't fetch this video
                    </h3>
                    <p className="text-slate-600 text-sm">{errorMsg}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {videoData && !isLoading && !isError && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10"
              >
                <div className="lg:col-span-5">
                  <Card className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                    <div className="relative aspect-video w-full bg-slate-100">
                      {videoData.thumbnail ? (
                        <img
                          src={videoData.thumbnail}
                          alt={videoData.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                      {videoData.duration && videoData.duration !== "Unknown" && (
                        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-md text-xs font-mono font-medium text-white flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {videoData.duration}
                        </div>
                      )}
                      {videoData.platform && PLATFORM_BADGE[videoData.platform] && (
                        <div
                          className={`absolute top-3 left-3 inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 ring-1 ${PLATFORM_BADGE[videoData.platform].color}`}
                        >
                          {PLATFORM_BADGE[videoData.platform].label}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h2
                        className="text-base font-semibold leading-snug text-slate-900 line-clamp-2 mb-1"
                        title={videoData.title}
                      >
                        {videoData.title}
                      </h2>
                      <p className="text-sm text-slate-500">{videoData.uploader}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-7">
                  <Card className="border border-slate-200 rounded-2xl bg-white h-full shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 text-base">
                        Choose a quality
                      </h3>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
                        {videoData.formats.length} options
                      </span>
                    </div>
                    <div className="p-3">
                      {videoData.formats.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                          {videoData.formats.map((format, i) => (
                            <motion.li
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              key={format.format_id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                <div className="h-11 w-14 rounded-lg bg-[#EFF6FF] ring-1 ring-blue-100 flex items-center justify-center shrink-0">
                                  <span className="font-bold text-sm text-[#2E83FB]">
                                    {format.quality}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 flex items-center text-sm">
                                    {format.label}
                                    <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                      {format.ext}
                                    </span>
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {format.filesize ? formatBytes(format.filesize) : "Size varies"}
                                  </p>
                                </div>
                              </div>
                              <Button
                                onClick={() =>
                                  download(currentUrl, format.format_id, videoData.title)
                                }
                                className="w-full sm:w-auto h-10 rounded-lg bg-[#2E83FB] hover:bg-[#1d6fe6] text-white font-semibold text-sm"
                                disabled={downloadingId === format.format_id}
                              >
                                {downloadingId === format.format_id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                    Starting…
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-1.5" />
                                    Download
                                  </>
                                )}
                              </Button>
                            </motion.li>
                          ))}
                        </ul>
                      ) : (
                        <div className="h-44 flex flex-col items-center justify-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mb-2" />
                          <p className="text-sm">No valid formats found.</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* How It Works */}
        {!videoData && !isLoading && !isError && (
          <>
            <section id="how" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-20">
              <div className="text-center mb-12">
                <span className="text-sm font-semibold text-[#2E83FB] uppercase tracking-wider">
                  How it works
                </span>
                <h2 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900">
                  Save any video in 3 simple steps
                </h2>
                <p className="mt-3 text-slate-600 text-lg max-w-xl mx-auto">
                  No tools, no plugins, no learning curve.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StepCard
                  number={1}
                  title="Copy the link"
                  description="Grab the URL of any video from YouTube, Facebook, or Instagram."
                  icon={Link2}
                />
                <StepCard
                  number={2}
                  title="Paste & analyze"
                  description="Paste it above and we'll instantly fetch all available qualities."
                  icon={Sparkles}
                />
                <StepCard
                  number={3}
                  title="Download in HD"
                  description="Pick your preferred format and save the video to your device."
                  icon={Download}
                />
              </div>
            </section>

            {/* Features */}
            <section id="features" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-100">
              <div className="text-center mb-12">
                <span className="text-sm font-semibold text-[#2E83FB] uppercase tracking-wider">
                  Why VidGrab
                </span>
                <h2 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900">
                  Built for speed and simplicity
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <FeatureCard
                  icon={Zap}
                  title="Blazing fast"
                  description="Direct CDN streaming means downloads start in milliseconds."
                />
                <FeatureCard
                  icon={Shield}
                  title="Private by default"
                  description="No accounts, no tracking. Your downloads stay yours."
                />
                <FeatureCard
                  icon={Film}
                  title="Up to 4K quality"
                  description="From mobile-friendly 240p to crisp 4K — pick what fits."
                />
                <FeatureCard
                  icon={Globe}
                  title="3 platforms, 1 tool"
                  description="YouTube, Facebook, and Instagram — all in one place."
                />
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-100">
              <div className="text-center mb-10">
                <span className="text-sm font-semibold text-[#2E83FB] uppercase tracking-wider">
                  FAQ
                </span>
                <h2 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900">
                  Frequently asked questions
                </h2>
              </div>
              <div className="space-y-4">
                <FaqItem
                  q="Is VidGrab really free?"
                  a="Yes — it's completely free with no usage limits, signup, or subscription required."
                />
                <FaqItem
                  q="Which platforms are supported?"
                  a="YouTube videos and Shorts, Facebook videos and Reels, and Instagram posts, Reels, and IGTV."
                />
                <FaqItem
                  q="What quality can I download?"
                  a="Up to the highest quality the source provides — including 4K, 1080p60, and HDR where available."
                />
                <FaqItem
                  q="Do you store my downloads?"
                  a="No. Videos stream directly from the source through our server to your browser. Nothing is saved."
                />
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="VidGrab" className="w-6 h-6" />
            <span className="font-semibold text-slate-700">VidGrab</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <span>Made with yt-dlp + ffmpeg</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBlock({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-start">
      <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center mb-2">
        <Icon className="w-[18px] h-[18px] text-[#2E83FB]" />
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function PlatformPill({
  icon: Icon,
  name,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700">
      <Icon className={`w-4 h-4 ${color}`} />
      {name}
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl p-7 hover:border-[#BFDBFE] hover:shadow-[0_8px_30px_rgba(46,131,251,0.10)] transition-all">
      <div className="absolute top-5 right-6 text-6xl font-extrabold text-slate-100 select-none leading-none">
        {number}
      </div>
      <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-[#2E83FB]" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#BFDBFE] hover:shadow-[0_8px_30px_rgba(46,131,251,0.08)] transition-all">
      <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#2E83FB]" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-white border border-slate-200 rounded-xl p-5 open:shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-shadow">
      <summary className="flex items-center justify-between cursor-pointer font-semibold text-slate-900 text-base list-none">
        {q}
        <span className="ml-4 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-open:bg-[#EFF6FF] group-open:text-[#2E83FB] group-open:rotate-45 transition-all">
          <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-open:rotate-0 transition-transform" />
        </span>
      </summary>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{a}</p>
    </details>
  );
}
