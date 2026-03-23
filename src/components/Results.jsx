import { useTheme } from "../lib/ThemeContext.jsx";
import { useTypewriter } from "../hooks/useTypewriter.js";
import ResultCard from "./ResultCard.jsx";
import CaseSummaryModal from "./CaseSummaryModal.jsx";
import { useEffect, useState, useRef, useCallback } from "react";

const PDF_ERROR_RESET_MS = 4000;
const COPY_RESET_MS = 2000;
import { useBookmarks } from "../hooks/useBookmarks.js";

const SECTION_LABELS = {
  criminal_code: "Criminal Code",
  case_law: "Case Law",
  civil_law: "Civil Law",
  charter: "Charter Rights",
};

function buildCitationText(data, verifications = {}) {
  const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const lines = ["CASEDIVE — CITATION EXPORT", dateStr, ""];

  for (const [key, label] of Object.entries(SECTION_LABELS)) {
    const items = data[key];
    if (!Array.isArray(items) || items.length === 0) continue;
    lines.push(label.toUpperCase());
    lines.push("─".repeat(40));
    for (const item of items) {
      const citation = item.citation || item.section || "";
      const summary = item.summary || item.description || "";
      const verified = key === "case_law" && verifications[citation]?.status === "verified";
      lines.push(`${citation}${verified ? " [Verified on CanLII]" : ""}`);
      if (summary) lines.push(`  ${summary}`);
    }
    lines.push("");
  }

  lines.push("─".repeat(40));
  lines.push("Educational tool only — not legal advice. Verify citations at canlii.org");
  return lines.join("\n");
}

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
  const [copyState, setCopyState] = useState("idle"); // idle | copied
  const pdfErrorTimer = useRef(null);
  const copyTimer = useRef(null);

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

  // Cleanup timers on unmount
  useEffect(() => () => { clearTimeout(pdfErrorTimer.current); clearTimeout(copyTimer.current); }, []);

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
          case_law: Array.isArray(data.case_law)
            ? data.case_law.filter((item) => {
                const v = verifications[item.citation];
                return !v || v.status !== "unparseable";
              })
            : data.case_law,
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

  const handleCopyCitations = useCallback(async () => {
    const text = buildCitationText(data, verifications);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyState("idle"), COPY_RESET_MS);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopyState("copied");
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyState("idle"), COPY_RESET_MS);
    }
  }, [data, verifications]);

  const handleExportTxt = useCallback(() => {
    const text = buildCitationText(data, verifications);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "casedive-citations.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [data, verifications]);

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
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (pdfState !== "loading") e.currentTarget.style.color = t.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = pdfState === "error" ? t.accentRed : t.text; }}
        >
          {pdfState === "loading" ? "Generating..." : pdfState === "error" ? "Export failed" : "Export PDF"}
        </button>

        <button
          onClick={handleExportTxt}
          data-testid="export-txt-btn"
          style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            letterSpacing: 3.5,
            textTransform: "uppercase",
            border: `1px solid ${t.border}`,
            background: "transparent",
            color: t.text,
            padding: "8px 16px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = t.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = t.text; }}
        >
          Export .txt
        </button>

        <button
          onClick={handleCopyCitations}
          data-testid="copy-citations-btn"
          style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            letterSpacing: 3.5,
            textTransform: "uppercase",
            border: `1px solid ${t.border}`,
            background: "transparent",
            color: copyState === "copied" ? t.accentGreen : t.text,
            padding: "8px 16px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (copyState !== "copied") e.currentTarget.style.color = t.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = copyState === "copied" ? t.accentGreen : t.text; }}
        >
          {copyState === "copied" ? "Copied" : "Copy Citations"}
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
            const v = verifications[item.citation];
            if (!v) return true; // not yet verified — keep
            return v.status !== "unparseable" && v.status !== "not_found"; // remove unverifiable citations
          });
          const verified = rawItems.filter((item) => verifications[item.citation]?.status === "verified").length;
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
          <span style={{
            display: "inline-block", width: 2, height: 18,
            background: t.text, marginLeft: 2,
            animation: "cfBlink 1s step-end infinite", verticalAlign: "text-bottom",
          }} />
        </div>
      </div>

      {/* CanLII */}
      {data.searchTerms?.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
            letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 12,
          }}>
            Suggested CanLII Searches
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.searchTerms.map((term, i) => (
              <a
                key={i}
                href={`https://www.canlii.org/en/#search/text=${encodeURIComponent(term)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
                  color: t.tagText, background: t.tagBg,
                  padding: "6px 14px", textDecoration: "none",
                  border: `1px solid ${t.border}`, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {term} {"\u2197"}
              </a>
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
          canliiUrl={(() => {
            const v = verifications[selectedCase.citation];
            if (!v) return null;
            if (v.status === "unverified") return v.searchUrl || null;
            return v.url || v.searchUrl || null;
          })()}
          scenario={scenario}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </section>
  );
}
