import { useTheme } from "../lib/ThemeContext.jsx";
import { useTypewriter } from "../hooks/useTypewriter.js";
import ResultCard from "./ResultCard.jsx";
import CaseSummaryModal from "./CaseSummaryModal.jsx";
import SuggestionLink from "./SuggestionLink.jsx";
import { useEffect, useState, useRef, useCallback } from "react";

const PDF_ERROR_RESET_MS = 4000;

/** Sources where an empty `case_law` array should still show the Case Law section (must stay in sync with `api/analyze.js`). */
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
  const [pdfState, setPdfState] = useState("idle"); // idle | loading | error
  const pdfErrorTimer = useRef(null);
  const caseLawMeta = data?.meta?.case_law;
  const showCaseLawEmptyState =
    CASE_LAW_EMPTY_SOURCES.has(caseLawMeta?.source) &&
    caseLawMeta?.reason !== "filter_disabled" &&
    (!Array.isArray(data.case_law) || data.case_law.length === 0);

  const caseLawEmptyMessage =
    caseLawMeta?.reason === "retrieval_error"
      ? "Case law could not be retrieved right now. Try again in a moment."
      : caseLawMeta?.reason === "missing_api_key"
        ? "Case law retrieval is unavailable (CanLII not configured)."
        : caseLawMeta?.reason === "no_terms_or_databases"
          ? "No search terms could be formed for case law. Try rephrasing with more legal detail."
          : "No verified case law was found for this scenario.";

  // Extract and verify citations on mount
  useEffect(() => {
    if (!data || verifyingCitations) return;

    const citationSet = new Set();
    const sections = ["criminal_code", "case_law", "civil_law", "charter"];
    
    // Extract all unique citations (max 20 per API limit)
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
        // /api/verify returns a flat map: { citation: { status, url, searchUrl, title } }
        if (json && typeof json === "object" && !Array.isArray(json)) {
          setVerifications(json);
        }
      })
      .catch((err) => {
        console.error("Citation verification failed:", err);
        // Silently fail — verification is non-blocking
      })
      .finally(() => setVerifyingCitations(false));
  }, [data]);

  // Old-format detection: data has charges/cases but not the new grouped keys
  const isOldFormat = data.charges && !data.criminal_code;

  // Cleanup timer on unmount
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

      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

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
    <section data-testid="results-section" style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 60px" }}>
      {/* Summary */}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 28, marginBottom: 8 }}>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
          letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 14,
        }}>
          Scenario Summary
        </div>
        <p style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: "clamp(16px, 2.5vw, 18px)",
          color: t.text, lineHeight: 1.6, margin: 0,
        }}>
          {data.summary}
        </p>
      </div>

      {/* Export PDF */}
      <div style={{ marginTop: 20, marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={handleExportPdf}
          data-testid="export-pdf-btn"
          disabled={pdfState === "loading"}
          style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            letterSpacing: 3.5,
            textTransform: "uppercase",
            border: `1px solid ${t.border}`,
            background: "transparent",
            color: pdfState === "error" ? t.accentRed : t.text,
            padding: "8px 16px",
            cursor: pdfState === "loading" ? "default" : "pointer",
            opacity: pdfState === "loading" ? 0.6 : 1,
            pointerEvents: pdfState === "loading" ? "none" : "auto",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (pdfState !== "loading") e.currentTarget.style.color = t.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = pdfState === "error" ? t.accentRed : t.text; }}
        >
          {pdfState === "loading" ? "Generating..." : pdfState === "error" ? "Export failed" : "Export PDF"}
        </button>
      </div>

      {/* Old format notice */}
      {isOldFormat && (
        <div style={{
          marginTop: 24, padding: "14px 18px",
          border: `1px solid ${t.border}`, background: t.bgAlt,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
          color: t.textSecondary, lineHeight: 1.5,
        }}>
          This result uses an older format. Re-run your search to see grouped results by law type.
        </div>
      )}

      {/* Grouped result sections */}
      {!isOldFormat && SECTIONS.map(({ key, label }) => {
        const rawItems = data[key];
        if (!rawItems?.length) return null;

        // For case_law, filter out hallucinated/unverifiable citations once verification completes
        let items = rawItems;
        let verificationBanner = null;
        if (key === "case_law" && Object.keys(verifications).length > 0) {
          items = rawItems.filter((item) => {
            if (item.verificationStatus === "verified") return true;
            const v = verifications[item.citation];
            if (!v) return true; // not yet verified — keep
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
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
                color: t.accent, marginBottom: 10, lineHeight: 1.5,
              }}>
                {verified} of {rawItems.length} citation{rawItems.length !== 1 ? "s" : ""} verified — {removed} unconfirmed removed
              </div>
            );
          } else if (verified === rawItems.length && verified > 0) {
            verificationBanner = (
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
                color: t.accentGreen, marginBottom: 10, lineHeight: 1.5,
              }}>
                {verified} of {verified} citation{verified !== 1 ? "s" : ""} verified on CanLII
              </div>
            );
          }
        }

        if (!items.length) {
          // All case_law items were filtered out
          if (key === "case_law" && rawItems.length > 0) {
            return (
              <div key={key} style={{ marginTop: 40 }}>
                <div style={{
                  fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
                  letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8,
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
                  color: t.textTertiary, lineHeight: 1.5,
                }}>
                  No case law citations could be verified
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
             const groupName = v?.jurisdiction ? (v.jurisdiction === "Federal" ? "Federal Statutes" : `${v.jurisdiction} Statutes`) : "Civil Law";
             if (!groups[groupName]) groups[groupName] = [];
             groups[groupName].push(item);
          });
          
          return (
             <div key={key} style={{ marginTop: 40 }}>
                {Object.entries(groups).map(([groupName, groupItems], idx) => (
                   <div key={`${key}-${idx}`} style={{ marginBottom: idx < Object.keys(groups).length - 1 ? 24 : 0 }}>
                      <div style={{
                        fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
                        letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8,
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        {groupName}
                        <span style={{
                          fontSize: 10, color: t.tagText, background: t.tagBg,
                          padding: "1px 6px", border: `1px solid ${t.border}`,
                          fontWeight: 700,
                        }}>
                          {groupItems.length}
                        </span>
                      </div>
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
          <div key={key} style={{ marginTop: 40 }}>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
              letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              {label}
              <span style={{
                fontSize: 10, color: t.tagText, background: t.tagBg,
                padding: "1px 6px", border: `1px solid ${t.border}`,
                fontWeight: 700,
              }}>
                {items.length}
              </span>
            </div>
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

      {showCaseLawEmptyState && (
        <div style={{ marginTop: 40 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
            letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8,
          }}>
            Case Law
          </div>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
            color: t.textTertiary, lineHeight: 1.5,
          }}>
            {caseLawEmptyMessage}
          </div>
        </div>
      )}

      {/* Analysis */}
      <div style={{ marginTop: 40 }}>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
          letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 14,
        }}>
          Legal Analysis
        </div>
        <div style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: "clamp(15px, 2.3vw, 17px)",
          color: t.text, lineHeight: 1.8,
          borderLeft: `2px solid ${t.accent}`, paddingLeft: 24,
        }}>
          {analysisText}
        </div>
      </div>

      {/* Suggested Links */}
      {data.suggestions?.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
            letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 12,
          }}>
            Suggested Links
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.suggestions.map((suggestion, i) => (
              <SuggestionLink key={i} suggestion={suggestion} />
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${t.borderLight}` }}>
        <p style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 11, color: t.textFaint, lineHeight: 1.6, margin: 0,
        }}>
          Disclaimer — CaseDive is an educational research tool and does not constitute legal advice.
          Case citations should be verified through CanLII or other official legal databases.
          Always consult a qualified legal professional for legal matters.
        </p>
      </div>

      {/* Case summary modal */}
      {selectedCase && (
        <CaseSummaryModal
          item={selectedCase}
          canliiUrl={verifications[selectedCase.citation]?.url || verifications[selectedCase.citation]?.searchUrl || null}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </section>
  );
}
