import { useTheme } from "../lib/ThemeContext.jsx";
import { isValidUrl } from "../lib/validateUrl.js";

function VerificationBadge({ verification, t, type }) {
  if (!verification) return null;

  const { status, url, searchUrl } = verification;

  if (status === "verified") {
    const safeUrl = isValidUrl(url) ? url : null;
    if (!safeUrl) return null;
    const label = type === "criminal_code" ? "Confirmed — Justice Laws" : "Verified on CanLII";
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.accentGreen, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u2713"} {label} {"\u2197"}
      </a>
    );
  }

  if (status === "not_found") {
    const safeSearchUrl = isValidUrl(searchUrl) ? searchUrl : null;
    if (!safeSearchUrl) return null;
    const label = type === "criminal_code"
      ? "Section not confirmed — check Justice Laws"
      : "Not found — search CanLII";
    return (
      <a
        href={safeSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.accentRed, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u26A0"} {label} {"\u2197"}
      </a>
    );
  }

  if (status === "unverified") {
    const safeUrl = (isValidUrl(url) && url) || (isValidUrl(searchUrl) && searchUrl);
    if (!safeUrl) return null;
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: t.textTertiary, textDecoration: "none", marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {"\u2192"} Pre-2000 cases aren{"'"}t always indexed — verify on CanLII {"\u2197"}
      </a>
    );
  }

  const href = (isValidUrl(url) && url) || (isValidUrl(searchUrl) && searchUrl);
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

function BookmarkIcon({ filled, color }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth="1.5"
      style={{ display: "block" }}
    >
      <path d="M3 2h10v12l-5-3-5 3V2z" />
    </svg>
  );
}

export default function ResultCard({ item, type, verification, onCardClick, addBookmark, removeBookmark, isBookmarked }) {
  const t = useTheme();
  const matchedText = item.matched_section || item.matched_content;
  const showCanLII = type === "case_law" || type === "criminal_code";
  const clickable = type === "case_law" && typeof onCardClick === "function";
  const citationId = item.citation || item.section || "";
  const bookmarked = isBookmarked ? isBookmarked(citationId) : false;

  function handleBookmarkClick(e) {
    e.stopPropagation();
    if (!citationId) return;
    if (bookmarked) {
      removeBookmark(citationId);
    } else {
      addBookmark(item, type, verification);
    }
  }

  return (
    <div
      onClick={clickable ? () => onCardClick(item) : undefined}
      style={{
        borderBottom: `1px solid ${t.border}`,
        padding: "18px 0",
        cursor: clickable ? "pointer" : "default",
        transition: clickable ? "opacity 0.15s" : undefined,
        position: "relative",
      }}
      onMouseEnter={clickable ? (e) => { e.currentTarget.style.opacity = "0.75"; } : undefined}
      onMouseLeave={clickable ? (e) => { e.currentTarget.style.opacity = "1"; } : undefined}
    >
      {/* Citation + court/year + bookmark */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {type === "case_law" && item.court && (
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
              color: t.textTertiary, letterSpacing: 1, whiteSpace: "nowrap",
            }}>
              {item.court}{item.year ? ` · ${item.year}` : ""}
            </div>
          )}
          {addBookmark && removeBookmark && isBookmarked && citationId && (
            <button
              data-testid={bookmarked ? "bookmark-remove" : "bookmark-add"}
              onClick={handleBookmarkClick}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark this citation"}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "4px",
                minWidth: 36, minHeight: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: bookmarked ? t.accent : t.textTertiary,
                transition: "color 0.15s",
              }}
            >
              <BookmarkIcon filled={bookmarked} color={bookmarked ? t.accent : t.textTertiary} />
            </button>
          )}
        </div>
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

      {/* Ground truth enrichment for verified Criminal Code sections */}
      {type === "criminal_code" && verification?.status === "verified" && verification.title && (
        <div style={{
          marginTop: 8, padding: "8px 12px",
          background: t.bgAlt, border: `1px solid ${t.borderLight}`,
          fontFamily: "'Courier New', monospace", fontSize: 12,
          color: t.textSecondary, lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 700, color: t.text }}>{verification.title}</span>
          {verification.severity && verification.severity !== "N/A" && (
            <span> · {verification.severity}</span>
          )}
          {verification.maxPenalty && verification.maxPenalty !== "N/A" && (
            <span> · Max: {verification.maxPenalty}</span>
          )}
        </div>
      )}

      {/* Verification badge (case_law + criminal_code only) */}
      {showCanLII && <VerificationBadge verification={verification} t={t} type={type} />}
    </div>
  );
}
