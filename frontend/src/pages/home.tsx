import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, Image, FileText, CheckSquare, Calculator } from "lucide-react";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { Sparkles, NotebookPen } from "lucide-react";

const SECTIONS = [
  {
    label: "Video Tools",
    tools: [
      {
        id: "youtube",
        path: "/tools/youtube",
        name: "YouTube",
        subtitle: "Downloader",
        description: "Download HD videos & MP3 audio from YouTube",
        icon: FaYoutube,
        gradient: "from-red-500 to-rose-600",
        badge: "Video",
      },
      {
        id: "facebook",
        path: "/tools/facebook",
        name: "Facebook",
        subtitle: "Video",
        description: "Save videos from Facebook and Watch",
        icon: FaFacebook,
        gradient: "from-blue-500 to-blue-700",
        badge: "Video",
      },
      {
        id: "instagram",
        path: "/tools/instagram",
        name: "Instagram",
        subtitle: "Video",
        description: "Download reels, posts and videos from Instagram",
        icon: FaInstagram,
        gradient: "from-pink-500 to-purple-600",
        badge: "Video",
      },
    ],
  },
  {
    label: "AI Tools",
    tools: [
      {
        id: "transcript",
        path: "/tools/transcript",
        name: "Transcript",
        subtitle: "Generator",
        description: "Extract full transcripts from any YouTube video",
        icon: FileText,
        gradient: "from-emerald-500 to-teal-600",
        badge: "AI",
      },
      {
        id: "summarizer",
        path: "/tools/summarizer",
        name: "AI",
        subtitle: "Summarizer",
        description: "Get an AI-powered summary of any YouTube video",
        icon: Sparkles,
        gradient: "from-violet-500 to-purple-700",
        badge: "AI",
      },
      {
        id: "bgremover",
        path: "/tools/bgremover",
        name: "Background",
        subtitle: "Remover",
        description: "Remove image backgrounds instantly with local AI",
        icon: Image,
        gradient: "from-cyan-500 to-sky-600",
        badge: "AI",
      },
    ],
  },
  {
    label: "Student Workspace",
    tools: [
      {
        id: "notes",
        path: "/tools/notes",
        name: "Notes",
        subtitle: "",
        description: "Write and save notes right in your browser",
        icon: NotebookPen,
        gradient: "from-blue-500 to-indigo-600",
        badge: "Study",
      },
      {
        id: "todo",
        path: "/tools/todo",
        name: "To-Do",
        subtitle: "List",
        description: "Manage tasks with priorities and due dates",
        icon: CheckSquare,
        gradient: "from-violet-500 to-indigo-600",
        badge: "Study",
      },
      {
        id: "converter",
        path: "/tools/converter",
        name: "Unit",
        subtitle: "Converter",
        description: "Convert length, mass, temperature, data and more",
        icon: Calculator,
        gradient: "from-teal-500 to-cyan-600",
        badge: "Study",
      },
    ],
  },
] as const;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e8f4fd 100%)",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(226,232,240,0.8)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base tracking-tight">SwiftTools</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2">9 free tools</span>
          </div>
        </div>
        <span className="text-xs text-slate-400 hidden md:block">Free · No sign-in required</span>
      </header>

      {/* Hero */}
      <div className="text-center pt-14 pb-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-5"
            style={{
              background: "linear-gradient(135deg, #ede9fe, #dbeafe)",
              color: "#6d28d9",
              border: "1px solid #c4b5fd",
            }}
          >
            <Zap className="w-3 h-3" fill="currentColor" />
            9 powerful tools, all free
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3 tracking-tight">
            Your toolkit,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              one click away
            </span>
          </h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            Download videos, generate transcripts, take notes, manage tasks, and convert units — all in your browser.
          </p>
        </motion.div>
      </div>

      {/* Sections */}
      <main className="flex-1 px-4 pb-16 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              {/* Section label */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Tool cards */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {section.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <motion.button
                      key={tool.id}
                      variants={cardVariants}
                      onClick={() => navigate(tool.path)}
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="text-left rounded-2xl overflow-hidden cursor-pointer focus:outline-none group"
                      style={{
                        background: "white",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)";
                      }}
                    >
                      {/* Gradient header */}
                      <div
                        className={`h-28 flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${tool.gradient} relative overflow-hidden`}
                      >
                        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white opacity-10" />
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white opacity-10" />
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                          {tool.badge}
                        </span>
                      </div>

                      {/* Card body */}
                      <div className="p-4">
                        <p className="text-[13px] font-bold text-slate-900 leading-tight">
                          {tool.name}
                          {tool.subtitle && (
                            <span className="font-normal text-slate-500 ml-1">{tool.subtitle}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400">
        SwiftTools · powered by yt-dlp &amp; rembg · free &amp; open source
      </footer>
    </div>
  );
}
