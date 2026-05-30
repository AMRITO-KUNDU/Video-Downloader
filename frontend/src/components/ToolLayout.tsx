import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import type { ReactNode } from "react";

interface ToolLayoutProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  accentColor?: string;
  children: ReactNode;
}

export default function ToolLayout({
  icon,
  title,
  subtitle,
  accentColor = "var(--md-primary)",
  children,
}: ToolLayoutProps) {
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--md-surface)" }}>

      {/* ── M3 Top App Bar — Small variant ─────────────────────────────── */}
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 4px",
          background: "var(--md-surface)",
          borderBottom: "1px solid var(--md-outline-variant)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          gap: 4,
        }}
      >
        {/* M3 Icon Button — Navigation back */}
        <button
          onClick={() => navigate("/")}
          className="md-state-layer"
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--md-shape-full)",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--md-on-surface-variant)",
            flexShrink: 0,
          }}
          title="Back to home"
        >
          <ArrowLeft style={{ width: 24, height: 24 }} />
        </button>

        {/* Leading icon — tonal container */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--md-shape-sm)",
            background: "var(--md-primary-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--md-on-primary-container)",
          }}
        >
          {icon}
        </div>

        {/* Title — Title Large (22sp, Roboto 400) */}
        <div style={{ flex: 1, overflow: "hidden", padding: "0 4px" }}>
          <span
            className="md-title-large"
            style={{
              color: "var(--md-on-surface)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}
          >
            {title}
            {subtitle && (
              <span
                className="md-title-large"
                style={{ color: "var(--md-on-surface-variant)", fontWeight: 400, marginLeft: 8 }}
              >
                {subtitle}
              </span>
            )}
          </span>
        </div>

        {/* Trailing brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 16, flexShrink: 0 }}>
          <Zap style={{ width: 16, height: 16, color: "var(--md-primary)" }} fill="currentColor" />
          <span className="md-label-medium" style={{ color: "var(--md-on-surface-variant)" }}>
            SwiftTools
          </span>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "24px 16px 64px" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
