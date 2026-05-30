import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e8f4fd 100%)",
        fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center px-6"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <Zap className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-6xl font-bold text-slate-900 mb-2">404</h1>
        <p className="text-slate-500 text-lg mb-8">Page not found</p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mx-auto text-white font-medium px-6 py-3 rounded-xl transition-colors"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to SwiftTools
        </button>
      </motion.div>
    </div>
  );
}
