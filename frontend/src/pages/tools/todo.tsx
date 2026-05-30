import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Plus, Trash2, Circle, CheckCircle2, ChevronDown, Calendar, Flag } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

const ACCENT = "#6750A4";
const STORAGE_KEY = "swifttools_todos_v1";

type Priority = "low" | "medium" | "high";
type Filter = "all" | "active" | "done";

interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  dueDate: string;
  createdAt: number;
}

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  high:   { label: "High",   color: "#C00000", bg: "#FFDAD6" },
  medium: { label: "Medium", color: "#7A5700", bg: "#FDECC4" },
  low:    { label: "Low",    color: "#006D3A", bg: "#BBEDCB" },
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
  const inputRef = useRef<HTMLInputElement>(null);

  const persist = (t: Todo[]) => { setTodos(t); save(t); };

  const addTodo = () => {
    if (!text.trim()) return;
    persist([{ id: crypto.randomUUID(), text: text.trim(), done: false, priority, dueDate, createdAt: Date.now() }, ...todos]);
    setText(""); setDueDate(""); setPriority("medium"); setShowForm(false);
  };

  const toggle = (id: string) => persist(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => persist(todos.filter(t => t.id !== id));
  const clearDone = () => persist(todos.filter(t => !t.done));

  const filtered = todos.filter(t => filter === "all" ? true : filter === "active" ? !t.done : t.done);
  const doneCount = todos.filter(t => t.done).length;
  const activeCount = todos.filter(t => !t.done).length;

  const isOverdue = (t: Todo) => !t.done && t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString());

  return (
    <ToolLayout icon={<CheckSquare style={{ width: 16, height: 16 }} />} title="To-Do List" accentColor={ACCENT}>
      <div>
        <h2 className="md-headline-small" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>To-Do List</h2>
        <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>
          Manage tasks with priorities and due dates. Saved in your browser.
        </p>
      </div>

      {/* Stats row */}
      {todos.length > 0 && (
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "active", "done"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="md-state-layer"
              style={{
                padding: "6px 16px", borderRadius: "var(--md-shape-full)", border: "none",
                background: filter === f ? ACCENT : "var(--md-surface-container-low)",
                color: filter === f ? "#fff" : "var(--md-on-surface-variant)",
                cursor: "pointer", fontFamily: "'Roboto',sans-serif", fontSize: 13, fontWeight: 500,
                transition: "background 150ms, color 150ms",
              }}>
              {f === "all" ? `All (${todos.length})` : f === "active" ? `Active (${activeCount})` : `Done (${doneCount})`}
            </button>
          ))}
          {doneCount > 0 && (
            <button onClick={clearDone} className="md-state-layer"
              style={{
                padding: "6px 16px", borderRadius: "var(--md-shape-full)",
                border: "1px solid var(--md-outline-variant)", background: "transparent",
                color: "var(--md-on-surface-variant)", cursor: "pointer",
                fontFamily: "'Roboto',sans-serif", fontSize: 13, fontWeight: 500, marginLeft: "auto",
              }}>
              Clear done
            </button>
          )}
        </div>
      )}

      {/* Add task card */}
      <div style={{
        background: "var(--md-surface-container-lowest)", borderRadius: "var(--md-shape-lg)",
        boxShadow: "var(--md-elevation-1)", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
          <div style={{ width: 24, height: 24, borderRadius: "var(--md-shape-full)", border: `2px solid ${ACCENT}`, flexShrink: 0 }} />
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
            onFocus={() => setShowForm(true)}
            placeholder="Add a task…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontFamily: "'Roboto',sans-serif", fontSize: 15, color: "var(--md-on-surface)",
            }} />
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: "hidden", borderTop: "1px solid var(--md-outline-variant)" }}>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {/* Priority selector */}
                <div style={{ display: "flex", gap: 6 }}>
                  {(Object.entries(PRIORITY_META) as [Priority, typeof PRIORITY_META[Priority]][]).map(([key, meta]) => (
                    <button key={key} onClick={() => setPriority(key)}
                      className="md-state-layer"
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", borderRadius: "var(--md-shape-full)", border: "none",
                        background: priority === key ? meta.bg : "var(--md-surface-container-low)",
                        color: priority === key ? meta.color : "var(--md-on-surface-variant)",
                        cursor: "pointer", fontFamily: "'Roboto',sans-serif", fontSize: 12, fontWeight: 500,
                      }}>
                      <Flag style={{ width: 12, height: 12 }} />
                      {meta.label}
                    </button>
                  ))}
                </div>
                {/* Due date */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: "var(--md-shape-full)", border: "1px solid var(--md-outline-variant)", background: "var(--md-surface-container-low)" }}>
                  <Calendar style={{ width: 13, height: 13, color: "var(--md-on-surface-variant)", flexShrink: 0 }} />
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Roboto',sans-serif", fontSize: 12, color: "var(--md-on-surface)" }} />
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button onClick={() => { setShowForm(false); setText(""); setDueDate(""); }} className="md-state-layer"
                    style={{
                      padding: "0 16px", height: 36, borderRadius: "var(--md-shape-full)",
                      border: "1px solid var(--md-outline)", background: "transparent",
                      cursor: "pointer", color: "var(--md-on-surface-variant)",
                      fontFamily: "'Roboto',sans-serif", fontSize: 14, fontWeight: 500,
                    }}>Cancel</button>
                  <button onClick={addTodo} disabled={!text.trim()} className="md-state-layer"
                    style={{
                      padding: "0 24px", height: 36, borderRadius: "var(--md-shape-full)",
                      border: "none", background: text.trim() ? ACCENT : "var(--md-surface-container-highest)",
                      color: text.trim() ? "#fff" : "var(--md-on-surface-variant)",
                      cursor: text.trim() ? "pointer" : "not-allowed",
                      fontFamily: "'Roboto',sans-serif", fontSize: 14, fontWeight: 500,
                      transition: "background 150ms",
                    }}>Add task</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Task list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "var(--md-shape-xl)", margin: "0 auto 12px", background: ACCENT + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckSquare style={{ width: 28, height: 28, color: ACCENT }} />
              </div>
              <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>
                {filter === "done" ? "No completed tasks yet" : filter === "active" ? "All tasks done!" : "No tasks yet — add one above"}
              </p>
            </motion.div>
          )}

          {filtered.map(todo => {
            const meta = PRIORITY_META[todo.priority];
            const overdue = isOverdue(todo);
            return (
              <motion.div key={todo.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 16 }}
                layout
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                  background: "var(--md-surface-container-lowest)", borderRadius: "var(--md-shape-md)",
                  boxShadow: "var(--md-elevation-1)",
                  opacity: todo.done ? 0.6 : 1, transition: "opacity 200ms",
                  borderLeft: `3px solid ${meta.color}`,
                }}>
                {/* Checkbox */}
                <button onClick={() => toggle(todo.id)}
                  style={{ border: "none", background: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: 2, color: todo.done ? "#006D3A" : "var(--md-outline)" }}>
                  {todo.done
                    ? <CheckCircle2 style={{ width: 22, height: 22 }} />
                    : <Circle style={{ width: 22, height: 22 }} />}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="md-body-medium" style={{ color: "var(--md-on-surface)", textDecoration: todo.done ? "line-through" : "none", wordBreak: "break-word" }}>
                    {todo.text}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span className="md-label-small" style={{ padding: "2px 8px", borderRadius: "var(--md-shape-full)", background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    {todo.dueDate && (
                      <span className="md-label-small" style={{ display: "flex", alignItems: "center", gap: 4, color: overdue ? "var(--md-error)" : "var(--md-on-surface-variant)" }}>
                        <Calendar style={{ width: 11, height: 11 }} />
                        {overdue ? "Overdue · " : ""}{new Date(todo.dueDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => remove(todo.id)} className="md-state-layer"
                  style={{
                    width: 36, height: 36, borderRadius: "var(--md-shape-full)", border: "none",
                    background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--md-on-surface-variant)", flexShrink: 0,
                  }}>
                  <Trash2 style={{ width: 16, height: 16 }} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToolLayout>
  );
}
