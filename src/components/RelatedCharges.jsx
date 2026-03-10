import { useState } from "react";
import { useTheme } from "../lib/ThemeContext.jsx";
import { getRelatedCharges } from "../lib/chargeRelations.js";

const typeLabel = { harsher: "↑ Harsher", simpler: "↓ Simpler", variant: "⟷ Variant" };
const typeColor = (relationType, t) => {
  if (relationType === "harsher") return t.accentRed;
  if (relationType === "simpler") return t.accentGreen;
  return t.accentOlive;
};

export default function RelatedCharges({ section }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const data = getRelatedCharges(section);

  if (!data || !data.related?.length) return null;

  const count = data.related.length;

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          letterSpacing: 1.5, textTransform: "uppercase",
          color: t.textSecondary, display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span>Related Charges</span>
        <span style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
          color: t.tagText, background: t.tagBg,
          padding: "1px 7px", border: `1px solid ${t.border}`,
        }}>
          {count}
        </span>
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 8,
        }}>
          {data.related.map((rel, i) => {
            const color = typeColor(rel.relationType, t);
            return (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  border: `1px solid ${t.borderLight}`,
                  background: t.bgAlt,
                  position: "relative",
                }}
              >
                <div style={{
                  fontFamily: "'Courier New', monospace", fontSize: 11,
                  color: t.accentRed, fontWeight: 700, marginBottom: 4,
                }}>
                  {rel.section}
                </div>
                <div style={{
                  fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
                  color: t.text, lineHeight: 1.4, marginBottom: 6,
                }}>
                  {rel.title}
                </div>
                <div style={{
                  fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
                  letterSpacing: 0.5, color, fontWeight: 600,
                }}>
                  {typeLabel[rel.relationType] || rel.relationType}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
