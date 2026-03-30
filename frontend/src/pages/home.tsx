import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Youtube, 
  Download, 
  AlertCircle, 
  Clock, 
  HardDrive, 
  Play, 
  Loader2, 
  ArrowRight,
  Check,
  Zap,
  Shield,
  Film,
  Globe,
  Copy,
  Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetVideoInfo } from "@/hooks/use-video-info";
import { useDownload } from "@/hooks/use-download";
import { formatBytes } from "@/lib/utils";

const formSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .url("Please enter a valid URL")
    .regex(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/, "Must be a valid YouTube URL"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  const videoInfoMutation = useGetVideoInfo();
  const { download, downloadingId } = useDownload();

  const onSubmit = (data: FormValues) => {
    setCurrentUrl(data.url);
    videoInfoMutation.mutate(data.url);
  };

  const videoData = videoInfoMutation.data;
  const isLoading = videoInfoMutation.isPending;
  const isError = videoInfoMutation.isError;
  const errorMsg =
    (videoInfoMutation.error as any)?.data?.error ||
    "Failed to fetch video information.";

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden flex flex-col">
      {/* Sticky Navbar */}
      <nav className="w-full sticky top-0 z-50 glass-panel border-x-0 border-t-0 rounded-none bg-background/80 backdrop-blur-xl">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl tracking-tight">YTDownloader</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 font-medium px-3">No Signup</Badge>
            <Badge variant="secondary" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 font-medium px-3">Free</Badge>
            <Badge variant="secondary" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 font-medium px-3">Open Source</Badge>
          </div>
        </div>
      </nav>

      {/* Background Image / Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-glow.png`} 
          alt="" 
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[100px]" />
      </div>

      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-24 flex flex-col items-center flex-1">
        
        {/* Header & Hero */}
        <motion.div 
          layout
          className="text-center w-full max-w-2xl mx-auto mb-10"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-2xl"
          >
            <Youtube className="w-8 h-8 text-primary" />
          </motion.div>
          <motion.h1 
            layout="position"
            className="text-4xl md:text-6xl font-extrabold text-gradient mb-6"
          >
            Download Any <br/>
            <span className="text-gradient-primary">YouTube Video</span>
          </motion.h1>
          <motion.p 
            layout="position"
            className="text-lg md:text-xl text-muted-foreground mb-8"
          >
            Paste your link below to fetch high-quality MP4 and WebM formats instantly. No ads, totally free.
          </motion.p>

          {/* Search Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-rose-500/30 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex flex-col sm:flex-row gap-3 bg-card p-2 rounded-2xl border border-white/10 shadow-2xl">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input 
                  {...register("url")}
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="pl-12 border-none bg-transparent shadow-none h-14 text-lg focus-visible:ring-0"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="w-full sm:w-auto rounded-xl px-8"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-5 h-5 mr-2" />
                )}
                {isLoading ? "Fetching..." : "Fetch Video"}
              </Button>
            </div>
            {errors.url && (
              <p className="absolute -bottom-7 left-2 text-sm text-destructive font-medium flex items-center mt-2">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.url.message}
              </p>
            )}
          </form>

          {/* Trust Badges */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-10 text-sm text-muted-foreground font-medium"
          >
            <span className="flex items-center"><Check className="w-4 h-4 text-primary mr-1.5"/> No registration needed</span>
            <span className="flex items-center"><Check className="w-4 h-4 text-primary mr-1.5"/> Up to 4K quality</span>
            <span className="flex items-center"><Check className="w-4 h-4 text-primary mr-1.5"/> Fast streaming</span>
            <span className="flex items-center"><Check className="w-4 h-4 text-primary mr-1.5"/> MP4 format</span>
          </motion.div>
        </motion.div>

        {/* Results Area */}
        <div className="w-full mt-8">
          <AnimatePresence mode="wait">
            
            {/* Error State */}
            {isError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                    <h3 className="text-xl font-display font-semibold mb-2">Oops! Something went wrong</h3>
                    <p className="text-muted-foreground">{errorMsg}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Success State */}
            {videoData && !isLoading && !isError && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Video Info Column */}
                <motion.div className="lg:col-span-5 flex flex-col gap-6">
                  <Card className="overflow-hidden border-white/10 glass-panel">
                    <div className="relative aspect-video w-full bg-black/50">
                      {videoData.thumbnail ? (
                        <img 
                          src={videoData.thumbnail} 
                          alt={videoData.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-12 h-12 text-white/20" />
                        </div>
                      )}
                      {videoData.duration && (
                        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md text-xs font-mono font-medium text-white border border-white/10 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {videoData.duration}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-bold leading-snug mb-2 line-clamp-2" title={videoData.title}>
                        {videoData.title}
                      </h2>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="font-medium text-white/80">{videoData.uploader}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Formats Column */}
                <motion.div className="lg:col-span-7">
                  <Card className="glass-panel border-white/10 h-full flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-display font-semibold text-lg flex items-center">
                        <HardDrive className="w-5 h-5 mr-2 text-primary" />
                        Available Qualities
                      </h3>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/5 text-muted-foreground">
                        {videoData.formats.length} formats found
                      </span>
                    </div>
                    <div className="p-2 flex-grow">
                      {videoData.formats.length > 0 ? (
                        <ul className="space-y-2">
                          {videoData.formats.map((format, i) => (
                            <motion.li 
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={format.format_id}
                              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all duration-200"
                            >
                              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                <div className="h-12 w-16 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center flex-shrink-0">
                                  <span className="font-display font-bold text-lg text-white">
                                    {format.quality}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium flex items-center">
                                    {format.label}
                                    <span className="ml-2 text-xs uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                                      {format.ext}
                                    </span>
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {format.filesize ? formatBytes(format.filesize) : "Unknown size"}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                onClick={() => download(currentUrl, format.format_id, videoData.title)}
                                variant="secondary"
                                className="w-full sm:w-auto shrink-0 relative overflow-hidden"
                                disabled={downloadingId === format.format_id}
                              >
                                {downloadingId === format.format_id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Starting...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                                    Download
                                  </>
                                )}
                              </Button>
                            </motion.li>
                          ))}
                        </ul>
                      ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                          <p>No valid formats found for this video.</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
                
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Marketing Sections (Show only when no data is present) */}
        {!videoData && !isLoading && !isError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full mt-24 flex flex-col gap-24"
          >
            {/* How It Works Section */}
            <section className="w-full">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How It Works</h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-lg">Three simple steps to save any video directly to your device.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                <Card className="glass-panel relative overflow-hidden group border-white/5 bg-black/20">
                  <CardContent className="p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.15)] group-hover:scale-110 transition-transform duration-300">
                      <Copy className="w-7 h-7" />
                    </div>
                    <div className="absolute top-4 right-6 text-7xl font-display font-black text-white/5 select-none transition-all duration-300 group-hover:text-primary/10">1</div>
                    <h3 className="text-xl font-bold mb-3 font-display">Paste URL</h3>
                    <p className="text-muted-foreground leading-relaxed">Copy any YouTube video link and paste it above in the search box.</p>
                  </CardContent>
                </Card>
                
                <Card className="glass-panel relative overflow-hidden group border-white/5 bg-black/20">
                  <CardContent className="p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.15)] group-hover:scale-110 transition-transform duration-300">
                      <Sliders className="w-7 h-7" />
                    </div>
                    <div className="absolute top-4 right-6 text-7xl font-display font-black text-white/5 select-none transition-all duration-300 group-hover:text-primary/10">2</div>
                    <h3 className="text-xl font-bold mb-3 font-display">Choose Quality</h3>
                    <p className="text-muted-foreground leading-relaxed">Pick from available resolutions from 144p up to crisp 4K quality.</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel relative overflow-hidden group border-white/5 bg-black/20">
                  <CardContent className="p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.15)] group-hover:scale-110 transition-transform duration-300">
                      <Download className="w-7 h-7" />
                    </div>
                    <div className="absolute top-4 right-6 text-7xl font-display font-black text-white/5 select-none transition-all duration-300 group-hover:text-primary/10">3</div>
                    <h3 className="text-xl font-bold mb-3 font-display">Download</h3>
                    <p className="text-muted-foreground leading-relaxed">Your browser downloads the MP4 file directly via fast streaming.</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Features Section */}
            <section className="w-full">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Why Use YTDownloader?</h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-lg">Built with cutting-edge technology to give you the best experience.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="glass-panel border-white/5 bg-black/20 hover:bg-white/[0.03] transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-5 border border-primary/20">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold mb-2 text-lg">Blazing Fast</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">ffmpeg streams video+audio directly to your browser, no temp files needed.</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel border-white/5 bg-black/20 hover:bg-white/[0.03] transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-5 border border-primary/20">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold mb-2 text-lg">Private</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">No account required, no tracking scripts, and no history stored.</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel border-white/5 bg-black/20 hover:bg-white/[0.03] transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-5 border border-primary/20">
                      <Film className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold mb-2 text-lg">All Resolutions</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">From 144p mobile-friendly up to stunning 4K, pick the size that fits you.</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel border-white/5 bg-black/20 hover:bg-white/[0.03] transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-5 border border-primary/20">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold mb-2 text-lg">Any YouTube Link</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Works perfectly with regular videos, YouTube Shorts, and embedded links.</p>
                  </CardContent>
                </Card>
              </div>
            </section>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-auto z-10 border-t border-white/5 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            © 2026 YTDownloader — Built with yt-dlp and ffmpeg
          </p>
        </div>
      </footer>
    </div>
  );
}
