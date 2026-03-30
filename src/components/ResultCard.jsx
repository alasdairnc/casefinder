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
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: t.accentGreen,
          textDecoration: "none",
          marginTop: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
      >
        {"\u2713"}&thinsp;{label}&thinsp;{"\u2197"}
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
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: t.accentRed,
          textDecoration: "none",
          marginTop: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
      >
        {"\u26A0"}&thinsp;{label}&thinsp;{"\u2197"}
      </a>
    );
  }

  if (status === "unverified") {
    const safeUrl = (isValidUrl(searchUrl) && searchUrl) || (isValidUrl(url) && url);
    if (!safeUrl) return null;
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: t.textTertiary,
          textDecoration: "none",
          marginTop: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
      >
        {"\u2192"}&thinsp;Pre-2000 — verify on CanLII&thinsp;{"\u2197"}
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
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "'Helvetica Neue', sans-serif",
        fontSize: 10,
        letterSpacing: "0.08em",
        color: t.textTertiary,
        textDecoration: "none",
        marginTop: 10,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
    >
      {"\u2192"}&thinsp;Search CanLII&thinsp;{"\u2197"}
    </a>
  );
}

function BookmarkIcon({ filled, color }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16"
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
        borderBottom: `1px solid ${t.borderLight}`,
        padding: "20px 0",
        cursor: clickable ? "pointer" : "default",
      }}
      onMouseEnter={clickable ? (e) => { e.currentTarget.style.opacity = "0.72"; } : undefined}
      onMouseLeave={clickable ? (e) => { e.currentTarget.style.opacity = "1"; } : undefined}
    >
      {/* Citation row */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title / Citation heading */}
          <div style={{
            fontFamily: "'Times New Roman', serif",
            fontSize: "clamp(15px, 2.2vw, 17px)",
            color: t.text,
            fontWeight: 700,
            lineHeight: 1.3,
          }}>
            {item.title || item.citation}
          </div>

          {/* Neutral citation below title when both present */}
          {item.title && item.title !== item.citation && (
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 11,
              color: t.textTertiary,
              marginTop: 2,
            }}>
              {item.citation}
            </div>
          )}

          {/* Court / year / jurisdiction tag — same line below citation */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 4,
            flexWrap: "wrap",
          }}>
            {type === "case_law" && item.court && (
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                color: t.textTertiary,
                letterSpacing: "0.04em",
              }}>
                {item.court}{item.year ? ` \u00B7 ${item.year}` : ""}
              </div>
            )}
            {type === "civil_law" && verification?.jurisdiction && (
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: verification.jurisdiction === "Federal" ? t.accentGreen : t.accent,
              }}>
                {verification.jurisdiction}
              </div>
            )}
          </div>
        </div>

        {/* Bookmark button — right aligned */}
        {addBookmark && removeBookmark && isBookmarked && citationId && (
          <button
            data-testid={bookmarked ? "bookmark-remove" : "bookmark-add"}
            onClick={handleBookmarkClick}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark this citation"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: bookmarked ? t.accent : t.textFaint,
              transition: "color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = t.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = bookmarked ? t.accent : t.textFaint; }}
          >
            <BookmarkIcon filled={bookmarked} color={bookmarked ? t.accent : "currentColor"} />
          </button>
        )}
      </div>

      {/* Summary */}
      {item.summary && (
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 13,
          color: t.textSecondary,
          lineHeight: 1.65,
          marginTop: 10,
        }}>
          {item.summary}
        </div>
      )}

      {/* Why It Matched */}
      {matchedText && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 9,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: t.textFaint,
            marginBottom: 5,
          }}>
            Why it matched
          </div>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 12,
            color: t.textTertiary,
            lineHeight: 1.65,
            borderLeft: `1px solid ${t.border}`,
            paddingLeft: 12,
          }}>
            {matchedText}
          </div>
        </div>
      )}

      {/* Verified Criminal Code enrichment */}
      {type === "criminal_code" && verification?.status === "verified" && verification.title && (
        <div style={{
          marginTop: 10,
          fontFamily: "'Courier New', monospace",
          fontSize: 11,
          color: t.textTertiary,
          lineHeight: 1.5,
        }}>
          <span style={{ color: t.text }}>{verification.title}</span>
          {verification.severity && verification.severity !== "N/A" && (
            <span style={{ color: t.textFaint }}> &middot; {verification.severity}</span>
          )}
          {verification.maxPenalty && verification.maxPenalty !== "N/A" && (
            <span style={{ color: t.textFaint }}> &middot; Max: {verification.maxPenalty}</span>
          )}
        </div>
      )}

      {/* Verification badge */}
      {showCanLII && <VerificationBadge verification={verification} t={t} type={type} />}
    </div>
  );
}
