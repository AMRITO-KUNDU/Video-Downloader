import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, FileText, Image } from "lucide-react";
import { FaYoutube, FaFacebook, FaInstagram } from "react-icons/fa";
import { Sparkles } from "lucide-react";

/* ── Tool definitions ── */
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
  },
] as const;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.2, 0, 0, 1] },
  },
};

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--md-surface)" }}>

      {/* ── M3 Top App Bar (small) ──────────────────────────────────────── */}
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          background: "var(--md-surface)",
          borderBottom: "1px solid var(--md-outline-variant)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Leading icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--md-shape-md)",
            background: "var(--md-primary-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          <Zap style={{ width: 20, height: 20, color: "var(--md-on-primary-container)" }} fill="currentColor" />
        </div>

        {/* Title — Title Large (22sp) */}
        <span
          className="md-title-large"
          style={{ color: "var(--md-on-surface)", flex: 1 }}
        >
          SwiftTools
        </span>

        {/* Trailing chip */}
        <span
          className="md-label-medium"
          style={{
            padding: "4px 12px",
            borderRadius: "var(--md-shape-full)",
            border: "1px solid var(--md-outline-variant)",
            color: "var(--md-on-surface-variant)",
          }}
        >
          Free
        </span>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        style={{ textAlign: "center", padding: "48px 24px 32px" }}
      >
        {/* Assist chip — M3 style */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 16px",
            borderRadius: "var(--md-shape-full)",
            border: "1px solid var(--md-outline-variant)",
            background: "var(--md-surface-container-low)",
            marginBottom: 20,
          }}
        >
          <Zap style={{ width: 14, height: 14, color: "var(--md-primary)" }} fill="currentColor" />
          <span className="md-label-large" style={{ color: "var(--md-on-surface-variant)" }}>
            6 powerful tools, all free
          </span>
        </div>

        {/* Headline — Headline Large (32sp) */}
        <h1
          className="md-headline-large"
          style={{ color: "var(--md-on-surface)", marginBottom: 12, maxWidth: 480, margin: "0 auto 12px" }}
        >
          Your toolkit,{" "}
          <span style={{ color: "var(--md-primary)" }}>one tap away</span>
        </h1>

        {/* Body Large */}
        <p
          className="md-body-large"
          style={{ color: "var(--md-on-surface-variant)", maxWidth: 420, margin: "0 auto" }}
        >
          Download videos, extract transcripts, summarize content, and remove backgrounds.
        </p>
      </motion.section>

      {/* ── App grid ──────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "0 16px 48px" }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
            maxWidth: 920,
            margin: "0 auto",
          }}
        >
          {TOOLS.map((tool) => {
            const Icon = tool.Icon;
            return (
              <motion.button
                key={tool.id}
                variants={cardVariants}
                onClick={() => navigate(tool.path)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="md-state-layer"
                style={{
                  textAlign: "left",
                  background: "var(--md-surface-container-lowest)",
                  borderRadius: "var(--md-shape-lg)",
                  boxShadow: "var(--md-elevation-1)",
                  border: "none",
                  cursor: "pointer",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "box-shadow 200ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "var(--md-elevation-2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "var(--md-elevation-1)";
                }}
              >
                {/* Icon + badge row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  {/* Tonal icon container — M3 spec: 48×48 rounded square */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "var(--md-shape-md)",
                      background: tool.containerColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 24, height: 24, color: tool.iconColor }} />
                  </div>

                  {/* Assist chip — badge */}
                  <span
                    className="md-label-small"
                    style={{
                      padding: "2px 10px",
                      borderRadius: "var(--md-shape-full)",
                      background: "var(--md-secondary-container)",
                      color: "var(--md-on-secondary-container)",
                    }}
                  >
                    {tool.badge}
                  </span>
                </div>

                {/* Text content */}
                <div>
                  {/* Title Medium */}
                  <p className="md-title-medium" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>
                    {tool.name}{" "}
                    <span style={{ color: "var(--md-on-surface-variant)", fontWeight: 400 }}>
                      {tool.subtitle}
                    </span>
                  </p>
                  {/* Body Small */}
                  <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>
                    {tool.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ textAlign: "center", padding: "16px 24px 32px" }}>
        <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>
          SwiftTools · powered by yt-dlp &amp; rembg · free &amp; open-source
        </p>
      </footer>
    </div>
  );
}
