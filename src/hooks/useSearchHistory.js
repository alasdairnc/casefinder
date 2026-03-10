import { useState, useCallback } from "react";

const STORAGE_KEY = "caseFinderHistory";
const MAX_ENTRIES = 20;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const now = Date.now();
    // Filter expired entries
    return parsed.filter(e => now - e.timestamp < TTL_MS);
  } catch {
    return [];
  }
}

function saveToStorage(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState(() => loadFromStorage());

  const addToHistory = useCallback((query, filters, result) => {
    setHistory(prev => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        query,
        filters: { ...filters },
        result,
        timestamp: Date.now(),
      };
      const updated = [entry, ...prev].slice(0, MAX_ENTRIES);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  // Returns { query, filters } for the given id — caller re-runs the query
  const rerunQuery = useCallback((id) => {
    const entry = history.find(e => e.id === id);
    if (!entry) return null;
    return { query: entry.query, filters: entry.filters };
  }, [history]);

  // Sorted newest first (already maintained by addToHistory)
  const getHistory = useCallback(() => history, [history]);

  return { history, addToHistory, clearHistory, rerunQuery, getHistory };
}
