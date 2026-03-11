import { useState, useRef } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ThemeProvider, useTheme } from "./lib/ThemeContext.jsx";
import { defaultLawTypes } from "./lib/constants.js";
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [filters, setFilters] = useState({
    jurisdiction: "all",
    courtLevel: "all",
    dateRange: "all",
    lawTypes: { ...defaultLawTypes },
  });
  const [verifications, setVerifications] = useState({});
  const resultsRef = useRef(null);
  const { history, addToHistory, clearHistory, rerunQuery } = useSearchHistory();

  const verifyInBackground = async (citations) => {
    if (!citations?.length) return;
    const filtered = citations.filter(Boolean);
    if (!filtered.length) return;
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citations: filtered.slice(0, 10) }),
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

      const citationsToVerify = [
        ...(data.case_law || []).map(c => c.citation),
        ...(data.criminal_code || []).map(c => c.citation),
      ].filter(Boolean);
      verifyInBackground(citationsToVerify);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
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

      <div ref={resultsRef}>
        {loading && <StagedLoading />}
        {error && <ErrorMessage message={error} onRetry={analyzeScenario} />}
        {result && <Results data={result} verifications={verifications} />}
      </div>

      {historyOpen && (
        <SearchHistory
          history={history}
          onClose={() => setHistoryOpen(false)}
          clearHistory={clearHistory}
          onSelect={(id) => {
            const entry = rerunQuery(id);
            if (!entry) return;
            setQuery(entry.query);
            const restoredFilters = {
              jurisdiction: entry.filters.jurisdiction || "all",
              courtLevel: entry.filters.courtLevel || "all",
              dateRange: entry.filters.dateRange || "all",
              lawTypes: entry.filters.lawTypes || { ...defaultLawTypes },
            };
            setFilters(restoredFilters);
            analyzeScenario(entry.query, restoredFilters);
          }}
        />
      )}

      <footer style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ borderTop: `1px solid ${t.borderLight}`, paddingTop: 24 }}>
          <p style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 11, color: t.textFaint, letterSpacing: 1.5,
            margin: "0 0 10px 0",
          }}>
            casedive {"\u00B7"} Legal Research Tool
          </p>
          <p style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 11, color: t.textFaint, lineHeight: 1.6,
            margin: 0, letterSpacing: 0.3,
          }}>
            {"\u26A0\uFE0F"} Educational Tool Only. This is not legal advice. Always consult a qualified lawyer for legal matters. Verify all citations with official sources like CanLII.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
      <SpeedInsights />
    </ThemeProvider>
  );
}
