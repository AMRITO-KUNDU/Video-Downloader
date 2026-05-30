import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Plus, Trash2, Save, Search, X, Clock } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

const accentColor = "#3b82f6";
const STORAGE_KEY = "swifttools_notes_v1";

interface Note { id: string; title: string; body: string; updatedAt: number; }

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function load(): Note[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function persist(notes: Note[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }

export default function NotesTool() {
  const [notes, setNotes] = useState<Note[]>(load);
  const [activeId, setActiveId] = useState<string | null>(load()[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = notes.find((n) => n.id === activeId) ?? null;
  const filtered = notes.filter((n) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase())
  );

  const update = (updated: Note[]) => {
    setNotes(updated); persist(updated);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  const createNote = () => {
    const note: Note = { id: crypto.randomUUID(), title: "Untitled note", body: "", updatedAt: Date.now() };
    const updated = [note, ...notes];
    update(updated); setActiveId(note.id);
    setTimeout(() => titleRef.current?.select(), 60);
  };

  const updateField = (field: "title" | "body", value: string) => {
    if (!activeId) return;
    update(notes.map((n) => n.id === activeId ? { ...n, [field]: value, updatedAt: Date.now() } : n));
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    update(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? null);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <ToolLayout icon={<FileText className="w-4 h-4" />} title="Notes" accentColor={accentColor}>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Notes</h2>
        <p className="text-slate-400 text-sm">Your notes are saved privately in this browser. Cloud sync coming soon.</p>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "200px 1fr", minHeight: 480 }}>
        {/* Sidebar */}
        <div className="flex flex-col gap-2 bg-slate-50 rounded-2xl p-3 border border-slate-100">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-100">
            <Search className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="flex-1 bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-300" />
            {search && <button onClick={() => setSearch("")} className="text-slate-300 hover:text-slate-500"><X className="w-3 h-3" /></button>}
          </div>

          <button onClick={createNote}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            style={{ background: `${accentColor}15`, color: accentColor }}>
            <Plus className="w-3.5 h-3.5" /> New note
          </button>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1">
            <AnimatePresence>
              {filtered.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-4">{search ? "No matches" : "No notes yet"}</p>
              )}
              {filtered.map((note) => (
                <motion.button key={note.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  onClick={() => setActiveId(note.id)}
                  className="text-left w-full px-3 py-2.5 rounded-xl transition-colors"
                  style={{
                    background: activeId === note.id ? `${accentColor}12` : "transparent",
                    borderLeft: `2px solid ${activeId === note.id ? accentColor : "transparent"}`,
                  }}>
                  <p className="text-xs font-semibold text-slate-800 truncate">{note.title || "Untitled"}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{note.body || "Empty"}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-2.5 h-2.5 text-slate-300" />
                    <span className="text-[10px] text-slate-300">{timeAgo(note.updatedAt)}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Editor */}
        {active ? (
          <div className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
              <input ref={titleRef} value={active.title} onChange={(e) => updateField("title", e.target.value)}
                className="flex-1 outline-none bg-transparent text-sm font-semibold text-slate-900" />
              <AnimatePresence>
                {saved && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <Save className="w-3 h-3" /> Saved
                  </motion.span>
                )}
              </AnimatePresence>
              <button onClick={() => deleteNote(active.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea value={active.body} onChange={(e) => updateField("body", e.target.value)}
              placeholder="Start writing…"
              className="flex-1 resize-none p-4 outline-none text-sm text-slate-700 leading-relaxed placeholder:text-slate-300"
              style={{ minHeight: 380 }} />
            <div className="px-4 py-2 border-t border-slate-50">
              <span className="text-[10px] text-slate-300">
                {active.body.trim().split(/\s+/).filter(Boolean).length} words · {active.body.length} chars
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm p-10">
            <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ background: `${accentColor}15` }}>
              <FileText className="w-6 h-6" style={{ color: accentColor }} />
            </div>
            <p className="text-slate-400 text-sm mb-4">Select a note or create one</p>
            <button onClick={createNote} className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2 rounded-xl" style={{ background: accentColor }}>
              <Plus className="w-4 h-4" /> New note
            </button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
