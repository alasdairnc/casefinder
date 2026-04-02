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
import RetrievalRecommendationsDashboard from "./components/RetrievalRecommendationsDashboard.jsx";
import { useSearchHistory } from "./hooks/useSearchHistory.js";
import { useBookmarks } from "./hooks/useBookmarks.js";

const SearchHistory = lazy(() => import("./components/SearchHistory.jsx"));
const BookmarksPanel = lazy(() => import("./components/BookmarksPanel.jsx"));
const CriminalCodeExplorer = lazy(() => import("./components/CriminalCodeExplorer.jsx"));

const EXAMPLE_SCENARIOS = [
  { label: "Impaired driving", text: "A driver was pulled over at a RIDE checkpoint, failed the roadside breath test, and refused to provide a breathalyzer sample. Police arrested the driver and obtained a blood sample." },
  { label: "Break and enter", text: "A person was found inside an occupied house at 2 a.m. with stolen electronics. The homeowner was home during the break-in and called 911." },
  { label: "Drug trafficking", text: "An individual was stopped by police and found with 50 grams of cocaine packaged in individual baggies alongside a scale and $3,000 cash. Police conducted a warrantless search of the vehicle." },
  { label: "Assault (GBH)", text: "Two people got into a fight outside a bar. One person punched the other repeatedly, causing a broken nose and cheekbone fracture that required surgery." },
  { label: "Youth offender", text: "A 17-year-old was apprehended shoplifting $800 in clothing from a retail store. It is a first offence with no prior record." },
  { label: "Fraud over $5,000", text: "An accused allegedly defrauded an elderly victim of $90,000 through a fake investment scheme, collecting payments over 18 months before the victim discovered the fraud." },
];

function EmptyState({ setQuery, t }) {
  return (
    <div className="cd-fade-in" style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}>
      {/* Thin rule above headline */}
      <div style={{ borderTop: `1px solid ${t.border}`, marginBottom: 24 }} />

      <h2 style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: "clamp(26px, 4.5vw, 38px)",
        fontWeight: 400,
        fontStyle: "italic",
        color: t.text,
        margin: "0 0 14px 0",
        lineHeight: 1.2,
        letterSpacing: "-0.3px",
      }}>
        Describe your legal scenario.
      </h2>

      <p style={{
        fontFamily: "'Helvetica Neue', sans-serif",
        fontSize: "clamp(12px, 1.8vw, 13px)",
        color: t.textTertiary,
        lineHeight: 1.75,
        margin: "0 0 28px 0",
        maxWidth: 480,
      }}>
        Criminal Code sections, verified case law, Charter rights, and civil law statutes —
        drawn from CanLII and the Justice Laws database.
      </p>

      {/* Example chips */}
      <div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 9,
          letterSpacing: "0.38em",
          textTransform: "uppercase",
          color: t.textFaint,
          marginBottom: 10,
        }}>
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

