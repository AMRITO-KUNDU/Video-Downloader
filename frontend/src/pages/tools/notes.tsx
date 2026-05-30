import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Plus, Trash2, Save, Search, X, Clock } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

const ACCENT = "#1565C0";
const STORAGE_KEY = "swifttools_notes_v1";

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export default function NotesTool() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = notes.find(n => n.id === activeId) ?? null;

  const filtered = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase())
  );

  const persist = (updated: Note[]) => {
    setNotes(updated);
    saveNotes(updated);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  const createNote = () => {
    const note: Note = { id: crypto.randomUUID(), title: "Untitled note", body: "", updatedAt: Date.now() };
    const updated = [note, ...notes];
    persist(updated);
    setActiveId(note.id);
    setTimeout(() => titleRef.current?.select(), 60);
  };

  const updateNote = (field: "title" | "body", value: string) => {
    if (!activeId) return;
    persist(notes.map(n => n.id === activeId ? { ...n, [field]: value, updatedAt: Date.now() } : n));
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    persist(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? null);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <ToolLayout icon={<FileText style={{ width: 16, height: 16 }} />} title="Notes" accentColor={ACCENT}>
      <div>
        <h2 className="md-headline-small" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>Notes</h2>
        <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>
          Your notes are saved privately in this browser. Cloud sync coming soon.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12, minHeight: 480 }}>

        {/* ── Sidebar ── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 8,
          background: "var(--md-surface-container-low)",
          borderRadius: "var(--md-shape-lg)", padding: 12, overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--md-surface-container-lowest)",
            borderRadius: "var(--md-shape-full)", padding: "6px 12px",
            border: "1px solid var(--md-outline-variant)",
          }}>
            <Search style={{ width: 14, height: 14, color: "var(--md-on-surface-variant)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "'Roboto',sans-serif", fontSize: 13, color: "var(--md-on-surface)" }} />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--md-on-surface-variant)", padding: 0 }}>
              <X style={{ width: 12, height: 12 }} />
            </button>}
          </div>

          {/* New note button — M3 Filled Tonal */}
          <button onClick={createNote} className="md-state-layer"
            style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%",
              padding: "8px 12px", borderRadius: "var(--md-shape-full)", border: "none",
              background: ACCENT + "1A", color: ACCENT, cursor: "pointer",
              fontFamily: "'Roboto',sans-serif", fontSize: 13, fontWeight: 500,
            }}>
            <Plus style={{ width: 16, height: 16 }} /> New note
          </button>

          {/* Note list */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            <AnimatePresence>
              {filtered.length === 0 && (
                <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)", textAlign: "center", padding: "16px 0" }}>
                  {search ? "No matches" : "No notes yet"}
                </p>
              )}
              {filtered.map(note => (
                <motion.button key={note.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  onClick={() => setActiveId(note.id)}
                  className="md-state-layer"
                  style={{
                    textAlign: "left", width: "100%", padding: "10px 10px",
                    borderRadius: "var(--md-shape-sm)", border: "none",
                    background: activeId === note.id ? ACCENT + "18" : "transparent",
                    cursor: "pointer",
                    borderLeft: activeId === note.id ? `3px solid ${ACCENT}` : "3px solid transparent",
                  }}>
                  <p className="md-label-large" style={{ color: "var(--md-on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.title || "Untitled"}
                  </p>
                  <p className="md-body-small" style={{ color: "var(--md-on-surface-variant)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.body || "Empty"}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Clock style={{ width: 10, height: 10, color: "var(--md-on-surface-variant)" }} />
                    <span className="md-label-small" style={{ color: "var(--md-on-surface-variant)" }}>{timeAgo(note.updatedAt)}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Editor ── */}
        {active ? (
          <div style={{
            display: "flex", flexDirection: "column", gap: 0,
            background: "var(--md-surface-container-lowest)",
            borderRadius: "var(--md-shape-lg)", boxShadow: "var(--md-elevation-1)",
            overflow: "hidden",
          }}>
            {/* Toolbar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
              borderBottom: "1px solid var(--md-outline-variant)",
            }}>
              <input ref={titleRef}
                value={active.title}
                onChange={e => updateNote("title", e.target.value)}
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontFamily: "'Roboto',sans-serif", fontSize: 16, fontWeight: 500,
                  color: "var(--md-on-surface)",
                }}
              />
              <AnimatePresence>
                {saved && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="md-label-small"
                    style={{ color: "#006D3A", display: "flex", alignItems: "center", gap: 4 }}>
                    <Save style={{ width: 12, height: 12 }} /> Saved
                  </motion.span>
                )}
              </AnimatePresence>
              <button onClick={() => deleteNote(active.id)} className="md-state-layer"
                style={{
                  width: 36, height: 36, borderRadius: "var(--md-shape-full)", border: "none",
                  background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--md-on-surface-variant)",
                }}>
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </div>
            {/* Body */}
            <textarea ref={bodyRef}
              value={active.body}
              onChange={e => updateNote("body", e.target.value)}
              placeholder="Start writing…"
              style={{
                flex: 1, border: "none", outline: "none", resize: "none",
                padding: "16px", background: "transparent", minHeight: 400,
                fontFamily: "'Roboto',sans-serif", fontSize: 15, lineHeight: "26px",
                color: "var(--md-on-surface)",
              }}
            />
            {/* Footer */}
            <div style={{ padding: "8px 16px", borderTop: "1px solid var(--md-outline-variant)" }}>
              <span className="md-body-small" style={{ color: "var(--md-on-surface-variant)" }}>
                {active.body.trim().split(/\s+/).filter(Boolean).length} words · {active.body.length} chars
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "var(--md-surface-container-lowest)", borderRadius: "var(--md-shape-lg)",
            boxShadow: "var(--md-elevation-1)", padding: 48,
          }}>
            <div style={{ width: 64, height: 64, borderRadius: "var(--md-shape-xl)", background: ACCENT + "1A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <FileText style={{ width: 28, height: 28, color: ACCENT }} />
            </div>
            <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)", marginBottom: 16 }}>Select a note or create one</p>
            <button onClick={createNote} className="md-state-layer"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0 24px", height: 40, borderRadius: "var(--md-shape-full)",
                border: "none", background: ACCENT, color: "#fff", cursor: "pointer",
                fontFamily: "'Roboto',sans-serif", fontSize: 14, fontWeight: 500,
              }}>
              <Plus style={{ width: 16, height: 16 }} /> New note
            </button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
