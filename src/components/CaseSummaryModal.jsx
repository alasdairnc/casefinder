import { useEffect, useState } from "react";
import { useTheme } from "../lib/ThemeContext.jsx";

function Skeleton({ width = "100%", height = 14, style = {} }) {
  const t = useTheme();
  return (
    <div
      style={{
        width,
        height,
        background: t.borderLight,
        borderRadius: 3,
        opacity: 0.6,
        animation: "cfBlink 1.2s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

function SummarySection({ label, children, t, isQuote = false }) {
  if (!children) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 10,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: t.textTertiary,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {isQuote ? (
        <blockquote
          style={{
            margin: 0,
            paddingLeft: 14,
            borderLeft: `3px solid ${t.accent}`,
            fontFamily: "'Times New Roman', serif",
            fontSize: "clamp(14px, 2.1vw, 15px)",
            color: t.textSecondary,
            lineHeight: 1.7,
            fontStyle: "italic",
          }}
        >
          {children}
        </blockquote>
      ) : (
        <div
          style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 13,
            color: t.textSecondary,
            lineHeight: 1.65,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton({ t }) {
  return (
    <div>
      {[80, 100, 60, 90, 70].map((w, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <Skeleton width={50} height={10} style={{ marginBottom: 8 }} />
          <Skeleton width={`${w}%`} height={13} style={{ marginBottom: 5 }} />
          <Skeleton width={`${Math.min(w + 10, 100)}%`} height={13} />
        </div>
      ))}
    </div>
  );
}

export default function CaseSummaryModal({ item, canliiUrl, scenario, onClose }) {
  const t = useTheme();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch summary
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSummary(null);

    fetch("/api/case-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citation: item.citation,
        title: item.title,
        court: item.court,
        year: item.year,
        summary: item.summary,
        matchedContent: item.matched_section || item.matched_content,
        scenario,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load summary. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [item.citation]);

  const viewUrl = canliiUrl || null;

  // Mobile: full-width bottom sheet; desktop: centered card
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : "24px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.bg,
          border: `1px solid ${t.border}`,
          width: "100%",
          maxWidth: isMobile ? "100%" : 640,
          maxHeight: isMobile ? "88vh" : "82vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: isMobile ? "12px 12px 0 0" : 4,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Times New Roman', serif",
                fontSize: "clamp(14px, 2.2vw, 16px)",
                color: t.text,
                fontWeight: "bold",
                lineHeight: 1.4,
              }}
            >
              {item.citation}
            </div>
            {(item.court || item.year) && (
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11,
                  color: t.textTertiary,
                  letterSpacing: 0.8,
                  marginTop: 4,
                }}
              >
                {[item.court, item.year].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.textTertiary,
              fontSize: 20,
              lineHeight: 1,
              padding: "2px 4px",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 20px 4px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {loading && <LoadingSkeleton t={t} />}
          {error && (
            <div
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 13,
                color: t.accentRed || "#c0392b",
                padding: "12px 0",
              }}
            >
              {error}
            </div>
          )}
          {summary && !loading && (
            <>
              <SummarySection label="Facts" t={t}>{summary.facts}</SummarySection>
              <SummarySection label="Held" t={t}>{summary.held}</SummarySection>
              <SummarySection label="Ratio Decidendi" t={t}>{summary.ratio}</SummarySection>
              {summary.keyQuote && (
                <SummarySection label="Key Quote" t={t} isQuote>{summary.keyQuote}</SummarySection>
              )}
              <SummarySection label="Significance" t={t}>{summary.significance}</SummarySection>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: `1px solid ${t.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {viewUrl ? (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 12,
                color: t.accentGreen,
                textDecoration: "none",
                letterSpacing: 0.5,
              }}
            >
              View on CanLII ↗
            </a>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 12,
              color: t.textSecondary,
              background: "none",
              border: `1px solid ${t.border}`,
              padding: "6px 16px",
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
