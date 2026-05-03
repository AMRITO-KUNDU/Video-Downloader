import { useState, useCallback } from "react";
import type { VideoPlatform } from "./use-video-info";

export type HistoryEntry = {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: VideoPlatform;
  format_id: string;
  quality: string;
  audio_only: boolean;
  timestamp: number;
};

const STORAGE_KEY = "vidgrab_history";
const MAX_ENTRIES = 20;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function useDownloadHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const addEntry = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    setHistory((prev) => {
      const deduped = prev.filter(
        (e) => !(e.url === entry.url && e.format_id === entry.format_id && e.audio_only === entry.audio_only)
      );
      const next: HistoryEntry[] = [
        { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: Date.now() },
        ...deduped,
      ].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    saveHistory([]);
    setHistory([]);
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}
