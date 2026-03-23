import { useTheme, useThemeActions } from "../lib/ThemeContext.jsx";

export default function Header({ bookmarkCount = 0, onOpenBookmarks, onOpenCodeExplorer }) {
  const t = useTheme();
  const { isDark, toggleTheme } = useThemeActions();

  return (
    <header style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 0" }}>
      <div style={{ borderTop: `2.5px solid ${t.text}`, marginBottom: 18 }} />
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
          <h1 style={{
            fontSize: "clamp(36px, 7vw, 52px)", fontWeight: 400, margin: 0,
            fontFamily: "'Times New Roman', Times, serif",
            letterSpacing: -2, lineHeight: 1, color: t.text,
          }}>
            casedive
          </h1>
          <span style={{
            fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase",
            color: t.textTertiary, fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
            whiteSpace: "nowrap",
          }}>
            Legal Research Tool
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {onOpenBookmarks && (
            <button
              onClick={onOpenBookmarks}
              aria-label="Saved citations"
              style={{
                background: "none", border: `1px solid ${t.border}`,
                color: t.textSecondary, cursor: "pointer",
                padding: "8px 14px", fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 12, letterSpacing: 1, display: "flex",
                alignItems: "center", gap: 8, transition: "all 0.2s",
                position: "relative",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill={bookmarkCount > 0 ? t.accent : "none"} stroke={bookmarkCount > 0 ? t.accent : t.textSecondary} strokeWidth="1.5" style={{ display: "block" }}>
                <path d="M3 2h10v12l-5-3-5 3V2z" />
              </svg>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2 }}>
                Saved
              </span>
              {bookmarkCount > 0 && (
                <span style={{
                  background: t.accent, color: "#fff",
                  borderRadius: "50%", width: 16, height: 16,
                  fontSize: 9, fontWeight: 700, letterSpacing: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "absolute", top: -6, right: -6,
                }}>
                  {bookmarkCount > 9 ? "9+" : bookmarkCount}
                </span>
              )}
            </button>
          )}
          {onOpenCodeExplorer && (
            <button
              onClick={onOpenCodeExplorer}
              aria-label="Criminal Code Explorer"
              style={{
                background: "none", border: `1px solid ${t.border}`,
                color: t.textSecondary, cursor: "pointer",
                padding: "8px 14px", fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 12, letterSpacing: 1, display: "flex",
                alignItems: "center", gap: 6, transition: "all 0.2s",
              }}
            >
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700 }}>§</span>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2 }}>
                Code
              </span>
            </button>
          )}
          <a
            href="https://buymeacoffee.com/alasdairnc"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "none", border: `1px solid ${t.border}`,
              color: t.textSecondary, cursor: "pointer",
              padding: "8px 14px", fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 12, letterSpacing: 1, display: "flex",
              alignItems: "center", gap: 6, transition: "all 0.2s",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 14 }}>☕</span>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Coffee
            </span>
          </a>
          <button
            onClick={toggleTheme}
            style={{
              background: "none", border: `1px solid ${t.border}`,
              color: t.textSecondary, cursor: "pointer",
              padding: "8px 14px", fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 12, letterSpacing: 1, display: "flex",
              alignItems: "center", gap: 8, transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 16 }}>{isDark ? "\u2600" : "\u263D"}</span>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2 }}>
              {isDark ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </div>
      <p style={{
        fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
        fontSize: 14, color: t.textSecondary, margin: "10px 0 0 0",
        letterSpacing: 0.2, lineHeight: 1.6,
      }}>
        Describe any legal scenario — receive Criminal Code sections, case law,
        civil law, Charter rights analysis, and more. Educational tool only — not legal advice.
      </p>
      <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 22 }} />
    </header>
  );
}
