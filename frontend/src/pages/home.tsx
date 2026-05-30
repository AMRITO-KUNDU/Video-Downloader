import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, FileText, Image, CheckSquare, Calculator } from "lucide-react";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { Sparkles, NotebookPen } from "lucide-react";

const TOOLS = [
  {
    id: "youtube",
    path: "/tools/youtube",
    name: "YouTube",
    subtitle: "Downloader",
    description: "Download HD videos and MP3 audio from any public YouTube video.",
    Icon: FaYoutube,
    containerColor: "#FFDAD6",
    iconColor: "#C00000",
    badge: "Video",
    badgeBg: "#FFDAD6",
    badgeColor: "#C00000",
  },
  {
    id: "facebook",
    path: "/tools/facebook",
    name: "Facebook",
    subtitle: "Video",
    description: "Save videos from Facebook and Watch in HD or SD quality.",
    Icon: FaFacebook,
    containerColor: "#D9E2FF",
    iconColor: "#0040C4",
    badge: "Video",
    badgeBg: "#D9E2FF",
    badgeColor: "#0040C4",
  },
  {
    id: "instagram",
    path: "/tools/instagram",
    name: "Instagram",
    subtitle: "Video",
    description: "Download reels, posts and videos from public Instagram accounts.",
    Icon: FaInstagram,
    containerColor: "#FFD8E4",
    iconColor: "#9E0059",
    badge: "Video",
    badgeBg: "#FFD8E4",
    badgeColor: "#9E0059",
  },
  {
    id: "transcript",
    path: "/tools/transcript",
    name: "Transcript",
    subtitle: "Generator",
    description: "Extract full captions and timestamped transcripts from YouTube videos.",
    Icon: FileText,
    containerColor: "#BBEDCB",
    iconColor: "#006D3A",
    badge: "AI",
    badgeBg: "#BBEDCB",
    badgeColor: "#006D3A",
  },
  {
    id: "summarizer",
    path: "/tools/summarizer",
    name: "AI",
    subtitle: "Summarizer",
    description: "Get an intelligent summary of any YouTube video via its transcript.",
    Icon: Sparkles,
    containerColor: "#EADDFF",
    iconColor: "#6750A4",
    badge: "AI",
    badgeBg: "#EADDFF",
    badgeColor: "#6750A4",
  },
  {
    id: "bgremover",
    path: "/tools/bgremover",
    name: "Background",
    subtitle: "Remover",
    description: "Remove image backgrounds instantly with a local AI model — fully private.",
    Icon: Image,
    containerColor: "#B2EBEB",
    iconColor: "#006A6A",
    badge: "AI",
    badgeBg: "#B2EBEB",
    badgeColor: "#006A6A",
  },
  {
    id: "notes",
    path: "/tools/notes",
    name: "Notes",
    subtitle: "",
    description: "Write and save multiple notes right in your browser. Cloud sync coming soon.",
    Icon: NotebookPen,
    containerColor: "#D9E2FF",
    iconColor: "#1565C0",
    badge: "Study",
    badgeBg: "#D9E2FF",
    badgeColor: "#1565C0",
  },
  {
    id: "todo",
    path: "/tools/todo",
    name: "To-Do List",
    subtitle: "",
    description: "Manage tasks with priorities and due dates. Saved in your browser.",
    Icon: CheckSquare,
    containerColor: "#EADDFF",
    iconColor: "#6750A4",
    badge: "Study",
    badgeBg: "#EADDFF",
    badgeColor: "#6750A4",
  },
  {
    id: "converter",
    path: "/tools/converter",
    name: "Unit",
    subtitle: "Converter",
    description: "Convert between length, mass, temperature, volume, data size, speed and more.",
    Icon: Calculator,
    containerColor: "#B2EBEB",
    iconColor: "#006A6A",
    badge: "Study",
    badgeBg: "#B2EBEB",
    badgeColor: "#006A6A",
  },
] as const;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0, 0, 1] } },
};

