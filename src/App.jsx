import { useState, useRef, useEffect } from "react";
import { ThemeProvider, useTheme } from "./lib/ThemeContext.jsx";
import { defaultLawTypes } from "./lib/constants.js";
import Header from "./components/Header.jsx";
import FiltersPanel from "./components/FiltersPanel.jsx";
import SearchArea from "./components/SearchArea.jsx";
import StagedLoading from "./components/StagedLoading.jsx";
import Results from "./components/Results.jsx";
import ErrorMessage from "./components/ErrorMessage.jsx";
import SearchHistory from "./components/SearchHistory.jsx";
import BookmarksPanel from "./components/BookmarksPanel.jsx";
import CriminalCodeExplorer from "./components/CriminalCodeExplorer.jsx";
import RetrievalHealthDashboard from "./components/RetrievalHealthDashboard.jsx";
import { useSearchHistory } from "./hooks/useSearchHistory.js";
import { useBookmarks } from "./hooks/useBookmarks.js";

const EXAMPLE_SCENARIOS = [
  { label: "Impaired driving", text: "A driver was pulled over at a RIDE checkpoint, failed the roadside breath test, and refused to provide a breathalyzer sample. Police arrested the driver and obtained a blood sample." },
  { label: "Break and enter", text: "A person was found inside an occupied house at 2 a.m. with stolen electronics. The homeowner was home during the break-in and called 911." },
  { label: "Drug trafficking", text: "An individual was stopped by police and found with 50 grams of cocaine packaged in individual baggies alongside a scale and $3,000 cash. Police conducted a warrantless search of the vehicle." },
  { label: "Assault (GBH)", text: "Two people got into a fight outside a bar. One person punched the other repeatedly, causing a broken nose and cheekbone fracture that required surgery." },
  { label: "Youth offender", text: "A 17-year-old was apprehended shoplifting $800 in clothing from a retail store. It is a first offence with no prior record." },
  { label: "Fraud over $5,000", text: "An accused allegedly defrauded an elderly victim of $90,000 through a fake investment scheme, collecting payments over 18 months before the victim discovered the fraud." },
];

const COVERAGE_AREAS = [
  { label: "Criminal Code", desc: "Offence sections, penalties, and defences from the Criminal Code of Canada" },
  { label: "Case Law", desc: "Verified Supreme Court and appellate decisions cross-referenced with CanLII" },
  { label: "Charter Rights", desc: "Constitutional rights under the Canadian Charter of Rights and Freedoms" },
  { label: "Civil Law", desc: "Provincial offences and federal statutes including CDSA, YCJA, and HTA" },
];

