import { useState } from "react";
import { useTheme } from "../lib/ThemeContext.jsx";
import { getSentencing } from "../lib/sentencingData.js";

const severityColor = (severity, t) => {
  if (severity === "Indictable") return t.accentRed;
  if (severity === "Summary") return t.accentGreen;
  if (severity === "Hybrid") return t.accentOlive;
  return t.textTertiary;
};

export default function SentencingPanel({ section }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const data = getSentencing(section);

  const accentBg = t.bg === "#FAF7F2"
    ? "rgba(212,160,64,0.13)"
    : "rgba(212,160,64,0.18)";

  if (!data) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
            letterSpacing: 1.5, textTransform: "uppercase",
            color: t.textTertiary, display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span>⚖</span>
          <span>Sentencing Info</span>
          <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div style={{
            marginTop: 8, padding: "10px 14px",
            background: accentBg,
            border: `1px solid ${t.borderLight}`,
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 12, color: t.textTertiary, fontStyle: "italic",
          }}>
            Sentencing info not available for this section.
          </div>
        )}
      </div>
    );
  }

  const sColor = severityColor(data.severity, t);

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          letterSpacing: 1.5, textTransform: "uppercase",
          color: t.accent, display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span>⚖</span>
        <span>Sentencing Info</span>
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 8, padding: "12px 16px",
          background: accentBg,
          border: `1px solid ${t.border}`,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
        }}>
          {/* Severity */}
          <div>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 9,
              letterSpacing: 2, textTransform: "uppercase", color: t.textTertiary, marginBottom: 4,
            }}>
              Offence Type
            </div>
            <div style={{
              display: "inline-block",
              fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
              color: sColor, border: `1px solid ${sColor}`,
              padding: "2px 7px",
              fontFamily: "'Helvetica Neue', sans-serif",
            }}>
              {data.severity}
            </div>
          </div>

          {/* Common Range */}
          <div>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 9,
              letterSpacing: 2, textTransform: "uppercase", color: t.textTertiary, marginBottom: 4,
            }}>
              Typical Sentence
            </div>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.text,
            }}>
              {data.commonRange}
            </div>
          </div>

          {/* Min Penalty */}
          <div>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 9,
              letterSpacing: 2, textTransform: "uppercase", color: t.textTertiary, marginBottom: 4,
            }}>
              Minimum
            </div>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary,
            }}>
              {data.minPenalty}
            </div>
          </div>

          {/* Max Penalty */}
          <div>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 9,
              letterSpacing: 2, textTransform: "uppercase", color: t.textTertiary, marginBottom: 4,
            }}>
              Maximum
            </div>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: t.textSecondary,
            }}>
              {data.maxPenalty}
            </div>
          </div>

          {/* Notes — full width */}
          {data.notes && (
            <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 9,
                letterSpacing: 2, textTransform: "uppercase", color: t.textTertiary, marginBottom: 4,
              }}>
                Notes
              </div>
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
                color: t.textSecondary, lineHeight: 1.5,
              }}>
                {data.notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
