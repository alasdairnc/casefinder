import { useTheme } from "../lib/ThemeContext.jsx";
import { useTypewriter } from "../hooks/useTypewriter.js";
import ResultCard from "./ResultCard.jsx";
import CaseSummaryModal from "./CaseSummaryModal.jsx";
import SuggestionLink from "./SuggestionLink.jsx";
import { useEffect, useState, useRef, useCallback } from "react";

// Newspaper-style section break: large label + full hairline rule
function SectionBreak({ label, count, t }) {
  return (
    <div style={{ marginBottom: 24, marginTop: 56 }}>
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 9,
            letterSpacing: "0.44em",
            textTransform: "uppercase",
            color: t.textTertiary,
          }}>
            {label}
          </div>
          {count != null && (
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: t.textFaint,
            }}>
              {count}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PDF_ERROR_RESET_MS = 4000;

const CASE_LAW_EMPTY_SOURCES = new Set([
  "retrieval",
  "hybrid",
  "hybrid_reranked",
  "retrieval_ranked",
  "retrieval_error",
  "ai_fallback",
]);

const SECTIONS = [
  { key: "criminal_code", label: "Criminal Code" },
  { key: "case_law", label: "Case Law" },
  { key: "civil_law", label: "Civil Law" },
  { key: "charter", label: "Charter Rights" },
];

