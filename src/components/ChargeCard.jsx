import { useState } from "react";
import { useTheme } from "../lib/ThemeContext.jsx";
import SentencingPanel from "./SentencingPanel.jsx";
import RelatedCharges from "./RelatedCharges.jsx";

export default function ChargeCard({ charge }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);

  const severityColor = {
    "Indictable": t.accentRed,
    "Summary": t.accentGreen,
    "Hybrid": t.accentOlive,
  };

  return (
    <div style={{
      borderBottom: `1px solid ${t.border}`, padding: "22px 0",
      display: "grid", gridTemplateColumns: "minmax(80px, 100px) 1fr", gap: "12px 20px",
      ...(expanded ? { background: t.bgAlt, margin: "0 -16px", padding: "22px 16px" } : {}),
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
        {/* Title row with expand toggle */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{
            fontFamily: "'Times New Roman', serif",
            fontSize: "clamp(16px, 2.5vw, 19px)",
            marginBottom: 6, color: t.text, lineHeight: 1.3, flex: 1,
          }}>
            {charge.title}
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            title={expanded ? "Collapse" : "Expand for sentencing & related charges"}
            style={{
              flexShrink: 0,
              background: "none",
              border: `1px solid ${t.border}`,
              cursor: "pointer",
              width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 16, color: t.textTertiary,
              lineHeight: 1, marginTop: 2,
            }}
          >
            {expanded ? "−" : "+"}
          </button>
        </div>

        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
          color: t.textSecondary, lineHeight: 1.6,
        }}>
          {charge.description}
        </div>

        {charge.maxPenalty && !expanded && (
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
            color: t.textTertiary, marginTop: 8, letterSpacing: 0.3,
          }}>
            Maximum Penalty: {charge.maxPenalty}
          </div>
        )}

        {/* Expanded: Sentencing + Related Charges */}
        {expanded && (
          <div style={{ marginTop: 4 }}>
            <SentencingPanel section={charge.section} />
            <RelatedCharges section={charge.section} />
          </div>
        )}
      </div>
    </div>
  );
}
