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
  accentColor = "#6366f1",
  children,
}: ToolLayoutProps) {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 60%, #e8f4fd 100%)",
        fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
      }}
    >
      {/* Title bar */}
      <header
        className="sticky top-0 z-50 flex items-center gap-3 px-4 sm:px-6 py-3"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(226,232,240,0.8)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
          style={{ background: accentColor }}
        >
          {icon}
        </div>

        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-bold text-slate-900 text-sm sm:text-base truncate">{title}</span>
          {subtitle && (
            <span className="text-sm text-slate-400 hidden sm:inline">{subtitle}</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-slate-300">
          <Zap className="w-3.5 h-3.5 text-violet-400" fill="currentColor" />
          <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">SwiftTools</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 py-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl mx-auto flex flex-col gap-5"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
