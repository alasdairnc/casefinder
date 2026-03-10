import { useState, useRef } from "react";
import { ThemeProvider, useTheme } from "./lib/ThemeContext.jsx";
import { exampleScenarios } from "./lib/constants.js";
import Header from "./components/Header.jsx";
import FiltersPanel from "./components/FiltersPanel.jsx";
import SearchArea from "./components/SearchArea.jsx";
import StagedLoading from "./components/StagedLoading.jsx";
import Results from "./components/Results.jsx";
import ErrorMessage from "./components/ErrorMessage.jsx";
import SearchHistory from "./components/SearchHistory.jsx";
import { useSearchHistory } from "./hooks/useSearchHistory.js";

function AppInner() {
  const t = useTheme();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [filters, setFilters] = useState({
    jurisdiction: "all",
    courtLevel: "all",
    dateRange: "all",
  });
  const [verifications, setVerifications] = useState({});
  const resultsRef = useRef(null);
  const { history, addToHistory, clearHistory, rerunQuery } = useSearchHistory();

  const verifyInBackground = async (cases) => {
    if (!cases?.length) return;
    const citations = cases.map((c) => c.citation).filter(Boolean);
    if (!citations.length) return;
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citations }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setVerifications(data);
    } catch {
      // Silent fail — verification is non-blocking
    }
  };

  const analyzeScenario = async (overrideQuery, overrideFilters) => {
    const activeQuery = typeof overrideQuery === "string" ? overrideQuery : query;
    const activeFilters = (overrideFilters && !overrideFilters.target) ? overrideFilters : filters;
    if (!activeQuery.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: activeQuery.trim(), filters: activeFilters }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setVerifications({});
      setResult(data);
      addToHistory(activeQuery.trim(), activeFilters, data);
      verifyInBackground(data.cases);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      console.error(err);
      setError(
        err.message?.includes("parse")
          ? "The AI response couldn't be parsed. Try rephrasing your scenario with more detail."
          : `Something went wrong: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: t.bg, minHeight: "100vh", color: t.text,
      transition: "background 0.3s, color 0.3s",
    }}>
      <Header />
      <FiltersPanel
        filters={filters} setFilters={setFilters}
        filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
      />
      <SearchArea
        query={query} setQuery={setQuery}
        onSubmit={analyzeScenario} loading={loading}
      />

      {/* History toggle */}
      {history.length > 0 && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 24px 0", textAlign: "right" }}>
          <button
            onClick={() => setHistoryOpen(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
              letterSpacing: 1.5, textTransform: "uppercase",
              color: t.textTertiary, padding: 0,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <span>History</span>
            <span style={{
              fontSize: 10, color: t.tagText, background: t.tagBg,
              padding: "1px 6px", border: `1px solid ${t.border}`,
            }}>
              {Math.min(history.length, 10)}
            </span>
          </button>
        </div>
      )}

      {/* Examples */}
      {!result && !loading && !error && (
        <section style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 0" }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
            letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 14,
          }}>
            Try an Example
          </div>
          {exampleScenarios.map((ex, i) => (
            <button
              key={i}
              onClick={() => setQuery(ex)}
              style={{
                display: "block", width: "100%",
                textAlign: "left", background: "transparent",
                border: "none", borderBottom: `1px solid ${t.borderLight}`,
                padding: "14px 0", cursor: "pointer",
                fontFamily: "'Times New Roman', serif",
                fontSize: "clamp(14px, 2vw, 15px)",
                color: t.textSecondary, lineHeight: 1.6,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => e.target.style.color = t.text}
              onMouseLeave={(e) => e.target.style.color = t.textSecondary}
            >
              {ex}
            </button>
          ))}
        </section>
      )}

      {/* Results */}
      <div ref={resultsRef}>
        {loading && <StagedLoading />}
        {error && <ErrorMessage message={error} onRetry={analyzeScenario} />}
        {result && <Results data={result} verifications={verifications} />}
      </div>

      {/* Search History modal */}
      {historyOpen && (
        <SearchHistory
          history={history}
          onClose={() => setHistoryOpen(false)}
          clearHistory={clearHistory}
          onSelect={(id) => {
            const entry = rerunQuery(id);
            if (!entry) return;
            setQuery(entry.query);
            setFilters(entry.filters);
            analyzeScenario(entry.query, entry.filters);
          }}
        />
      )}

      {/* Footer */}
      <footer style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ borderTop: `1px solid ${t.borderLight}`, paddingTop: 24 }}>
          <span style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 11, color: t.textFaint, letterSpacing: 1.5,
          }}>
            CaseFinder — Built by Alasdair NC {"\u00B7"} 2026
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