// Compact chips shown directly below the submit button
function ScenarioChips({ setQuery, t }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 24px 0" }}>
      <div style={{
        fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
        letterSpacing: 2.5, textTransform: "uppercase",
        color: t.textTertiary, marginBottom: 10,
      }}>
        Try an example
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {EXAMPLE_SCENARIOS.map(({ label, text }, i) => (
          <button
            key={i}
            onClick={() => setQuery(text)}
            style={{
              background: "none", border: `1px solid ${t.borderLight}`,
              padding: "6px 14px", cursor: "pointer",
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
              color: t.textTertiary, letterSpacing: 0.5,
              transition: "border-color 0.15s, color 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.borderLight; e.currentTarget.style.color = t.textTertiary; }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Description + coverage grid shown in center column below the fold
function LandingDescription({ t }) {
  return (
    <div style={{ padding: "8px 24px 32px" }}>
      <p style={{
        fontFamily: "'Times New Roman', serif",
        fontSize: "clamp(15px, 2.3vw, 17px)",
        color: t.textSecondary, lineHeight: 1.8, margin: "0 0 32px 0",
      }}>
        CaseDive is a Canadian criminal law research tool. Describe a legal scenario and receive
        relevant Criminal Code sections, verified case law citations, Charter rights implications,
        and a legal analysis — drawn from CanLII and the Justice Laws database.
      </p>
      <div style={{
        fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
        letterSpacing: 3.5, textTransform: "uppercase",
        color: t.textTertiary, marginBottom: 16,
      }}>
        Coverage
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {COVERAGE_AREAS.map(({ label, desc }) => (
          <div key={label} style={{ border: `1px solid ${t.borderLight}`, padding: "14px 16px" }}>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
              fontWeight: 700, color: t.text, marginBottom: 6, letterSpacing: 0.5,
            }}>
              {label}
            </div>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
              color: t.textTertiary, lineHeight: 1.5,
            }}>
              {desc}
            </div>
          </div>
        ))}
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
  const [filtersOpen, setFiltersOpen] = useState(true);
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
      background: t.bg, minHeight: "100vh", color: t.text,
      transition: "background 0.3s, color 0.3s",
    }}>
      <style>{`
        @media (max-width: 1200px) {
          .ad-side-left, .ad-side-right { display: none !important; }
        }
        @media (min-width: 1201px) {
          .ad-bottom { display: none !important; }
        }
      `}</style>

      {/* Above the fold — input is the first thing after the header */}
      <Header bookmarkCount={bookmarks.length} onOpenBookmarks={() => setBookmarksOpen(true)} onOpenCodeExplorer={() => setCodeExplorerOpen(true)} />
      <FiltersPanel
        filters={filters} setFilters={setFilters}
        filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
      />
      <SearchArea
        query={query} setQuery={setQuery}
        onSubmit={analyzeScenario} loading={loading}
      />

      {/* Legal Disclaimer */}
      <div style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '16px 24px 0',
      }}>
        <p style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 11,
          lineHeight: 1.5,
          color: t.textTertiary,
          letterSpacing: 0.3,
          borderLeft: `2px solid ${t.border}`,
          paddingLeft: 12,
          margin: 0,
        }}>
          CaseFinder is an educational research tool and does not provide legal advice. Results are AI-generated and may contain errors. Always consult a qualified lawyer for legal matters. Case citations are verified against CanLII where possible.
        </p>
      </div>

      {/* History button */}
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

      {/* Compact scenario chips — empty state only, right below submit */}
      {isEmpty && <ScenarioChips setQuery={setQuery} t={t} />}

      {/* 3-column layout — always rendered so side ads are always visible */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 24,
        maxWidth: "100%",
        margin: "0 auto",
        padding: "24px 12px",
      }}>
        {/* Left side ad — sticky, desktop only */}
        <div className="ad-side-left" style={{ flex: "0 0 160px" }}>
          <div style={{ position: "sticky", top: 24 }}>
            <AdUnit slotId="5671735556" style={{ minHeight: 600 }} />
          </div>
        </div>

        {/* Center column */}
        <div style={{ flex: "1 1 auto", maxWidth: 760, minWidth: 0 }}>
          {/* Top ad — always shown */}
          <div style={{ marginBottom: 8 }}>
            <AdUnit slotId="7399604405" style={{ maxWidth: "100%" }} />
          </div>

          {/* Landing description + coverage — empty state only */}
          {isEmpty && <LandingDescription t={t} />}

          {/* Loading / error */}
          <div ref={resultsRef}>
            {loading && <StagedLoading />}
            {error && <ErrorMessage message={error} onRetry={analyzeScenario} />}
          </div>

          {/* Results */}
          {result && (
            <>
              <Results
                data={result}
                scenario={submittedQuery}
                addBookmark={addBookmark}
                removeBookmark={removeBookmark}
                isBookmarked={isBookmarked}
              />
              {/* Bottom ad — mobile only (hidden on >1200px via CSS) */}
              <div className="ad-bottom" style={{ margin: "32px 24px 0", textAlign: "center" }}>
                <AdUnit slotId="1225553652" style={{ maxWidth: "100%", height: "auto" }} />
              </div>
            </>
          )}
        </div>

        {/* Right side ad — sticky, desktop only */}
        <div className="ad-side-right" style={{ flex: "0 0 160px" }}>
          <div style={{ position: "sticky", top: 24 }}>
            <AdUnit slotId="3173060142" style={{ minHeight: 600 }} />
          </div>
        </div>
      </div>

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
            margin: "0 0 15px 0", letterSpacing: 0.3,
          }}>
            {"\u26A0\uFE0F"} Educational Tool Only. This is not legal advice. Always consult a qualified lawyer for legal matters. Verify all citations with official sources like CanLII.
          </p>
          <p style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10, color: t.textFaint, lineHeight: 1.4,
            margin: 0,
          }}>
            <a href="/about.html" style={{ color: t.textFaint, textDecoration: "none" }}>About</a>
            {" \u00B7 "}
            <a href="/privacy.html" style={{ color: t.textFaint, textDecoration: "none" }}>Privacy Policy</a>
            {" \u00B7 "}
            <a href="/terms.html" style={{ color: t.textFaint, textDecoration: "none" }}>Terms of Service</a>
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
