import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { ThemeProvider, useTheme } from "./lib/ThemeContext.jsx";
import { defaultLawTypes } from "./lib/constants.js";
import Header from "./components/Header.jsx";
import FiltersPanel from "./components/FiltersPanel.jsx";
import SearchArea from "./components/SearchArea.jsx";
import StagedLoading from "./components/StagedLoading.jsx";
import Results from "./components/Results.jsx";
import ErrorMessage from "./components/ErrorMessage.jsx";
import RetrievalHealthDashboard from "./components/RetrievalHealthDashboard.jsx";
import { useSearchHistory } from "./hooks/useSearchHistory.js";
import { useBookmarks } from "./hooks/useBookmarks.js";
import { MAX_CASE_LAW_REPORT_SCENARIO_SNIPPET_LENGTH } from "./lib/caseLawReportReasons.js";

const SearchHistory = lazy(() => import("./components/SearchHistory.jsx"));
const BookmarksPanel = lazy(() => import("./components/BookmarksPanel.jsx"));
const CriminalCodeExplorer = lazy(
  () => import("./components/CriminalCodeExplorer.jsx"),
);

// NOTE: Sensitive user scenario data is no longer stored in localStorage. AdSense script context is restricted.
const EXAMPLE_SCENARIOS = [
  {
    label: "Impaired driving",
    text: "A driver was pulled over at a RIDE checkpoint, failed the roadside breath test, and refused to provide a breathalyzer sample. Police arrested the driver and obtained a blood sample.",
  },
  {
    label: "Break and enter",
    text: "A person was found inside an occupied house at 2 a.m. with stolen electronics. The homeowner was home during the break-in and called 911.",
  },
  {
    label: "Drug trafficking",
    text: "An individual was stopped by police and found with 50 grams of cocaine packaged in individual baggies alongside a scale and $3,000 cash. Police conducted a warrantless search of the vehicle.",
  },
  {
    label: "Assault (GBH)",
    text: "Two people got into a fight outside a bar. One person punched the other repeatedly, causing a broken nose and cheekbone fracture that required surgery.",
  },
  {
    label: "Youth offender",
    text: "A 17-year-old was apprehended shoplifting $800 in clothing from a retail store. It is a first offence with no prior record.",
  },
  {
    label: "Fraud over $5,000",
    text: "An accused allegedly defrauded an elderly victim of $90,000 through a fake investment scheme, collecting payments over 18 months before the victim discovered the fraud.",
  },
];

function createDefaultFilters() {
  return {
    jurisdiction: "all",
    courtLevel: "all",
    dateRange: "all",
    lawTypes: { ...defaultLawTypes },
  };
}

function cloneSubmittedFilters(filters = {}) {
  return {
    jurisdiction: filters.jurisdiction || "all",
    courtLevel: filters.courtLevel || "all",
    dateRange: filters.dateRange || "all",
    lawTypes: {
      criminal_code: filters?.lawTypes?.criminal_code !== false,
      case_law: filters?.lawTypes?.case_law !== false,
      civil_law: filters?.lawTypes?.civil_law !== false,
      charter: filters?.lawTypes?.charter !== false,
    },
  };
}

function toScenarioSnippet(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CASE_LAW_REPORT_SCENARIO_SNIPPET_LENGTH);
}