export default function Results({ data, scenario, addBookmark, removeBookmark, isBookmarked }) {
  const t = useTheme();
  const analysisText = useTypewriter(data.analysis || "", 10);
  const [verifications, setVerifications] = useState({});
  const [verifyingCitations, setVerifyingCitations] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [pdfState, setPdfState] = useState("idle");
  const pdfErrorTimer = useRef(null);
  const caseLawMeta = data?.meta?.case_law;
  const showCaseLawEmptyState =
    CASE_LAW_EMPTY_SOURCES.has(caseLawMeta?.source) &&
    caseLawMeta?.reason !== "filter_disabled" &&
    (!Array.isArray(data.case_law) || data.case_law.length === 0);

  const caseLawEmptyMessage =
    caseLawMeta?.reason?.startsWith("retrieval_error")
      ? "Case law retrieval is temporarily unavailable. Please try again in a moment."
      : caseLawMeta?.reason === "missing_api_key"
        ? "Case law retrieval is unavailable (CanLII not configured)."
        : caseLawMeta?.reason === "no_terms_or_databases"
          ? "No search terms could be formed from this scenario."
          : "No verified Supreme Court or Appellate cases perfectly matched this scenario.";

  const canliiSearchUrl = scenario
    ? `https://www.canlii.org/en/#search/text=${encodeURIComponent(scenario.slice(0, 200))}`
    : null;

  const retrievalStats = caseLawMeta?.retrieval;
  const showRetrievalStats =
    retrievalStats &&
    (retrievalStats.searchCalls > 0 || retrievalStats.candidateCount > 0);

  useEffect(() => {
    if (!data || verifyingCitations) return;
    const citationSet = new Set();
    const sections = ["criminal_code", "case_law", "civil_law", "charter"];
    for (const section of sections) {
      const items = data[section];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (item.citation && !citationSet.has(item.citation)) {
          citationSet.add(item.citation);
          if (citationSet.size >= 20) break;
        }
      }
      if (citationSet.size >= 20) break;
    }
    if (citationSet.size === 0) return;
    setVerifyingCitations(true);
    fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ citations: Array.from(citationSet).slice(0, 10) }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json && typeof json === "object" && !Array.isArray(json)) {
          setVerifications(json);
        }
      })
      .catch(() => {})
      .finally(() => setVerifyingCitations(false));
  }, [data]);

  const isOldFormat = data.charges && !data.criminal_code;
  useEffect(() => () => clearTimeout(pdfErrorTimer.current), []);

  const handleExportPdf = useCallback(async () => {
    if (pdfState === "loading") return;
    clearTimeout(pdfErrorTimer.current);
    setPdfState("loading");
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          summary: data.summary,
          criminal_code: data.criminal_code,
          case_law: data.case_law,
          civil_law: data.civil_law,
          charter: data.charter,
          analysis: data.analysis,
          verifications,
        }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "casedive-analysis.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setPdfState("idle");
    } catch {
      setPdfState("error");
      pdfErrorTimer.current = setTimeout(() => setPdfState("idle"), PDF_ERROR_RESET_MS);
    }
  }, [pdfState, data, verifications]);

  return (
    <section data-testid="results-section" style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 80px" }}>

      {/* Summary — first section, top rule built in */}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10, marginTop: 40 }}>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 9,
          letterSpacing: "0.44em",
          textTransform: "uppercase",
          color: t.textTertiary,
          marginBottom: 18,
        }}>
          Scenario Summary
        </div>
        <p style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: "clamp(17px, 2.5vw, 20px)",
          color: t.text,
          lineHeight: 1.65,
          margin: 0,
          fontStyle: "italic",
        }}>
          {data.summary}
        </p>
      </div>

      {/* Export PDF */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={handleExportPdf}
          data-testid="export-pdf-btn"
          disabled={pdfState === "loading"}
          style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            border: "none",
            background: "none",
            color: pdfState === "error" ? t.accentRed : t.textFaint,
            padding: 0,
            cursor: pdfState === "loading" ? "default" : "pointer",
            opacity: pdfState === "loading" ? 0.5 : 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { if (pdfState !== "loading") e.currentTarget.style.color = t.textSecondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = pdfState === "error" ? t.accentRed : t.textFaint; }}
        >
          {pdfState === "loading" ? "Generating\u2026" : pdfState === "error" ? "Export failed" : "\u2193 Export PDF"}
        </button>
      </div>

      {/* Old format notice */}
      {isOldFormat && (
        <div style={{
          marginTop: 32,
          borderLeft: `3px solid ${t.border}`,
          paddingLeft: 16,
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 13,
          color: t.textSecondary,
          lineHeight: 1.5,
        }}>
          This result uses an older format. Re-run your search to see grouped results by law type.
        </div>
      )}

      {/* Grouped result sections */}
      {!isOldFormat && SECTIONS.map(({ key, label }) => {
        const rawItems = data[key];
        if (!rawItems?.length) return null;

        let items = rawItems;
        let verificationBanner = null;

        if (key === "case_law" && Object.keys(verifications).length > 0) {
          items = rawItems.filter((item) => {
            if (item.verificationStatus === "verified") return true;
            const v = verifications[item.citation];
            if (!v) return true;
            if (v.status === "not_found" || v.status === "unparseable" || v.status === "unknown_court" || v.status === "error")
              return false;
            return v.status === "verified" || v.status === "unverified";
          });
          const verified = rawItems.filter(
            (item) =>
              item.verificationStatus === "verified" || verifications[item.citation]?.status === "verified"
          ).length;
          const removed = rawItems.length - items.length;
          if (removed > 0) {
            verificationBanner = (
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                color: t.textTertiary,
                marginBottom: 16,
                letterSpacing: "0.02em",
              }}>
                {verified} of {rawItems.length} verified — {removed} unconfirmed removed
              </div>
            );
          } else if (verified === rawItems.length && verified > 0) {
            verificationBanner = (
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                color: t.accentGreen,
                marginBottom: 16,
              }}>
                {verified} of {verified} citation{verified !== 1 ? "s" : ""} verified on CanLII
              </div>
            );
          }
        }

        if (!items.length) {
          if (key === "case_law" && rawItems.length > 0) {
            return (
              <div key={key}>
                <SectionBreak label={label} t={t} />
                <div style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 12,
                  color: t.textTertiary,
                  lineHeight: 1.5,
                }}>
                  No case law citations could be verified.
                </div>
              </div>
            );
          }
          return null;
        }

        if (key === "civil_law") {
          const groups = {};
          items.forEach(item => {
            const v = verifications[item.citation];
            const groupName = v?.jurisdiction
              ? (v.jurisdiction === "Federal" ? "Federal Statutes" : `${v.jurisdiction} Statutes`)
              : "Civil Law";
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(item);
          });

          return (
            <div key={key}>
              {Object.entries(groups).map(([groupName, groupItems], idx) => (
                <div key={`${key}-${idx}`}>
                  <SectionBreak label={groupName} count={groupItems.length} t={t} />
                  {idx === 0 && verificationBanner}
                  {groupItems.map((item, i) => (
                    <ResultCard
                      key={i}
                      item={item}
                      type={key}
                      verification={verifications[item.citation]}
                      addBookmark={addBookmark}
                      removeBookmark={removeBookmark}
                      isBookmarked={isBookmarked}
                    />
                  ))}
                </div>
              ))}
            </div>
          );
        }

        return (
          <div key={key}>
            <SectionBreak label={label} count={items.length} t={t} />
            {verificationBanner}
            {items.map((item, i) => (
              <ResultCard
                key={i}
                item={item}
                type={key}
                verification={verifications[item.citation]}
                onCardClick={key === "case_law" ? setSelectedCase : undefined}
                addBookmark={addBookmark}
                removeBookmark={removeBookmark}
                isBookmarked={isBookmarked}
              />
            ))}
          </div>
        );
      })}

      {/* Case law empty state */}
      {showCaseLawEmptyState && (
        <div>
          <SectionBreak label="Case Law" t={t} />
          <div style={{
            borderLeft: `2px solid ${t.accent}`,
            paddingLeft: 18,
          }}>
            <div style={{
              fontFamily: "'Times New Roman', serif",
              fontSize: "clamp(14px, 2vw, 16px)",
              color: t.textSecondary,
              lineHeight: 1.6,
              fontStyle: "italic",
            }}>
              {caseLawEmptyMessage}
            </div>

            {(caseLawMeta?.reason === "no_verified" || caseLawMeta?.reason === "no_terms_or_databases" || !caseLawMeta?.reason) && (
              <ul style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 12,
                color: t.textTertiary,
                lineHeight: 1.8,
                margin: "12px 0 0",
                paddingLeft: 16,
              }}>
                <li>Specify the offence type (e.g. &quot;assault causing bodily harm&quot;)</li>
                <li>Include a jurisdiction (e.g. &quot;in Ontario&quot;)</li>
                <li>Mention a specific legal issue (e.g. &quot;Charter s. 8 search&quot;)</li>
              </ul>
            )}

            {canliiSearchUrl && (
              <a
                href={canliiSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: t.accent,
                  textDecoration: "none",
                  marginTop: 14,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
              >
                Search CanLII manually {"\u2197"}
              </a>
            )}

            {showRetrievalStats && (
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 10,
                color: t.textFaint,
                marginTop: 10,
                letterSpacing: "0.04em",
              }}>
                {retrievalStats.searchCalls} database{retrievalStats.searchCalls !== 1 ? "s" : ""} searched
                {" · "}
                {retrievalStats.candidateCount} candidate{retrievalStats.candidateCount !== 1 ? "s" : ""} evaluated
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legal Analysis */}
      <div>
        <SectionBreak label="Legal Analysis" t={t} />
        <div style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: "clamp(15px, 2.3vw, 17px)",
          color: t.text,
          lineHeight: 1.85,
          borderLeft: `2px solid ${t.accent}`,
          paddingLeft: 20,
        }}>
          {analysisText}
        </div>
      </div>

      {/* Suggested Links */}
      {data.suggestions?.length > 0 && (
        <div>
          <SectionBreak label="Suggested Links" t={t} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.suggestions.map((suggestion, i) => (
              <SuggestionLink key={i} suggestion={suggestion} />
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 56, borderTop: `1px solid ${t.borderLight}`, paddingTop: 16 }}>
        <p style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 11,
          color: t.textFaint,
          lineHeight: 1.65,
          margin: 0,
          letterSpacing: "0.02em",
        }}>
          CaseDive is an educational research tool and does not constitute legal advice.
          Case citations should be verified through CanLII or official legal databases.
          Always consult a qualified legal professional.
        </p>
      </div>

      {selectedCase && (
        <CaseSummaryModal
          item={selectedCase}
          canliiUrl={selectedCase.url_canlii || verifications[selectedCase.citation]?.url || verifications[selectedCase.citation]?.searchUrl || null}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </section>
  );
}
