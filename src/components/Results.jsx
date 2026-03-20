import { useTheme } from "../lib/ThemeContext.jsx";
import { useTypewriter } from "../hooks/useTypewriter.js";
import ResultCard from "./ResultCard.jsx";
import CaseSummaryModal from "./CaseSummaryModal.jsx";
import { useEffect, useState } from "react";

const SECTIONS = [
  { key: "criminal_code", label: "Criminal Code" },
  { key: "case_law", label: "Case Law" },
  { key: "civil_law", label: "Civil Law" },
  { key: "charter", label: "Charter Rights" },
];

export default function Results({ data, scenario }) {
  const t = useTheme();
  const analysisText = useTypewriter(data.analysis || "", 10);
  const [verifications, setVerifications] = useState({});
  const [verifyingCitations, setVerifyingCitations] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);

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

  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 60px" }}>
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
        const items = data[key];
        if (!items?.length) return null;
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
            {items.map((item, i) => (
              <ResultCard
                key={i}
                item={item}
                type={key}
                verification={verifications[item.citation]}
                onCardClick={key === "case_law" ? setSelectedCase : undefined}
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
          canliiUrl={verifications[selectedCase.citation]?.url || verifications[selectedCase.citation]?.searchUrl || null}
          scenario={scenario}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </section>
  );
}
