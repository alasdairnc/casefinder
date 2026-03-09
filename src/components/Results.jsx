import { useTheme } from "../lib/ThemeContext.jsx";
import { useTypewriter } from "../hooks/useTypewriter.js";
import ChargeCard from "./ChargeCard.jsx";
import CaseCard from "./CaseCard.jsx";

export default function Results({ data }) {
  const t = useTheme();
  const analysisText = useTypewriter(data.analysis || "", 10);

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

      {/* Charges */}
      <div style={{ marginTop: 40 }}>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
          letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8,
        }}>
          Likely Charges ({data.charges?.length || 0})
        </div>
        {data.charges?.map((c, i) => <ChargeCard key={i} charge={c} />)}
      </div>

      {/* Cases */}
      <div style={{ marginTop: 40 }}>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
          letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary, marginBottom: 8,
        }}>
          Relevant Case Law ({data.cases?.length || 0})
        </div>
        {data.cases?.map((c, i) => <CaseCard key={i} caseItem={c} />)}
      </div>

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
          Disclaimer — CaseFinder is an educational research tool and does not constitute legal advice.
          Case citations should be verified through CanLII or other official legal databases.
          Always consult a qualified legal professional for legal matters.
        </p>
      </div>
    </section>
  );
}
