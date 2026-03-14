import { useTheme } from "../lib/ThemeContext.jsx";

function VerificationBadge({ verification, t }) {
  if (!verification) return null;

  const { status, url, searchUrl } = verification;

  if (status === "verified") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.accentGreen, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u2713"} Verified on CanLII {"\u2197"}
      </a>
    );
  }

  if (status === "not_found") {
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.accentRed, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u26A0"} Not found {"\u2014"} search CanLII {"\u2197"}
      </a>
    );
  }

  const href = url || searchUrl;
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
        color: t.textTertiary, textDecoration: "none", marginTop: 8,
        letterSpacing: 0.5,
      }}
    >
      {"\u2192"} Search CanLII {"\u2197"}
    </a>
  );
}

export default function ResultCard({ item, type, verification, onCardClick }) {
  const t = useTheme();
  const matchedText = item.matched_section || item.matched_content;
  const showCanLII = type === "case_law" || type === "criminal_code";
  const clickable = type === "case_law" && typeof onCardClick === "function";

  return (
    <div
      onClick={clickable ? () => onCardClick(item) : undefined}
      style={{
        borderBottom: `1px solid ${t.border}`,
        padding: "18px 0",
        cursor: clickable ? "pointer" : "default",
        transition: clickable ? "opacity 0.15s" : undefined,
      }}
      onMouseEnter={clickable ? (e) => { e.currentTarget.style.opacity = "0.75"; } : undefined}
      onMouseLeave={clickable ? (e) => { e.currentTarget.style.opacity = "1"; } : undefined}
    >
      {/* Citation + court/year */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", flexWrap: "wrap", gap: 8,
      }}>
        <div style={{
          fontFamily: "'Times New Roman', serif",
          fontSize: "clamp(15px, 2.3vw, 17px)",
          color: t.text, fontWeight: "bold",
        }}>
          {item.citation}
        </div>
        {type === "case_law" && item.court && (
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
            color: t.textTertiary, letterSpacing: 1, whiteSpace: "nowrap",
          }}>
            {item.court}{item.year ? ` · ${item.year}` : ""}
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{
        fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
        color: t.textSecondary, lineHeight: 1.6, marginTop: 8,
      }}>
        {item.summary}
      </div>

      {/* Why It Matched */}
      {matchedText && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
            letterSpacing: 2, textTransform: "uppercase",
            color: t.textTertiary, marginBottom: 4,
          }}>
            Why It Matched
          </div>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
            color: t.textSecondary, lineHeight: 1.6,
            borderLeft: `2px solid ${t.borderLight}`, paddingLeft: 12,
          }}>
            {matchedText}
          </div>
        </div>
      )}

      {/* Verification badge (case_law + criminal_code only) */}
      {showCanLII && <VerificationBadge verification={verification} t={t} />}
    </div>
  );
}
