import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Plus, Trash2, Circle, CheckCircle2, Calendar, Flag } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

const accentColor = "#8b5cf6";
const STORAGE_KEY = "swifttools_todos_v1";

type Priority = "low" | "medium" | "high";
type Filter = "all" | "active" | "done";

interface Todo { id: string; text: string; done: boolean; priority: Priority; dueDate: string; createdAt: number; }

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  high:   { label: "High",   color: "#ef4444", bg: "#fef2f2" },
  medium: { label: "Medium", color: "#f59e0b", bg: "#fffbeb" },
  low:    { label: "Low",    color: "#10b981", bg: "#f0fdf4" },
};

function load(): Todo[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function save(t: Todo[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

export default function TodoTool() {
  const [todos, setTodos] = useState<Todo[]>(load);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);

  const persist = (t: Todo[]) => { setTodos(t); save(t); };
  const addTodo = () => {
    if (!text.trim()) return;
    persist([{ id: crypto.randomUUID(), text: text.trim(), done: false, priority, dueDate, createdAt: Date.now() }, ...todos]);
    setText(""); setDueDate(""); setPriority("medium"); setShowForm(false);
  };
  const toggle = (id: string) => persist(todos.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => persist(todos.filter((t) => t.id !== id));
  const clearDone = () => persist(todos.filter((t) => !t.done));

  const filtered = todos.filter((t) => filter === "all" ? true : filter === "active" ? !t.done : t.done);
  const doneCount = todos.filter((t) => t.done).length;
  const activeCount = todos.filter((t) => !t.done).length;
  const isOverdue = (t: Todo) => !t.done && t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString());

  return (
    <ToolLayout icon={<CheckSquare className="w-4 h-4" />} title="To-Do List" accentColor={accentColor}>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">To-Do List</h2>
        <p className="text-slate-400 text-sm">Manage tasks with priorities and due dates. Saved in your browser.</p>
      </div>

      {/* Filter + clear */}
      {todos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "active", "done"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: filter === f ? accentColor : "#f1f5f9",
                color: filter === f ? "white" : "#64748b",
              }}>
              {f === "all" ? `All (${todos.length})` : f === "active" ? `Active (${activeCount})` : `Done (${doneCount})`}
            </button>
          ))}
          {doneCount > 0 && (
            <button onClick={clearDone} className="ml-auto text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
              Clear done
            </button>
          )}
        </div>
      )}

      {/* Add task */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <Circle className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTodo(); }}
            onFocus={() => setShowForm(true)}
            placeholder="Add a task…"
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-300"
          />
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-5 pb-4 pt-1 border-t border-slate-50 flex items-center gap-3 flex-wrap">
                <div className="flex gap-1.5">
                  {(Object.entries(PRIORITY_META) as [Priority, typeof PRIORITY_META[Priority]][]).map(([key, meta]) => (
                    <button key={key} onClick={() => setPriority(key)}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                      style={{
                        background: priority === key ? meta.bg : "#f8fafc",
                        color: priority === key ? meta.color : "#94a3b8",
                        border: `1px solid ${priority === key ? meta.color + "44" : "#e2e8f0"}`,
                      }}>
                      <Flag className="w-2.5 h-2.5" />{meta.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
                  <Calendar className="w-3.5 h-3.5" />
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="outline-none bg-transparent text-xs text-slate-600" />
                </div>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => { setShowForm(false); setText(""); }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors border border-slate-100">
                    Cancel
                  </button>
                  <button onClick={addTodo} disabled={!text.trim()}
                    className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg text-white transition-opacity disabled:opacity-40"
                    style={{ background: accentColor }}>
                    <Plus className="w-3.5 h-3.5" /> Add task
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                <CheckSquare className="w-6 h-6" style={{ color: accentColor }} />
              </div>
              <p className="text-slate-400 text-sm">
                {filter === "done" ? "No completed tasks" : filter === "active" ? "All tasks done!" : "No tasks yet — add one above"}
              </p>
            </motion.div>
          )}

          {filtered.map((todo) => {
            const meta = PRIORITY_META[todo.priority];
            const overdue = isOverdue(todo);
            return (
              <motion.div key={todo.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 12 }}
                layout
                className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
                style={{ opacity: todo.done ? 0.6 : 1, borderLeft: `3px solid ${meta.color}` }}>
                <button onClick={() => toggle(todo.id)} className="mt-0.5 shrink-0 transition-colors"
                  style={{ color: todo.done ? "#10b981" : "#cbd5e1" }}>
                  {todo.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800" style={{ textDecoration: todo.done ? "line-through" : "none" }}>
                    {todo.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    {todo.dueDate && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: overdue ? "#ef4444" : "#94a3b8" }}>
                        <Calendar className="w-2.5 h-2.5" />
                        {overdue ? "Overdue · " : ""}{new Date(todo.dueDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => remove(todo.id)} className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-slate-200 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToolLayout>
  );
}
