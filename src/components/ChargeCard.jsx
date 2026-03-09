import { useTheme } from "../lib/ThemeContext.jsx";

export default function ChargeCard({ charge }) {
  const t = useTheme();
  const severityColor = {
    "Indictable": t.accentRed,
    "Summary": t.accentGreen,
    "Hybrid": t.accentOlive,
  };

  return (
    <div style={{
      borderBottom: `1px solid ${t.border}`, padding: "22px 0",
      display: "grid", gridTemplateColumns: "minmax(80px, 100px) 1fr", gap: "12px 20px",
    }}>
      <div>
        <div style={{
          fontFamily: "'Courier New', monospace", fontSize: 14,
          color: t.accentRed, fontWeight: 700, lineHeight: 1.4,
        }}>
          {charge.section}
        </div>
        <div style={{
          marginTop: 8, display: "inline-block",
          fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase",
          color: severityColor[charge.severity] || t.textTertiary,
          border: `1px solid ${severityColor[charge.severity] || t.border}`,
          padding: "3px 8px",
          fontFamily: "'Helvetica Neue', sans-serif",
        }}>
          {charge.severity}
        </div>
      </div>
      <div>
        <div style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: "clamp(16px, 2.5vw, 19px)",
          marginBottom: 6, color: t.text, lineHeight: 1.3,
        }}>
          {charge.title}
        </div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
          color: t.textSecondary, lineHeight: 1.6,
        }}>
          {charge.description}
        </div>
        {charge.maxPenalty && (
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
            color: t.textTertiary, marginTop: 8, letterSpacing: 0.3,
          }}>
            Maximum Penalty: {charge.maxPenalty}
          </div>
        )}
      </div>
    </div>
  );
}