function EmptyState({ setQuery, t }) {
  return (
    <div
      className="cd-fade-in"
      style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}
    >
      {/* Thin rule above headline */}
      <div style={{ borderTop: `1px solid ${t.border}`, marginBottom: 24 }} />

      <h2
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "clamp(26px, 4.5vw, 38px)",
          fontWeight: 400,
          fontStyle: "italic",
          color: t.text,
          margin: "0 0 14px 0",
          lineHeight: 1.2,
          letterSpacing: "-0.3px",
        }}
      >
        Describe your legal scenario.
      </h2>

      <p
        style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: "clamp(12px, 1.8vw, 13px)",
          color: t.textSecondary,
          lineHeight: 1.75,
          margin: "0 0 28px 0",
          maxWidth: 480,
        }}
      >
        Criminal Code sections, verified case law, Charter rights, and civil law
        statutes — drawn from CanLII and the Justice Laws database.
      </p>

      {/* Example chips */}
      <div>
        <div
          style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 9,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: t.textTertiary,
            marginBottom: 10,
          }}
        >
          Try an example
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EXAMPLE_SCENARIOS.slice(0, 3).map(({ label, text }, i) => (
            <button
              key={i}
              onClick={() => setQuery(text)}
              style={{
                background: "none",
                border: `1px solid ${t.border}`,
                padding: "8px 18px",
                cursor: "pointer",
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                letterSpacing: "0.05em",
                color: t.textTertiary,
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = t.text;
                e.currentTarget.style.color = t.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = t.border;
                e.currentTarget.style.color = t.textTertiary;
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const t = useTheme();
  const [pathname, setPathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/",
  );

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [codeExplorerOpen, setCodeExplorerOpen] = useState(false);
  const [filters, setFilters] = useState(() => createDefaultFilters());
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedScenarioSnippet, setSubmittedScenarioSnippet] = useState("");
  const [submittedFilters, setSubmittedFilters] = useState(() =>
    createDefaultFilters(),
  );
  const resultsRef = useRef(null);
  const { history, addToHistory, clearHistory, rerunQuery } =
    useSearchHistory();
  const {
    bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    clearBookmarks,
  } = useBookmarks();

  if (pathname === "/internal/retrieval-health") {
    return (
      <RetrievalHealthDashboard
        onNavigateHome={() => {
          window.history.pushState({}, "", "/");
          setPathname("/");
        }}
      />
    );
  }

  const analyzeScenario = async (overrideQuery, overrideFilters) => {
    const activeQuery =
      typeof overrideQuery === "string" ? overrideQuery : query;
    const activeFilters =
      overrideFilters && !overrideFilters.target ? overrideFilters : filters;
    if (!activeQuery.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: activeQuery.trim(),
          filters: activeFilters,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const mins = retryAfter ? Math.ceil(Number(retryAfter) / 60) : null;
          throw new Error(
            errData.error ||
              (mins
                ? `Rate limit reached. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`
                : "Rate limit exceeded."),
          );
        }
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setSubmittedQuery(activeQuery.trim());
      setSubmittedScenarioSnippet(toScenarioSnippet(activeQuery));
      setSubmittedFilters(cloneSubmittedFilters(activeFilters));
      setResult(data);
      addToHistory(activeQuery.trim(), activeFilters, data);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      const isInternalParse =
        err.message?.includes("parse") && !err.message.includes("Rate");
      setError(
        isInternalParse
          ? "The AI response couldn't be parsed. Try rephrasing your scenario with more detail."
          : err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = !result && !loading && !error;

  return (
    <div
      style={{
        background: t.bg,
        minHeight: "100vh",
        color: t.text,
        transition: "background 0.3s, color 0.3s",
      }}
    >
      <style>{`
        @keyframes cdFadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cd-fade-in {
          animation: cdFadeSlideIn 0.38s ease-out forwards;
        }
        .cd-results-in {
          animation: cdFadeSlideIn 0.28s ease-out forwards;
        }
        ::placeholder {
          color: ${t.textTertiary};
          opacity: 1;
        }
        select option {
          background: ${t.bgAlt};
          color: ${t.text};
        }
      `}</style>

      <Header
        bookmarkCount={bookmarks.length}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onOpenCodeExplorer={() => setCodeExplorerOpen(true)}
      />

      <FiltersPanel filters={filters} setFilters={setFilters} />

      <SearchArea
        query={query}
        setQuery={setQuery}
        onSubmit={analyzeScenario}
        loading={loading}
      />

      {/* Disclaimer */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 24px 0" }}>
        <p
          style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            lineHeight: 1.5,
            color: t.textSecondary,
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          Educational tool only — not legal advice. Always consult a qualified
          lawyer. Citations verified against CanLII where possible.
        </p>
      </div>

      {/* History button */}
      {history.length > 0 && (
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "10px 24px 0",
            textAlign: "right",
          }}
        >
          <button
            onClick={() => setHistoryOpen(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: t.textTertiary,
              padding: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = t.textSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = t.textTertiary;
            }}
          >
            History ({Math.min(history.length, 10)})
          </button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && <EmptyState setQuery={setQuery} t={t} />}

      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "24px 24px",
        }}
      >
        <div ref={resultsRef}>
          {loading && <StagedLoading />}
          {error && <ErrorMessage message={error} onRetry={analyzeScenario} />}
        </div>

        {result && (
          <div className="cd-results-in">
            <Results
              data={result}
              scenario={submittedQuery}
              scenarioSnippet={submittedScenarioSnippet}
              filters={submittedFilters}
              addBookmark={addBookmark}
              removeBookmark={removeBookmark}
              isBookmarked={isBookmarked}
            />
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {bookmarksOpen && (
          <BookmarksPanel
            bookmarks={bookmarks}
            removeBookmark={removeBookmark}
            clearBookmarks={clearBookmarks}
            onClose={() => setBookmarksOpen(false)}
          />
        )}

        {codeExplorerOpen && (
          <CriminalCodeExplorer onClose={() => setCodeExplorerOpen(false)} />
        )}

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
      </Suspense>

      <footer style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        <div
          style={{ borderTop: `1px solid ${t.borderLight}`, paddingTop: 20 }}
        >
          <p
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 10,
              color: t.textTertiary,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              margin: "0 0 10px 0",
            }}
          >
            CaseDive &middot; Canadian Legal Research
          </p>
          <p
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 10,
              color: t.textSecondary,
              lineHeight: 1.6,
              margin: "0 0 14px 0",
            }}
          >
            Educational tool only. Not legal advice. Always consult a qualified
            lawyer. Verify all citations with CanLII.
          </p>
          <p
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 10,
              color: t.textTertiary,
              margin: 0,
            }}
          >
            <a
              href="/about.html"
              style={{ color: t.textTertiary, textDecoration: "none" }}
            >
              About
            </a>
            {" \u00B7 "}
            <a
              href="/privacy.html"
              style={{ color: t.textTertiary, textDecoration: "none" }}
            >
              Privacy
            </a>
            {" \u00B7 "}
            <a
              href="/terms.html"
              style={{ color: t.textTertiary, textDecoration: "none" }}
            >
              Terms
            </a>
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
    </ThemeProvider>
  );
}