const SECTIONS = [
  { label: "Video Tools",       ids: ["youtube","facebook","instagram"] },
  { label: "AI Tools",          ids: ["transcript","summarizer","bgremover"] },
  { label: "Student Workspace", ids: ["notes","todo","converter"] },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--md-surface)" }}>

      {/* ── M3 Top App Bar ─────────────────────────────────────────────── */}
      <header style={{
        height: 64, display: "flex", alignItems: "center", padding: "0 16px",
        background: "var(--md-surface)", borderBottom: "1px solid var(--md-outline-variant)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "var(--md-shape-md)",
          background: "var(--md-primary-container)", display: "flex", alignItems: "center",
          justifyContent: "center", marginRight: 12, flexShrink: 0,
        }}>
          <Zap style={{ width: 20, height: 20, color: "var(--md-on-primary-container)" }} fill="currentColor" />
        </div>
        <span className="md-title-large" style={{ color: "var(--md-on-surface)", flex: 1 }}>SwiftTools</span>
        <span className="md-label-medium" style={{
          padding: "4px 12px", borderRadius: "var(--md-shape-full)",
          border: "1px solid var(--md-outline-variant)", color: "var(--md-on-surface-variant)",
        }}>Free</span>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        style={{ textAlign: "center", padding: "48px 24px 32px" }}
      >
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 16px", borderRadius: "var(--md-shape-full)",
          border: "1px solid var(--md-outline-variant)", background: "var(--md-surface-container-low)",
          marginBottom: 20,
        }}>
          <Zap style={{ width: 14, height: 14, color: "var(--md-primary)" }} fill="currentColor" />
          <span className="md-label-large" style={{ color: "var(--md-on-surface-variant)" }}>9 tools, all free</span>
        </div>
        <h1 className="md-headline-large" style={{ color: "var(--md-on-surface)", margin: "0 auto 12px", maxWidth: 480 }}>
          Your toolkit,{" "}
          <span style={{ color: "var(--md-primary)" }}>one tap away</span>
        </h1>
        <p className="md-body-large" style={{ color: "var(--md-on-surface-variant)", maxWidth: 440, margin: "0 auto" }}>
          Download videos, generate transcripts, take notes, manage tasks, and convert units.
        </p>
      </motion.section>

      {/* ── Sections ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "0 16px 56px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
          {SECTIONS.map(section => {
            const sectionTools = TOOLS.filter(t => section.ids.includes(t.id));
            return (
              <div key={section.label}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <p className="md-title-small" style={{ color: "var(--md-on-surface)" }}>{section.label}</p>
                  <div style={{ flex: 1, height: 1, background: "var(--md-outline-variant)" }} />
                </div>

                {/* Tool grid */}
                <motion.div
                  variants={containerVariants} initial="hidden" animate="show"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
                    gap: 14,
                  }}
                >
                  {sectionTools.map(tool => {
                    const Icon = tool.Icon;
                    return (
                      <motion.button
                        key={tool.id} variants={cardVariants}
                        onClick={() => navigate(tool.path)}
                        whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                        className="md-state-layer"
                        style={{
                          textAlign: "left", background: "var(--md-surface-container-lowest)",
                          borderRadius: "var(--md-shape-lg)", boxShadow: "var(--md-elevation-1)",
                          border: "none", cursor: "pointer", padding: 20,
                          display: "flex", flexDirection: "column", gap: 12,
                          transition: "box-shadow 200ms ease",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--md-elevation-2)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--md-elevation-1)"; }}
                      >
                        {/* Icon + badge */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: "var(--md-shape-md)",
                            background: tool.containerColor, display: "flex", alignItems: "center",
                            justifyContent: "center", flexShrink: 0,
                          }}>
                            <Icon style={{ width: 24, height: 24, color: tool.iconColor }} />
                          </div>
                          <span className="md-label-small" style={{
                            padding: "2px 10px", borderRadius: "var(--md-shape-full)",
                            background: tool.badgeBg, color: tool.badgeColor,
                          }}>
                            {tool.badge}
                          </span>
                        </div>

                        {/* Text */}
                        <div>
                          <p className="md-title-medium" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>
                            {tool.name}
                            {tool.subtitle && (
                              <span style={{ color: "var(--md-on-surface-variant)", fontWeight: 400 }}> {tool.subtitle}</span>
                            )}
                          </p>
                          <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>{tool.description}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ textAlign: "center", padding: "16px 24px 32px" }}>
        <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>
          SwiftTools · powered by yt-dlp, rembg &amp; youtube-transcript-api · free &amp; open-source
        </p>
      </footer>
    </div>
  );
}
