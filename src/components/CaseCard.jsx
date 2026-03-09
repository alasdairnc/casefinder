import { useTheme } from "../lib/ThemeContext.jsx";

export default function CaseCard({ caseItem }) {
  const t = useTheme();
  return (
    <div style={{ borderBottom: `1px solid ${t.border}`, padding: "18px 0" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", flexWrap: "wrap", gap: 8,
      }}>
        <div style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: "clamp(15px, 2.3vw, 17px)",
          color: t.text, fontStyle: "italic",
        }}>
          {caseItem.citation}
        </div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.textTertiary, letterSpacing: 1, whiteSpace: "nowrap",
        }}>
          {caseItem.court}
        </div>
      </div>
      <div style={{
        fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
        color: t.textSecondary, lineHeight: 1.6, marginTop: 8,
      }}>
        {caseItem.relevance}
      </div>
      {caseItem.outcome && (
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
          color: t.accentGreen, marginTop: 8, fontWeight: 500,
        }}>
          Outcome: {caseItem.outcome}
        </div>
      )}
    </div>
  );
}