// AdSense — only push once per <ins> element
function AdUnit({ slotId, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || ref.current.dataset.adLoaded) return;
    ref.current.dataset.adLoaded = "true";
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, []);
  return (
    <ins
      ref={ref}
      className="adsbygoogle"
      style={{ display: "block", ...style }}
      data-ad-client="ca-pub-5931276184603899"
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

function AppInner() {
  const t = useTheme();
  const [pathname, setPathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
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
  const [filters, setFilters] = useState({
    jurisdiction: "all",
    courtLevel: "all",
    dateRange: "all",
    lawTypes: { ...defaultLawTypes },
  });
  const [submittedQuery, setSubmittedQuery] = useState("");
  const resultsRef = useRef(null);
  const { history, addToHistory, clearHistory, rerunQuery } = useSearchHistory();
  const { bookmarks, addBookmark, removeBookmark, isBookmarked, clearBookmarks } = useBookmarks();

  if (pathname === "/internal/retrieval-health") {
    return (
      <RetrievalHealthDashboard
        onNavigateHome={() => {
          window.history.pushState({}, "", "/");
          setPathname("/");
        }}
        onNavigateRecommendations={() => {
          window.history.pushState({}, "", "/internal/retrieval-recommendations");
          setPathname("/internal/retrieval-recommendations");
        }}
      />
    );
  }

  if (pathname === "/internal/retrieval-recommendations") {
    return (
      <RetrievalRecommendationsDashboard
        onNavigateHome={() => {
          window.history.pushState({}, "", "/");
          setPathname("/");
        }}
        onNavigateHealth={() => {
          window.history.pushState({}, "", "/internal/retrieval-health");
          setPathname("/internal/retrieval-health");
        }}
      />
    );
  }

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
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const mins = retryAfter ? Math.ceil(Number(retryAfter) / 60) : null;
          throw new Error(errData.error || (mins ? `Rate limit reached. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.` : "Rate limit exceeded."));
        }
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setSubmittedQuery(activeQuery.trim());
      setResult(data);
      addToHistory(activeQuery.trim(), activeFilters, data);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const isInternalParse = err.message?.includes("parse") && !err.message.includes("Rate");
      setError(
        isInternalParse
          ? "The AI response couldn't be parsed. Try rephrasing your scenario with more detail."
          : (err.message || "Something went wrong. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = !result && !loading && !error;

  return (
    <div style={{
      background: t.bg,
      minHeight: "100vh",
      color: t.text,
      transition: "background 0.3s, color 0.3s",
    }}>
      <style>{`
        @media (max-width: 1200px) {
          .ad-side-left, .ad-side-right { display: none !important; }
        }
        @media (min-width: 1201px) {
          .ad-bottom { display: none !important; }
        }
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
          color: ${t.textFaint};
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
        <p style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 10,
          lineHeight: 1.5,
          color: t.textFaint,
          letterSpacing: "0.02em",
          margin: 0,
        }}>
          Educational tool only — not legal advice. Always consult a qualified lawyer. Citations verified against CanLII where possible.
        </p>
      </div>

      {/* History button */}
      {history.length > 0 && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "10px 24px 0", textAlign: "right" }}>
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
              color: t.textFaint,
              padding: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = t.textSecondary; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = t.textFaint; }}
          >
            History ({Math.min(history.length, 10)})
          </button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && <EmptyState setQuery={setQuery} t={t} />}

      {/* 3-column layout */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 24,
        maxWidth: "100%",
        margin: "0 auto",
        padding: "24px 12px",
      }}>
        {/* Left side ad */}
        <div className="ad-side-left" style={{ flex: "0 0 160px" }}>
          <div style={{ position: "sticky", top: 24 }}>
            <AdUnit slotId="5671735556" style={{ minHeight: 600 }} />
          </div>
        </div>

        {/* Center column */}
        <div style={{ flex: "1 1 auto", maxWidth: 760, minWidth: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <AdUnit slotId="7399604405" style={{ maxWidth: "100%" }} />
          </div>

          <div ref={resultsRef}>
            {loading && <StagedLoading />}
            {error && <ErrorMessage message={error} onRetry={analyzeScenario} />}
          </div>

          {result && (
            <div className="cd-results-in">
              <Results
                data={result}
                scenario={submittedQuery}
                addBookmark={addBookmark}
                removeBookmark={removeBookmark}
                isBookmarked={isBookmarked}
              />
              <div className="ad-bottom" style={{ margin: "32px 24px 0", textAlign: "center" }}>
                <AdUnit slotId="1225553652" style={{ maxWidth: "100%", height: "auto" }} />
              </div>
            </div>
          )}
        </div>

        {/* Right side ad */}
        <div className="ad-side-right" style={{ flex: "0 0 160px" }}>
          <div style={{ position: "sticky", top: 24 }}>
            <AdUnit slotId="3173060142" style={{ minHeight: 600 }} />
          </div>
        </div>
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
        <div style={{ borderTop: `1px solid ${t.borderLight}`, paddingTop: 20 }}>
          <p style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            color: t.textFaint,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            margin: "0 0 10px 0",
          }}>
            CaseDive &middot; Canadian Legal Research
          </p>
          <p style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            color: t.textFaint,
            lineHeight: 1.6,
            margin: "0 0 14px 0",
          }}>
            Educational tool only. Not legal advice. Always consult a qualified lawyer.
            Verify all citations with CanLII.
          </p>
          <p style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            color: t.textFaint,
            margin: 0,
          }}>
            <a href="/about.html" style={{ color: t.textFaint, textDecoration: "none" }}>About</a>
            {" \u00B7 "}
            <a href="/privacy.html" style={{ color: t.textFaint, textDecoration: "none" }}>Privacy</a>
            {" \u00B7 "}
            <a href="/terms.html" style={{ color: t.textFaint, textDecoration: "none" }}>Terms</a>
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
